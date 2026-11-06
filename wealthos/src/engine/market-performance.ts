/**
 * Long-run performance of a market instrument, for research (not a user's own holdings).
 *
 * Pipeline: price/NAV observations + corporate actions → total-return index (dividends reinvested
 * on the ex-date, splits applied) → optional conversion into another currency using FX observed on
 * the SAME date → month-end points → calendar-year returns, trailing annualised returns, volatility,
 * drawdown, optional inflation adjustment.
 *
 * Rules (docs/FINANCIAL_ENGINE.md):
 * - Nothing is interpolated or borrowed from another date. A converted point exists only where the
 *   price and the FX rate were both observed that day. A month-end point exists only when the last
 *   observation of the month falls within `maxGapDays` of the month end; a return needing a missing
 *   point is null, never estimated.
 * - Price-only series (no distributions recorded) are labelled as such by the caller; the index is
 *   then a price index, not a total return.
 * - Everything is Decimal; results are deterministic for the same inputs.
 */
import { Decimal, ONE, ZERO, d } from "./decimal";
import { daysBetween, monthEnd, type ISODate } from "./dates";
import { annualizedVolatility, maxDrawdown } from "./risk";

export interface ObservedValue {
  date: ISODate;
  value: Decimal;
}

export type CorporateActionKind = "cash_dividend" | "split";

export interface CorporateActionInput {
  kind: CorporateActionKind;
  exDate: ISODate;
  /** Cash dividend per share, in the instrument's price currency. */
  amount?: Decimal;
  /** Split/bonus ratio: shares held after per share held before (2 for a 2-for-1 split). */
  ratio?: Decimal;
}

export interface TotalReturnResult {
  points: ObservedValue[];
  dividendsApplied: number;
  splitsApplied: number;
  /** Actions that could not be applied (e.g. ex-date before the first price), for disclosure. */
  ignored: number;
}

/**
 * Index (base 100 at the first observation) of holding one share with dividends reinvested at the
 * ex-date close. A step from date a to date b applies every action with a < exDate ≤ b:
 * factor = ratio × (P_b + dividend) / P_a.
 */
export function totalReturnIndex(prices: ObservedValue[], actions: CorporateActionInput[], base: Decimal = d(100)): TotalReturnResult {
  const sorted = [...prices].filter((p) => p.value.gt(0)).sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  const acts = [...actions].sort((a, b) => (a.exDate < b.exDate ? -1 : 1));
  const points: ObservedValue[] = [];
  let dividendsApplied = 0;
  let splitsApplied = 0;
  let ignored = 0;
  let ai = 0;
  while (ai < acts.length && sorted[0] && acts[ai]!.exDate <= sorted[0].date) {
    ignored++;
    ai++;
  }
  let level = base;
  for (let i = 0; i < sorted.length; i++) {
    const p = sorted[i]!;
    if (i === 0) {
      points.push({ date: p.date, value: level });
      continue;
    }
    const prev = sorted[i - 1]!;
    let ratio = ONE;
    let dividend = ZERO;
    while (ai < acts.length && acts[ai]!.exDate <= p.date) {
      const a = acts[ai]!;
      if (a.kind === "split" && a.ratio && a.ratio.gt(0)) {
        ratio = ratio.times(a.ratio);
        splitsApplied++;
      } else if (a.kind === "cash_dividend" && a.amount && a.amount.gt(0)) {
        dividend = dividend.plus(a.amount);
        dividendsApplied++;
      } else ignored++;
      ai++;
    }
    level = level.times(ratio.times(p.value.plus(dividend)).div(prev.value));
    points.push({ date: p.date, value: level });
  }
  ignored += acts.length - ai;
  return { points, dividendsApplied, splitsApplied, ignored };
}

/**
 * Re-express a series in another currency: value × rate, where `rates` gives units of the target
 * currency per unit of the series currency, observed on the same date. Dates without an FX
 * observation are dropped (counted), never filled from another day.
 */
export function convertSeries(series: ObservedValue[], rates: ObservedValue[]): { points: ObservedValue[]; dropped: number } {
  const byDate = new Map(rates.map((r) => [r.date, r.value]));
  const points: ObservedValue[] = [];
  let dropped = 0;
  for (const p of series) {
    const r = byDate.get(p.date);
    if (r && r.gt(0)) points.push({ date: p.date, value: p.value.times(r) });
    else dropped++;
  }
  return { points, dropped };
}

/** "YYYY-MM" of a date. */
export function monthKey(date: ISODate): string {
  return date.slice(0, 7);
}

function shiftMonth(key: string, delta: number): string {
  const [y, m] = key.split("-").map(Number) as [number, number];
  const idx = y * 12 + (m - 1) + delta;
  return `${Math.floor(idx / 12)}-${String((idx % 12) + 1).padStart(2, "0")}`;
}

/**
 * The last observation of each month, kept only if it falls within `maxGapDays` of the month end
 * (so a fund that stopped reporting mid-month has no month-end value for that month).
 * The latest month is kept as-is if `asOf` (the series' own last date) is inside it.
 */
export function monthEndPoints(series: ObservedValue[], maxGapDays = 7): Map<string, ObservedValue> {
  const last = new Map<string, ObservedValue>();
  for (const p of series) {
    const k = monthKey(p.date);
    const cur = last.get(k);
    if (!cur || p.date > cur.date) last.set(k, p);
  }
  const lastDate = series.reduce<ISODate | null>((m, p) => (m === null || p.date > m ? p.date : m), null);
  const out = new Map<string, ObservedValue>();
  for (const [k, p] of [...last.entries()].sort(([a], [b]) => (a < b ? -1 : 1))) {
    const isCurrentMonth = lastDate !== null && monthKey(lastDate) === k && p.date === lastDate;
    if (isCurrentMonth || daysBetween(p.date, monthEnd(p.date)) <= maxGapDays) out.set(k, p);
  }
  return out;
}

/** Deflate month-end values by a monthly price index (CPI): real = nominal × CPI_base / CPI_month. */
export function deflate(months: Map<string, ObservedValue>, cpi: Map<string, Decimal>): Map<string, ObservedValue> {
  const out = new Map<string, ObservedValue>();
  const keys = [...months.keys()].filter((k) => cpi.has(k));
  if (keys.length === 0) return out;
  const baseCpi = cpi.get(keys[0]!)!;
  for (const k of keys) {
    const c = cpi.get(k)!;
    if (c.lte(0)) continue;
    const p = months.get(k)!;
    out.set(k, { date: p.date, value: p.value.times(baseCpi).div(c) });
  }
  return out;
}

export interface CalendarYearReturn {
  year: number;
  /** Return from the previous December's month-end to this December's (or to the latest point for the current year). */
  value: Decimal | null;
  /** True for the current, incomplete year (year to date). */
  ytd: boolean;
}

export function calendarYearReturns(months: Map<string, ObservedValue>, fromYear: number, toYear: number): CalendarYearReturn[] {
  const keys = [...months.keys()].sort();
  const lastKey = keys[keys.length - 1];
  const out: CalendarYearReturn[] = [];
  for (let y = fromYear; y <= toYear; y++) {
    const start = months.get(`${y - 1}-12`);
    const decEnd = months.get(`${y}-12`);
    const ytd = !decEnd && lastKey !== undefined && lastKey.startsWith(`${y}-`);
    const end = decEnd ?? (ytd ? months.get(lastKey!) : undefined);
    out.push({ year: y, value: start && end && start.value.gt(0) ? end.value.div(start.value).minus(1) : null, ytd: Boolean(ytd) });
  }
  return out;
}

export const RESEARCH_WINDOWS = [
  { key: "1Y", months: 12 },
  { key: "3Y", months: 36 },
  { key: "5Y", months: 60 },
  { key: "10Y", months: 120 },
] as const;
export type ResearchWindow = (typeof RESEARCH_WINDOWS)[number]["key"];

export interface WindowReturn {
  key: ResearchWindow;
  startMonth: string;
  endMonth: string;
  cumulative: Decimal | null;
  /** Compound annual rate over the window (equals cumulative for 1Y). */
  annualized: Decimal | null;
}

/** (1 + c)^(1/years) − 1; −100% stays −100%. */
export function annualizeOverYears(cumulative: Decimal, years: number): Decimal {
  const base = cumulative.plus(1);
  if (base.lte(0)) return d(-1);
  return years === 1 ? cumulative : base.pow(d(1).div(years)).minus(1);
}

/** Trailing returns ending at the latest month-end point, over whole months. */
export function trailingWindowReturns(months: Map<string, ObservedValue>): WindowReturn[] {
  const keys = [...months.keys()].sort();
  const endMonth = keys[keys.length - 1];
  return RESEARCH_WINDOWS.map(({ key, months: n }) => {
    if (!endMonth) return { key, startMonth: "", endMonth: "", cumulative: null, annualized: null };
    const startMonth = shiftMonth(endMonth, -n);
    const s = months.get(startMonth);
    const e = months.get(endMonth)!;
    const cumulative = s && s.value.gt(0) ? e.value.div(s.value).minus(1) : null;
    return { key, startMonth, endMonth, cumulative, annualized: cumulative === null ? null : annualizeOverYears(cumulative, n / 12) };
  });
}

/** Month-on-month returns between consecutive months that both have points (gaps break the chain). */
export function monthlyReturns(months: Map<string, ObservedValue>): Array<{ month: string; value: Decimal }> {
  const keys = [...months.keys()].sort();
  const out: Array<{ month: string; value: Decimal }> = [];
  for (let i = 1; i < keys.length; i++) {
    if (shiftMonth(keys[i - 1]!, 1) !== keys[i]) continue;
    const a = months.get(keys[i - 1]!)!.value;
    const b = months.get(keys[i]!)!.value;
    if (a.gt(0)) out.push({ month: keys[i]!, value: b.div(a).minus(1) });
  }
  return out;
}

export interface RiskSummary {
  /** Annualised standard deviation of monthly returns over the last 36 months (needs 24+). */
  volatility3y: Decimal | null;
  /** Worst peak-to-trough fall over the whole series (negative fraction), with dates. */
  maxDrawdown: Decimal | null;
  drawdownPeak: ISODate | null;
  drawdownTrough: ISODate | null;
  drawdownRecovered: ISODate | null;
  /** Share of months with a positive return. */
  positiveMonths: Decimal | null;
  monthsCounted: number;
}

export function riskSummary(series: ObservedValue[], months: Map<string, ObservedValue>): RiskSummary {
  const mr = monthlyReturns(months);
  const last36 = mr.slice(-36).map((m) => m.value);
  const vol = last36.length >= 24 ? annualizedVolatility(last36, 12) : null;
  const dd = series.length >= 2 ? maxDrawdown(series.map((p) => p.value)) : null;
  const hasDd = dd && dd.maxDrawdown.isNegative();
  return {
    volatility3y: vol,
    maxDrawdown: dd ? dd.maxDrawdown : null,
    drawdownPeak: hasDd ? series[dd.peakIndex]!.date : null,
    drawdownTrough: hasDd ? series[dd.troughIndex]!.date : null,
    drawdownRecovered: hasDd && dd.recoveryIndex !== null ? series[dd.recoveryIndex]!.date : null,
    positiveMonths: mr.length ? d(mr.filter((m) => m.value.gt(0)).length).div(mr.length) : null,
    monthsCounted: mr.length,
  };
}

/** Growth of `amount` invested at `fromMonth`'s month-end, at each later month-end point. */
export function growthOf(months: Map<string, ObservedValue>, fromMonth: string, amount: Decimal): Array<{ month: string; date: ISODate; value: Decimal }> {
  const start = months.get(fromMonth);
  if (!start || start.value.lte(0)) return [];
  return [...months.entries()]
    .filter(([k]) => k >= fromMonth)
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([month, p]) => ({ month, date: p.date, value: p.value.div(start.value).times(amount) }));
}

/** Year-on-year change of a monthly index (e.g. CPI inflation), where both months exist. */
export function yearOnYear(index: Map<string, Decimal>): Array<{ month: string; value: Decimal }> {
  return [...index.keys()]
    .sort()
    .flatMap((k) => {
      const prev = index.get(shiftMonth(k, -12));
      const cur = index.get(k)!;
      return prev && prev.gt(0) ? [{ month: k, value: cur.div(prev).minus(1) }] : [];
    });
}

export { shiftMonth };

export interface BillAuction {
  date: ISODate;
  /** Stop rate on a discount basis (fraction). */
  discountRate: Decimal;
  tenorDays: number;
  maturity: ISODate;
}

/**
 * Total-return index of rolling Treasury bills bought at primary auction: buy at an auction, hold to
 * maturity, then buy again at the first auction on or after maturity (cash earns nothing while it
 * waits). Between purchase and maturity the bill is valued at amortised cost (its price accretes at
 * its own discount rate). Points at each purchase, each maturity and each month end.
 * Actual/365 discount basis (Nigerian Treasury bills).
 */
export function rolledBillIndex(auctions: BillAuction[], end: ISODate, base: Decimal = d(100), basisDays = 365): ObservedValue[] {
  const sorted = [...auctions].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  const out = new Map<ISODate, Decimal>();
  let value = base;
  let i = 0;
  let cursor = sorted[0]?.date;
  if (!cursor) return [];
  const priceAt = (a: BillAuction, on: ISODate) => {
    const remaining = Math.max(daysBetween(on, a.maturity), 0);
    return d(1).minus(a.discountRate.times(remaining).div(basisDays));
  };
  while (i < sorted.length && cursor <= end) {
    const a = sorted[i]!;
    const purchasePrice = priceAt(a, a.date);
    if (purchasePrice.lte(0)) {
      i++;
      continue;
    }
    const units = value.div(purchasePrice);
    out.set(a.date, value);
    // Month ends while holding, valued at amortised cost.
    for (let me = monthEnd(a.date); me < a.maturity && me <= end; me = monthEnd(addDaysLocal(me, 1))) {
      if (me > a.date) out.set(me, units.times(priceAt(a, me)));
    }
    if (a.maturity > end) break;
    value = units; // matured at face value 1 per unit
    out.set(a.maturity, value);
    cursor = a.maturity;
    // Cash waits (at zero) for the next auction on or after maturity; month ends in between keep the value.
    const nextIdx = sorted.findIndex((b, j) => j > i && b.date >= cursor!);
    for (let me = monthEnd(cursor); nextIdx !== -1 ? me < sorted[nextIdx]!.date : me <= end; me = monthEnd(addDaysLocal(me, 1))) {
      if (me > cursor && me <= end) out.set(me, value);
      if (me > end) break;
    }
    if (nextIdx === -1) break;
    i = nextIdx;
  }
  return [...out.entries()].sort(([a], [b]) => (a < b ? -1 : 1)).map(([date, v]) => ({ date, value: v }));
}

function addDaysLocal(date: ISODate, days: number): ISODate {
  const t = Date.parse(`${date}T00:00:00Z`) + days * 86400000;
  return new Date(t).toISOString().slice(0, 10);
}

/**
 * Cumulative inflation over whole years ending at `endMonth`, from a year-on-year series (as the CBN
 * publishes): ∏(1 + yoy) at endMonth, endMonth − 12, … Exact, because consecutive 12-month changes
 * chain. Null if any needed month is missing.
 */
export function inflationFromYoY(yoy: Map<string, Decimal>, endMonth: string, years: number): Decimal | null {
  let factor = d(1);
  for (let k = 0; k < years; k++) {
    const v = yoy.get(shiftMonth(endMonth, -12 * k));
    if (!v) return null;
    factor = factor.times(v.plus(1));
  }
  return factor.minus(1);
}

/** Cumulative inflation between two months from a price index level series. */
export function inflationFromIndex(index: Map<string, Decimal>, startMonth: string, endMonth: string): Decimal | null {
  const a = index.get(startMonth);
  const b = index.get(endMonth);
  return a && b && a.gt(0) ? b.div(a).minus(1) : null;
}
