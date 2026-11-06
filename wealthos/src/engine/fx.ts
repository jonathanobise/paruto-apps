import { Decimal, ONE, d } from "./decimal";
import { daysBetween, type ISODate } from "./dates";
import type { CurrencyCode } from "./currency";

/**
 * FX policy (see docs/FINANCIAL_ENGINE.md):
 * - A rate is looked up for a specific valuation date.
 * - The latest observation ON OR BEFORE that date is used, provided it is no older than
 *   `maxAgeDays` (weekends and holidays). A later observation is never used for an earlier date.
 * - Today's (or any other) rate is never substituted for a missing historical rate:
 *   if nothing qualifies, MissingFxRateError is raised and the caller must flag the value.
 * - Inverse pairs are used when only the opposite quote exists. Triangulation through a
 *   pivot currency (USD) is allowed and reported in the result.
 */
export interface FxObservation {
  base: CurrencyCode;
  quote: CurrencyCode;
  /** Units of `quote` per 1 unit of `base`. */
  rate: Decimal;
  observedOn: ISODate;
  sourceId?: string;
  synthetic?: boolean;
}

export interface FxQuote {
  rate: Decimal;
  observedOn: ISODate;
  ageDays: number;
  method: "identity" | "direct" | "inverse" | "triangulated";
  sources: string[];
  synthetic: boolean;
}

export class MissingFxRateError extends Error {
  constructor(
    readonly from: CurrencyCode,
    readonly to: CurrencyCode,
    readonly date: ISODate,
  ) {
    super(`No FX rate ${from}->${to} on or within the allowed window before ${date}`);
    this.name = "MissingFxRateError";
  }
}

export interface FxProvider {
  /** Converts 1 unit of `from` into `to` at `date`. Throws MissingFxRateError. */
  quote(from: CurrencyCode, to: CurrencyCode, date: ISODate): FxQuote;
}

export interface FxTableOptions {
  maxAgeDays?: number;
  pivot?: CurrencyCode;
}

export class FxTable implements FxProvider {
  private readonly series = new Map<string, FxObservation[]>();
  private readonly maxAgeDays: number;
  private readonly pivot: CurrencyCode;

  constructor(observations: FxObservation[], options: FxTableOptions = {}) {
    this.maxAgeDays = options.maxAgeDays ?? 5;
    this.pivot = options.pivot ?? "USD";
    for (const o of observations) {
      if (d(o.rate).lte(0)) throw new RangeError(`FX rate must be positive: ${o.base}${o.quote} ${o.observedOn}`);
      const key = `${o.base}/${o.quote}`;
      const list = this.series.get(key) ?? [];
      list.push({ ...o, rate: d(o.rate) });
      this.series.set(key, list);
    }
    for (const list of this.series.values()) list.sort((a, b) => (a.observedOn < b.observedOn ? -1 : 1));
  }

  private latestOnOrBefore(base: CurrencyCode, quote: CurrencyCode, date: ISODate): FxObservation | undefined {
    const list = this.series.get(`${base}/${quote}`);
    if (!list) return undefined;
    let lo = 0;
    let hi = list.length - 1;
    let found: FxObservation | undefined;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      const obs = list[mid]!;
      if (obs.observedOn <= date) {
        found = obs;
        lo = mid + 1;
      } else hi = mid - 1;
    }
    if (!found || daysBetween(found.observedOn, date) > this.maxAgeDays) return undefined;
    return found;
  }

  private direct(from: CurrencyCode, to: CurrencyCode, date: ISODate): FxQuote | undefined {
    const direct = this.latestOnOrBefore(from, to, date);
    const inverse = this.latestOnOrBefore(to, from, date);
    // Prefer the most recent observation; ties prefer the direct quote.
    const pick =
      direct && (!inverse || direct.observedOn >= inverse.observedOn)
        ? { obs: direct, rate: direct.rate, method: "direct" as const }
        : inverse
          ? { obs: inverse, rate: ONE.div(inverse.rate), method: "inverse" as const }
          : undefined;
    if (!pick) return undefined;
    return {
      rate: pick.rate,
      observedOn: pick.obs.observedOn,
      ageDays: daysBetween(pick.obs.observedOn, date),
      method: pick.method,
      sources: pick.obs.sourceId ? [pick.obs.sourceId] : [],
      synthetic: Boolean(pick.obs.synthetic),
    };
  }

  quote(from: CurrencyCode, to: CurrencyCode, date: ISODate): FxQuote {
    if (from === to) {
      return { rate: ONE, observedOn: date, ageDays: 0, method: "identity", sources: [], synthetic: false };
    }
    const direct = this.direct(from, to, date);
    if (direct) return direct;
    if (from !== this.pivot && to !== this.pivot) {
      const a = this.direct(from, this.pivot, date);
      const b = this.direct(this.pivot, to, date);
      if (a && b) {
        return {
          rate: a.rate.times(b.rate),
          observedOn: a.observedOn < b.observedOn ? a.observedOn : b.observedOn,
          ageDays: Math.max(a.ageDays, b.ageDays),
          method: "triangulated",
          sources: [...a.sources, ...b.sources],
          synthetic: a.synthetic || b.synthetic,
        };
      }
    }
    throw new MissingFxRateError(from, to, date);
  }
}

export function convert(amount: Decimal, from: CurrencyCode, to: CurrencyCode, date: ISODate, fx: FxProvider): { amount: Decimal; quote: FxQuote } {
  const quote = fx.quote(from, to, date);
  return { amount: amount.times(quote.rate), quote };
}
