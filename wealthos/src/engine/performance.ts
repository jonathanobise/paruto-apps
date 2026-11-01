/**
 * Portfolio performance over a period for a scope of accounts.
 *
 * Separates (all in base currency):
 *   end value − start value = net external contributions + investment gain
 * and splits investment gain into income, realised and unrealised components where possible.
 * Deposits are never counted as profit.
 */
import { Decimal, ZERO, d, sum } from "./decimal";
import { daysBetween, monthEndsBetween, type ISODate } from "./dates";
import type { CurrencyCode } from "./currency";
import { MissingFxRateError, type FxProvider, type FxQuote } from "./fx";
import type { PriceProvider } from "./prices";
import type { InstrumentInfo, LedgerEvent } from "./types";
import { PortfolioBook, effectiveEvents, flowsForScope, sortEvents, type AccountFlow, type LotMethod } from "./book";
import { valueBook, valueUnits, type Valuation, type ValuationIssue, type MissingPricePolicy } from "./valuation";
import { annualize, timeWeightedReturn, xirr, type DatedAmount, type ValuationPoint } from "./returns";

export interface PerformanceInput {
  events: LedgerEvent[];
  instruments: Map<string, InstrumentInfo>;
  prices: PriceProvider;
  fx: FxProvider;
  baseCurrency: CurrencyCode;
  /** Accounts in the analysis. Transfers inside the scope are internal. */
  scope: Set<string>;
  start: ISODate;
  end: ISODate;
  lotMethod?: LotMethod;
  missingPricePolicy?: MissingPricePolicy;
  /** Extra valuation dates (month ends, flow dates, start and end are always included). */
  extraDates?: ISODate[];
}

export interface SeriesPoint {
  date: ISODate;
  value: Decimal;
  flow: Decimal;
  cumulativeFlows: Decimal;
  complete: boolean;
}

export interface PerformanceResult {
  baseCurrency: CurrencyCode;
  start: ISODate;
  end: ISODate;
  days: number;
  series: SeriesPoint[];
  startValue: Decimal;
  endValue: Decimal;
  /** Contributions minus withdrawals across the scope boundary during (start, end]. */
  netContributions: Decimal;
  contributions: Decimal;
  withdrawals: Decimal;
  /** endValue − startValue − netContributions. */
  investmentGain: Decimal;
  /** Investment gain if all FX rates had stayed at their start-date levels; null if unavailable. */
  investmentGainConstantFx: Decimal | null;
  /** investmentGain − investmentGainConstantFx: the part of the gain caused by currency moves. */
  fxEffect: Decimal | null;
  incomeGross: Decimal;
  withholdingTax: Decimal;
  fees: Decimal;
  realizedGain: Decimal;
  twr: Decimal | null;
  twrAnnualized: Decimal | null;
  xirr: number | null;
  /** True only if every valuation and flow in the period could be valued in the base currency. */
  complete: boolean;
  issues: ValuationIssue[];
  endValuation: Valuation;
}

/** FX provider that always answers with rates as of a fixed date (explicit counterfactual analysis only). */
class FixedDateFx implements FxProvider {
  constructor(
    private readonly inner: FxProvider,
    private readonly asOf: ISODate,
  ) {}
  quote(from: CurrencyCode, to: CurrencyCode): FxQuote {
    return this.inner.quote(from, to, this.asOf);
  }
}

function flowValue(flow: AccountFlow, date: ISODate, input: PerformanceInput, fx: FxProvider, issues: ValuationIssue[]): Decimal | null {
  const sign = flow.direction;
  let local: Decimal | null;
  if (flow.kind === "cash") local = flow.amount!;
  else {
    const ctx = { date, baseCurrency: input.baseCurrency, instruments: input.instruments, prices: input.prices, fx, missingPricePolicy: input.missingPricePolicy ?? "cost" };
    const lot = { lotId: "flow", accountId: flow.accountId, instrumentId: flow.instrumentId!, acquiredOn: date, quantity: flow.quantity!, cost: flow.cost ?? ZERO, currency: flow.currency, costBase: null, sourceEventId: flow.eventId };
    local = valueUnits(ctx, flow.instrumentId!, flow.quantity!, [lot], flow.cost ?? ZERO, issues, { accountId: flow.accountId }).value;
  }
  if (local === null) return null;
  try {
    return local.times(fx.quote(flow.currency, input.baseCurrency, date).rate).times(sign);
  } catch (err) {
    if (err instanceof MissingFxRateError) {
      issues.push({ code: "MISSING_FX", currency: flow.currency, accountId: flow.accountId, message: `Cannot value flow on ${date}: ${err.message}` });
      return null;
    }
    throw err;
  }
}

interface SeriesBuild {
  points: SeriesPoint[];
  complete: boolean;
  contributions: Decimal;
  withdrawals: Decimal;
  endValuation: Valuation;
  book: PortfolioBook;
}

function buildSeries(input: PerformanceInput, fx: FxProvider, dates: ISODate[], issues: ValuationIssue[]): SeriesBuild {
  const events = sortEvents(effectiveEvents(input.events));
  const book = new PortfolioBook({ baseCurrency: input.baseCurrency, instruments: input.instruments, fx, lotMethod: input.lotMethod ?? "FIFO" });
  let idx = 0;
  const points: SeriesPoint[] = [];
  let cumulative = ZERO;
  let contributions = ZERO;
  let withdrawals = ZERO;
  let complete = true;
  let flowCursor = 0;
  let endValuation: Valuation | null = null;
  for (const date of dates) {
    while (idx < events.length && events[idx]!.date <= date) book.apply(events[idx++]!);
    // Flows recorded by the book since the previous point that cross the scope boundary.
    const newFlows = book.flows.slice(flowCursor);
    flowCursor = book.flows.length;
    let flowTotal = ZERO;
    for (const f of flowsForScope(newFlows, input.scope)) {
      if (date === dates[0]) continue; // flows on or before the start are part of the starting value
      const v = flowValue(f, f.date, input, fx, issues);
      if (v === null) {
        complete = false;
        continue;
      }
      flowTotal = flowTotal.plus(v);
      if (v.isPositive()) contributions = contributions.plus(v);
      else withdrawals = withdrawals.plus(v.negated());
    }
    cumulative = cumulative.plus(flowTotal);
    const valuation = valueBook(book, { date, baseCurrency: input.baseCurrency, instruments: input.instruments, prices: input.prices, fx, missingPricePolicy: input.missingPricePolicy ?? "cost" }, input.scope);
    issues.push(...valuation.issues);
    if (!valuation.complete) complete = false;
    points.push({ date, value: valuation.totalBase, flow: flowTotal, cumulativeFlows: cumulative, complete: valuation.complete });
    endValuation = valuation;
  }
  return { points, complete, contributions, withdrawals, endValuation: endValuation!, book };
}

export function valuationDates(input: Pick<PerformanceInput, "events" | "start" | "end" | "extraDates">): ISODate[] {
  const set = new Set<ISODate>([input.start, input.end, ...monthEndsBetween(input.start, input.end), ...(input.extraDates ?? [])]);
  for (const e of input.events) if (e.date > input.start && e.date <= input.end) set.add(e.date);
  return [...set].filter((x) => x >= input.start && x <= input.end).sort();
}

export function analyzePerformance(input: PerformanceInput): PerformanceResult {
  if (input.end < input.start) throw new RangeError("end must not be before start");
  const dates = valuationDates(input);
  const issues: ValuationIssue[] = [];
  const main = buildSeries(input, input.fx, dates, issues);
  const first = main.points[0]!;
  const last = main.points[main.points.length - 1]!;
  const netContributions = main.contributions.minus(main.withdrawals);
  const investmentGain = last.value.minus(first.value).minus(netContributions);

  // Constant-FX counterfactual for currency attribution.
  let investmentGainConstantFx: Decimal | null = null;
  try {
    const cf = buildSeries(input, new FixedDateFx(input.fx, input.start), dates, []);
    if (cf.complete) {
      const f0 = cf.points[0]!;
      const fN = cf.points[cf.points.length - 1]!;
      investmentGainConstantFx = fN.value.minus(f0.value).minus(cf.contributions.minus(cf.withdrawals));
    }
  } catch {
    investmentGainConstantFx = null;
  }

  // Income, tax, fees and realised gains inside the period and scope, converted at event-date FX.
  const inPeriod = (date: ISODate) => date > input.start && date <= input.end;
  const toBase = (amount: Decimal, ccy: CurrencyCode, date: ISODate): Decimal | null => {
    try {
      return amount.times(input.fx.quote(ccy, input.baseCurrency, date).rate);
    } catch (err) {
      if (err instanceof MissingFxRateError) return null;
      throw err;
    }
  };
  let incomplete = !main.complete;
  const add = (acc: Decimal, v: Decimal | null) => {
    if (v === null) {
      incomplete = true;
      return acc;
    }
    return acc.plus(v);
  };
  let incomeGross = ZERO;
  let withholdingTax = ZERO;
  for (const r of main.book.income) if (input.scope.has(r.accountId) && inPeriod(r.date)) {
    incomeGross = add(incomeGross, toBase(r.gross, r.currency, r.date));
    withholdingTax = add(withholdingTax, toBase(r.tax, r.currency, r.date));
  }
  let fees = ZERO;
  for (const x of main.book.expenses) if (x.kind === "fee" && input.scope.has(x.accountId) && inPeriod(x.date)) fees = add(fees, toBase(x.amount, x.currency, x.date));
  let realizedGain = ZERO;
  for (const r of main.book.realized) if (input.scope.has(r.accountId) && inPeriod(r.date)) {
    if (r.gainBase === null) incomplete = true;
    else realizedGain = realizedGain.plus(r.gainBase);
  }

  const points: ValuationPoint[] = main.points.map((p) => ({ date: p.date, value: p.value, flow: p.flow }));
  const complete = !incomplete && main.complete;
  const { twr } = timeWeightedReturn(points);
  const days = daysBetween(input.start, input.end);

  const cashflows: DatedAmount[] = [];
  if (!first.value.isZero()) cashflows.push({ date: first.date, amount: first.value.negated() });
  for (const p of main.points.slice(1)) if (!p.flow.isZero()) cashflows.push({ date: p.date, amount: p.flow.negated() });
  cashflows.push({ date: last.date, amount: last.value });

  const hasCapital = main.points.some((p) => p.value.gt(0));
  return {
    baseCurrency: input.baseCurrency,
    start: input.start,
    end: input.end,
    days,
    series: main.points,
    startValue: first.value,
    endValue: last.value,
    netContributions,
    contributions: main.contributions,
    withdrawals: main.withdrawals,
    investmentGain,
    investmentGainConstantFx,
    fxEffect: investmentGainConstantFx === null ? null : investmentGain.minus(investmentGainConstantFx),
    incomeGross,
    withholdingTax,
    fees,
    realizedGain,
    twr: complete && hasCapital ? twr : null,
    twrAnnualized: complete && hasCapital ? annualize(twr, days) : null,
    xirr: complete ? xirr(cashflows) : null,
    complete,
    issues: uniqueIssues(issues),
    endValuation: main.endValuation,
  };
}

function uniqueIssues(issues: ValuationIssue[]): ValuationIssue[] {
  const seen = new Set<string>();
  return issues.filter((i) => {
    const k = `${i.code}|${i.accountId ?? ""}|${i.instrumentId ?? ""}|${i.currency ?? ""}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

export { sum, d };
