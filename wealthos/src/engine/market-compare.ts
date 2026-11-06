import { d, type Decimal } from "./decimal";
import { annualizedVolatility, maxDrawdown } from "./risk";
import { annualizeOverYears, monthlyReturns, type ObservedValue } from "./market-performance";

/**
 * Side-by-side comparison of several month-end value series over the period they all cover.
 * Each series is rebased to 100 at the common start month; nothing is filled in: a month missing
 * from any series is left out of the common grid for all of them.
 */
export interface CommonWindowStats {
  cumulative: Decimal;
  annualized: Decimal;
  volatility: Decimal | null;
  maxDrawdown: Decimal;
}

export interface CommonWindow {
  startMonth: string;
  endMonth: string;
  years: number;
  /** Months present in every series, ascending. */
  months: string[];
  /** Rebased values (start = 100) per series, aligned with `months`. */
  rebased: Decimal[][];
  stats: CommonWindowStats[];
}

/** `series[i]` maps month (YYYY-MM) → month-end point. Needs at least 13 shared months (one year). */
export function commonWindow(series: Array<Map<string, ObservedValue>>): CommonWindow | null {
  if (series.length < 2) return null;
  const first = series.map((s) => [...s.keys()].sort()[0]);
  const last = series.map((s) => [...s.keys()].sort().at(-1));
  if (first.some((x) => !x) || last.some((x) => !x)) return null;
  const startMonth = (first as string[]).reduce((a, b) => (a > b ? a : b));
  const endMonth = (last as string[]).reduce((a, b) => (a < b ? a : b));
  if (startMonth >= endMonth) return null;
  const months = [...series[0]!.keys()].filter((k) => k >= startMonth && k <= endMonth && series.every((s) => s.has(k))).sort();
  // If the start or end month is missing from one series, the window shrinks to the shared months.
  if (months.length < 13) return null;
  const s0 = months[0]!;
  const e0 = months.at(-1)!;
  const years = (Date.parse(series[0]!.get(e0)!.date) - Date.parse(series[0]!.get(s0)!.date)) / (365.25 * 86400000);
  const rebased = series.map((s) => {
    const base = s.get(s0)!.value;
    return months.map((m) => s.get(m)!.value.div(base).times(100));
  });
  const stats = series.map((s, i) => {
    const values = rebased[i]!;
    const cumulative = values.at(-1)!.div(100).minus(1);
    const window = new Map(months.map((m) => [m, s.get(m)!]));
    const mr = monthlyReturns(window).map((x) => x.value);
    return {
      cumulative,
      annualized: annualizeOverYears(cumulative, years),
      volatility: mr.length >= 12 ? annualizedVolatility(mr, 12) : null,
      maxDrawdown: maxDrawdown(values).maxDrawdown,
    };
  });
  return { startMonth: s0, endMonth: e0, years: Math.round(years * 10) / 10, months, rebased, stats };
}

/** Parses a percentage typed by a person ("12.5" → 0.125). Returns null for blank or invalid input. */
export function parsePercentInput(raw: string | null | undefined): Decimal | null {
  const t = (raw ?? "").trim().replace(/%$/, "").replace(/−/g, "-");
  if (!/^-?\d{1,4}(\.\d{1,4})?$/.test(t)) return null;
  return d(t).div(100);
}
