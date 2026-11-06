import "server-only";
import { z } from "zod";
import { REBALANCE_LABELS, annualizeOverYears, d, inflationFromIndex, inflationFromYoY, runBacktest, shiftMonth, type BacktestResult, type Decimal, type Rebalance } from "@/engine";
import { withTenant, type TenantContext } from "@/server/db/client";
import { formatMoney } from "@/lib/format";
import { getPerformanceMany, inflationFor, type Lens } from "./performance";
import { researchUniverse } from "./screener";

/**
 * Hypothetical backtest of a user-chosen mix of research instruments, in one currency, on
 * month-end total-return levels. Stateless: inputs come from the URL and nothing is stored.
 * A hypothetical illustration of the past, not a forecast or a recommendation.
 */

export const BACKTEST_MAX_HOLDINGS = 6;
const money = z.string().trim().transform((s) => s.replace(/[,\s₦$£]/g, "")).pipe(z.string().regex(/^\d{1,13}(\.\d{1,2})?$/, "Enter an amount, e.g. 1000000"));

export const backtestSchema = z.object({
  lens: z.enum(["NGN", "USD", "GBP"]),
  holdings: z
    .array(z.object({ id: z.uuid(), weight: z.string().trim().regex(/^\d{1,3}(\.\d{1,2})?$/, "Weights are percentages, e.g. 60") }))
    .min(1, "Add at least one holding.")
    .max(BACKTEST_MAX_HOLDINGS, `Up to ${BACKTEST_MAX_HOLDINGS} holdings.`)
    .refine((h) => new Set(h.map((x) => x.id)).size === h.length, "Each instrument can appear once.")
    .refine((h) => h.every((x) => d(x.weight).gt(0)), "Every weight must be above zero.")
    .refine((h) => h.reduce((a, x) => a.plus(d(x.weight)), d(0)).minus(100).abs().lte("0.01"), "Weights must add up to 100%."),
  initial: money,
  contribution: money,
  rebalance: z.enum(["none", "monthly", "quarterly", "annually"]),
  startYear: z.string().regex(/^\d{4}$/).optional(),
  benchmarkId: z.uuid().optional(),
});
export type BacktestRequest = z.input<typeof backtestSchema>;

export interface BacktestSummary {
  finalValue: string;
  totalInvested: string;
  gain: string;
  twrCumulative: string;
  twrAnnualized: string;
  moneyWeighted: string | null;
  volatility: string | null;
  maxDrawdown: string;
  drawdownPeak: string | null;
  drawdownTrough: string | null;
  bestYear: { year: number; value: string; partial: boolean } | null;
  worstYear: { year: number; value: string; partial: boolean } | null;
  calendar: Array<{ year: number; value: string; partial: boolean }>;
  /** Inflation-adjusted time-weighted return a year, and the span it covers. */
  real: { annualized: string; from: string; to: string; basis: string } | null;
}

export interface BacktestView {
  ok: true;
  lens: Exclude<Lens, "local">;
  rebalanceLabel: string;
  startMonth: string;
  endMonth: string;
  years: number;
  holdings: Array<{ id: string; name: string; symbol: string | null; currency: string; target: string; end: string; asOf: string | null; totalReturn: boolean }>;
  portfolio: BacktestSummary;
  benchmark: (BacktestSummary & { id: string; name: string }) | null;
  chart: Array<{ month: string; portfolio: number; benchmark: number | null; invested: number }>;
  notes: string[];
  sources: string[];
}

export type BacktestOutcome = BacktestView | { ok: false; errors: string[] };

function summarise(r: BacktestResult, real: BacktestSummary["real"]): BacktestSummary {
  const full = r.calendar.filter((c) => !c.partial);
  const pick = (cmp: (a: Decimal, b: Decimal) => boolean) => full.reduce<(typeof full)[number] | null>((best, c) => (!best || cmp(c.value, best.value) ? c : best), null);
  const best = pick((a, b) => a.gt(b));
  const worst = pick((a, b) => a.lt(b));
  const s = (c: (typeof full)[number] | null) => (c ? { year: c.year, value: c.value.toString(), partial: c.partial } : null);
  return {
    finalValue: r.finalValue.toFixed(2),
    totalInvested: r.totalInvested.toFixed(2),
    gain: r.finalValue.minus(r.totalInvested).toFixed(2),
    twrCumulative: r.twrCumulative.toString(),
    twrAnnualized: r.twrAnnualized.toString(),
    moneyWeighted: r.moneyWeighted === null ? null : String(r.moneyWeighted),
    volatility: r.volatility?.toString() ?? null,
    maxDrawdown: r.maxDrawdown.toString(),
    drawdownPeak: r.drawdownPeak,
    drawdownTrough: r.drawdownTrough,
    bestYear: s(best),
    worstYear: s(worst),
    calendar: r.calendar.map((c) => ({ year: c.year, value: c.value.toString(), partial: c.partial })),
    real,
  };
}

type Inflation = Awaited<ReturnType<typeof inflationFor>>;

/** Real time-weighted return a year: exact from a price index; from whole years of y/y rates otherwise. */
function realOf(r: BacktestResult, infl: Inflation): BacktestSummary["real"] {
  if (!infl) return null;
  const idx = new Map(r.points.map((p) => [p.month, p.index]));
  const end = r.points.map((p) => p.month).filter((m) => infl.months.has(m)).at(-1);
  if (!end) return null;
  const startMonth = r.points[0]!.month;
  let from: string;
  let inflation: Decimal | null;
  if (infl.kind === "index") {
    from = startMonth;
    inflation = inflationFromIndex(infl.months, from, end);
  } else {
    const yearsAvail = Math.floor((Number(end.slice(0, 4)) * 12 + Number(end.slice(5)) - (Number(startMonth.slice(0, 4)) * 12 + Number(startMonth.slice(5)))) / 12);
    if (yearsAvail < 1) return null;
    from = shiftMonth(end, -12 * yearsAvail);
    inflation = inflationFromYoY(infl.months, end, yearsAvail);
  }
  const a = idx.get(from);
  const b = idx.get(end)!;
  if (!a || inflation === null) return null;
  const months = (Number(end.slice(0, 4)) - Number(from.slice(0, 4))) * 12 + Number(end.slice(5)) - Number(from.slice(5));
  if (months < 12) return null;
  const realCum = b.div(a).div(inflation.plus(1)).minus(1);
  return { annualized: annualizeOverYears(realCum, months / 12).toString(), from, to: end, basis: infl.label };
}

export async function backtest(ctx: TenantContext, raw: BacktestRequest): Promise<BacktestOutcome> {
  const parsed = backtestSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, errors: [...new Set(parsed.error.issues.map((i) => i.message))] };
  const req = parsed.data;
  const initial = d(req.initial);
  const contribution = d(req.contribution);
  if (initial.isZero() && contribution.isZero()) return { ok: false, errors: ["Enter a starting amount or a monthly contribution."] };

  return withTenant(ctx, async (tx) => {
    const universe = new Map((await researchUniverse(tx)).map((u) => [u.id, u]));
    const unknown = req.holdings.filter((h) => !universe.has(h.id));
    if (unknown.length) return { ok: false as const, errors: ["One of the chosen instruments isn't available for research."] };
    // The benchmark may also be one of the holdings (a mix against 100% of one part is a fair question).
    const benchmarkId = req.benchmarkId && universe.has(req.benchmarkId) ? req.benchmarkId : null;
    const ids = [...req.holdings.map((h) => h.id), ...(benchmarkId ? [benchmarkId] : [])];
    const perf = await getPerformanceMany(tx, ids, req.lens);
    const missing = [...new Set(ids)].filter((id) => !perf.get(id)?.asOf || (perf.get(id)?.growth.length ?? 0) < 2);
    if (missing.length) return { ok: false as const, errors: missing.map((id) => `${universe.get(id)!.name} has no ${req.lens} history (it needs prices and same-day exchange rates that overlap).`) };

    // Months every series has (holdings and benchmark), from the chosen start year.
    const series = ids.map((id) => new Map(perf.get(id)!.growth.map((p) => [p.date.slice(0, 7), d(String(p.value))])));
    let months = [...series[0]!.keys()].filter((m) => series.every((s) => s.has(m))).sort();
    if (req.startYear) months = months.filter((m) => m >= `${req.startYear}-01`);
    if (months.length < 13) return { ok: false as const, errors: [`These instruments share less than a year of month-end history in ${req.lens}${req.startYear ? ` from ${req.startYear}` : ""}. Try an earlier start or different instruments.`] };

    const weights = req.holdings.map((h) => d(h.weight).div(100));
    const n = req.holdings.length;
    const rebalance = req.rebalance as Rebalance;
    const result = runBacktest({ months, levels: series.slice(0, n).map((s) => months.map((m) => s.get(m)!)), weights, initial, contribution, rebalance });
    const bench = benchmarkId ? runBacktest({ months, levels: [months.map((m) => series[n]!.get(m)!)], weights: [d(1)], initial, contribution, rebalance: "none" }) : null;
    const infl = await inflationFor(tx, req.lens, false);

    const notes = [
      `Total returns where dividends are recorded; each holding's return is converted to ${req.lens} at same-day official exchange rates.`,
      "No dealing costs, fund charges beyond those already in prices, spreads or taxes are deducted.",
    ];
    if (contribution.gt(0)) notes.push(`${formatMoney(contribution.toString(), req.lens, { decimals: 0 })} is added at each month end and split by the target weights.`);
    if (result.skippedMonths) notes.push(`${result.skippedMonths} month${result.skippedMonths === 1 ? " was" : "s were"} missing for at least one instrument and ${result.skippedMonths === 1 ? "was" : "were"} skipped (no contribution or rebalance that month; returns run across the gap).`);
    for (const id of new Set(ids)) {
      const p = perf.get(id)!;
      if (!p.totalReturn) notes.push(`${universe.get(id)!.name}: no dividends recorded, so its returns are price returns only.`);
    }
    if (!infl) notes.push(`No ${req.lens} inflation series is loaded, so there is no inflation-adjusted figure.`);

    const sources = [...new Set(ids.flatMap((id) => perf.get(id)!.sources.map((s) => s.name)))];
    if (infl) sources.push(infl.label);
    return {
      ok: true as const,
      lens: req.lens,
      rebalanceLabel: REBALANCE_LABELS[rebalance],
      startMonth: months[0]!,
      endMonth: months.at(-1)!,
      years: Math.round(result.years * 10) / 10,
      holdings: req.holdings.map((h, i) => {
        const u = universe.get(h.id)!;
        const p = perf.get(h.id)!;
        return { id: h.id, name: u.name, symbol: u.symbol, currency: u.currency, target: weights[i]!.toString(), end: result.endWeights[i]!.toString(), asOf: p.asOf, totalReturn: p.totalReturn };
      }),
      portfolio: summarise(result, realOf(result, infl)),
      benchmark: bench && benchmarkId ? { ...summarise(bench, realOf(bench, infl)), id: benchmarkId, name: universe.get(benchmarkId)!.name } : null,
      chart: result.points.map((p, i) => ({ month: p.month, portfolio: Number(p.value.toFixed(2)), benchmark: bench ? Number(bench.points[i]!.value.toFixed(2)) : null, invested: Number(p.invested.toFixed(2)) })),
      notes,
      sources,
    };
  });
}

/** Instruments the backtester can use (for the pickers). */
export async function backtestOptions(ctx: TenantContext) {
  return withTenant(ctx, async (tx) => (await researchUniverse(tx)).map((u) => ({ id: u.id, label: [u.name, u.symbol, u.currency].filter(Boolean).join(" · "), market: u.market })));
}
