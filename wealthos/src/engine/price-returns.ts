/**
 * Trailing price returns from a price/NAV series, over identical calendar windows ending on a
 * common as-of date (so different instruments are compared over the same period).
 *
 * These are PRICE returns: distributions are excluded unless the series is a total-return index
 * or an accumulating NAV. A window's return is null when no observation exists within
 * `maxGapDays` before either end of the window — never interpolated or taken from another date.
 */
import { Decimal } from "./decimal";
import { addDays, addMonths, daysBetween, type ISODate } from "./dates";
import { annualize } from "./returns";

export const TRAILING_WINDOWS = [
  { key: "1M", months: 1 },
  { key: "3M", months: 3 },
  { key: "6M", months: 6 },
  { key: "1Y", months: 12 },
  { key: "3Y", months: 36 },
  { key: "5Y", months: 60 },
] as const;
export type TrailingKey = (typeof TRAILING_WINDOWS)[number]["key"];

export interface PricePoint {
  date: ISODate;
  price: Decimal;
}

export interface TrailingReturn {
  key: TrailingKey;
  start: ISODate;
  end: ISODate;
  startPrice: Decimal | null;
  endPrice: Decimal | null;
  /** Cumulative price return over the window. */
  cumulative: Decimal | null;
  /** Annualised for windows of a year or more. */
  annualized: Decimal | null;
}

function lastOnOrBefore(series: PricePoint[], date: ISODate, maxGapDays: number): PricePoint | null {
  let hit: PricePoint | null = null;
  for (const p of series) {
    if (p.date <= date) hit = p;
    else break;
  }
  return hit && daysBetween(hit.date, date) <= maxGapDays ? hit : null;
}

export function trailingReturns(series: PricePoint[], asOf: ISODate, maxGapDays = 7): TrailingReturn[] {
  const sorted = [...series].sort((a, b) => (a.date < b.date ? -1 : 1));
  const endPoint = lastOnOrBefore(sorted, asOf, maxGapDays);
  return TRAILING_WINDOWS.map(({ key, months }) => {
    const start = addMonths(asOf, -months);
    const startPoint = lastOnOrBefore(sorted, start, maxGapDays);
    const ok = startPoint && endPoint && startPoint.price.gt(0);
    const cumulative = ok ? endPoint!.price.div(startPoint!.price).minus(1) : null;
    return {
      key,
      start,
      end: asOf,
      startPrice: startPoint?.price ?? null,
      endPrice: endPoint?.price ?? null,
      cumulative,
      annualized: cumulative && months >= 12 ? annualize(cumulative, daysBetween(start, asOf)) : null,
    };
  });
}

/** Down-sample a series for charts: last observation per calendar week (keeps the final point). */
export function weeklySeries(series: PricePoint[]): PricePoint[] {
  const out = new Map<string, PricePoint>();
  for (const p of [...series].sort((a, b) => (a.date < b.date ? -1 : 1))) {
    const d = new Date(`${p.date}T00:00:00Z`);
    const monday = addDays(p.date, -((d.getUTCDay() + 6) % 7));
    out.set(monday, p);
  }
  return [...out.values()];
}
