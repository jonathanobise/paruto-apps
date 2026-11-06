import { d, type Decimal } from "./decimal";
import { annualizedVolatility, maxDrawdown } from "./risk";
import { annualizeOverYears } from "./market-performance";
import { xirr } from "./returns";

/**
 * Hypothetical portfolio backtest on month-end total-return levels (all in one currency).
 *
 * - Starts with `initial` split by target weights at the first month end.
 * - Each later month end: every holding grows by its own level ratio; then the monthly
 *   contribution is invested by target weights; then, if due, the whole portfolio is
 *   rebalanced to target weights. No costs, taxes or spreads are modelled.
 * - The time-weighted index measures the mix's return independently of contributions; the
 *   money-weighted return (XIRR) is the investor's return on the actual cash flows.
 * Only months present for every asset are used: a missing month is skipped, never filled.
 */
export type Rebalance = "none" | "monthly" | "quarterly" | "annually";
export const REBALANCE_LABELS: Record<Rebalance, string> = { none: "Never (let it drift)", annually: "Every year", quarterly: "Every quarter", monthly: "Every month" };

export interface BacktestInput {
  /** Ascending YYYY-MM keys shared by every asset. */
  months: string[];
  /** levels[asset][i] is the total-return level at months[i]. */
  levels: Decimal[][];
  /** Target weights, summing to 1. */
  weights: Decimal[];
  initial: Decimal;
  /** Invested at each month end after the first (zero for none). */
  contribution: Decimal;
  rebalance: Rebalance;
}

export interface BacktestPoint {
  month: string;
  value: Decimal;
  invested: Decimal;
  /** Time-weighted index, 100 at the start. */
  index: Decimal;
}

export interface BacktestResult {
  points: BacktestPoint[];
  finalValue: Decimal;
  totalInvested: Decimal;
  years: number;
  twrCumulative: Decimal;
  twrAnnualized: Decimal;
  /** Money-weighted (XIRR) annual return; a number because it is solved numerically. */
  moneyWeighted: number | null;
  volatility: Decimal | null;
  maxDrawdown: Decimal;
  drawdownPeak: string | null;
  drawdownTrough: string | null;
  /** Holding weights at the end (drift from target when not rebalanced). */
  endWeights: Decimal[];
  calendar: Array<{ year: number; value: Decimal; partial: boolean }>;
  /** Months between start and end that were missing for at least one asset. */
  skippedMonths: number;
  rebalances: number;
}

export function monthEndDate(month: string): string {
  const [y, m] = month.split("-").map(Number) as [number, number];
  return new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
}

function monthIndex(month: string): number {
  const [y, m] = month.split("-").map(Number) as [number, number];
  return y * 12 + (m - 1);
}

export function runBacktest(input: BacktestInput): BacktestResult {
  const { months, levels, weights, initial, contribution, rebalance } = input;
  const n = weights.length;
  if (n === 0 || levels.length !== n) throw new RangeError("one level series per weight");
  if (months.length < 2) throw new RangeError("need at least two months");
  if (levels.some((l) => l.length !== months.length || l.some((v) => v.lte(0)))) throw new RangeError("levels must be positive and aligned with months");
  if (!weights.reduce((a, w) => a.plus(w), d(0)).minus(1).abs().lte("0.0001")) throw new RangeError("weights must sum to 1");
  if (initial.lt(0) || contribution.lt(0) || (initial.isZero() && contribution.isZero())) throw new RangeError("invest something");

  const startIdx = monthIndex(months[0]!);
  let holdings = weights.map((w) => initial.times(w));
  let invested = initial;
  let index = d(100);
  let rebalances = 0;
  const points: BacktestPoint[] = [{ month: months[0]!, value: initial, invested, index }];
  const twr: Decimal[] = [];
  const flows = [{ date: monthEndDate(months[0]!), amount: initial.negated() }];
  let skipped = 0;

  for (let i = 1; i < months.length; i++) {
    skipped += monthIndex(months[i]!) - monthIndex(months[i - 1]!) - 1;
    const before = holdings.reduce((a, h) => a.plus(h), d(0));
    holdings = holdings.map((h, a) => h.times(levels[a]![i]!.div(levels[a]![i - 1]!)));
    const grown = holdings.reduce((a, h) => a.plus(h), d(0));
    if (before.gt(0)) {
      const r = grown.div(before).minus(1);
      twr.push(r);
      index = index.times(r.plus(1));
    }
    if (contribution.gt(0)) {
      holdings = holdings.map((h, a) => h.plus(contribution.times(weights[a]!)));
      invested = invested.plus(contribution);
      flows.push({ date: monthEndDate(months[i]!), amount: contribution.negated() });
    }
    const elapsed = monthIndex(months[i]!) - startIdx;
    const due = rebalance === "monthly" || (rebalance === "quarterly" && elapsed % 3 === 0) || (rebalance === "annually" && elapsed % 12 === 0);
    if (due && i < months.length - 1) {
      const total = holdings.reduce((a, h) => a.plus(h), d(0));
      holdings = weights.map((w) => total.times(w));
      rebalances++;
    }
    points.push({ month: months[i]!, value: holdings.reduce((a, h) => a.plus(h), d(0)), invested, index });
  }

  const last = points.at(-1)!;
  const years = (monthIndex(last.month) - startIdx) / 12;
  const twrCumulative = last.index.div(100).minus(1);
  const dd = maxDrawdown(points.map((p) => p.index));
  const hasDd = dd.maxDrawdown.isNegative();
  flows.push({ date: monthEndDate(last.month), amount: last.value });

  // Calendar years from the time-weighted index, year end to year end. A year is partial unless it
  // runs from one December to the next (the first and last years usually are).
  const calendar: BacktestResult["calendar"] = [];
  const yearEnd = new Map<number, BacktestPoint>();
  for (const p of points.slice(1)) yearEnd.set(Number(p.month.slice(0, 4)), p);
  let prev = points[0]!;
  for (const [year, p] of [...yearEnd].sort(([a], [b]) => a - b)) {
    calendar.push({ year, value: p.index.div(prev.index).minus(1), partial: !(prev.month === `${year - 1}-12` && p.month === `${year}-12`) });
    prev = p;
  }

  const total = last.value;
  return {
    points,
    finalValue: last.value,
    totalInvested: last.invested,
    years,
    twrCumulative,
    twrAnnualized: years > 0 ? annualizeOverYears(twrCumulative, years) : twrCumulative,
    moneyWeighted: years >= 1 ? xirr(flows) : null,
    volatility: twr.length >= 12 ? annualizedVolatility(twr, 12) : null,
    maxDrawdown: dd.maxDrawdown,
    drawdownPeak: hasDd ? points[dd.peakIndex]!.month : null,
    drawdownTrough: hasDd ? points[dd.troughIndex]!.month : null,
    endWeights: total.gt(0) ? holdings.map((h) => h.div(total)) : weights,
    calendar,
    skippedMonths: skipped,
    rebalances,
  };
}
