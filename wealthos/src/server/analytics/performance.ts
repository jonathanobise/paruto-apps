import "server-only";
import { withTenant, type TenantContext } from "@/server/db/client";
import { analyzePerformance, holdingPerformance, type HoldingReturn, type ISODate } from "@/engine";
import { loadPortfolioInputs, periodStart, type PeriodKey } from "./portfolio";
import { withSnapshot } from "./cache";

export interface ReturnView {
  currency: string;
  startValue: string;
  endValue: string;
  invested: string;
  returned: string;
  gain: string;
  twr: string | null;
  twrAnnualized: string | null;
  xirr: number | null;
}

export interface HoldingPerformanceView {
  key: string;
  accountId: string;
  instrumentId: string;
  name: string;
  symbol: string | null;
  start: ISODate;
  end: ISODate;
  local: ReturnView;
  base: ReturnView | null;
  incomeGross: string;
  complete: boolean;
}

function view(r: HoldingReturn): ReturnView {
  return {
    currency: r.currency,
    startValue: r.startValue.toFixed(2),
    endValue: r.endValue.toFixed(2),
    invested: r.invested.toFixed(2),
    returned: r.returned.toFixed(2),
    gain: r.gain.toFixed(2),
    twr: r.twr?.toFixed(8) ?? null,
    twrAnnualized: r.twrAnnualized?.toFixed(8) ?? null,
    xirr: r.xirr,
  };
}

/**
 * Per-holding performance over a period for every position held at any point in the period
 * (optionally limited to one account). Local = instrument currency (excludes FX); base includes FX.
 */
export async function holdingsPerformance(ctx: TenantContext, opts: { baseCurrency: string; period: PeriodKey; accountId?: string; asOf?: ISODate; bypassCache?: boolean }): Promise<HoldingPerformanceView[]> {
  const asOf = opts.asOf ?? new Date().toISOString().slice(0, 10);
  return withTenant(ctx, (tx) => withSnapshot(tx, ctx, "holdings-performance", `${opts.baseCurrency}|${opts.period}|${asOf}|${opts.accountId ?? "*"}`, async () => {
    const inp = await loadPortfolioInputs(tx, ctx, asOf);
    if (!inp.firstDate) return [];
    const start = periodStart(opts.period, asOf, inp.firstDate);
    // Every (account, instrument) pair that appears in the ledger.
    const pairs = new Map<string, { accountId: string; instrumentId: string }>();
    for (const e of inp.effective) {
      if (!("instrumentId" in e) || !e.instrumentId) continue;
      const accs = "accountId" in e ? [e.accountId] : "fromAccountId" in e ? [e.fromAccountId, e.toAccountId] : [];
      for (const accountId of accs) pairs.set(`${accountId}|${e.instrumentId}`, { accountId, instrumentId: e.instrumentId });
    }
    const out: HoldingPerformanceView[] = [];
    for (const [key, pair] of pairs) {
      if (opts.accountId && pair.accountId !== opts.accountId) continue;
      const r = holdingPerformance({ events: inp.events, instruments: inp.instrumentMap, prices: inp.prices, fx: inp.fx, baseCurrency: opts.baseCurrency, accountId: pair.accountId, instrumentId: pair.instrumentId, start, end: asOf });
      // Skip positions with no activity or value in the period.
      if (r.local.startValue.isZero() && r.local.endValue.isZero() && r.local.invested.isZero() && r.local.returned.isZero()) continue;
      const info = inp.instrumentMap.get(pair.instrumentId)!;
      out.push({ key, ...pair, name: info.name, symbol: info.symbol ?? null, start, end: asOf, local: view(r.local), base: r.base ? view(r.base) : null, incomeGross: r.incomeGross.toFixed(2), complete: r.complete });
    }
    return out;
  }, { bypass: Boolean(opts.bypassCache) }));
}

export interface AccountPerformanceView {
  start: ISODate;
  end: ISODate;
  days: number;
  startValue: string;
  endValue: string;
  netContributions: string;
  contributions: string;
  withdrawals: string;
  investmentGain: string;
  incomeGross: string;
  fees: string;
  withholdingTax: string;
  realizedGain: string;
  fxEffect: string | null;
  twr: string | null;
  twrAnnualized: string | null;
  xirr: number | null;
  complete: boolean;
  series: Array<{ date: ISODate; value: number; cumulativeFlows: number }>;
}

/** Performance of one ledger account. Transfers to and from your other accounts count as its contributions/withdrawals. */
export async function accountPerformance(ctx: TenantContext, accountId: string, opts: { baseCurrency: string; period: PeriodKey; asOf?: ISODate; bypassCache?: boolean }): Promise<AccountPerformanceView | null> {
  const asOf = opts.asOf ?? new Date().toISOString().slice(0, 10);
  return withTenant(ctx, (tx) => withSnapshot(tx, ctx, `account-performance:${accountId}`, `${opts.baseCurrency}|${opts.period}|${asOf}`, async () => {
    const inp = await loadPortfolioInputs(tx, ctx, asOf);
    if (!inp.accounts.some((a) => a.id === accountId && a.accountClass === "ledger")) return null;
    const touches = inp.effective.filter((e) => ("accountId" in e && e.accountId === accountId) || ("fromAccountId" in e && (e.fromAccountId === accountId || e.toAccountId === accountId)));
    if (touches.length === 0) return null;
    const first = touches[0]!.date;
    const start = periodStart(opts.period, asOf, first);
    if (start >= asOf) return null;
    const r = analyzePerformance({ events: inp.events, instruments: inp.instrumentMap, prices: inp.prices, fx: inp.fx, baseCurrency: opts.baseCurrency, scope: new Set([accountId]), start, end: asOf });
    return {
      start,
      end: asOf,
      days: r.days,
      startValue: r.startValue.toFixed(2),
      endValue: r.endValue.toFixed(2),
      netContributions: r.netContributions.toFixed(2),
      contributions: r.contributions.toFixed(2),
      withdrawals: r.withdrawals.toFixed(2),
      investmentGain: r.investmentGain.toFixed(2),
      incomeGross: r.incomeGross.toFixed(2),
      fees: r.fees.toFixed(2),
      withholdingTax: r.withholdingTax.toFixed(2),
      realizedGain: r.realizedGain.toFixed(2),
      fxEffect: r.fxEffect?.toFixed(2) ?? null,
      twr: r.twr?.toFixed(8) ?? null,
      twrAnnualized: r.twrAnnualized?.toFixed(8) ?? null,
      xirr: r.xirr,
      complete: r.complete,
      series: r.series.map((p) => ({ date: p.date, value: p.value.toNumber(), cumulativeFlows: p.cumulativeFlows.toNumber() })),
    };
  }, { bypass: Boolean(opts.bypassCache) }));
}
