/**
 * Point-in-time valuation of a PortfolioBook.
 *
 * Policies (docs/FINANCIAL_ENGINE.md §Data policies):
 * - Prices: latest observation on or before the valuation date. Older than the instrument's
 *   staleAfterDays → used but flagged STALE_PRICE. Never a later observation.
 * - Missing price: policy "cost" values the position at its cost basis and flags
 *   VALUED_AT_COST; policy "exclude" leaves it out of totals and flags MISSING_PRICE.
 * - Discount instruments without a market price are valued by straight-line accretion from
 *   cost to face value (flag MODEL_VALUATION).
 * - Missing FX: the item is excluded from base-currency totals and flagged MISSING_FX.
 *   No other date's rate is substituted.
 */
import { Decimal, ZERO, d, sum } from "./decimal";
import { daysBetween, type ISODate } from "./dates";
import type { CurrencyCode } from "./currency";
import { MissingFxRateError, type FxProvider, type FxQuote } from "./fx";
import type { PriceProvider } from "./prices";
import type { InstrumentInfo } from "./types";
import type { Lot, PortfolioBook } from "./book";

export type ValuationIssueCode =
  | "STALE_PRICE"
  | "MISSING_PRICE"
  | "VALUED_AT_COST"
  | "MODEL_VALUATION"
  | "MATURED_NOT_REDEEMED"
  | "MISSING_FX"
  | "STALE_FX"
  | "TRIANGULATED_FX"
  | "SYNTHETIC_DATA";

export interface ValuationIssue {
  code: ValuationIssueCode;
  accountId?: string;
  instrumentId?: string;
  currency?: CurrencyCode;
  message: string;
}

export type MissingPricePolicy = "cost" | "exclude";

export interface ValuationContext {
  date: ISODate;
  baseCurrency: CurrencyCode;
  instruments: Map<string, InstrumentInfo>;
  prices: PriceProvider;
  fx: FxProvider;
  missingPricePolicy?: MissingPricePolicy;
  /** FX observations older than this (days) are flagged STALE_FX. They are still within the FxTable window. */
  fxStaleAfterDays?: number;
}

export type ValuationMethod = "market" | "nav" | "accrual" | "cost" | "manual" | "none";

export interface ValuedHolding {
  accountId: string;
  instrumentId: string;
  currency: CurrencyCode;
  quantity: Decimal;
  price: Decimal | null;
  priceDate: ISODate | null;
  method: ValuationMethod;
  /** Market value in the instrument currency (null when it cannot be valued). */
  marketValue: Decimal | null;
  marketValueBase: Decimal | null;
  cost: Decimal;
  costBase: Decimal | null;
  unrealized: Decimal | null;
  /** Base-currency unrealised gain: includes the FX effect since acquisition. */
  unrealizedBase: Decimal | null;
  fx: FxQuote | null;
  synthetic: boolean;
}

export interface ValuedCash {
  accountId: string;
  currency: CurrencyCode;
  amount: Decimal;
  amountBase: Decimal | null;
  fx: FxQuote | null;
}

export interface Valuation {
  date: ISODate;
  baseCurrency: CurrencyCode;
  holdings: ValuedHolding[];
  cash: ValuedCash[];
  holdingsBase: Decimal;
  cashBase: Decimal;
  totalBase: Decimal;
  /** True when every item was valued in the base currency. */
  complete: boolean;
  issues: ValuationIssue[];
}

interface FxResult {
  quote: FxQuote | null;
}

function fxFor(ctx: ValuationContext, currency: CurrencyCode, issues: ValuationIssue[], ref: { accountId?: string; instrumentId?: string }): FxResult {
  try {
    const quote = ctx.fx.quote(currency, ctx.baseCurrency, ctx.date);
    if (quote.method === "triangulated") issues.push({ code: "TRIANGULATED_FX", currency, ...ref, message: `${currency}->${ctx.baseCurrency} derived via a pivot currency` });
    if (quote.ageDays > (ctx.fxStaleAfterDays ?? 3)) issues.push({ code: "STALE_FX", currency, ...ref, message: `${currency}->${ctx.baseCurrency} rate is ${quote.ageDays} days old (as of ${quote.observedOn})` });
    if (quote.synthetic) issues.push({ code: "SYNTHETIC_DATA", currency, ...ref, message: `${currency}->${ctx.baseCurrency} rate is SAMPLE data` });
    return { quote };
  } catch (err) {
    if (err instanceof MissingFxRateError) {
      issues.push({ code: "MISSING_FX", currency, ...ref, message: err.message });
      return { quote: null };
    }
    throw err;
  }
}

/** Accreted value of discount-instrument lots on `date` (straight line from cost to face). */
export function accretedValue(lots: Lot[], info: InstrumentInfo, date: ISODate): { value: Decimal; matured: boolean } {
  if (!info.faceValuePerUnit || !info.maturityDate) throw new RangeError(`${info.id}: discount accrual requires faceValuePerUnit and maturityDate`);
  let value = ZERO;
  const matured = date >= info.maturityDate;
  for (const lot of lots) {
    const face = lot.quantity.times(info.faceValuePerUnit);
    const total = daysBetween(lot.acquiredOn, info.maturityDate);
    if (matured || total <= 0) {
      value = value.plus(face);
      continue;
    }
    const elapsed = Math.max(0, daysBetween(lot.acquiredOn, date));
    value = value.plus(lot.cost.plus(face.minus(lot.cost).times(elapsed).div(total)));
  }
  return { value, matured };
}

/** Value `quantity` units of an instrument (with the given lots for accrual/cost fallbacks). */
export function valueUnits(
  ctx: ValuationContext,
  instrumentId: string,
  quantity: Decimal,
  lots: Lot[],
  cost: Decimal,
  issues: ValuationIssue[],
  ref: { accountId?: string },
): { price: Decimal | null; priceDate: ISODate | null; method: ValuationMethod; value: Decimal | null; synthetic: boolean } {
  const info = ctx.instruments.get(instrumentId);
  if (!info) {
    issues.push({ code: "MISSING_PRICE", instrumentId, ...ref, message: `Unknown instrument ${instrumentId}` });
    return { price: null, priceDate: null, method: "none", value: null, synthetic: false };
  }
  const multiplier = info.priceMultiplier ?? d(1);
  const quote = ctx.prices.quote(instrumentId, ctx.date, info.staleAfterDays);
  if (quote && (info.pricingModel !== "discount_accrual" || quote.status === "fresh")) {
    if (quote.currency !== info.currency) throw new RangeError(`Price currency ${quote.currency} differs from instrument currency ${info.currency} for ${instrumentId}`);
    if (quote.status === "stale") issues.push({ code: "STALE_PRICE", instrumentId, ...ref, message: `${info.name}: last price is ${quote.ageDays} days old (as of ${quote.observedOn})` });
    if (quote.synthetic) issues.push({ code: "SYNTHETIC_DATA", instrumentId, ...ref, message: `${info.name}: price is SAMPLE data` });
    const method: ValuationMethod = info.pricingModel === "nav" ? "nav" : info.pricingModel === "manual" ? "manual" : "market";
    return { price: quote.price, priceDate: quote.observedOn, method, value: quantity.times(quote.price).div(multiplier), synthetic: quote.synthetic };
  }
  if (info.pricingModel === "discount_accrual" && info.faceValuePerUnit && info.maturityDate) {
    const { value, matured } = accretedValue(lots, info, ctx.date);
    issues.push({ code: "MODEL_VALUATION", instrumentId, ...ref, message: `${info.name}: valued by straight-line accretion to face value at maturity (${info.maturityDate})` });
    if (matured) issues.push({ code: "MATURED_NOT_REDEEMED", instrumentId, ...ref, message: `${info.name} matured on ${info.maturityDate}; record the maturity proceeds` });
    return { price: quantity.isZero() ? null : value.times(multiplier).div(quantity), priceDate: null, method: "accrual", value, synthetic: false };
  }
  if ((ctx.missingPricePolicy ?? "cost") === "cost") {
    issues.push({ code: "VALUED_AT_COST", instrumentId, ...ref, message: `${info.name}: no price on or before ${ctx.date}; shown at cost basis` });
    return { price: null, priceDate: null, method: "cost", value: cost, synthetic: false };
  }
  issues.push({ code: "MISSING_PRICE", instrumentId, ...ref, message: `${info.name}: no price on or before ${ctx.date}; excluded from totals` });
  return { price: null, priceDate: null, method: "none", value: null, synthetic: false };
}

export function valueBook(book: PortfolioBook, ctx: ValuationContext, scope?: Set<string>): Valuation {
  const issues: ValuationIssue[] = [];
  const holdings: ValuedHolding[] = [];
  for (const p of book.positions()) {
    if (scope && !scope.has(p.accountId)) continue;
    if (p.quantity.isZero()) continue;
    const ref = { accountId: p.accountId };
    const v = valueUnits(ctx, p.instrumentId, p.quantity, p.lots, p.cost, issues, ref);
    const fx = v.value === null ? { quote: null } : fxFor(ctx, p.currency, issues, { ...ref, instrumentId: p.instrumentId });
    const marketValueBase = v.value !== null && fx.quote ? v.value.times(fx.quote.rate) : null;
    holdings.push({
      accountId: p.accountId,
      instrumentId: p.instrumentId,
      currency: p.currency,
      quantity: p.quantity,
      price: v.price,
      priceDate: v.priceDate,
      method: v.method,
      marketValue: v.value,
      marketValueBase,
      cost: p.cost,
      costBase: p.costBase,
      unrealized: v.value === null || v.method === "cost" ? (v.method === "cost" ? ZERO : null) : v.value.minus(p.cost),
      unrealizedBase: marketValueBase === null || p.costBase === null ? null : marketValueBase.minus(p.costBase),
      fx: fx.quote,
      synthetic: v.synthetic,
    });
  }
  const cash: ValuedCash[] = [];
  for (const c of book.cashBalances()) {
    if (scope && !scope.has(c.accountId)) continue;
    const fx = fxFor(ctx, c.currency, issues, { accountId: c.accountId });
    cash.push({ ...c, amountBase: fx.quote ? c.amount.times(fx.quote.rate) : null, fx: fx.quote });
  }
  const holdingsBase = sum(holdings.flatMap((h) => (h.marketValueBase ? [h.marketValueBase] : [])));
  const cashBase = sum(cash.flatMap((c) => (c.amountBase ? [c.amountBase] : [])));
  const complete = holdings.every((h) => h.marketValueBase !== null) && cash.every((c) => c.amountBase !== null);
  return { date: ctx.date, baseCurrency: ctx.baseCurrency, holdings, cash, holdingsBase, cashBase, totalBase: holdingsBase.plus(cashBase), complete, issues: dedupeIssues(issues) };
}

function dedupeIssues(issues: ValuationIssue[]): ValuationIssue[] {
  const seen = new Set<string>();
  return issues.filter((i) => {
    const k = `${i.code}|${i.accountId ?? ""}|${i.instrumentId ?? ""}|${i.currency ?? ""}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}
