import "server-only";
import type { TenantContext } from "@/server/db/client";
import { getFixedIncome, getMacroOverview, type ChartRow, type SourceRef } from "./markets";

/**
 * The market snapshot: the handful of official figures a Nigerian investor checks every day
 * (naira exchange rates, inflation, policy rates, Treasury bill yields), each with its as-of date,
 * source and a two-year trend. Shown on the dashboard and given to the assistant.
 *
 * Official data (CBN, Federal Reserve, Bank of England, ONS, BLS), plus the FGN 10-year market
 * yield where licensed data may be shown (EODHD; never on the demo). It is the same for every
 * person in a deployment, so it is computed once and kept for ten minutes. Any part that fails to load is left
 * out (and the snapshot says what is missing) rather than failing the page.
 */
export interface SnapshotTile {
  key: string;
  label: string;
  /** Decimal string: a rate as a fraction ("0.1463"), or naira per unit for an exchange rate. */
  value: string | null;
  unit: "percent" | "naira";
  asOf: string | null;
  /** What `asOf` means in words: a day for daily data, a month for monthly. */
  asOfKind: "day" | "month";
  /** The same measure a year earlier, as a decimal string (rates) or the relative change (FX). */
  yearAgo: string | null;
  change1y: string | null;
  /** Monthly values for the last two years (presentation numbers). */
  trend: number[];
  source: string | null;
  href: string;
  note?: string;
}

export interface MarketSnapshot {
  tiles: SnapshotTile[];
  sources: SourceRef[];
  missing: string[];
  builtAt: string;
}

const TTL_MS = 10 * 60_000;
let cache: { at: number; value: MarketSnapshot } | null = null;
let inflight: Promise<MarketSnapshot> | null = null;

const trendOf = (rows: ChartRow[], key: string, months = 24) =>
  rows
    .slice(-months)
    .map((r) => r[key])
    .filter((v): v is number => typeof v === "number");

async function build(ctx: TenantContext): Promise<MarketSnapshot> {
  const missing: string[] = [];
  const [macro, fixed] = await Promise.all([
    getMacroOverview(ctx).catch((e) => {
      console.error("[snapshot] macro", String(e).slice(0, 200));
      missing.push("exchange rates, inflation and policy rates");
      return null;
    }),
    getFixedIncome(ctx).catch((e) => {
      console.error("[snapshot] fixed income", String(e).slice(0, 200));
      missing.push("Treasury bill yields");
      return null;
    }),
  ]);
  const tiles: SnapshotTile[] = [];

  if (macro) {
    for (const [c, label] of [
      ["USD", "US dollar"],
      ["GBP", "British pound"],
      ["EUR", "Euro"],
    ] as const) {
      const fx = macro.fx.latest.find((x) => x.key === `${c}/NGN`);
      tiles.push({ key: `${c}/NGN`, label: `${label} · ${c}/NGN`, value: fx?.value ?? null, unit: "naira", asOf: fx?.asOf ?? null, asOfKind: "day", yearAgo: fx?.yearAgo ?? null, change1y: fx?.change1y ?? null, trend: trendOf(macro.fx.chart, c.toLowerCase()), source: fx?.source?.name ?? null, href: "/research/macro", note: "Official CBN rate. A rise means the naira buys less." });
    }
    const infl = macro.inflation.latest.find((x) => x.key === "NG.CPI_YOY");
    tiles.push({ key: "NG.CPI_YOY", label: "Nigeria inflation", value: infl?.value ?? null, unit: "percent", asOf: infl?.asOf ?? null, asOfKind: "month", yearAgo: infl?.yearAgo ?? null, change1y: null, trend: trendOf(macro.inflation.chart, "ng"), source: infl?.source?.name ?? null, href: "/research/macro", note: "Headline consumer prices, year on year." });
    const mpr = macro.policy.latest.find((x) => x.key === "NG.MPR");
    tiles.push({ key: "NG.MPR", label: "CBN policy rate", value: mpr?.value ?? null, unit: "percent", asOf: mpr?.asOf ?? null, asOfKind: "month", yearAgo: mpr?.yearAgo ?? null, change1y: null, trend: trendOf(macro.policy.chart, "ng"), source: mpr?.source?.name ?? null, href: "/research/macro", note: "Monetary Policy Rate." });
    const real = macro.policy.real.find((x) => x.country === "Nigeria");
    const realTrend = macro.policy.chart.slice(-24).flatMap((r) => {
      const i = macro.inflation.chart.find((x) => x.month === r.month)?.ng;
      return typeof r.ng === "number" && typeof i === "number" ? [(1 + r.ng) / (1 + i) - 1] : [];
    });
    tiles.push({ key: "NG.REAL", label: "Real policy rate", value: real?.real ?? null, unit: "percent", asOf: real?.asOf ?? null, asOfKind: "month", yearAgo: null, change1y: null, trend: realTrend, source: "Computed from CBN data", href: "/research/macro", note: "(1 + policy rate) ÷ (1 + inflation) − 1. Positive means above inflation." });
    const fed = macro.policy.latest.find((x) => x.key === "US.FEDFUNDS");
    tiles.push({ key: "US.FEDFUNDS", label: "US fed funds rate", value: fed?.value ?? null, unit: "percent", asOf: fed?.asOf ?? null, asOfKind: "day", yearAgo: fed?.yearAgo ?? null, change1y: null, trend: trendOf(macro.policy.chart, "us"), source: fed?.source?.name ?? null, href: "/research/macro", note: "Effective federal funds rate." });
  }

  if (fixed) {
    const bill = fixed.ntb.find((x) => x.tenorDays !== null && x.tenorDays >= 350) ?? fixed.ntb.at(-1);
    const trendKey = bill?.tenorDays && bill.tenorDays >= 350 ? "364" : bill?.tenorDays ? String(bill.tenorDays) : "364";
    tiles.push({ key: "NG.NTB", label: bill?.tenorDays ? `${bill.tenorDays}-day T-bill yield` : "T-bill yield", value: bill?.effectiveAnnual ?? bill?.trueYield ?? null, unit: "percent", asOf: bill?.asOf ?? null, asOfKind: "day", yearAgo: null, change1y: null, trend: trendOf(fixed.ntbChart, trendKey), source: fixed.source?.name ?? null, href: "/research/fixed-income", note: "Effective annual yield from the latest CBN primary auction stop rate." });
  }

  // The FGN 10-year market yield: only where it is loaded and may be shown (never counted missing).
  const ng10 = fixed?.marketYields?.latest.find((y) => y.country === "NG");
  if (fixed?.marketYields && ng10?.value) {
    tiles.push({ key: "NG.GB10Y", label: "FGN 10-year yield", value: ng10.value, unit: "percent", asOf: ng10.asOf, asOfKind: "day", yearAgo: ng10.yearAgo, change1y: null, trend: trendOf(fixed.marketYields.chart, "ng"), source: ng10.source?.name ?? null, href: "/research/fixed-income", note: "What the 10-year FGN bond yields in the market, end of day." });
  }

  const sources = [...(macro?.sources ?? [])];
  for (const src of [fixed?.source, ng10 ? fixed?.marketYields?.source : null]) if (src && !sources.some((s) => s.name === src.name)) sources.push(src);
  return { tiles, sources, missing, builtAt: new Date().toISOString() };
}

/** The snapshot, at most ten minutes old. Never throws: a failure gives an empty snapshot with the reason. */
export async function getMarketSnapshot(ctx: TenantContext): Promise<MarketSnapshot> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.value;
  if (!inflight) {
    inflight = build(ctx)
      .then((value) => {
        // Only a complete snapshot is kept; a partial one is retried on the next request.
        if (!value.missing.length) cache = { at: Date.now(), value };
        return value;
      })
      .catch((e) => {
        console.error("[snapshot]", String(e).slice(0, 200));
        return { tiles: [], sources: [], missing: ["market data"], builtAt: new Date().toISOString() } satisfies MarketSnapshot;
      })
      .finally(() => {
        inflight = null;
      });
  }
  return inflight;
}

/** For tests. */
export function clearMarketSnapshotCache() {
  cache = null;
}
