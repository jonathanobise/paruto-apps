/**
 * Calendar dates are ISO strings (YYYY-MM-DD) with no time zone. Financial events are
 * booked on a calendar date in the user's reporting time zone; the engine never mixes
 * timestamps and dates.
 */
export type ISODate = string;

const ISO_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const MS_PER_DAY = 86_400_000;

export function isISODate(value: string): value is ISODate {
  const m = ISO_RE.exec(value);
  if (!m) return false;
  const [, y, mo, da] = m;
  const t = Date.UTC(Number(y), Number(mo) - 1, Number(da));
  return new Date(t).toISOString().slice(0, 10) === value;
}

export function assertISODate(value: string): ISODate {
  if (!isISODate(value)) throw new RangeError(`Invalid ISO date: ${value}`);
  return value;
}

function toUTC(date: ISODate): number {
  assertISODate(date);
  return Date.parse(`${date}T00:00:00Z`);
}

export function fromUTC(ms: number): ISODate {
  return new Date(ms).toISOString().slice(0, 10);
}

/** Actual calendar days from a to b (b − a). */
export function daysBetween(a: ISODate, b: ISODate): number {
  return Math.round((toUTC(b) - toUTC(a)) / MS_PER_DAY);
}

export function addDays(date: ISODate, days: number): ISODate {
  return fromUTC(toUTC(date) + days * MS_PER_DAY);
}

/** Add calendar months, clamping to the month end (e.g. 31 Jan + 1M = 28/29 Feb). */
export function addMonths(date: ISODate, months: number): ISODate {
  const [y, m, dd] = date.split("-").map(Number) as [number, number, number];
  const total = (y * 12 + (m - 1)) + months;
  const ny = Math.floor(total / 12);
  const nm = total - ny * 12;
  const lastDay = new Date(Date.UTC(ny, nm + 1, 0)).getUTCDate();
  return fromUTC(Date.UTC(ny, nm, Math.min(dd, lastDay)));
}

export function compareDates(a: ISODate, b: ISODate): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

export function minDate(a: ISODate, b: ISODate): ISODate {
  return a <= b ? a : b;
}

export function maxDate(a: ISODate, b: ISODate): ISODate {
  return a >= b ? a : b;
}

export function monthEnd(date: ISODate): ISODate {
  const [y, m] = date.split("-").map(Number) as [number, number];
  return fromUTC(Date.UTC(y, m, 0));
}

/** Inclusive list of month-end dates between two dates, plus the end date itself if it is not a month end. */
export function monthEndsBetween(start: ISODate, end: ISODate): ISODate[] {
  const out: ISODate[] = [];
  let cursor = monthEnd(start);
  while (cursor <= end) {
    if (cursor >= start) out.push(cursor);
    cursor = monthEnd(addDays(cursor, 1));
  }
  if (out[out.length - 1] !== end) out.push(end);
  return out;
}

export type DayCountConvention = "ACT/365" | "ACT/364" | "ACT/360" | "ACT/ACT";

export function yearFraction(a: ISODate, b: ISODate, convention: DayCountConvention): number {
  const days = daysBetween(a, b);
  switch (convention) {
    case "ACT/365":
      return days / 365;
    case "ACT/364":
      return days / 364;
    case "ACT/360":
      return days / 360;
    case "ACT/ACT": {
      // Simple ACT/ACT ISDA approximation by splitting at year boundaries.
      let frac = 0;
      let cursor = a;
      while (cursor < b) {
        const y = Number(cursor.slice(0, 4));
        const yearEnd = `${y + 1}-01-01`;
        const segEnd = yearEnd < b ? yearEnd : b;
        const daysInYear = (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0 ? 366 : 365;
        frac += daysBetween(cursor, segEnd) / daysInYear;
        cursor = segEnd;
      }
      return frac;
    }
  }
}
