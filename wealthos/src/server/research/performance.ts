import "server-only";
import { and, asc, eq, inArray, isNull, ne, sql } from "drizzle-orm";
import {
  annualizeOverYears,
  calendarYearReturns,
  convertSeries,
  d,
  inflationFromIndex,
  inflationFromYoY,
  monthEndPoints,
  riskSummary,
  shiftMonth,
  totalReturnIndex,
  trailingWindowReturns,
  type CorporateActionInput,
  type Decimal,
  type ObservedValue,
} from "@/engine";
import type { Tx } from "@/server/db/client";
import { corporateActions, fxRates, instrumentPerformance, instruments, macroObservations, macroSeries, marketDataSources, marketPrices } from "@/server/db/schema";

/** Bump when the calculation changes, so cached results are recomputed. */
export const PERFORMANCE_ENGINE_VERSION = 1;

export type Lens = "local" | "NGN" | "USD" | "GBP";
export const LENSES: Lens[] = ["local", "NGN", "USD", "GBP"];

export interface WindowView {
  key: string;
  cumulative: string | null;
  annualized: string | null;
  startMonth: string;
  endMonth: string;
}

export interface PerformanceResult {
  instrumentId: string;
  currency: string;
  lens: Lens;
  /** True when the series includes reinvested dividends (or is an accumulating NAV/index). */
  totalReturn: boolean;
  firstDate: string | null;
  asOf: string | null;
  trailing: WindowView[];
  /** Inflation-adjusted trailing returns, ending at the last month with published inflation. */
  realTrailing: WindowView[];
  realBasis: string | null;
  calendar: Array<{ year: number; value: string | null; real: string | null; ytd: boolean }>;
  sinceStart: { annualized: string | null; cumulative: string | null; years: number } | null;
  risk: { volatility3y: string | null; maxDrawdown: string | null; drawdownPeak: string | null; drawdownTrough: string | null; drawdownRecovered: string | null; positiveMonths: string | null };
  /** Month-end values of the total-return series, rebased to 100 at the first month. */
  growth: Array<{ date: string; value: number }>;
  dividendYield12m: string | null;
  sources: Array<{ name: string; kind: string; license: string }>;
  notes: string[];
}

const s = (x: Decimal | null | undefined) => (x == null ? null : x.toString());

/** The observations for one instrument from its best source (official/licensed/derived before synthetic; then the most complete). */
async function loadPrices(tx: Tx, instrumentId: string) {
  const counts = await tx
    .select({ sourceId: marketPrices.sourceId, n: sql<number>`count(*)::int`, kind: marketDataSources.kind, name: marketDataSources.name, license: marketDataSources.licenseNote })
    .from(marketPrices)
    .innerJoin(marketDataSources, eq(marketDataSources.id, marketPrices.sourceId))
    .where(and(eq(marketPrices.instrumentId, instrumentId), isNull(marketPrices.orgId)))
    .groupBy(marketPrices.sourceId, marketDataSources.kind, marketDataSources.name, marketDataSources.licenseNote);
  if (!counts.length) return null;
  const best = [...counts].sort((a, b) => Number(a.kind === "synthetic") - Number(b.kind === "synthetic") || b.n - a.n)[0]!;
  const rows = await tx
    .select({ date: marketPrices.observedOn, price: marketPrices.price, currency: marketPrices.currency, methodology: marketPrices.methodology })
    .from(marketPrices)
    .where(and(eq(marketPrices.instrumentId, instrumentId), eq(marketPrices.sourceId, best.sourceId), isNull(marketPrices.orgId)))
    .orderBy(asc(marketPrices.observedOn));
  return { source: best, rows };
}

/** Units of `to` per unit of `from` on each date, from observations of the same date only (direct, inverse or crossed through NGN). */
export async function fxSeries(tx: Tx, from: string, to: string, allowSynthetic: boolean): Promise<ObservedValue[]> {
  if (from === to) return [];
  const load = async (base: string, quote: string) => {
    const rows = await tx
      .select({ date: fxRates.observedOn, rate: fxRates.rate })
      .from(fxRates)
      .innerJoin(marketDataSources, eq(marketDataSources.id, fxRates.sourceId))
      .where(and(eq(fxRates.base, base), eq(fxRates.quote, quote), allowSynthetic ? sql`true` : ne(marketDataSources.kind, "synthetic")))
      .orderBy(asc(fxRates.observedOn));
    // One value per date (several sources may publish the same day: keep the first, consistently).
    const m = new Map<string, Decimal>();
    for (const r of rows) if (!m.has(r.date)) m.set(r.date, d(r.rate));
    return m;
  };
  const direct = await load(from, to);
  if (direct.size) return [...direct].map(([date, v]) => ({ date, value: v }));
  const inverse = await load(to, from);
  if (inverse.size) return [...inverse].filter(([, v]) => v.gt(0)).map(([date, v]) => ({ date, value: d(1).div(v) }));
  // Cross through NGN (the CBN publishes every currency against the naira on the same day).
  const a = from === "NGN" ? null : await load(from, "NGN");
  const b = to === "NGN" ? null : await load(to, "NGN");
  if (a && b) return [...a].filter(([date]) => b.has(date) && b.get(date)!.gt(0)).map(([date, v]) => ({ date, value: v.div(b.get(date)!) }));
  return [];
}

/** Inflation source for a currency lens: an index (UK, US) or year-on-year rates (Nigeria, as the CBN publishes). */
async function inflationFor(tx: Tx, currency: string, allowSynthetic: boolean): Promise<{ kind: "index" | "yoy"; months: Map<string, Decimal>; label: string } | null> {
  const options: Record<string, Array<{ key: string; kind: "index" | "yoy" }>> = {
    NGN: [{ key: "NG.CPI_YOY", kind: "yoy" }, { key: "NG.CPI", kind: "index" }],
    GBP: [{ key: "UK.CPI", kind: "index" }],
    USD: [{ key: "US.CPI", kind: "index" }],
  };
  for (const o of options[currency] ?? []) {
    const [series] = await tx.select().from(macroSeries).where(eq(macroSeries.key, o.key)).limit(1);
    if (!series || (series.isDemo && !allowSynthetic)) continue;
    const rows = await tx.select({ date: macroObservations.observedOn, value: macroObservations.value }).from(macroObservations).where(eq(macroObservations.seriesId, series.id)).orderBy(asc(macroObservations.observedOn));
    if (!rows.length) continue;
    return { kind: o.kind, months: new Map(rows.map((r) => [r.date.slice(0, 7), d(r.value)])), label: series.name };
  }
  return null;
}

export async function computePerformance(tx: Tx, instrumentId: string, lens: Lens): Promise<PerformanceResult | null> {
  const [inst] = await tx.select().from(instruments).where(eq(instruments.id, instrumentId)).limit(1);
  if (!inst) return null;
  const loaded = await loadPrices(tx, instrumentId);
  const notes: string[] = [];
  const target = lens === "local" ? inst.currency : lens;
  const empty: PerformanceResult = {
    instrumentId, currency: target, lens, totalReturn: false, firstDate: null, asOf: null, trailing: [], realTrailing: [], realBasis: null, calendar: [], sinceStart: null,
    risk: { volatility3y: null, maxDrawdown: null, drawdownPeak: null, drawdownTrough: null, drawdownRecovered: null, positiveMonths: null }, growth: [], dividendYield12m: null, sources: [], notes: ["No price history yet."],
  };
  if (!loaded || loaded.rows.length < 2) return empty;
  const allowSynthetic = inst.isDemo;
  const sources = [{ name: loaded.source.name, kind: loaded.source.kind, license: loaded.source.license }];

  const actions = await tx.select().from(corporateActions).where(eq(corporateActions.instrumentId, instrumentId));
  const priceCcy = loaded.rows[0]!.currency;
  const usable = actions.flatMap((a): CorporateActionInput[] => {
    if (a.kind === "split" && a.ratio) return [{ kind: "split", exDate: a.exDate, ratio: d(a.ratio) }];
    if (a.kind === "cash_dividend" && a.amount && (!a.currency || a.currency === priceCcy)) return [{ kind: "cash_dividend", exDate: a.exDate, amount: d(a.amount) }];
    return [];
  });
  const otherCcyDividends = actions.filter((a) => a.kind === "cash_dividend" && a.currency && a.currency !== priceCcy).length;
  if (otherCcyDividends) notes.push(`${otherCcyDividends} dividends declared in another currency were not reinvested.`);
  const prices = loaded.rows.map((r) => ({ date: r.date, value: d(r.price) }));
  const tr = totalReturnIndex(prices, usable);
  const isAccumulating = ["nav", "index"].includes(loaded.rows[0]!.methodology) || inst.assetClass === "index" || inst.assetClass === "money_market";
  const totalReturn = tr.dividendsApplied > 0 || isAccumulating;
  if (!totalReturn && ["equity", "etf", "equity_fund", "fixed_income_fund"].includes(inst.assetClass)) notes.push("No dividends recorded: returns are price returns and may understate the total return.");
  if (tr.ignored) notes.push(`${tr.ignored} corporate actions fell outside the price history and were not applied.`);

  let series = tr.points;
  if (target !== priceCcy) {
    const fx = await fxSeries(tx, priceCcy, target, allowSynthetic);
    if (!fx.length) return { ...empty, notes: [`No ${priceCcy}→${target} exchange rates available.`] };
    const conv = convertSeries(series, fx);
    series = conv.points;
    if (conv.dropped) notes.push(`${conv.dropped} days without a same-day ${priceCcy}/${target} rate were left out (never filled from another day).`);
    sources.push({ name: `${priceCcy}/${target} exchange rates`, kind: "official", license: "See exchange-rate source." });
  }
  if (series.length < 2) return { ...empty, notes: ["Not enough overlapping price and exchange-rate history."] };

  const months = monthEndPoints(series);
  const keys = [...months.keys()];
  const asOf = series[series.length - 1]!.date;
  const firstYear = Number(series[0]!.date.slice(0, 4));
  const lastYear = Number(asOf.slice(0, 4));
  const trailing = trailingWindowReturns(months).map((w) => ({ key: w.key, cumulative: s(w.cumulative), annualized: s(w.annualized), startMonth: w.startMonth, endMonth: w.endMonth }));

  // Inflation-adjusted views.
  const infl = await inflationFor(tx, target, allowSynthetic);
  let realTrailing: WindowView[] = [];
  let realBasis: string | null = null;
  const calendarNominal = calendarYearReturns(months, firstYear + 1, lastYear);
  const realOfYear = new Map<number, Decimal | null>();
  if (infl) {
    const realEnd = keys.filter((k) => infl.months.has(k)).at(-1);
    if (realEnd) {
      realBasis = `${infl.label}, to ${realEnd}`;
      realTrailing = [12, 36, 60, 120].map((n) => {
        const startMonth = shiftMonth(realEnd, -n);
        const sp = months.get(startMonth);
        const ep = months.get(realEnd)!;
        const inflation = infl.kind === "index" ? inflationFromIndex(infl.months, startMonth, realEnd) : inflationFromYoY(infl.months, realEnd, n / 12);
        if (!sp || inflation === null) return { key: `${n / 12}Y`, cumulative: null, annualized: null, startMonth, endMonth: realEnd };
        const realCum = ep.value.div(sp.value).div(inflation.plus(1)).minus(1);
        return { key: `${n / 12}Y`, cumulative: realCum.toString(), annualized: annualizeOverYears(realCum, n / 12).toString(), startMonth, endMonth: realEnd };
      });
    }
    for (const y of calendarNominal) {
      if (y.value === null || y.ytd) continue;
      const inflation = infl.kind === "index" ? inflationFromIndex(infl.months, `${y.year - 1}-12`, `${y.year}-12`) : inflationFromYoY(infl.months, `${y.year}-12`, 1);
      realOfYear.set(y.year, inflation === null ? null : y.value.plus(1).div(inflation.plus(1)).minus(1));
    }
  } else notes.push(`No ${target} inflation series yet: inflation-adjusted figures are unavailable.`);

  const firstKey = keys[0]!;
  const lastKey = keys[keys.length - 1]!;
  const years = (Date.parse(months.get(lastKey)!.date) - Date.parse(months.get(firstKey)!.date)) / (365.25 * 86400000);
  const cum = months.get(lastKey)!.value.div(months.get(firstKey)!.value).minus(1);
  const risk = riskSummary(series, months);
  const base = months.get(firstKey)!.value;

  // Trailing 12-month dividend yield in the price currency (cash dividends per share / latest price).
  const lastPrice = d(loaded.rows[loaded.rows.length - 1]!.price);
  const lastDate = loaded.rows[loaded.rows.length - 1]!.date;
  const yearAgo = new Date(Date.parse(lastDate) - 365 * 86400000).toISOString().slice(0, 10);
  const recent = actions.filter((a) => a.kind === "cash_dividend" && a.amount && a.exDate > yearAgo && a.exDate <= lastDate && (!a.currency || a.currency === priceCcy));
  const splitAfter = actions.filter((a) => a.kind === "split" && a.ratio && a.exDate > yearAgo && a.exDate <= lastDate);
  const dividendYield12m = recent.length && lastPrice.gt(0) && !splitAfter.length ? recent.reduce((acc, a) => acc.plus(d(a.amount!)), d(0)).div(lastPrice).toString() : null;

  return {
    instrumentId,
    currency: target,
    lens,
    totalReturn,
    firstDate: series[0]!.date,
    asOf,
    trailing,
    realTrailing,
    realBasis,
    calendar: calendarNominal.map((y) => ({ year: y.year, value: s(y.value), real: s(realOfYear.get(y.year) ?? null), ytd: y.ytd })),
    sinceStart: years >= 1 ? { annualized: annualizeOverYears(cum, years).toString(), cumulative: cum.toString(), years: Math.round(years * 10) / 10 } : null,
    risk: { volatility3y: s(risk.volatility3y), maxDrawdown: s(risk.maxDrawdown), drawdownPeak: risk.drawdownPeak, drawdownTrough: risk.drawdownTrough, drawdownRecovered: risk.drawdownRecovered, positiveMonths: s(risk.positiveMonths) },
    growth: [...months.values()].map((p) => ({ date: p.date, value: Number(p.value.div(base).times(100).toFixed(4)) })),
    dividendYield12m,
    sources,
    notes,
  };
}

async function marketVersion(tx: Tx): Promise<number> {
  const r = await tx.execute<{ version: string }>(sql`select version from data_versions where key = 'market'`);
  return Number(r.rows[0]?.version ?? 0);
}

/** Cached performance for catalogue instruments (recomputed when market data or the engine changes). */
export async function getPerformance(tx: Tx, instrumentId: string, lens: Lens): Promise<PerformanceResult | null> {
  const version = await marketVersion(tx);
  const [hit] = await tx.select().from(instrumentPerformance).where(and(eq(instrumentPerformance.instrumentId, instrumentId), eq(instrumentPerformance.currency, lens))).limit(1);
  if (hit && hit.marketVersion === version && hit.engineVersion === PERFORMANCE_ENGINE_VERSION) return hit.result as unknown as PerformanceResult;
  const result = await computePerformance(tx, instrumentId, lens);
  if (!result) return null;
  const [inst] = await tx.select({ orgId: instruments.orgId }).from(instruments).where(eq(instruments.id, instrumentId)).limit(1);
  if (inst && inst.orgId === null) {
    await tx
      .insert(instrumentPerformance)
      .values({ instrumentId, currency: lens, engineVersion: PERFORMANCE_ENGINE_VERSION, marketVersion: version, result: result as unknown as Record<string, unknown> })
      .onConflictDoUpdate({ target: [instrumentPerformance.instrumentId, instrumentPerformance.currency], set: { engineVersion: PERFORMANCE_ENGINE_VERSION, marketVersion: version, result: result as unknown as Record<string, unknown>, computedAt: new Date() } });
  }
  return result;
}

/** Performance for many instruments (screener, scoreboard). */
export async function getPerformanceMany(tx: Tx, instrumentIds: string[], lens: Lens): Promise<Map<string, PerformanceResult>> {
  const out = new Map<string, PerformanceResult>();
  if (!instrumentIds.length) return out;
  const version = await marketVersion(tx);
  const cached = await tx.select().from(instrumentPerformance).where(and(inArray(instrumentPerformance.instrumentId, instrumentIds), eq(instrumentPerformance.currency, lens)));
  for (const c of cached) if (c.marketVersion === version && c.engineVersion === PERFORMANCE_ENGINE_VERSION) out.set(c.instrumentId, c.result as unknown as PerformanceResult);
  for (const id of instrumentIds) {
    if (out.has(id)) continue;
    const r = await getPerformance(tx, id, lens);
    if (r) out.set(id, r);
  }
  return out;
}
