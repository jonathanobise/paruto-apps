import "server-only";
import { withTenant } from "@/server/db/client";
import { d } from "@/engine";
import { getFixedIncome, getInstrumentPerformance, getMacroOverview, getScoreboard, type ChartRow } from "@/server/research/markets";
import { getMarketSnapshot } from "@/server/research/snapshot";
import { MARKETS, SORTS, compareMarkets, researchUniverse, runScreener } from "@/server/research/screener";
import { BACKTEST_MAX_HOLDINGS, backtest } from "@/server/research/backtest";
import type { PerformanceResult, WindowView } from "@/server/research/performance";
import type { ToolDef, ToolOutput } from "./tools";

/**
 * Research tools: the assistant reads the same official and licensed market data, through the same
 * services (and the same licence filtering), as the research pages. Read-only, no personal data.
 * Each needs its research feature to be available in the organisation's jurisdiction
 * (MARKET_RESEARCH, PORTFOLIO_BACKTEST), exactly like the pages.
 *
 * Every rate and return is given as a percentage string ("14.63%"), so the model never converts
 * fractions; amounts stay decimal strings. Nothing here ranks or recommends: the screener sorts
 * only by what the person asked for.
 */
const schema = (properties: Record<string, unknown>, required = Object.keys(properties)) => ({ type: "object" as const, properties, required, additionalProperties: false });
const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const pct = (v: string | null | undefined, places = 2) => (v === null || v === undefined ? null : `${d(v).times(100).toFixed(places)}%`);
const LENS = { type: "string", enum: ["NGN", "USD", "GBP"], description: "Currency to measure returns in (the person spends in naira unless they say otherwise)." };
type LensArg = "NGN" | "USD" | "GBP";
const lensOf = (v: unknown): LensArg => (v === "USD" || v === "GBP" ? v : "NGN");
const sourcesOf = (list: Array<{ name: string; url?: string | null }>, asOf?: string | null) => list.map((s) => ({ kind: "market-data", label: s.name, asOf: asOf ?? null, url: s.url ?? null }));

const windows = (ws: WindowView[]) => ws.map((w) => ({ window: w.key, total: pct(w.cumulative), aYear: pct(w.annualized), from: w.startMonth, to: w.endMonth }));
/** A compact performance record (no chart series). */
function perfView(r: PerformanceResult) {
  return {
    currency: r.currency,
    measuredIn: r.lens,
    totalReturn: r.totalReturn ? "yes (income reinvested)" : "price only",
    dataFrom: r.firstDate,
    asOf: r.asOf,
    trailing: windows(r.trailing),
    realTrailing: windows(r.realTrailing),
    realBasis: r.realBasis,
    calendarYears: r.calendar.slice(-10).map((c) => ({ year: c.year, return: pct(c.value), real: pct(c.real), yearToDate: c.ytd })),
    sinceStart: r.sinceStart ? { aYear: pct(r.sinceStart.annualized), total: pct(r.sinceStart.cumulative), years: r.sinceStart.years } : null,
    risk: { volatility3yAYear: pct(r.risk.volatility3y), worstFall: pct(r.risk.maxDrawdown), worstFallFrom: r.risk.drawdownPeak, worstFallTo: r.risk.drawdownTrough, recovered: r.risk.drawdownRecovered, monthsUp: pct(r.risk.positiveMonths, 0) },
    dividendYield12m: pct(r.dividendYield12m),
    notes: r.notes,
  };
}

const MACRO_SERIES: Record<string, { label: string; chart: "inflation" | "policy" | "fx" | "breakdown"; key: string; unit: "percent" | "naira" }> = {
  nigeria_inflation: { label: "Nigeria headline inflation, year on year", chart: "inflation", key: "ng", unit: "percent" },
  nigeria_food_inflation: { label: "Nigeria food inflation, year on year", chart: "breakdown", key: "food", unit: "percent" },
  nigeria_core_inflation: { label: "Nigeria core inflation, year on year", chart: "breakdown", key: "core", unit: "percent" },
  us_inflation: { label: "US inflation (CPI-U), year on year", chart: "inflation", key: "us", unit: "percent" },
  uk_inflation: { label: "UK inflation (CPI), year on year", chart: "inflation", key: "uk", unit: "percent" },
  nigeria_policy_rate: { label: "CBN Monetary Policy Rate", chart: "policy", key: "ng", unit: "percent" },
  us_fed_funds: { label: "US effective federal funds rate", chart: "policy", key: "us", unit: "percent" },
  uk_bank_rate: { label: "Bank of England Bank Rate", chart: "policy", key: "uk", unit: "percent" },
  usd_ngn: { label: "Official naira per US dollar (CBN, month end)", chart: "fx", key: "usd", unit: "naira" },
  gbp_ngn: { label: "Official naira per pound (CBN, month end)", chart: "fx", key: "gbp", unit: "naira" },
  eur_ngn: { label: "Official naira per euro (CBN, month end)", chart: "fx", key: "eur", unit: "naira" },
};

export const RESEARCH_TOOLS: Record<string, ToolDef> = {
  get_market_snapshot: {
    personal: false,
    feature: "research",
    definition: {
      name: "get_market_snapshot",
      description: "Today's key official figures for Nigeria: CBN official USD, GBP and EUR exchange rates against the naira (with the change over a year), Nigeria's inflation, the CBN policy rate, the real policy rate, the US fed funds rate and the latest one-year Treasury bill yield. Each has its as-of date and source.",
      input_schema: schema({}),
      strict: true,
    },
    run: async (ctx) => {
      const snap = await getMarketSnapshot(ctx);
      return {
        data: snap.tiles.map((t) => ({ figure: t.label, value: t.value === null ? null : t.unit === "naira" ? `₦${d(t.value).toFixed(2)}` : pct(t.value), asOf: t.asOf, aYearEarlier: t.unit === "naira" ? null : pct(t.yearAgo), changeOverAYear: t.unit === "naira" ? pct(t.change1y) : null, source: t.source, meaning: t.note })),
        sources: snap.tiles.filter((t) => t.source).map((t) => ({ kind: "market-data", label: `${t.label}: ${t.source}`, asOf: t.asOf })),
        notes: [...(snap.missing.length ? [`Not loaded right now: ${snap.missing.join(", ")}.`] : []), "For exchange rates, a positive change means the naira buys less of the foreign currency (it weakened)."],
      };
    },
  },
  get_macro_history: {
    personal: false,
    feature: "research",
    definition: {
      name: "get_macro_history",
      description: "Monthly history of one official economic series (inflation, policy rates or the naira's official exchange rates) for the last `months` months, from the official publisher.",
      input_schema: schema({
        series: { type: "string", enum: Object.keys(MACRO_SERIES), description: "Which series." },
        months: { type: "integer", description: "How many months back, 1-180." },
      }),
      strict: true,
    },
    run: async (ctx, input) => {
      const spec = MACRO_SERIES[String(input.series)];
      if (!spec) throw new Error(`series must be one of: ${Object.keys(MACRO_SERIES).join(", ")}`);
      const months = Math.max(1, Math.min(180, Number(input.months) || 24));
      const m = await getMacroOverview(ctx);
      const chart: ChartRow[] = spec.chart === "inflation" ? m.inflation.chart : spec.chart === "breakdown" ? m.inflation.ngBreakdown : spec.chart === "policy" ? m.policy.chart : m.fx.chart;
      const rows = chart.filter((r) => typeof r[spec.key] === "number").slice(-months);
      return {
        data: { series: spec.label, monthly: rows.map((r) => ({ month: r.month, value: spec.unit === "naira" ? `₦${(r[spec.key] as number).toFixed(2)}` : `${((r[spec.key] as number) * 100).toFixed(2)}%` })) },
        sources: sourcesOf(m.sources, rows.at(-1)?.month as string | undefined),
        notes: [...(spec.chart === "fx" ? [m.fx.methodology] : []), ...m.inflation.notes, ...(spec.chart === "breakdown" ? ["From January 2025 the NBS rebased the CPI (base year 2024), so year-on-year rates either side of that change are not strictly comparable."] : [])],
      };
    },
  },
  get_fixed_income: {
    personal: false,
    feature: "research",
    definition: {
      name: "get_fixed_income",
      description: "Nigerian fixed income: from the CBN, the latest Treasury bill auction stop rates (bank-discount basis) with the true and effective annual yields worked out from them, FGN bond auction results (to mid-2023), money-market and bank rates and the latest inflation; and, where available, the daily market yield of the 10-year FGN bond with the US and UK 10-year yields for context.",
      input_schema: schema({}),
      strict: true,
    },
    run: async (ctx) => {
      const f = await getFixedIncome(ctx);
      const auction = (a: (typeof f.ntb)[number]) => ({ name: a.name, tenorDays: a.tenorDays, asOf: a.asOf, quoted: `${pct(a.value)} (${a.methodology.replace(/_/g, " ")})`, trueYield: pct(a.trueYield), effectiveAnnualYield: pct(a.effectiveAnnual), realApprox: pct(a.realApprox) });
      return {
        data: {
          treasuryBills: f.ntb.map(auction),
          fgnBonds: f.bonds.map(auction),
          lastBondAuctionInSource: f.lastBondAuction,
          moneyMarket: f.moneyMarket.map((x) => ({ rate: x.name, value: pct(x.value), asOf: x.asOf, aYearEarlier: pct(x.yearAgo) })),
          inflation: f.inflation ? { value: pct(f.inflation.value), asOf: f.inflation.asOf } : null,
          tenYearMarketYields: f.marketYields ? f.marketYields.latest.map((y) => ({ bond: y.name, yield: pct(y.value), asOf: y.asOf, aYearEarlier: pct(y.yearAgo), realApprox: pct(y.realApprox) })) : null,
        },
        sources: [
          ...(f.source ? [{ kind: "market-data" as const, label: f.source.name, asOf: f.ntb.at(-1)?.asOf ?? null, url: f.source.url }] : []),
          ...(f.marketYields ? [{ kind: "market-data" as const, label: f.marketYields.source.name, asOf: f.marketYields.latest[0]?.asOf ?? null, url: f.marketYields.source.url }] : []),
        ],
        notes: [
          "A T-bill stop rate is a bank-discount rate; the true yield and the effective annual yield are different measures. Keep them distinct.",
          "Real yields are approximate: inflation is backward-looking.",
          ...(f.lastBondAuction ? [`The CBN's FGN bond auction results end on ${f.lastBondAuction}; later auctions are run by the DMO and are not a source here.${f.marketYields ? " For the current level use the 10-year market yield, which is a secondary-market yield, not an auction result." : ""}`] : []),
          ...(f.marketYields ? ["Bond yields are in each bond's own currency; don't compare them as if they were returns in one currency."] : []),
        ],
      };
    },
  },
  get_asset_class_returns: {
    personal: false,
    feature: "research",
    definition: {
      name: "get_asset_class_returns",
      description: "Long-run total returns of the main asset classes (Nigerian Treasury bills, and where licensed data is available US and UK shares and bonds, global and emerging-market shares, gold and others), measured in one currency, before and after that currency's inflation, with the worst fall.",
      input_schema: schema({ currency: LENS }),
      strict: true,
    },
    run: async (ctx, input) => {
      const board = await getScoreboard(ctx, lensOf(input.currency));
      const rows = board.rows.filter((r) => r.result);
      return {
        data: {
          measuredIn: lensOf(input.currency),
          assetClasses: rows.map((r) => ({ assetClass: r.label, represented: r.symbol ?? r.name, ...perfView(r.result!) })),
          awaitingData: board.rows.filter((r) => !r.result).map((r) => r.label),
        },
        sources: rows.flatMap((r) => sourcesOf(r.result!.sources, r.result!.asOf)).filter((s, i, a) => a.findIndex((x) => x.label === s.label) === i),
        notes: ["Past performance is not a reliable indicator of future results.", ...(board.licensedHidden ? ["Licensed market data is not shown on this deployment, so some asset classes are missing."] : [])],
      };
    },
  },
  find_research_instruments: {
    personal: false,
    feature: "research",
    definition: {
      name: "find_research_instruments",
      description: "Find real instruments with price history that the research tools can measure (shares, ETFs, funds, indices), by name or ticker, optionally within a market. Returns the ids that get_instrument_performance, compare_instruments and run_backtest take.",
      input_schema: schema({ query: { type: "string", description: "Name or ticker (may be empty to list a market)." }, market: { type: "string", enum: ["any", ...Object.keys(MARKETS)] } }),
      strict: true,
    },
    run: async (ctx, input) => {
      const market = String(input.market) === "any" ? undefined : String(input.market);
      const rows = await withTenant(ctx, (tx) => researchUniverse(tx, { q: String(input.query ?? "").slice(0, 80) || undefined, market }));
      return { data: rows.slice(0, 15).map((u) => ({ id: u.id, name: u.name, symbol: u.symbol, market: u.market, assetClass: u.assetClass, currency: u.currency })), sources: [], notes: rows.length > 15 ? [`${rows.length} matches; showing 15. Narrow the search.`] : [] };
    },
  },
  get_instrument_performance: {
    personal: false,
    feature: "research",
    definition: {
      name: "get_instrument_performance",
      description: "Long-run performance of one instrument (id from find_research_instruments or search_instruments), measured in one currency at same-day official exchange rates: trailing returns over 1, 3, 5 and 10 years, after-inflation returns, calendar years, volatility, the worst fall and the 12-month dividend yield.",
      input_schema: schema({ instrument_id: { type: "string" }, currency: LENS }),
      strict: true,
    },
    run: async (ctx, input) => {
      if (!uuidRe.test(String(input.instrument_id))) throw new Error("instrument_id must be an id returned by find_research_instruments or search_instruments");
      const r = await getInstrumentPerformance(ctx, String(input.instrument_id), lensOf(input.currency));
      if (!r) return { data: null, sources: [], notes: ["No price history for this instrument in that currency (or its data may not be shown here)."] };
      return { data: perfView(r), sources: sourcesOf(r.sources, r.asOf), notes: ["Past performance is not a reliable indicator of future results."] };
    },
  },
  screen_instruments: {
    personal: false,
    feature: "research",
    definition: {
      name: "screen_instruments",
      description: `Filter real instruments by market, past returns, volatility, dividend yield or valuation, sorted by the measure the person chose. There is no default ranking: sort only by what the person asked for, and present results as a filtered list, never as recommendations or "top picks". Sorts: ${Object.entries(SORTS).map(([k, v]) => `${k} (${v})`).join(", ")}.`,
      input_schema: schema(
        {
          currency: LENS,
          market: { type: "string", enum: ["any", ...Object.keys(MARKETS)] },
          query: { type: "string", description: "Optional name or ticker filter (empty for none)." },
          min_5y_return_percent: { type: "string", description: "Optional minimum 5-year return a year, e.g. \"8\" (empty for none)." },
          max_volatility_percent: { type: "string", description: "Optional maximum 3-year volatility, e.g. \"20\" (empty for none)." },
          min_dividend_yield_percent: { type: "string", description: "Optional, e.g. \"3\" (empty for none)." },
          sort: { type: "string", enum: Object.keys(SORTS) },
          direction: { type: "string", enum: ["asc", "desc"] },
        },
        ["currency", "market", "query", "min_5y_return_percent", "max_volatility_percent", "min_dividend_yield_percent", "sort", "direction"],
      ),
      strict: true,
    },
    run: async (ctx, input) => {
      const opt = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : undefined);
      const r = await runScreener(ctx, {
        lens: lensOf(input.currency),
        market: String(input.market) === "any" ? undefined : String(input.market),
        q: opt(input.query),
        min5y: opt(input.min_5y_return_percent),
        maxVol: opt(input.max_volatility_percent),
        minYield: opt(input.min_dividend_yield_percent),
        sort: String(input.sort),
        dir: String(input.direction),
      });
      if (r.invalid.length) throw new Error(`Invalid filters: ${r.invalid.join("; ")}`);
      return {
        data: {
          matches: r.rows.length,
          inUniverse: r.universe,
          withoutHistory: r.withoutHistory,
          sortedBy: `${SORTS[r.sort]} (${r.dir})`,
          rows: r.rows.slice(0, 20).map((x) => ({ id: x.id, name: x.name, symbol: x.symbol, market: x.market, assetClass: x.assetClassLabel, currency: x.currency, return1y: pct(x.r1y), return3yAYear: pct(x.r3y), return5yAYear: pct(x.r5y), return10yAYear: pct(x.r10y), real5yAYear: pct(x.real5y), volatility3y: pct(x.vol), worstFall: pct(x.dd), dividendYield: pct(x.dy), priceToEarnings: x.pe, asOf: x.asOf })),
        },
        sources: [{ kind: "calculation", label: "Research screener (same data as /research/screener)" }],
        notes: ["A filtered list sorted by the chosen measure, not a recommendation. Past performance is not a reliable indicator of future results.", ...(r.rows.length > 20 ? [`${r.rows.length} matches; showing the first 20.`] : [])],
      };
    },
  },
  compare_instruments: {
    personal: false,
    feature: "research",
    definition: {
      name: "compare_instruments",
      description: "Compare up to three instruments over their common period, in one currency: total and yearly return, volatility, worst fall, and calendar years side by side.",
      input_schema: schema({ instrument_ids: { type: "array", items: { type: "string" }, description: "One to three ids from find_research_instruments." }, currency: LENS }),
      strict: true,
    },
    run: async (ctx, input) => {
      const ids = (Array.isArray(input.instrument_ids) ? input.instrument_ids : []).map(String).filter((i) => uuidRe.test(i)).slice(0, 3);
      if (!ids.length) throw new Error("Give one to three instrument ids from find_research_instruments.");
      const c = await compareMarkets(ctx, ids, lensOf(input.currency));
      return {
        data: {
          measuredIn: c.lens,
          commonPeriod: c.common ? { from: c.common.startMonth, to: c.common.endMonth, years: c.common.years } : null,
          instruments: c.items.map((it, i) => ({ id: it.id, name: it.name, symbol: it.symbol, market: it.market, stats: c.common?.stats[i] ? { total: pct(c.common.stats[i]!.cumulative), aYear: pct(c.common.stats[i]!.annualized), volatility: pct(c.common.stats[i]!.volatility), worstFall: pct(c.common.stats[i]!.maxDrawdown) } : null })),
          calendarYears: c.calendar.slice(-10).map((y) => ({ year: y.year, values: y.values.map((v) => (v ? { return: pct(v.value), real: pct(v.real), yearToDate: v.ytd } : null)) })),
        },
        sources: c.items.flatMap((it) => (it.result ? sourcesOf(it.result.sources, it.result.asOf) : [])).filter((s, i, a) => a.findIndex((x) => x.label === s.label) === i),
        notes: [...(c.common ? [] : ["These instruments have no period of history in common in that currency."]), "Past performance is not a reliable indicator of future results."],
      };
    },
  },
  run_backtest: {
    personal: false,
    feature: "backtest",
    definition: {
      name: "run_backtest",
      description: `Hypothetical backtest of a mix the PERSON chose (never suggest weights): up to ${BACKTEST_MAX_HOLDINGS} instruments with weights adding to 100, one currency, a starting amount, optional monthly additions and rebalancing, against an optional benchmark with the same cash flows. Returns time- and money-weighted returns, the real return, volatility, the worst fall and calendar years. A hypothetical illustration of the past, not a forecast.`,
      input_schema: schema(
        {
          holdings: { type: "array", items: { type: "object", properties: { instrument_id: { type: "string" }, weight_percent: { type: "string" } }, required: ["instrument_id", "weight_percent"], additionalProperties: false } },
          currency: LENS,
          starting_amount: { type: "string", description: "e.g. \"1000000\"" },
          monthly_addition: { type: "string", description: "\"0\" for none." },
          rebalance: { type: "string", enum: ["none", "monthly", "quarterly", "annually"] },
          start_year: { type: "string", description: "Four-digit year, or empty for the earliest common start." },
          benchmark_id: { type: "string", description: "Optional instrument id to compare against, or empty." },
        },
        ["holdings", "currency", "starting_amount", "monthly_addition", "rebalance", "start_year", "benchmark_id"],
      ),
      strict: true,
    },
    run: async (ctx, input): Promise<ToolOutput> => {
      const holdings = (Array.isArray(input.holdings) ? input.holdings : []) as Array<{ instrument_id?: unknown; weight_percent?: unknown }>;
      const out = await backtest(ctx, {
        lens: lensOf(input.currency),
        holdings: holdings.map((h) => ({ id: String(h.instrument_id ?? ""), weight: String(h.weight_percent ?? "") })),
        initial: String(input.starting_amount ?? ""),
        contribution: String(input.monthly_addition ?? "0") || "0",
        rebalance: (["none", "monthly", "quarterly", "annually"] as const).find((r) => r === input.rebalance) ?? "none",
        ...(/^\d{4}$/.test(String(input.start_year ?? "")) ? { startYear: String(input.start_year) } : {}),
        ...(uuidRe.test(String(input.benchmark_id ?? "")) ? { benchmarkId: String(input.benchmark_id) } : {}),
      });
      if (!out.ok) throw new Error(out.errors.join(" "));
      const sum = (s: typeof out.portfolio) => ({ finalValue: s.finalValue, totalPaidIn: s.totalInvested, gain: s.gain, timeWeightedTotal: pct(s.twrCumulative), timeWeightedAYear: pct(s.twrAnnualized), moneyWeightedAYear: pct(s.moneyWeighted), realAYear: s.real ? `${pct(s.real.annualized)} (${s.real.from} to ${s.real.to})` : null, volatility: pct(s.volatility), worstFall: pct(s.maxDrawdown), bestYear: s.bestYear ? `${s.bestYear.year}: ${pct(s.bestYear.value)}` : null, worstYear: s.worstYear ? `${s.worstYear.year}: ${pct(s.worstYear.value)}` : null });
      return {
        data: {
          measuredIn: out.lens,
          period: { from: out.startMonth, to: out.endMonth, years: out.years },
          rebalancing: out.rebalanceLabel,
          holdings: out.holdings.map((h) => ({ name: h.name, symbol: h.symbol, targetWeight: pct(h.target), endWeight: pct(h.end) })),
          portfolio: sum(out.portfolio),
          benchmark: out.benchmark ? { name: out.benchmark.name, ...sum(out.benchmark) } : null,
        },
        sources: out.sources.map((s) => ({ kind: "market-data", label: s })),
        notes: ["Hypothetical: a back-tested illustration of a mix the person chose, not a forecast or a recommendation. Past performance is not a reliable indicator of future results.", ...out.notes],
      };
    },
  },
};
