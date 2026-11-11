import "server-only";
import { and, asc, eq, inArray, isNotNull, isNull, sql } from "drizzle-orm";
import { d, discountToTrueYield, simpleToEffectiveAnnual, type Decimal } from "@/engine";
import { withTenant, type TenantContext, type Tx } from "@/server/db/client";
import { fxRates, instrumentFundamentals, instruments, macroObservations, macroSeries, marketDataSources, publishedRates } from "@/server/db/schema";
import { BENCHMARKS } from "@/server/ingest/universe";
import type { Fundamentals } from "@/server/ingest/eodhd";
import { getPerformanceMany, type Lens, type PerformanceResult } from "./performance";
import { hiddenSourceKinds, licensedDataVisible } from "./licence";

/**
 * Research views over official and licensed market data: macro (inflation, policy rates, FX),
 * Nigerian fixed income (primary auctions, money-market rates) and the markets scoreboard.
 * Every figure carries its source; nothing is filled from another date.
 */

export interface SourceRef {
  name: string;
  url: string | null;
  license: string;
}

/** One chart row per month (YYYY-MM); series values are presentation numbers (percent as fractions). */
export type ChartRow = { month: string } & Record<string, number | null | string>;

export interface SeriesLatest {
  key: string;
  name: string;
  value: string | null;
  asOf: string | null;
  /** Same month a year earlier (or the value in force then, for rates set on decision dates). */
  yearAgo: string | null;
  source: SourceRef | null;
}

interface LoadedSeries {
  key: string;
  name: string;
  unit: string;
  frequency: string;
  source: SourceRef;
  points: Array<{ date: string; value: Decimal }>;
}

async function loadSeries(tx: Tx, keys: string[]): Promise<Map<string, LoadedSeries>> {
  const meta = await tx
    .select({ id: macroSeries.id, key: macroSeries.key, name: macroSeries.name, unit: macroSeries.unit, frequency: macroSeries.frequency, isDemo: macroSeries.isDemo, kind: marketDataSources.kind, sourceName: marketDataSources.name, sourceUrl: marketDataSources.url, license: marketDataSources.licenseNote })
    .from(macroSeries)
    .innerJoin(marketDataSources, eq(marketDataSources.id, macroSeries.sourceId))
    .where(and(inArray(macroSeries.key, keys), eq(macroSeries.isDemo, false)));
  // Licensed series (EODHD bond yields) are left out where this deployment may not show them.
  const hidden = hiddenSourceKinds() as string[];
  meta.splice(0, meta.length, ...meta.filter((m) => !hidden.includes(m.kind)));
  const out = new Map<string, LoadedSeries>();
  if (!meta.length) return out;
  const rows = await tx
    .select({ seriesId: macroObservations.seriesId, date: macroObservations.observedOn, value: macroObservations.value })
    .from(macroObservations)
    .where(inArray(macroObservations.seriesId, meta.map((m) => m.id)))
    .orderBy(asc(macroObservations.observedOn));
  for (const m of meta) {
    out.set(m.key, {
      key: m.key,
      name: m.name,
      unit: m.unit,
      frequency: m.frequency,
      source: { name: m.sourceName, url: m.sourceUrl, license: m.license },
      points: rows.filter((r) => r.seriesId === m.id).map((r) => ({ date: r.date, value: d(r.value) })),
    });
  }
  return out;
}

const monthOf = (date: string) => date.slice(0, 7);
function shiftMonthKey(key: string, delta: number): string {
  const [y, m] = key.split("-").map(Number) as [number, number];
  const t = y * 12 + (m - 1) + delta;
  return `${Math.floor(t / 12)}-${String((t % 12) + 1).padStart(2, "0")}`;
}
function monthsBetween(from: string, to: string): string[] {
  const out: string[] = [];
  for (let k = from; k <= to; k = shiftMonthKey(k, 1)) out.push(k);
  return out;
}

/** Monthly values: the last observation in each month (daily series), or the observation itself (monthly series). */
function monthlyLast(points: LoadedSeries["points"]): Map<string, Decimal> {
  const m = new Map<string, Decimal>();
  for (const p of points) m.set(monthOf(p.date), p.value);
  return m;
}

/** For rates that change on decision dates: the rate in force at each month end, from the first decision on. */
function stepMonthly(points: LoadedSeries["points"], lastMonth: string): Map<string, Decimal> {
  const m = new Map<string, Decimal>();
  if (!points.length) return m;
  let i = 0;
  let current: Decimal | null = null;
  for (const month of monthsBetween(monthOf(points[0]!.date), lastMonth)) {
    while (i < points.length && monthOf(points[i]!.date) <= month) current = points[i++]!.value;
    if (current) m.set(month, current);
  }
  return m;
}

/** Year-on-year change of a price index, month by month (only where both months are published). */
function yoyFromIndex(index: Map<string, Decimal>): Map<string, Decimal> {
  const out = new Map<string, Decimal>();
  for (const [k, v] of index) {
    const prev = index.get(shiftMonthKey(k, -12));
    if (prev && prev.gt(0)) out.set(k, v.div(prev).minus(1));
  }
  return out;
}

function latestOf(key: string, name: string, monthly: Map<string, Decimal>, source: SourceRef | null, lastDate?: string): SeriesLatest {
  const keys = [...monthly.keys()].sort();
  const last = keys.at(-1);
  if (!last) return { key, name, value: null, asOf: null, yearAgo: null, source };
  const ago = monthly.get(shiftMonthKey(last, -12));
  return { key, name, value: monthly.get(last)!.toString(), asOf: lastDate ?? `${last}`, yearAgo: ago ? ago.toString() : null, source };
}

function toChart(series: Record<string, Map<string, Decimal>>, fromMonth: string): ChartRow[] {
  const all = new Set<string>();
  for (const m of Object.values(series)) for (const k of m.keys()) if (k >= fromMonth) all.add(k);
  return [...all].sort().map((month) => {
    const row: ChartRow = { month };
    for (const [name, m] of Object.entries(series)) {
      const v = m.get(month);
      row[name] = v ? Number(v.toFixed(6)) : null;
    }
    return row;
  });
}

// ------------------------------------------------------------------------------------------- Macro

export interface MacroOverview {
  inflation: { latest: SeriesLatest[]; chart: ChartRow[]; ngBreakdown: ChartRow[]; notes: string[] };
  policy: { latest: SeriesLatest[]; chart: ChartRow[]; real: Array<{ country: string; policy: string | null; inflation: string | null; real: string | null; asOf: string | null }> };
  fx: { latest: Array<SeriesLatest & { change1y: string | null }>; chart: ChartRow[]; methodology: string };
  sources: SourceRef[];
}

const MACRO_KEYS = ["NG.CPI_YOY", "NG.FOOD_YOY", "NG.CORE_YOY", "US.CPI", "UK.CPI", "NG.MPR", "US.FEDFUNDS", "UK.BANKRATE"];

async function fxMonthly(tx: Tx, base: string, quote: string): Promise<{ monthly: Map<string, Decimal>; lastDate: string | null; source: SourceRef | null }> {
  const rows = await tx
    .select({ date: fxRates.observedOn, rate: fxRates.rate, sourceName: marketDataSources.name, sourceUrl: marketDataSources.url, license: marketDataSources.licenseNote })
    .from(fxRates)
    .innerJoin(marketDataSources, eq(marketDataSources.id, fxRates.sourceId))
    .where(and(eq(fxRates.base, base), eq(fxRates.quote, quote), eq(marketDataSources.kind, "official")))
    .orderBy(asc(fxRates.observedOn));
  const monthly = new Map<string, Decimal>();
  for (const r of rows) monthly.set(monthOf(r.date), d(r.rate));
  const last = rows.at(-1);
  return { monthly, lastDate: last?.date ?? null, source: last ? { name: last.sourceName, url: last.sourceUrl, license: last.license } : null };
}

export async function getMacroOverview(ctx: TenantContext): Promise<MacroOverview> {
  return withTenant(ctx, async (tx) => {
    const s = await loadSeries(tx, MACRO_KEYS);
    const notes: string[] = [];
    const get = (k: string) => s.get(k);
    const ngYoy = get("NG.CPI_YOY") ? monthlyLast(get("NG.CPI_YOY")!.points) : new Map<string, Decimal>();
    const usYoy = get("US.CPI") ? yoyFromIndex(monthlyLast(get("US.CPI")!.points)) : new Map<string, Decimal>();
    const ukYoy = get("UK.CPI") ? yoyFromIndex(monthlyLast(get("UK.CPI")!.points)) : new Map<string, Decimal>();
    if (get("US.CPI") || get("UK.CPI")) notes.push("US and UK inflation are computed from the published index levels (this month ÷ the same month a year earlier − 1). Nigeria's rates are as the CBN publishes them.");
    const start = shiftMonthKey(monthOf(new Date().toISOString()), -12 * 15);

    const today = new Date().toISOString().slice(0, 10);
    const lastMonth = monthOf(today);
    const mpr = get("NG.MPR") ? monthlyLast(get("NG.MPR")!.points) : new Map<string, Decimal>();
    const fed = get("US.FEDFUNDS") ? monthlyLast(get("US.FEDFUNDS")!.points) : new Map<string, Decimal>();
    const boe = get("UK.BANKRATE") ? stepMonthly(get("UK.BANKRATE")!.points, lastMonth) : new Map<string, Decimal>();
    const lastPoint = (k: string) => get(k)?.points.at(-1)?.date;

    const policyLatest = [
      latestOf("NG.MPR", "Nigeria Monetary Policy Rate", mpr, get("NG.MPR")?.source ?? null),
      latestOf("US.FEDFUNDS", "US effective federal funds rate", fed, get("US.FEDFUNDS")?.source ?? null, lastPoint("US.FEDFUNDS")),
      latestOf("UK.BANKRATE", "UK Bank Rate", boe, get("UK.BANKRATE")?.source ?? null, today),
    ];
    const inflLatest = [
      latestOf("NG.CPI_YOY", "Nigeria", ngYoy, get("NG.CPI_YOY")?.source ?? null),
      latestOf("US.CPI", "United States", usYoy, get("US.CPI")?.source ?? null),
      latestOf("UK.CPI", "United Kingdom", ukYoy, get("UK.CPI")?.source ?? null),
    ];
    // Real policy rate: the rate in force in the latest month with published inflation (Fisher: (1+i)/(1+π) − 1).
    const real = [
      { country: "Nigeria", p: mpr, i: ngYoy },
      { country: "United States", p: fed, i: usYoy },
      { country: "United Kingdom", p: boe, i: ukYoy },
    ].map(({ country, p, i }) => {
      const month = [...i.keys()].sort().filter((k) => p.has(k)).at(-1);
      if (!month) return { country, policy: null, inflation: null, real: null, asOf: null };
      const pv = p.get(month)!;
      const iv = i.get(month)!;
      return { country, policy: pv.toString(), inflation: iv.toString(), real: pv.plus(1).div(iv.plus(1)).minus(1).toString(), asOf: month };
    });

    // One transaction runs one query at a time: load the pairs in turn.
    const fxPairs = [];
    for (const c of ["USD", "GBP", "EUR"] as const) fxPairs.push({ c, ...(await fxMonthly(tx, c, "NGN")) });
    const fxLatest = fxPairs.map(({ c, monthly, lastDate, source }) => {
      const l = latestOf(`${c}/NGN`, `${c}/NGN`, monthly, source, lastDate ?? undefined);
      return { ...l, change1y: l.value && l.yearAgo ? d(l.value).div(d(l.yearAgo)).minus(1).toString() : null };
    });

    const sources = [...new Map([...s.values()].map((x) => [x.source.name, x.source])).values()];
    for (const f of fxPairs) if (f.source && !sources.some((x) => x.name === f.source!.name)) sources.push(f.source);
    return {
      inflation: {
        latest: inflLatest,
        chart: toChart({ ng: ngYoy, us: usYoy, uk: ukYoy }, start),
        ngBreakdown: toChart({ headline: ngYoy, food: get("NG.FOOD_YOY") ? monthlyLast(get("NG.FOOD_YOY")!.points) : new Map(), core: get("NG.CORE_YOY") ? monthlyLast(get("NG.CORE_YOY")!.points) : new Map() }, start),
        notes,
      },
      policy: { latest: policyLatest, chart: toChart({ ng: mpr, us: fed, uk: boe }, start), real },
      fx: {
        latest: fxLatest,
        chart: toChart(Object.fromEntries(fxPairs.map((f) => [f.c.toLowerCase(), f.monthly])), start),
        methodology: "CBN official rates (month-end observation). Nigeria's FX regime changed in June 2023 (unification of the official windows), so earlier official rates are not comparable to market rates of the time.",
      },
      sources,
    };
  });
}

// ------------------------------------------------------------------------------------ Fixed income

export interface AuctionView {
  instrumentId: string;
  name: string;
  symbol: string | null;
  methodology: string;
  value: string;
  tenorDays: number | null;
  asOf: string;
  /** For NTBs: the bank-discount stop rate converted to a true yield and an effective annual yield. */
  trueYield: string | null;
  effectiveAnnual: string | null;
  /** (1 + yield) ÷ (1 + latest inflation) − 1, labelled as an approximation (inflation is backward-looking). */
  realApprox: string | null;
}

export interface FixedIncomeOverview {
  ntb: AuctionView[];
  bonds: AuctionView[];
  ntbChart: ChartRow[];
  bondChart: ChartRow[];
  moneyMarket: SeriesLatest[];
  inflation: SeriesLatest | null;
  /** Bond results left out as implausible (under six months to maturity at a primary auction). */
  excludedBondResults: number;
  /** Date of the latest FGN bond result in the source. */
  lastBondAuction: string | null;
  source: SourceRef | null;
  /**
   * 10-year government bond yields traded in the market (Nigeria, US, UK; daily, licensed from
   * EODHD): null when none are loaded or this deployment may not show licensed data.
   */
  marketYields: MarketYields | null;
  /** True when licensed data (the market yields) exists as a kind but is not shown here (demo). */
  licensedHidden: boolean;
}

export interface MarketYield extends SeriesLatest {
  country: "NG" | "US" | "GB";
  /** Nigeria only: (1 + yield) ÷ (1 + latest headline inflation) − 1, an approximation. */
  realApprox: string | null;
}

export interface MarketYields {
  latest: MarketYield[];
  /** Month-end yields, last ten years; keys ng, us, uk. */
  chart: ChartRow[];
  source: SourceRef;
}

const GB_KEYS = [
  { key: "NG.GB10Y", country: "NG", chart: "ng", label: "Nigeria 10-year FGN bond" },
  { key: "US.GB10Y", country: "US", chart: "us", label: "US 10-year Treasury" },
  { key: "UK.GB10Y", country: "GB", chart: "uk", label: "UK 10-year gilt" },
] as const;

const MM_KEYS = ["NG.MPR", "NG.INTERBANK_CALL", "NG.TBILL_RATE", "NG.SAVINGS_DEPOSIT", "NG.DEPOSIT_12M", "NG.PRIME_LENDING", "NG.MAX_LENDING"];

export async function getFixedIncome(ctx: TenantContext): Promise<FixedIncomeOverview> {
  return withTenant(ctx, async (tx) => {
    const series = await loadSeries(tx, [...MM_KEYS, "NG.CPI_YOY", ...GB_KEYS.map((g) => g.key)]);
    const cpi = series.get("NG.CPI_YOY");
    const inflation = cpi ? latestOf("NG.CPI_YOY", "Nigeria headline inflation", monthlyLast(cpi.points), cpi.source) : null;
    const infl = inflation?.value ? d(inflation.value) : null;

    const insts = await tx
      .select({ id: instruments.id, name: instruments.name, symbol: instruments.symbol, assetClass: instruments.assetClass })
      .from(instruments)
      .where(and(isNull(instruments.orgId), eq(instruments.isDemo, false), eq(instruments.country, "NG"), inArray(instruments.assetClass, ["treasury_bill", "government_bond"]), sql`${instruments.symbol} like 'NG-%'`));
    const ids = insts.map((i) => i.id);
    const rates = ids.length
      ? await tx
          .select({ instrumentId: publishedRates.instrumentId, methodology: publishedRates.methodology, value: publishedRates.value, tenorDays: publishedRates.tenorDays, asOf: publishedRates.asOf, sourceName: marketDataSources.name, sourceUrl: marketDataSources.url, license: marketDataSources.licenseNote })
          .from(publishedRates)
          .innerJoin(marketDataSources, eq(marketDataSources.id, publishedRates.sourceId))
          .where(and(inArray(publishedRates.instrumentId, ids), isNotNull(publishedRates.value)))
          .orderBy(asc(publishedRates.asOf))
      : [];
    // A bond "auction" with under six months to run is a keying error in the source: leave it out and say so.
    const bondIds = new Set(insts.filter((i) => i.assetClass === "government_bond").map((i) => i.id));
    const implausible = rates.filter((r) => bondIds.has(r.instrumentId) && (r.tenorDays ?? 0) < 180);
    if (implausible.length) rates.splice(0, rates.length, ...rates.filter((r) => !implausible.includes(r)));
    const lastBondAuction = rates.filter((r) => bondIds.has(r.instrumentId)).at(-1)?.asOf ?? null;
    const tenorOrder = (sym: string | null) => {
      const m = sym?.match(/-(\d+)([DY])$/);
      return m ? Number(m[1]) * (m[2] === "Y" ? 365 : 1) : 0;
    };
    const view = (i: (typeof insts)[number]): AuctionView | null => {
      const mine = rates.filter((r) => r.instrumentId === i.id);
      const last = mine.at(-1);
      if (!last) return null;
      const v = d(last.value);
      let trueYield: Decimal | null = null;
      let eff: Decimal | null = null;
      if (last.methodology === "discount_rate" && last.tenorDays) {
        trueYield = discountToTrueYield(v, last.tenorDays);
        eff = simpleToEffectiveAnnual(trueYield, last.tenorDays);
      }
      const nominal = eff ?? v;
      return {
        instrumentId: i.id, name: i.name, symbol: i.symbol, methodology: last.methodology, value: last.value, tenorDays: last.tenorDays, asOf: last.asOf,
        trueYield: trueYield?.toString() ?? null, effectiveAnnual: eff?.toString() ?? null,
        realApprox: infl ? nominal.plus(1).div(infl.plus(1)).minus(1).toString() : null,
      };
    };
    const sorted = [...insts].sort((a, b) => tenorOrder(a.symbol) - tenorOrder(b.symbol));
    const ntbInsts = sorted.filter((i) => i.assetClass === "treasury_bill");
    const bondInsts = sorted.filter((i) => i.assetClass === "government_bond");

    // Charts: the last auction of each month per tenor (NTB as true yield, so tenors compare on one basis).
    const start = shiftMonthKey(monthOf(new Date().toISOString()), -12 * 10);
    const monthlyOf = (id: string, asTrueYield: boolean) => {
      const m = new Map<string, Decimal>();
      for (const r of rates) {
        if (r.instrumentId !== id) continue;
        const v = d(r.value);
        m.set(monthOf(r.asOf), asTrueYield && r.methodology === "discount_rate" && r.tenorDays ? discountToTrueYield(v, r.tenorDays) : v);
      }
      return m;
    };
    const ntbChart = toChart(Object.fromEntries(ntbInsts.map((i) => [String(tenorOrder(i.symbol)), monthlyOf(i.id, true)])), start);
    const pick = bondInsts.filter((i) => ["NG-FGN-5Y", "NG-FGN-10Y", "NG-FGN-20Y"].includes(i.symbol ?? ""));
    const bondChart = toChart(Object.fromEntries(pick.map((i) => [i.symbol!.replace("NG-FGN-", ""), monthlyOf(i.id, false)])), start);

    const today = monthOf(new Date().toISOString());
    const moneyMarket = MM_KEYS.flatMap((k) => {
      const s = series.get(k);
      if (!s) return [];
      return [latestOf(k, s.name.replace(/^Nigeria /, ""), s.frequency === "event" ? stepMonthly(s.points, today) : monthlyLast(s.points), s.source)];
    });
    const src = rates.at(-1);

    const gb = GB_KEYS.flatMap((g) => {
      const s = series.get(g.key);
      return s?.points.length ? [{ ...g, s }] : [];
    });
    const marketYields: MarketYields | null = gb.length
      ? {
          latest: gb.map(({ key, country, label, s }) => {
            const monthly = monthlyLast(s.points);
            const l = latestOf(key, label, monthly, s.source, s.points.at(-1)!.date);
            // A year earlier: the last observation on or before the same day a year back.
            const target = `${Number(l.asOf!.slice(0, 4)) - 1}${l.asOf!.slice(4)}`;
            const ago = [...s.points].reverse().find((p) => p.date <= target);
            const real = country === "NG" && infl && l.value ? d(l.value).plus(1).div(infl.plus(1)).minus(1).toString() : null;
            return { ...l, yearAgo: ago ? ago.value.toString() : null, country, realApprox: real };
          }),
          chart: toChart(Object.fromEntries(gb.map(({ chart, s }) => [chart, monthlyLast(s.points)])), start),
          source: gb[0]!.s.source,
        }
      : null;
    return {
      marketYields,
      licensedHidden: !licensedDataVisible(),
      ntb: ntbInsts.map(view).filter((x): x is AuctionView => x !== null),
      bonds: bondInsts.map(view).filter((x): x is AuctionView => x !== null),
      ntbChart,
      bondChart,
      moneyMarket,
      inflation,
      excludedBondResults: implausible.length,
      lastBondAuction,
      source: src ? { name: src.sourceName, url: src.sourceUrl, license: src.license } : null,
    };
  });
}

// -------------------------------------------------------------------------------------- Scoreboard

export interface ScoreboardRow {
  key: string;
  label: string;
  market: string;
  instrumentId: string | null;
  name: string | null;
  symbol: string | null;
  result: PerformanceResult | null;
}

const NG_BENCHMARKS = [{ benchmarkKey: "ng-tbills", benchmarkLabel: "Nigerian Treasury bills (91-day, rolled; computed from CBN auctions)", market: "ng" }];

export async function getScoreboard(ctx: TenantContext, lens: Lens): Promise<{ rows: ScoreboardRow[]; licensedHidden: boolean }> {
  return withTenant(ctx, async (tx) => {
    const expected = [
      ...NG_BENCHMARKS,
      ...(licensedDataVisible() ? BENCHMARKS.map((b) => ({ benchmarkKey: b.benchmarkKey!, benchmarkLabel: b.benchmarkLabel!, market: b.market })) : []),
    ];
    const found = await tx
      .select({ id: instruments.id, name: instruments.name, symbol: instruments.symbol, benchmarkKey: instruments.benchmarkKey })
      .from(instruments)
      .where(and(isNull(instruments.orgId), eq(instruments.isDemo, false), inArray(instruments.benchmarkKey, expected.map((e) => e.benchmarkKey))));
    const perf = await getPerformanceMany(tx, found.map((f) => f.id), lens);
    const rows = expected.map((e) => {
      const f = found.find((x) => x.benchmarkKey === e.benchmarkKey);
      const result = f ? perf.get(f.id) ?? null : null;
      return { key: e.benchmarkKey, label: e.benchmarkLabel, market: e.market, instrumentId: f?.id ?? null, name: f?.name ?? null, symbol: f?.symbol ?? null, result: result && result.asOf ? result : null };
    });
    return { rows, licensedHidden: !licensedDataVisible() };
  });
}

/** Long-run performance of one catalogue instrument (instrument page). */
export async function getInstrumentPerformance(ctx: TenantContext, instrumentId: string, lens: Lens): Promise<PerformanceResult | null> {
  return withTenant(ctx, async (tx) => {
    const r = (await getPerformanceMany(tx, [instrumentId], lens)).get(instrumentId) ?? null;
    return r && r.asOf ? r : null;
  });
}

/** Latest company/fund fundamentals for an instrument, when its source may be displayed here. */
export async function getFundamentals(ctx: TenantContext, instrumentId: string): Promise<{ data: Fundamentals; retrievedAt: string; source: SourceRef } | null> {
  return withTenant(ctx, async (tx) => {
    const [row] = await tx
      .select({ data: instrumentFundamentals.data, retrievedAt: instrumentFundamentals.retrievedAt, kind: marketDataSources.kind, name: marketDataSources.name, url: marketDataSources.url, license: marketDataSources.licenseNote })
      .from(instrumentFundamentals)
      .innerJoin(marketDataSources, eq(marketDataSources.id, instrumentFundamentals.sourceId))
      .where(eq(instrumentFundamentals.instrumentId, instrumentId))
      .limit(1);
    if (!row || (hiddenSourceKinds() as string[]).includes(row.kind)) return null;
    return { data: row.data as unknown as Fundamentals, retrievedAt: row.retrievedAt.toISOString(), source: { name: row.name, url: row.url, license: row.license } };
  });
}
