/**
 * Performance of a single holding (one instrument in one account).
 *
 * The holding is treated as its own small portfolio. Money in: purchases (incl. fees),
 * holding-specific fees/taxes paid, opening positions and securities transferred in (at market
 * value). Money out: sale proceeds (net of fees), maturity/redemption proceeds, net income paid
 * out (dividends, interest, coupons after withholding tax) and securities transferred out.
 * Reinvested income is both out and back in, so it nets to zero but counts as income.
 * Splits and bonus issues are not flows. Same end-of-day TWR convention as the portfolio.
 */
import { Decimal, ZERO, d } from "./decimal";
import { daysBetween, monthEndsBetween, type ISODate } from "./dates";
import type { CurrencyCode } from "./currency";
import { MissingFxRateError, type FxProvider } from "./fx";
import type { PriceProvider } from "./prices";
import type { InstrumentInfo, LedgerEvent } from "./types";
import { PortfolioBook, effectiveEvents, sortEvents, type LotMethod } from "./book";
import { valueUnits, type MissingPricePolicy, type ValuationIssue } from "./valuation";
import { annualize, timeWeightedReturn, xirr, type DatedAmount } from "./returns";

export interface HoldingPerformanceInput {
  events: LedgerEvent[];
  instruments: Map<string, InstrumentInfo>;
  prices: PriceProvider;
  fx: FxProvider;
  baseCurrency: CurrencyCode;
  accountId: string;
  instrumentId: string;
  start: ISODate;
  end: ISODate;
  lotMethod?: LotMethod;
  missingPricePolicy?: MissingPricePolicy;
}

export interface HoldingReturn {
  currency: CurrencyCode;
  startValue: Decimal;
  endValue: Decimal;
  /** Money put in during (start, end]. */
  invested: Decimal;
  /** Money taken out during (start, end] (sale/maturity proceeds and net income). */
  returned: Decimal;
  /** endValue − startValue − invested + returned. */
  gain: Decimal;
  twr: Decimal | null;
  twrAnnualized: Decimal | null;
  xirr: number | null;
}

export interface HoldingPerformance {
  accountId: string;
  instrumentId: string;
  start: ISODate;
  end: ISODate;
  days: number;
  /** In the instrument's own currency: the investment's performance excluding currency moves. */
  local: HoldingReturn;
  /** In the base currency: what it did for you, including currency moves. Null if FX is missing. */
  base: HoldingReturn | null;
  /** Gross income (dividends, interest, coupons, reinvested, discount accretion) in the period, local currency. */
  incomeGross: Decimal;
  complete: boolean;
  issues: ValuationIssue[];
}

/** Local-currency cash flow into (+) or out of (−) the holding for one event, or null if unrelated. */
function holdingFlow(e: LedgerEvent, accountId: string, instrumentId: string, info: InstrumentInfo, unitValue: (qty: Decimal) => Decimal | null): Decimal | null {
  const mult = info.priceMultiplier ?? d(1);
  switch (e.type) {
    case "buy":
      return e.accountId === accountId && e.instrumentId === instrumentId ? e.quantity.times(e.price).div(mult).plus(e.fees) : null;
    case "sell":
      return e.accountId === accountId && e.instrumentId === instrumentId ? e.quantity.times(e.price).div(mult).minus(e.fees).negated() : null;
    case "dividend":
    case "interest":
    case "coupon":
      return e.accountId === accountId && e.instrumentId === instrumentId ? e.grossAmount.minus(e.withholdingTax).negated() : null;
    case "fee":
    case "tax":
      return e.accountId === accountId && e.instrumentId === instrumentId ? e.amount : null;
    case "maturity":
    case "redemption":
      return e.accountId === accountId && e.instrumentId === instrumentId ? e.proceeds.negated() : null;
    case "opening_position":
      return e.accountId === accountId && e.instrumentId === instrumentId ? (unitValue(e.quantity) ?? e.costBasis) : null;
    case "security_transfer": {
      if (e.instrumentId !== instrumentId) return null;
      const v = unitValue(e.quantity) ?? ZERO;
      if (e.toAccountId === accountId) return v;
      if (e.fromAccountId === accountId) return v.negated();
      return null;
    }
    case "reinvestment":
      return e.accountId === accountId && e.instrumentId === instrumentId ? ZERO : null;
    default:
      return null;
  }
}

function result(points: Array<{ date: ISODate; value: Decimal; flow: Decimal }>, currency: CurrencyCode, days: number): HoldingReturn {
  const first = points[0]!;
  const last = points[points.length - 1]!;
  let invested = ZERO;
  let returned = ZERO;
  for (const p of points.slice(1)) {
    if (p.flow.isPositive()) invested = invested.plus(p.flow);
    else returned = returned.plus(p.flow.negated());
  }
  const hasCapital = points.some((p) => p.value.gt(0));
  const { twr } = timeWeightedReturn(points.map((p, i) => (i === 0 ? { ...p, flow: ZERO } : p)));
  const cfs: DatedAmount[] = [];
  if (!first.value.isZero()) cfs.push({ date: first.date, amount: first.value.negated() });
  for (const p of points.slice(1)) if (!p.flow.isZero()) cfs.push({ date: p.date, amount: p.flow.negated() });
  cfs.push({ date: last.date, amount: last.value });
  return {
    currency,
    startValue: first.value,
    endValue: last.value,
    invested,
    returned,
    gain: last.value.minus(first.value).minus(invested).plus(returned),
    twr: hasCapital ? twr : null,
    twrAnnualized: hasCapital ? annualize(twr, days) : null,
    xirr: xirr(cfs),
  };
}

export function holdingPerformance(input: HoldingPerformanceInput): HoldingPerformance {
  const info = input.instruments.get(input.instrumentId);
  if (!info) throw new RangeError(`Unknown instrument ${input.instrumentId}`);
  const events = sortEvents(effectiveEvents(input.events));
  const touches = (e: LedgerEvent) => "instrumentId" in e && e.instrumentId === input.instrumentId;
  const dateSet = new Set<ISODate>([input.start, input.end, ...monthEndsBetween(input.start, input.end)]);
  for (const e of events) if (touches(e) && e.date > input.start && e.date <= input.end) dateSet.add(e.date);
  const dates = [...dateSet].filter((x) => x >= input.start && x <= input.end).sort();

  const book = new PortfolioBook({ baseCurrency: input.baseCurrency, instruments: input.instruments, lotMethod: input.lotMethod ?? "FIFO" });
  const issues: ValuationIssue[] = [];
  const policy = input.missingPricePolicy ?? "cost";
  const ctxAt = (date: ISODate) => ({ date, baseCurrency: info.currency, instruments: input.instruments, prices: input.prices, fx: input.fx, missingPricePolicy: policy });
  const positionValue = (date: ISODate): Decimal | null => {
    const pos = book.positions().find((p) => p.accountId === input.accountId && p.instrumentId === input.instrumentId);
    if (!pos || pos.quantity.isZero()) return ZERO;
    return valueUnits(ctxAt(date), input.instrumentId, pos.quantity, pos.lots, pos.cost, issues, { accountId: input.accountId }).value;
  };
  const fxRate = (date: ISODate): Decimal | null => {
    try {
      return input.fx.quote(info.currency, input.baseCurrency, date).rate;
    } catch (err) {
      if (err instanceof MissingFxRateError) {
        issues.push({ code: "MISSING_FX", currency: info.currency, message: err.message });
        return null;
      }
      throw err;
    }
  };

  const local: Array<{ date: ISODate; value: Decimal; flow: Decimal }> = [];
  const base: Array<{ date: ISODate; value: Decimal; flow: Decimal }> = [];
  let complete = true;
  let baseOk = true;
  let incomeGross = ZERO;
  let idx = 0;
  for (const [n, date] of dates.entries()) {
    let flowLocal = ZERO;
    let flowBase = ZERO;
    while (idx < events.length && events[idx]!.date <= date) {
      const e = events[idx++]!;
      const unitValue = (qty: Decimal) => valueUnits(ctxAt(e.date), input.instrumentId, qty, [], ZERO, [], {}).value;
      const f = touches(e) ? holdingFlow(e, input.accountId, input.instrumentId, info, unitValue) : null;
      const before = book.income.length;
      book.apply(e);
      if (f === null || n === 0) continue; // flows on or before the start are part of the starting value
      for (const inc of book.income.slice(before)) if (inc.accountId === input.accountId && inc.instrumentId === input.instrumentId) incomeGross = incomeGross.plus(inc.gross);
      flowLocal = flowLocal.plus(f);
      const r = fxRate(e.date);
      if (r === null) baseOk = false;
      else flowBase = flowBase.plus(f.times(r));
    }
    const v = positionValue(date);
    if (v === null) {
      complete = false;
      continue;
    }
    local.push({ date, value: v, flow: flowLocal });
    const r = fxRate(date);
    if (r === null) baseOk = false;
    else base.push({ date, value: v.times(r), flow: flowBase });
  }
  const days = daysBetween(input.start, input.end);
  const seen = new Set<string>();
  return {
    accountId: input.accountId,
    instrumentId: input.instrumentId,
    start: input.start,
    end: input.end,
    days,
    local: result(local, info.currency, days),
    base: baseOk && base.length === local.length ? result(base, input.baseCurrency, days) : null,
    incomeGross,
    complete: complete && baseOk,
    issues: issues.filter((i) => {
      const k = `${i.code}|${i.currency ?? ""}|${i.instrumentId ?? ""}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    }),
  };
}

/**
 * All holdings in one ledger replay. Each holding is valued on exactly the dates the single-holding
 * calculation uses (period start/end, month ends and its own event dates), with the same flow and
 * income rules, so results are identical to calling holdingPerformance once per holding — tested.
 */
export function holdingsPerformanceBatch(input: Omit<HoldingPerformanceInput, "accountId" | "instrumentId"> & { pairs: Array<{ accountId: string; instrumentId: string }> }): HoldingPerformance[] {
  const events = sortEvents(effectiveEvents(input.events));
  const policy = input.missingPricePolicy ?? "cost";
  const baseDates = [input.start, input.end, ...monthEndsBetween(input.start, input.end)];
  const inRange = (x: ISODate) => x >= input.start && x <= input.end;

  interface PairState {
    accountId: string;
    instrumentId: string;
    info: InstrumentInfo;
    dates: Set<ISODate>;
    local: Array<{ date: ISODate; value: Decimal; flow: Decimal }>;
    base: Array<{ date: ISODate; value: Decimal; flow: Decimal }>;
    flowLocal: Decimal;
    flowBase: Decimal;
    complete: boolean;
    baseOk: boolean;
    incomeGross: Decimal;
    issues: ValuationIssue[];
  }
  const states: PairState[] = [];
  const byInstrument = new Map<string, PairState[]>();
  for (const p of input.pairs) {
    const info = input.instruments.get(p.instrumentId);
    if (!info) throw new RangeError(`Unknown instrument ${p.instrumentId}`);
    const s: PairState = { ...p, info, dates: new Set(baseDates.filter(inRange)), local: [], base: [], flowLocal: ZERO, flowBase: ZERO, complete: true, baseOk: true, incomeGross: ZERO, issues: [] };
    states.push(s);
    byInstrument.set(p.instrumentId, [...(byInstrument.get(p.instrumentId) ?? []), s]);
  }
  for (const e of events) {
    if (!("instrumentId" in e) || !e.instrumentId || e.date <= input.start || e.date > input.end) continue;
    for (const s of byInstrument.get(e.instrumentId) ?? []) s.dates.add(e.date);
  }
  const allDates = [...new Set(states.flatMap((s) => [...s.dates]))].sort();
  const book = new PortfolioBook({ baseCurrency: input.baseCurrency, instruments: input.instruments, lotMethod: input.lotMethod ?? "FIFO" });
  const ctxAt = (date: ISODate, info: InstrumentInfo) => ({ date, baseCurrency: info.currency, instruments: input.instruments, prices: input.prices, fx: input.fx, missingPricePolicy: policy });
  const fxRate = (s: PairState, date: ISODate): Decimal | null => {
    try {
      return input.fx.quote(s.info.currency, input.baseCurrency, date).rate;
    } catch (err) {
      if (err instanceof MissingFxRateError) {
        s.issues.push({ code: "MISSING_FX", currency: s.info.currency, message: err.message });
        return null;
      }
      throw err;
    }
  };

  let idx = 0;
  for (const [n, date] of allDates.entries()) {
    while (idx < events.length && events[idx]!.date <= date) {
      const e = events[idx++]!;
      const touched = "instrumentId" in e && e.instrumentId ? (byInstrument.get(e.instrumentId) ?? []) : [];
      const flows = touched.map((s) => holdingFlow(e, s.accountId, s.instrumentId, s.info, (qty) => valueUnits(ctxAt(e.date, s.info), s.instrumentId, qty, [], ZERO, [], {}).value));
      const before = book.income.length;
      book.apply(e);
      if (n === 0) continue; // flows on or before the start are part of the starting value
      touched.forEach((s, i) => {
        const f = flows[i];
        if (f === null || f === undefined) return;
        for (const inc of book.income.slice(before)) if (inc.accountId === s.accountId && inc.instrumentId === s.instrumentId) s.incomeGross = s.incomeGross.plus(inc.gross);
        s.flowLocal = s.flowLocal.plus(f);
        const r = fxRate(s, e.date);
        if (r === null) s.baseOk = false;
        else s.flowBase = s.flowBase.plus(f.times(r));
      });
    }
    const due = states.filter((s) => s.dates.has(date));
    if (!due.length) continue;
    const positions = new Map(book.positions().map((p) => [`${p.accountId}|${p.instrumentId}`, p]));
    for (const s of due) {
      const pos = positions.get(`${s.accountId}|${s.instrumentId}`);
      const v = !pos || pos.quantity.isZero() ? ZERO : valueUnits(ctxAt(date, s.info), s.instrumentId, pos.quantity, pos.lots, pos.cost, s.issues, { accountId: s.accountId }).value;
      const [fl, fb] = [s.flowLocal, s.flowBase];
      s.flowLocal = ZERO;
      s.flowBase = ZERO;
      if (v === null) {
        s.complete = false;
        continue;
      }
      s.local.push({ date, value: v, flow: fl });
      const r = fxRate(s, date);
      if (r === null) s.baseOk = false;
      else s.base.push({ date, value: v.times(r), flow: fb });
    }
  }
  const days = daysBetween(input.start, input.end);
  return states.map((s) => {
    const seen = new Set<string>();
    return {
      accountId: s.accountId,
      instrumentId: s.instrumentId,
      start: input.start,
      end: input.end,
      days,
      local: result(s.local, s.info.currency, days),
      base: s.baseOk && s.base.length === s.local.length ? result(s.base, input.baseCurrency, days) : null,
      incomeGross: s.incomeGross,
      complete: s.complete && s.baseOk,
      issues: s.issues.filter((i) => {
        const k = `${i.code}|${i.currency ?? ""}|${i.instrumentId ?? ""}`;
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      }),
    };
  });
}
