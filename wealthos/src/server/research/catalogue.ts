import "server-only";
import { and, asc, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";
import { instrumentIdentifiers, instruments, marketDataSources, marketPrices, organizations, publishedRates } from "@/server/db/schema";
import { withTenant, type TenantContext, type Tx } from "@/server/db/client";
import { AppError } from "@/server/platform/errors";
import { ASSET_CLASS_LABELS, d, daysBetween, discountToTrueYield, simpleToEffectiveAnnual, trailingReturns, weeklySeries, type RateMethodology } from "@/engine";
import { factsSchema, type ProductFacts } from "./facts";
import { hiddenSourceKinds } from "./licence";

export type DataStatus = "current" | "stale" | "no_data";

export interface CatalogueRow {
  id: string;
  name: string;
  symbol: string | null;
  issuer: string | null;
  assetClass: string;
  assetClassLabel: string;
  currency: string;
  country: string;
  isPrivate: boolean;
  isSample: boolean;
  verification: string;
  latestPrice: { price: string; observedOn: string; methodology: string; synthetic: boolean } | null;
  priceStatus: DataStatus;
  rates: RateView[];
}

export interface RateView {
  methodology: RateMethodology;
  value: string;
  tenorDays: number | null;
  basis: string | null;
  asOf: string;
  sourceName: string;
  sourceUrl: string | null;
  verification: string;
  ageDays: number;
}

async function isDemoOrg(tx: Tx, orgId: string): Promise<boolean> {
  const [o] = await tx.select({ isDemo: organizations.isDemo }).from(organizations).where(eq(organizations.id, orgId)).limit(1);
  return Boolean(o?.isDemo);
}

async function latestPrices(tx: Tx, ids: string[]) {
  if (!ids.length) return new Map<string, { price: string; observedOn: string; methodology: string; synthetic: boolean }>();
  const rows = await tx.execute<{ instrument_id: string; price: string; observed_on: string; methodology: string; verification_state: string }>(sql`
    select distinct on (instrument_id) instrument_id, price::text, observed_on::text, methodology, verification_state::text
    from market_prices where instrument_id = any(${sql.param(ids)}::uuid[])
      and source_id not in (select id from market_data_sources where kind::text = any(${sql.param(hiddenSourceKinds() as string[])}::text[]))
    order by instrument_id, observed_on desc`);
  return new Map(rows.rows.map((r) => [r.instrument_id, { price: r.price, observedOn: r.observed_on, methodology: r.methodology, synthetic: r.verification_state === "synthetic" }]));
}

async function latestRates(tx: Tx, ids: string[], today: string): Promise<Map<string, RateView[]>> {
  const out = new Map<string, RateView[]>();
  if (!ids.length) return out;
  const rows = await tx.execute<{ instrument_id: string; methodology: RateMethodology; value: string; tenor_days: number | null; basis: string | null; as_of: string; source_name: string; source_url: string | null; verification_state: string }>(sql`
    select distinct on (r.instrument_id, r.methodology, r.tenor_days) r.instrument_id, r.methodology::text as methodology, r.value::text, r.tenor_days, r.basis, r.as_of::text, s.name as source_name, coalesce(r.source_url, s.url) as source_url, r.verification_state::text
    from published_rates r join market_data_sources s on s.id = r.source_id
    where r.instrument_id = any(${sql.param(ids)}::uuid[])
    order by r.instrument_id, r.methodology, r.tenor_days, r.as_of desc`);
  for (const r of rows.rows) {
    const list = out.get(r.instrument_id) ?? [];
    list.push({ methodology: r.methodology, value: r.value, tenorDays: r.tenor_days, basis: r.basis, asOf: r.as_of, sourceName: r.source_name, sourceUrl: r.source_url, verification: r.verification_state, ageDays: daysBetween(r.as_of, today) });
    out.set(r.instrument_id, list);
  }
  return out;
}

function statusOf(observedOn: string | undefined, staleAfterDays: number, today: string): DataStatus {
  if (!observedOn) return "no_data";
  return daysBetween(observedOn, today) > staleAfterDays ? "stale" : "current";
}

const uuidList = (ids: string[]) => ids.filter((i) => /^[0-9a-f-]{36}$/i.test(i));

export interface SearchFilters {
  q?: string;
  assetClass?: string;
  currency?: string;
  country?: string;
}

/** Search the catalogue visible to the organisation. SAMPLE instruments appear only inside demo portfolios. */
export async function searchCatalogue(ctx: TenantContext, f: SearchFilters): Promise<CatalogueRow[]> {
  const today = new Date().toISOString().slice(0, 10);
  return withTenant(ctx, async (tx) => {
    const demo = await isDemoOrg(tx, ctx.orgId);
    const conds = [];
    if (!demo) conds.push(eq(instruments.isDemo, false));
    if (f.q?.trim()) {
      const q = `%${f.q.trim().replace(/[%_\\]/g, (m) => `\\${m}`)}%`;
      conds.push(or(ilike(instruments.name, q), ilike(instruments.symbol, q), ilike(instruments.issuer, q)));
    }
    if (f.assetClass) conds.push(sql`${instruments.assetClass}::text = ${f.assetClass}`);
    if (f.currency) conds.push(eq(instruments.currency, f.currency));
    if (f.country) conds.push(eq(instruments.country, f.country));
    const rows = await tx.select().from(instruments).where(conds.length ? and(...conds) : undefined).orderBy(asc(instruments.name)).limit(200);
    const ids = rows.map((r) => r.id);
    const [prices, rates] = await Promise.all([latestPrices(tx, ids), latestRates(tx, ids, today)]);
    return rows.map((r) => {
      const lp = prices.get(r.id) ?? null;
      return {
        id: r.id,
        name: r.name,
        symbol: r.symbol,
        issuer: r.issuer,
        assetClass: r.assetClass,
        assetClassLabel: ASSET_CLASS_LABELS[r.assetClass as keyof typeof ASSET_CLASS_LABELS],
        currency: r.currency,
        country: r.country,
        isPrivate: Boolean(r.orgId),
        isSample: r.isDemo,
        verification: r.verificationState,
        latestPrice: lp,
        priceStatus: r.pricingModel === "discount_accrual" && !lp ? "no_data" : statusOf(lp?.observedOn, r.staleAfterDays, today),
        rates: rates.get(r.id) ?? [],
      };
    });
  });
}

export interface InstrumentDetail extends CatalogueRow {
  pricingModel: string;
  maturityDate: string | null;
  officialUrl: string | null;
  verifiedAt: string | null;
  facts: ProductFacts | null;
  factsSourceUrl: string | null;
  factsAsOf: string | null;
  identifiers: Array<{ scheme: string; value: string; verification: string }>;
  priceSource: { name: string; kind: string; licenseNote: string; url: string | null } | null;
  chart: Array<{ date: string; price: number }>;
  /**
   * Daily closes for the last ten years (the interactive chart), with the day's open, high, low and
   * volume where the source publishes them; `chart` stays weekly for tables and the assistant.
   */
  daily: Array<{ date: string; price: number; open: number | null; high: number | null; low: number | null; volume: number | null }>;
  trailing: Array<{ key: string; start: string; cumulative: string | null; annualized: string | null }>;
  rateHistory: RateView[];
}

const tenYearsBefore = (iso: string) => `${Number(iso.slice(0, 4)) - 10}${iso.slice(4)}`;

export async function getInstrument(ctx: TenantContext, id: string): Promise<InstrumentDetail> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw new AppError("NOT_FOUND", "Instrument not found.");
  const today = new Date().toISOString().slice(0, 10);
  return withTenant(ctx, async (tx) => {
    const [r] = await tx.select().from(instruments).where(eq(instruments.id, id)).limit(1);
    if (!r || (r.isDemo && !(await isDemoOrg(tx, ctx.orgId)))) throw new AppError("NOT_FOUND", "Instrument not found.");
    const series = await tx
      .select({ date: marketPrices.observedOn, price: marketPrices.price, open: marketPrices.open, high: marketPrices.high, low: marketPrices.low, volume: marketPrices.volume, sourceName: marketDataSources.name, sourceKind: marketDataSources.kind, license: marketDataSources.licenseNote, url: marketDataSources.url, verification: marketPrices.verificationState, methodology: marketPrices.methodology })
      .from(marketPrices)
      .innerJoin(marketDataSources, eq(marketDataSources.id, marketPrices.sourceId))
      .where(and(eq(marketPrices.instrumentId, id), ...hiddenSourceKinds().map((k) => sql`${marketDataSources.kind} <> ${k}`)))
      .orderBy(asc(marketPrices.observedOn));
    const last = series[series.length - 1];
    const points = series.map((p) => ({ date: p.date, price: d(p.price) }));
    const trailing = trailingReturns(points, today, Math.max(7, r.staleAfterDays));
    const rateRows = await tx
      .select({ methodology: publishedRates.methodology, value: publishedRates.value, tenorDays: publishedRates.tenorDays, basis: publishedRates.basis, asOf: publishedRates.asOf, sourceName: marketDataSources.name, sourceUrl: sql<string | null>`coalesce(${publishedRates.sourceUrl}, ${marketDataSources.url})`, verification: publishedRates.verificationState })
      .from(publishedRates)
      .innerJoin(marketDataSources, eq(marketDataSources.id, publishedRates.sourceId))
      .where(eq(publishedRates.instrumentId, id))
      .orderBy(desc(publishedRates.asOf))
      .limit(60);
    const ids = await tx.select().from(instrumentIdentifiers).where(eq(instrumentIdentifiers.instrumentId, id));
    const rateHistory = rateRows.map((x) => ({ ...x, methodology: x.methodology as RateMethodology, ageDays: daysBetween(x.asOf, today) }));
    const latestRatesList = [...new Map(rateHistory.map((x) => [`${x.methodology}|${x.tenorDays}`, x])).values()];
    const parsedFacts = factsSchema.safeParse(r.facts);
    const factsVisible = r.verificationState === "verified" && r.factsAsOf && parsedFacts.success && Object.keys(r.facts).length > 0;
    return {
      id: r.id,
      name: r.name,
      symbol: r.symbol,
      issuer: r.issuer,
      assetClass: r.assetClass,
      assetClassLabel: ASSET_CLASS_LABELS[r.assetClass as keyof typeof ASSET_CLASS_LABELS],
      currency: r.currency,
      country: r.country,
      isPrivate: Boolean(r.orgId),
      isSample: r.isDemo,
      verification: r.verificationState,
      latestPrice: last ? { price: last.price, observedOn: last.date, methodology: last.methodology, synthetic: last.verification === "synthetic" } : null,
      priceStatus: statusOf(last?.date, r.staleAfterDays, today),
      rates: latestRatesList,
      pricingModel: r.pricingModel,
      maturityDate: r.maturityDate,
      officialUrl: r.officialUrl,
      verifiedAt: r.verifiedAt?.toISOString() ?? null,
      facts: factsVisible ? parsedFacts.data : null,
      factsSourceUrl: factsVisible ? r.factsSourceUrl : null,
      factsAsOf: factsVisible ? r.factsAsOf : null,
      identifiers: ids.map((x) => ({ scheme: x.scheme, value: x.value, verification: x.verificationState })),
      priceSource: last ? { name: last.sourceName, kind: last.sourceKind, licenseNote: last.license, url: last.url } : null,
      chart: weeklySeries(points).map((p) => ({ date: p.date, price: p.price.toNumber() })),
      daily: series
        .filter((p) => p.date >= tenYearsBefore(today))
        .map((p) => ({ date: p.date, price: Number(p.price), open: p.open === null ? null : Number(p.open), high: p.high === null ? null : Number(p.high), low: p.low === null ? null : Number(p.low), volume: p.volume === null ? null : Number(p.volume) })),
      trailing: trailing.map((t) => ({ key: t.key, start: t.start, cumulative: t.cumulative?.toFixed(8) ?? null, annualized: t.annualized?.toFixed(8) ?? null })),
      rateHistory,
    };
  });
}

export interface ComparedRate extends RateView {
  /** Mathematically derived equivalents (e.g. discount rate → true yield), labelled as derived. */
  derived: Array<{ methodology: RateMethodology; value: string; formula: string }>;
}

/** Derive comparable equivalents where an exact conversion exists; otherwise none. */
export function deriveEquivalents(r: RateView): ComparedRate["derived"] {
  if (r.methodology === "discount_rate" && r.tenorDays && r.tenorDays > 0) {
    const t = discountToTrueYield(d(r.value), r.tenorDays);
    return [
      { methodology: "true_yield", value: t.toFixed(10), formula: `d ÷ (1 − d × ${r.tenorDays}/365)` },
      { methodology: "effective_annual_yield", value: simpleToEffectiveAnnual(t, r.tenorDays).toFixed(10), formula: `(1 + y × ${r.tenorDays}/365)^(365/${r.tenorDays}) − 1` },
    ];
  }
  if (r.methodology === "true_yield" && r.tenorDays && r.tenorDays > 0) {
    return [{ methodology: "effective_annual_yield", value: simpleToEffectiveAnnual(d(r.value), r.tenorDays).toFixed(10), formula: `(1 + y × ${r.tenorDays}/365)^(365/${r.tenorDays}) − 1` }];
  }
  return [];
}

export async function compareInstruments(ctx: TenantContext, rawIds: string[]) {
  const ids = [...new Set(uuidList(rawIds))].slice(0, 4);
  if (ids.length < 2) throw new AppError("VALIDATION", "Choose at least two instruments to compare.");
  const details = [];
  for (const id of ids) details.push(await getInstrument(ctx, id));
  const methodologies = [...new Set(details.flatMap((x) => [...x.rates.map((r) => r.methodology), ...x.rates.flatMap((r) => deriveEquivalents(r).map((e) => e.methodology))]))];
  return {
    instruments: details.map((x) => ({ ...x, rates: x.rates.map((r) => ({ ...r, derived: deriveEquivalents(r) })) })),
    methodologies,
    currencies: [...new Set(details.map((x) => x.currency))],
  };
}

export async function instrumentsByIds(ctx: TenantContext, ids: string[]) {
  const clean = uuidList(ids);
  if (!clean.length) return [];
  return withTenant(ctx, (tx) => tx.select({ id: instruments.id, name: instruments.name, symbol: instruments.symbol }).from(instruments).where(inArray(instruments.id, clean)));
}
