/**
 * PortfolioBook: deterministic replay of an immutable ledger into positions, lots,
 * cash balances, realised gains, income, expenses and external flows.
 *
 * Invariants (tested in tests/unit/book.test.ts):
 * - Replaying the same events in the same order always produces the same state.
 * - Sum of lot quantities equals the position quantity for every (account, instrument).
 * - Total cost basis is conserved by splits, stock dividends and security transfers.
 * - Transfers between two accounts never change total portfolio cash.
 * - A reversed event and its reversal have no effect on the state.
 * - Selling more units than held raises InsufficientQuantityError (no short positions).
 */
import { Decimal, ZERO, d, sum } from "./decimal";
import type { ISODate } from "./dates";
import type { CurrencyCode } from "./currency";
import type { FxProvider } from "./fx";
import { MissingFxRateError } from "./fx";
import type { InstrumentInfo, LedgerEvent } from "./types";

export type LotMethod = "FIFO" | "AVERAGE";

export interface Lot {
  lotId: string;
  accountId: string;
  instrumentId: string;
  acquiredOn: ISODate;
  quantity: Decimal;
  /** Total cost of the remaining quantity, in the instrument currency (fees capitalised). */
  cost: Decimal;
  currency: CurrencyCode;
  /** Cost in the book's base currency at acquisition-date FX, or null when that rate is missing. */
  costBase: Decimal | null;
  sourceEventId: string;
}

export interface RealizedGain {
  eventId: string;
  date: ISODate;
  accountId: string;
  instrumentId: string;
  quantity: Decimal;
  proceeds: Decimal;
  cost: Decimal;
  gain: Decimal;
  currency: CurrencyCode;
  /** Gain in base currency: proceeds at disposal FX minus cost at acquisition FX. Null if any rate is missing. */
  gainBase: Decimal | null;
  /** Discount-instrument maturity gains are interest in substance. */
  classification: "capital" | "interest";
}

export interface IncomeRecord {
  eventId: string;
  date: ISODate;
  accountId: string;
  instrumentId?: string;
  kind: "dividend" | "interest" | "coupon" | "reinvested" | "discount_accretion";
  gross: Decimal;
  tax: Decimal;
  currency: CurrencyCode;
}

export interface ExpenseRecord {
  eventId: string;
  date: ISODate;
  accountId: string;
  instrumentId?: string;
  kind: "fee" | "tax";
  amount: Decimal;
  currency: CurrencyCode;
}

/**
 * A movement of value into or out of an account. Whether it is an *external* flow depends on
 * the analysis scope (see flowsForScope): a transfer between two in-scope accounts is internal.
 */
export interface AccountFlow {
  eventId: string;
  date: ISODate;
  accountId: string;
  /** Positive = into the account. */
  direction: 1 | -1;
  kind: "cash" | "in_kind";
  currency: CurrencyCode;
  /** Cash amount (kind = cash). */
  amount?: Decimal;
  /** In-kind: instrument and quantity, valued at market on the flow date by the valuation layer. */
  instrumentId?: string;
  quantity?: Decimal;
  /** In-kind: carried cost basis (used when no market value is available). */
  cost?: Decimal;
  /** Counterparty account for transfers; undefined for deposits/withdrawals/opening positions. */
  counterpartyAccountId?: string;
}

export interface BookWarning {
  eventId: string;
  code: "NEGATIVE_CASH" | "MISSING_FX_FOR_COST_BASIS" | "UNKNOWN_INSTRUMENT";
  message: string;
}

export class InsufficientQuantityError extends Error {
  constructor(
    readonly eventId: string,
    readonly accountId: string,
    readonly instrumentId: string,
    readonly requested: Decimal,
    readonly held: Decimal,
  ) {
    super(`Event ${eventId}: cannot remove ${requested.toFixed()} units of ${instrumentId} from ${accountId}; only ${held.toFixed()} held`);
    this.name = "InsufficientQuantityError";
  }
}

export class LedgerValidationError extends Error {
  constructor(
    readonly eventId: string,
    message: string,
  ) {
    super(`Event ${eventId}: ${message}`);
    this.name = "LedgerValidationError";
  }
}

export interface BookOptions {
  baseCurrency: CurrencyCode;
  instruments: Map<string, InstrumentInfo>;
  lotMethod?: LotMethod;
  /** Used to compute base-currency cost basis and realised gains. Optional. */
  fx?: FxProvider;
}

function cashKey(accountId: string, currency: CurrencyCode): string {
  return `${accountId}|${currency}`;
}

function positive(eventId: string, label: string, v: Decimal): void {
  if (!v.isFinite() || v.lte(0)) throw new LedgerValidationError(eventId, `${label} must be greater than zero`);
}

function nonNegative(eventId: string, label: string, v: Decimal): void {
  if (!v.isFinite() || v.lt(0)) throw new LedgerValidationError(eventId, `${label} cannot be negative`);
}

/** Drop reversed events and the reversals themselves. Throws on dangling or double reversals. */
export function effectiveEvents(events: LedgerEvent[]): LedgerEvent[] {
  const ids = new Set(events.map((e) => e.id));
  const reversed = new Set<string>();
  for (const e of events) {
    if (e.type === "reversal") {
      if (!ids.has(e.reversesEventId)) throw new LedgerValidationError(e.id, `reverses unknown event ${e.reversesEventId}`);
      if (reversed.has(e.reversesEventId)) throw new LedgerValidationError(e.id, `event ${e.reversesEventId} is already reversed`);
      reversed.add(e.reversesEventId);
    }
  }
  return events.filter((e) => e.type !== "reversal" && !reversed.has(e.id));
}

/** Stable ordering: by date, then by the caller-supplied sequence. */
export function sortEvents(events: LedgerEvent[]): LedgerEvent[] {
  return events.map((e, i) => ({ e, i })).sort((a, b) => (a.e.date < b.e.date ? -1 : a.e.date > b.e.date ? 1 : a.i - b.i)).map((x) => x.e);
}

export class PortfolioBook {
  readonly lots: Lot[] = [];
  readonly cash = new Map<string, Decimal>();
  readonly realized: RealizedGain[] = [];
  readonly income: IncomeRecord[] = [];
  readonly expenses: ExpenseRecord[] = [];
  readonly flows: AccountFlow[] = [];
  readonly warnings: BookWarning[] = [];
  private lotSeq = 0;
  private readonly lotMethod: LotMethod;
  lastAppliedDate: ISODate | null = null;

  constructor(private readonly opts: BookOptions) {
    this.lotMethod = opts.lotMethod ?? "FIFO";
  }

  /** Replay a full event list (reversals resolved, sorted by date). */
  static replay(events: LedgerEvent[], opts: BookOptions): PortfolioBook {
    const book = new PortfolioBook(opts);
    for (const e of sortEvents(effectiveEvents(events))) book.apply(e);
    return book;
  }

  private instrument(eventId: string, id: string): InstrumentInfo {
    const info = this.opts.instruments.get(id);
    if (!info) throw new LedgerValidationError(eventId, `unknown instrument ${id}`);
    return info;
  }

  private toBase(amount: Decimal, currency: CurrencyCode, date: ISODate, eventId: string): Decimal | null {
    if (currency === this.opts.baseCurrency) return amount;
    if (!this.opts.fx) return null;
    try {
      return amount.times(this.opts.fx.quote(currency, this.opts.baseCurrency, date).rate);
    } catch (err) {
      if (err instanceof MissingFxRateError) {
        this.warnings.push({ eventId, code: "MISSING_FX_FOR_COST_BASIS", message: err.message });
        return null;
      }
      throw err;
    }
  }

  private moveCash(eventId: string, accountId: string, currency: CurrencyCode, delta: Decimal): void {
    const key = cashKey(accountId, currency);
    const next = (this.cash.get(key) ?? ZERO).plus(delta);
    this.cash.set(key, next);
    if (next.isNegative()) {
      this.warnings.push({
        eventId,
        code: "NEGATIVE_CASH",
        message: `Cash in ${accountId} (${currency}) is negative after this event: ${next.toFixed()}. A deposit may be missing.`,
      });
    }
  }

  private addLot(eventId: string, accountId: string, instrumentId: string, acquiredOn: ISODate, quantity: Decimal, cost: Decimal, currency: CurrencyCode, costBase: Decimal | null): void {
    this.lots.push({
      lotId: `${eventId}#${++this.lotSeq}`,
      accountId,
      instrumentId,
      acquiredOn,
      quantity,
      cost,
      currency,
      costBase,
      sourceEventId: eventId,
    });
  }

  positionQuantity(accountId: string, instrumentId: string): Decimal {
    return sum(this.lots.filter((l) => l.accountId === accountId && l.instrumentId === instrumentId).map((l) => l.quantity));
  }

  /** Remove `quantity` units using the configured lot method. Returns the removed lot slices. */
  private removeUnits(eventId: string, accountId: string, instrumentId: string, quantity: Decimal): Lot[] {
    const lots = this.lots.filter((l) => l.accountId === accountId && l.instrumentId === instrumentId);
    const held = sum(lots.map((l) => l.quantity));
    if (held.lt(quantity)) throw new InsufficientQuantityError(eventId, accountId, instrumentId, quantity, held);
    const removed: Lot[] = [];
    if (this.lotMethod === "AVERAGE") {
      const fraction = quantity.div(held);
      for (const lot of lots) {
        const q = lot.quantity.times(fraction);
        const c = lot.cost.times(fraction);
        const cb = lot.costBase === null ? null : lot.costBase.times(fraction);
        removed.push({ ...lot, quantity: q, cost: c, costBase: cb });
        lot.quantity = lot.quantity.minus(q);
        lot.cost = lot.cost.minus(c);
        lot.costBase = lot.costBase === null || cb === null ? null : lot.costBase.minus(cb);
      }
    } else {
      let remaining = quantity;
      const ordered = [...lots].sort((a, b) => (a.acquiredOn < b.acquiredOn ? -1 : a.acquiredOn > b.acquiredOn ? 1 : 0));
      for (const lot of ordered) {
        if (remaining.isZero()) break;
        const take = Decimal.min(lot.quantity, remaining);
        const fraction = take.div(lot.quantity);
        const c = lot.cost.times(fraction);
        const cb = lot.costBase === null ? null : lot.costBase.times(fraction);
        removed.push({ ...lot, quantity: take, cost: c, costBase: cb });
        lot.quantity = lot.quantity.minus(take);
        lot.cost = lot.cost.minus(c);
        lot.costBase = lot.costBase === null || cb === null ? null : lot.costBase.minus(cb);
        remaining = remaining.minus(take);
      }
    }
    // Drop exhausted lots.
    for (let i = this.lots.length - 1; i >= 0; i--) if (this.lots[i]!.quantity.isZero()) this.lots.splice(i, 1);
    return removed;
  }

  private realize(e: LedgerEvent & { accountId: string; instrumentId: string }, removed: Lot[], proceeds: Decimal, currency: CurrencyCode, classification: RealizedGain["classification"]): void {
    const cost = sum(removed.map((l) => l.cost));
    const quantity = sum(removed.map((l) => l.quantity));
    const proceedsBase = this.toBase(proceeds, currency, e.date, e.id);
    const costBase = removed.some((l) => l.costBase === null) ? null : sum(removed.map((l) => l.costBase as Decimal));
    this.realized.push({
      eventId: e.id,
      date: e.date,
      accountId: e.accountId,
      instrumentId: e.instrumentId,
      quantity,
      proceeds,
      cost,
      gain: proceeds.minus(cost),
      currency,
      gainBase: proceedsBase === null || costBase === null ? null : proceedsBase.minus(costBase),
      classification,
    });
  }

  apply(e: LedgerEvent): void {
    if (this.lastAppliedDate && e.date < this.lastAppliedDate) {
      throw new LedgerValidationError(e.id, `events must be applied in date order (${e.date} after ${this.lastAppliedDate})`);
    }
    this.lastAppliedDate = e.date;
    switch (e.type) {
      case "deposit":
      case "withdrawal": {
        positive(e.id, "amount", e.amount);
        const dir = e.type === "deposit" ? 1 : -1;
        this.moveCash(e.id, e.accountId, e.currency, e.amount.times(dir));
        this.flows.push({ eventId: e.id, date: e.date, accountId: e.accountId, direction: dir, kind: "cash", currency: e.currency, amount: e.amount });
        return;
      }
      case "buy": {
        positive(e.id, "quantity", e.quantity);
        nonNegative(e.id, "price", e.price);
        nonNegative(e.id, "fees", e.fees);
        const info = this.instrument(e.id, e.instrumentId);
        if (info.currency !== e.currency) throw new LedgerValidationError(e.id, `trade currency ${e.currency} differs from instrument currency ${info.currency}; record an FX conversion first`);
        const multiplier = info.priceMultiplier ?? d(1);
        const gross = e.quantity.times(e.price).div(multiplier);
        const cost = gross.plus(e.fees);
        this.moveCash(e.id, e.accountId, e.currency, cost.negated());
        this.addLot(e.id, e.accountId, e.instrumentId, e.date, e.quantity, cost, e.currency, this.toBase(cost, e.currency, e.date, e.id));
        if (!e.fees.isZero()) this.expenses.push({ eventId: e.id, date: e.date, accountId: e.accountId, instrumentId: e.instrumentId, kind: "fee", amount: e.fees, currency: e.currency });
        return;
      }
      case "sell": {
        positive(e.id, "quantity", e.quantity);
        nonNegative(e.id, "price", e.price);
        nonNegative(e.id, "fees", e.fees);
        const info = this.instrument(e.id, e.instrumentId);
        if (info.currency !== e.currency) throw new LedgerValidationError(e.id, `trade currency ${e.currency} differs from instrument currency ${info.currency}`);
        const multiplier = info.priceMultiplier ?? d(1);
        const net = e.quantity.times(e.price).div(multiplier).minus(e.fees);
        const removed = this.removeUnits(e.id, e.accountId, e.instrumentId, e.quantity);
        this.moveCash(e.id, e.accountId, e.currency, net);
        this.realize(e, removed, net, e.currency, "capital");
        if (!e.fees.isZero()) this.expenses.push({ eventId: e.id, date: e.date, accountId: e.accountId, instrumentId: e.instrumentId, kind: "fee", amount: e.fees, currency: e.currency });
        return;
      }
      case "dividend":
      case "interest":
      case "coupon": {
        positive(e.id, "gross amount", e.grossAmount);
        nonNegative(e.id, "withholding tax", e.withholdingTax);
        if (e.withholdingTax.gt(e.grossAmount)) throw new LedgerValidationError(e.id, "withholding tax exceeds gross amount");
        this.moveCash(e.id, e.accountId, e.currency, e.grossAmount.minus(e.withholdingTax));
        this.income.push({
          eventId: e.id,
          date: e.date,
          accountId: e.accountId,
          ...(e.instrumentId ? { instrumentId: e.instrumentId } : {}),
          kind: e.type,
          gross: e.grossAmount,
          tax: e.withholdingTax,
          currency: e.currency,
        });
        if (!e.withholdingTax.isZero()) this.expenses.push({ eventId: e.id, date: e.date, accountId: e.accountId, ...(e.instrumentId ? { instrumentId: e.instrumentId } : {}), kind: "tax", amount: e.withholdingTax, currency: e.currency });
        return;
      }
      case "fee":
      case "tax": {
        positive(e.id, "amount", e.amount);
        this.moveCash(e.id, e.accountId, e.currency, e.amount.negated());
        this.expenses.push({ eventId: e.id, date: e.date, accountId: e.accountId, ...(e.instrumentId ? { instrumentId: e.instrumentId } : {}), kind: e.type, amount: e.amount, currency: e.currency });
        return;
      }
      case "fx_conversion": {
        positive(e.id, "from amount", e.fromAmount);
        positive(e.id, "to amount", e.toAmount);
        nonNegative(e.id, "fees", e.fees);
        if (e.fromCurrency === e.toCurrency) throw new LedgerValidationError(e.id, "FX conversion needs two different currencies");
        this.moveCash(e.id, e.accountId, e.fromCurrency, e.fromAmount.plus(e.fees).negated());
        this.moveCash(e.id, e.accountId, e.toCurrency, e.toAmount);
        if (!e.fees.isZero()) this.expenses.push({ eventId: e.id, date: e.date, accountId: e.accountId, kind: "fee", amount: e.fees, currency: e.fromCurrency });
        return;
      }
      case "transfer": {
        positive(e.id, "amount", e.amount);
        if (e.fromAccountId === e.toAccountId) throw new LedgerValidationError(e.id, "transfer needs two different accounts");
        this.moveCash(e.id, e.fromAccountId, e.currency, e.amount.negated());
        this.moveCash(e.id, e.toAccountId, e.currency, e.amount);
        this.flows.push({ eventId: e.id, date: e.date, accountId: e.fromAccountId, direction: -1, kind: "cash", currency: e.currency, amount: e.amount, counterpartyAccountId: e.toAccountId });
        this.flows.push({ eventId: e.id, date: e.date, accountId: e.toAccountId, direction: 1, kind: "cash", currency: e.currency, amount: e.amount, counterpartyAccountId: e.fromAccountId });
        return;
      }
      case "security_transfer": {
        positive(e.id, "quantity", e.quantity);
        if (e.fromAccountId === e.toAccountId) throw new LedgerValidationError(e.id, "transfer needs two different accounts");
        const info = this.instrument(e.id, e.instrumentId);
        const removed = this.removeUnits(e.id, e.fromAccountId, e.instrumentId, e.quantity);
        // Lots keep their acquisition date and cost basis.
        for (const slice of removed) this.addLot(e.id, e.toAccountId, e.instrumentId, slice.acquiredOn, slice.quantity, slice.cost, slice.currency, slice.costBase);
        const cost = sum(removed.map((l) => l.cost));
        this.flows.push({ eventId: e.id, date: e.date, accountId: e.fromAccountId, direction: -1, kind: "in_kind", currency: info.currency, instrumentId: e.instrumentId, quantity: e.quantity, cost, counterpartyAccountId: e.toAccountId });
        this.flows.push({ eventId: e.id, date: e.date, accountId: e.toAccountId, direction: 1, kind: "in_kind", currency: info.currency, instrumentId: e.instrumentId, quantity: e.quantity, cost, counterpartyAccountId: e.fromAccountId });
        return;
      }
      case "reinvestment": {
        positive(e.id, "amount", e.amount);
        positive(e.id, "quantity", e.quantity);
        const info = this.instrument(e.id, e.instrumentId);
        if (info.currency !== e.currency) throw new LedgerValidationError(e.id, `reinvestment currency ${e.currency} differs from instrument currency ${info.currency}`);
        this.income.push({ eventId: e.id, date: e.date, accountId: e.accountId, instrumentId: e.instrumentId, kind: "reinvested", gross: e.amount, tax: ZERO, currency: e.currency });
        this.addLot(e.id, e.accountId, e.instrumentId, e.date, e.quantity, e.amount, e.currency, this.toBase(e.amount, e.currency, e.date, e.id));
        return;
      }
      case "split": {
        positive(e.id, "split numerator", e.numerator);
        positive(e.id, "split denominator", e.denominator);
        this.instrument(e.id, e.instrumentId);
        const ratio = e.numerator.div(e.denominator);
        for (const lot of this.lots) if (lot.instrumentId === e.instrumentId) lot.quantity = lot.quantity.times(ratio);
        return;
      }
      case "stock_dividend": {
        positive(e.id, "quantity", e.quantity);
        this.instrument(e.id, e.instrumentId);
        // Bonus shares: total cost basis is unchanged and reallocated pro rata across existing lots.
        const lots = this.lots.filter((l) => l.accountId === e.accountId && l.instrumentId === e.instrumentId);
        const held = sum(lots.map((l) => l.quantity));
        if (held.isZero()) throw new LedgerValidationError(e.id, "stock dividend received without an existing holding");
        const factor = held.plus(e.quantity).div(held);
        for (const lot of lots) lot.quantity = lot.quantity.times(factor);
        return;
      }
      case "maturity":
      case "redemption": {
        positive(e.id, "quantity", e.quantity);
        nonNegative(e.id, "proceeds", e.proceeds);
        const info = this.instrument(e.id, e.instrumentId);
        if (info.currency !== e.currency) throw new LedgerValidationError(e.id, `proceeds currency ${e.currency} differs from instrument currency ${info.currency}`);
        const removed = this.removeUnits(e.id, e.accountId, e.instrumentId, e.quantity);
        this.moveCash(e.id, e.accountId, e.currency, e.proceeds);
        const isDiscount = info.pricingModel === "discount_accrual";
        this.realize(e, removed, e.proceeds, e.currency, isDiscount ? "interest" : "capital");
        if (isDiscount) {
          const cost = sum(removed.map((l) => l.cost));
          const accretion = e.proceeds.minus(cost);
          if (!accretion.isZero()) {
            this.income.push({ eventId: e.id, date: e.date, accountId: e.accountId, instrumentId: e.instrumentId, kind: "discount_accretion", gross: accretion, tax: ZERO, currency: e.currency });
          }
        }
        return;
      }
      case "opening_position": {
        positive(e.id, "quantity", e.quantity);
        nonNegative(e.id, "cost basis", e.costBasis);
        const info = this.instrument(e.id, e.instrumentId);
        if (info.currency !== e.currency) throw new LedgerValidationError(e.id, `cost currency ${e.currency} differs from instrument currency ${info.currency}`);
        if (e.acquiredOn > e.date) throw new LedgerValidationError(e.id, "acquisition date cannot be after the event date");
        this.addLot(e.id, e.accountId, e.instrumentId, e.acquiredOn, e.quantity, e.costBasis, e.currency, this.toBase(e.costBasis, e.currency, e.acquiredOn, e.id));
        this.flows.push({ eventId: e.id, date: e.date, accountId: e.accountId, direction: 1, kind: "in_kind", currency: e.currency, instrumentId: e.instrumentId, quantity: e.quantity, cost: e.costBasis });
        return;
      }
      case "reversal":
        throw new LedgerValidationError(e.id, "reversals must be resolved with effectiveEvents() before replay");
    }
  }

  /** Aggregated position per (account, instrument). */
  positions(): Array<{ accountId: string; instrumentId: string; quantity: Decimal; cost: Decimal; costBase: Decimal | null; currency: CurrencyCode; averageCost: Decimal; lots: Lot[] }> {
    const map = new Map<string, Lot[]>();
    for (const lot of this.lots) {
      const k = `${lot.accountId}|${lot.instrumentId}`;
      const list = map.get(k) ?? [];
      list.push(lot);
      map.set(k, list);
    }
    return [...map.values()].map((lots) => {
      const first = lots[0]!;
      const quantity = sum(lots.map((l) => l.quantity));
      const cost = sum(lots.map((l) => l.cost));
      const costBase = lots.some((l) => l.costBase === null) ? null : sum(lots.map((l) => l.costBase as Decimal));
      return { accountId: first.accountId, instrumentId: first.instrumentId, quantity, cost, costBase, currency: first.currency, averageCost: quantity.isZero() ? ZERO : cost.div(quantity), lots };
    });
  }

  cashBalances(): Array<{ accountId: string; currency: CurrencyCode; amount: Decimal }> {
    return [...this.cash.entries()]
      .map(([k, amount]) => {
        const [accountId, currency] = k.split("|") as [string, string];
        return { accountId, currency, amount };
      })
      .filter((c) => !c.amount.isZero());
  }
}

/**
 * External flows for an analysis scope (a set of account ids). A flow is external when value
 * crosses the scope boundary: deposits/withdrawals/opening positions into in-scope accounts, and
 * transfers whose counterparty is outside the scope. Transfers inside the scope cancel out, so
 * moving money between your own accounts is never counted as a contribution or a return.
 */
export function flowsForScope(flows: AccountFlow[], scope: Set<string>): AccountFlow[] {
  return flows.filter((f) => scope.has(f.accountId) && !(f.counterpartyAccountId && scope.has(f.counterpartyAccountId)));
}
