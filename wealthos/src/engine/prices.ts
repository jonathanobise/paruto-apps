import { Decimal, d } from "./decimal";
import { daysBetween, type ISODate } from "./dates";
import type { CurrencyCode } from "./currency";

export interface PriceObservation {
  instrumentId: string;
  price: Decimal;
  currency: CurrencyCode;
  observedOn: ISODate;
  sourceId?: string;
  synthetic?: boolean;
}

export type PriceStatus = "fresh" | "stale" | "missing";

export interface PriceQuote {
  price: Decimal;
  currency: CurrencyCode;
  observedOn: ISODate;
  ageDays: number;
  status: Exclude<PriceStatus, "missing">;
  sourceId?: string;
  synthetic: boolean;
}

export interface PriceProvider {
  /** Latest price on or before `date`, or undefined. Never returns a price observed after `date`. */
  quote(instrumentId: string, date: ISODate, staleAfterDays: number): PriceQuote | undefined;
}

export class PriceTable implements PriceProvider {
  private readonly series = new Map<string, PriceObservation[]>();

  constructor(observations: PriceObservation[]) {
    for (const o of observations) {
      if (d(o.price).lt(0)) throw new RangeError(`Negative price for ${o.instrumentId} on ${o.observedOn}`);
      const list = this.series.get(o.instrumentId) ?? [];
      list.push({ ...o, price: d(o.price) });
      this.series.set(o.instrumentId, list);
    }
    for (const list of this.series.values()) list.sort((a, b) => (a.observedOn < b.observedOn ? -1 : 1));
  }

  quote(instrumentId: string, date: ISODate, staleAfterDays: number): PriceQuote | undefined {
    const list = this.series.get(instrumentId);
    if (!list) return undefined;
    let lo = 0;
    let hi = list.length - 1;
    let found: PriceObservation | undefined;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      const obs = list[mid]!;
      if (obs.observedOn <= date) {
        found = obs;
        lo = mid + 1;
      } else hi = mid - 1;
    }
    if (!found) return undefined;
    const ageDays = daysBetween(found.observedOn, date);
    return {
      price: found.price,
      currency: found.currency,
      observedOn: found.observedOn,
      ageDays,
      status: ageDays > staleAfterDays ? "stale" : "fresh",
      ...(found.sourceId ? { sourceId: found.sourceId } : {}),
      synthetic: Boolean(found.synthetic),
    };
  }

  /** All observation dates for an instrument (used to build valuation calendars). */
  datesFor(instrumentId: string): ISODate[] {
    return (this.series.get(instrumentId) ?? []).map((o) => o.observedOn);
  }
}
