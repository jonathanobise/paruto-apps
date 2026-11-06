import "server-only";
import { and, asc, eq, inArray, isNull, sql } from "drizzle-orm";
import { ASSET_CLASS_LABELS, commonWindow, d, parsePercentInput, type AssetClass, type Decimal, type ObservedValue } from "@/engine";
import { withTenant, type TenantContext, type Tx } from "@/server/db/client";
import { instrumentFundamentals, instruments, marketDataSources, sectors } from "@/server/db/schema";
import { AppError } from "@/server/platform/errors";
import { hiddenSourceKinds } from "./licence";
import { getPerformanceMany, type Lens, type PerformanceResult } from "./performance";

/**
 * Screener and cross-market comparison over the research universe: real catalogue instruments
 * (never SAMPLE or private ones) with price history from a source this deployment may display.
 * Factual filters and sorts only; nothing is ranked as "best" or recommended.
 */

export const MARKETS = { ng: "Nigeria", us: "United States", uk: "United Kingdom", global: "Global" } as const;
export type MarketKey = keyof typeof MARKETS;

export interface UniverseEntry {
  id: string;
  name: string;
  symbol: string | null;
  market: string | null;
  assetClass: AssetClass;
  sectorKey: string | null;
  currency: string;
}

/** Catalogue instruments that research may show: global, real, and priced by a displayable source. */
export async function researchUniverse(tx: Tx, filter: { market?: string; assetClass?: string; sector?: string; q?: string } = {}): Promise<UniverseEntry[]> {
  const hidden = hiddenSourceKinds() as string[];
  const conds = [
    isNull(instruments.orgId),
    eq(instruments.isDemo, false),
    sql`exists (select 1 from market_prices p join market_data_sources s on s.id = p.source_id
                where p.instrument_id = ${instruments.id} and p.org_id is null and s.kind <> 'synthetic' and not (s.kind::text = any(${sql.param(hidden)}::text[])))`,
  ];
  if (filter.market && filter.market in MARKETS) conds.push(eq(instruments.market, filter.market));
  if (filter.assetClass) conds.push(sql`${instruments.assetClass}::text = ${filter.assetClass}`);
  if (filter.sector) conds.push(eq(instruments.sectorKey, filter.sector));
  if (filter.q?.trim()) {
    const q = `%${filter.q.trim().replace(/[%_\\]/g, (m) => `\\${m}`)}%`;
    conds.push(sql`(${instruments.name} ilike ${q} or ${instruments.symbol} ilike ${q})`);
  }
  const rows = await tx
    .select({ id: instruments.id, name: instruments.name, symbol: instruments.symbol, market: instruments.market, assetClass: instruments.assetClass, sectorKey: instruments.sectorKey, currency: instruments.currency })
    .from(instruments)
    .where(and(...conds))
    .orderBy(asc(instruments.name))
    .limit(400);
  return rows as UniverseEntry[];
}

// ---------------------------------------------------------------------------------------- Screener

export const SORTS = {
  name: "Name",
  r1y: "1 year",
  r3y: "3 years a year",
  r5y: "5 years a year",
  r10y: "10 years a year",
  real5y: "5 years, real, a year",
  vol: "Volatility (3 years)",
  dd: "Worst fall",
  dy: "Dividend yield",
  pe: "Price ÷ earnings",
} as const;
export type SortKey = keyof typeof SORTS;

export interface ScreenerQuery {
  lens: Lens;
  market?: string;
  assetClass?: string;
  sector?: string;
  q?: string;
  /** Typed percentages, e.g. "8" = 8%. */
  min5y?: string;
  maxVol?: string;
  minYield?: string;
  /** A plain multiple, e.g. "20". */
  maxPe?: string;
  sort?: string;
  dir?: string;
}

export interface ScreenerRow {
  id: string;
  name: string;
  symbol: string | null;
  market: string | null;
  assetClassLabel: string;
  sector: string | null;
  currency: string;
  r1y: string | null;
  r3y: string | null;
  r5y: string | null;
  r10y: string | null;
  real5y: string | null;
  vol: string | null;
  dd: string | null;
  dy: string | null;
  pe: string | null;
  asOf: string | null;
  totalReturn: boolean;
}

export interface ScreenerResult {
  rows: ScreenerRow[];
  /** Instruments in the filtered universe before the numeric thresholds. */
  universe: number;
  /** Of those, how many have no history in the chosen currency (dropped). */
  withoutHistory: number;
  sectors: Array<{ key: string; name: string }>;
  sort: SortKey;
  dir: "asc" | "desc";
  invalid: string[];
}

const win = (r: PerformanceResult, key: string, real = false) => (real ? r.realTrailing : r.trailing).find((w) => w.key === key) ?? null;

function rowOf(u: UniverseEntry, r: PerformanceResult, sectorName: string | null, pe: string | null): ScreenerRow {
  return {
    id: u.id,
    name: u.name,
    symbol: u.symbol,
    market: u.market,
    assetClassLabel: ASSET_CLASS_LABELS[u.assetClass] ?? u.assetClass,
    sector: sectorName,
    currency: u.currency,
    r1y: win(r, "1Y")?.cumulative ?? null,
    r3y: win(r, "3Y")?.annualized ?? null,
    r5y: win(r, "5Y")?.annualized ?? null,
    r10y: win(r, "10Y")?.annualized ?? null,
    real5y: win(r, "5Y", true)?.annualized ?? null,
    vol: r.risk.volatility3y,
    dd: r.risk.maxDrawdown,
    dy: r.dividendYield12m,
    pe,
    asOf: r.asOf,
    totalReturn: r.totalReturn,
  };
}

/** Trailing P/E from the latest fundamentals, when their source may be displayed and the value is positive. */
async function peOf(tx: Tx, ids: string[]): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  if (!ids.length) return out;
  const hidden = hiddenSourceKinds() as string[];
  const rows = await tx
    .select({ id: instrumentFundamentals.instrumentId, pe: sql<string | null>`${instrumentFundamentals.data} -> 'snapshot' ->> 'trailingPE'`, kind: marketDataSources.kind })
    .from(instrumentFundamentals)
    .innerJoin(marketDataSources, eq(marketDataSources.id, instrumentFundamentals.sourceId))
    .where(inArray(instrumentFundamentals.instrumentId, ids));
  for (const r of rows) if (r.pe && !hidden.includes(r.kind) && /^-?\d+(\.\d+)?$/.test(r.pe) && d(r.pe).gt(0)) out.set(r.id, r.pe);
  return out;
}

export async function runScreener(ctx: TenantContext, q: ScreenerQuery): Promise<ScreenerResult> {
  const sort: SortKey = q.sort && q.sort in SORTS ? (q.sort as SortKey) : "r5y";
  const dir: "asc" | "desc" = q.dir === "asc" ? "asc" : q.dir === "desc" ? "desc" : sort === "name" || sort === "vol" || sort === "pe" ? "asc" : "desc";
  const invalid: string[] = [];
  const pct = (label: string, raw?: string) => {
    if (!raw?.trim()) return null;
    const v = parsePercentInput(raw);
    if (v === null) invalid.push(label);
    return v;
  };
  const min5y = pct("Minimum 5-year return", q.min5y);
  const maxVol = pct("Maximum volatility", q.maxVol);
  const minYield = pct("Minimum dividend yield", q.minYield);
  let maxPe: Decimal | null = null;
  if (q.maxPe?.trim()) {
    if (/^\d{1,4}(\.\d{1,2})?$/.test(q.maxPe.trim())) maxPe = d(q.maxPe.trim());
    else invalid.push("Maximum price ÷ earnings");
  }

  return withTenant(ctx, async (tx) => {
    const sectorRows = await tx.select({ key: sectors.key, name: sectors.name }).from(sectors).orderBy(asc(sectors.sort));
    const sectorName = new Map(sectorRows.map((s) => [s.key, s.name]));
    const universe = await researchUniverse(tx, q);
    const perf = await getPerformanceMany(tx, universe.map((u) => u.id), q.lens);
    const pe = await peOf(tx, universe.map((u) => u.id));
    let withoutHistory = 0;
    const rows: ScreenerRow[] = [];
    for (const u of universe) {
      const r = perf.get(u.id);
      if (!r || !r.asOf) { withoutHistory++; continue; }
      rows.push(rowOf(u, r, u.sectorKey ? sectorName.get(u.sectorKey) ?? null : null, pe.get(u.id) ?? null));
    }
    // A threshold excludes rows without the figure: an unknown value never passes a filter.
    const passes = (v: string | null, bound: Decimal | null, kind: "min" | "max") => bound === null || (v !== null && (kind === "min" ? d(v).gte(bound) : d(v).lte(bound)));
    const filtered = rows.filter((r) => passes(r.r5y, min5y, "min") && passes(r.vol, maxVol, "max") && passes(r.dy, minYield, "min") && passes(r.pe, maxPe, "max"));
    filtered.sort((a, b) => {
      if (sort === "name") return dir === "asc" ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
      const av = a[sort];
      const bv = b[sort];
      if (av === null && bv === null) return a.name.localeCompare(b.name);
      if (av === null) return 1; // unknowns last, whichever direction
      if (bv === null) return -1;
      const c = d(av).cmp(d(bv));
      return (dir === "asc" ? c : -c) || a.name.localeCompare(b.name);
    });
    return { rows: filtered, universe: universe.length, withoutHistory, sectors: sectorRows, sort, dir, invalid };
  });
}

// --------------------------------------------------------------------------------- Cross-market compare

export const COMPARE_MAX = 3;

export interface CompareItem {
  id: string;
  name: string;
  symbol: string | null;
  market: string | null;
  currency: string;
  result: PerformanceResult | null;
}

export interface MarketComparison {
  lens: Lens;
  items: CompareItem[];
  common: {
    startMonth: string;
    endMonth: string;
    years: number;
    chart: Array<{ month: string } & Record<string, number | string | null>>;
    stats: Array<{ cumulative: string; annualized: string; volatility: string | null; maxDrawdown: string }>;
  } | null;
  calendar: Array<{ year: number; values: Array<{ value: string | null; real: string | null; ytd: boolean } | null> }>;
  /** Every instrument research may show, for the pickers. */
  options: Array<{ id: string; label: string; market: string | null }>;
}

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function compareMarkets(ctx: TenantContext, rawIds: string[], lens: Lens): Promise<MarketComparison> {
  if (lens === "local") throw new AppError("VALIDATION", "Choose one currency to compare in.");
  const ids = [...new Set(rawIds.filter((i) => uuid.test(i)))].slice(0, COMPARE_MAX);
  return withTenant(ctx, async (tx) => {
    const universe = await researchUniverse(tx);
    const allowed = new Map(universe.map((u) => [u.id, u]));
    const chosen = ids.filter((i) => allowed.has(i));
    const perf = await getPerformanceMany(tx, chosen, lens);
    const items: CompareItem[] = chosen.map((id) => {
      const u = allowed.get(id)!;
      const r = perf.get(id);
      return { id, name: u.name, symbol: u.symbol, market: u.market, currency: u.currency, result: r && r.asOf ? r : null };
    });
    const withData = items.filter((i) => i.result && i.result.growth.length > 1);
    let common: MarketComparison["common"] = null;
    if (withData.length >= 2 && withData.length === items.length) {
      const maps = withData.map((i) => new Map<string, ObservedValue>(i.result!.growth.map((p) => [p.date.slice(0, 7), { date: p.date, value: d(String(p.value)) }])));
      const w = commonWindow(maps);
      if (w) {
        common = {
          startMonth: w.startMonth,
          endMonth: w.endMonth,
          years: w.years,
          chart: w.months.map((month, mi) => Object.fromEntries([["month", month], ...w.rebased.map((vals, si) => [`s${si}`, Number(vals[mi]!.toFixed(4))])]) as { month: string } & Record<string, number>),
          stats: w.stats.map((s) => ({ cumulative: s.cumulative.toString(), annualized: s.annualized.toString(), volatility: s.volatility?.toString() ?? null, maxDrawdown: s.maxDrawdown.toString() })),
        };
      }
    }
    const years = [...new Set(items.flatMap((i) => i.result?.calendar.map((c) => c.year) ?? []))].sort((a, b) => b - a).slice(0, 10);
    const calendar = years.map((year) => ({
      year,
      values: items.map((i) => {
        const c = i.result?.calendar.find((x) => x.year === year);
        return c ? { value: c.value, real: c.real, ytd: c.ytd } : null;
      }),
    }));
    const options = universe.map((u) => ({ id: u.id, label: [u.name, u.symbol, u.currency].filter(Boolean).join(" · "), market: u.market }));
    return { lens, items, common, calendar, options };
  });
}
