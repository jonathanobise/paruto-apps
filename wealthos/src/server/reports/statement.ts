import "server-only";
import { buildDashboard, listTransactions, PERIODS, type DashboardData } from "@/server/analytics/portfolio";
import { getGoalView, listGoals } from "@/server/planning/goals";
import { DISCLOSURES } from "@/server/compliance/features";
import type { TenantContext } from "@/server/db/client";

export type PeriodKey = keyof typeof PERIODS;
export const REPORT_PERIODS: Array<{ key: PeriodKey; label: string }> = [
  { key: "1M", label: "Last month" },
  { key: "3M", label: "Last 3 months" },
  { key: "YTD", label: "Year to date" },
  { key: "1Y", label: "Last 12 months" },
  { key: "3Y", label: "Last 3 years" },
  { key: "ALL", label: "Since the first record" },
];

const INCOME_TYPES = new Set(["dividend", "interest", "coupon"]);
const COST_TYPES = new Set(["fee", "tax"]);

export interface WealthStatement {
  generatedAt: string;
  orgName: string;
  periodLabel: string;
  dash: DashboardData;
  transactions: Awaited<ReturnType<typeof listTransactions>>;
  transactionsTruncated: number;
  income: Awaited<ReturnType<typeof listTransactions>>;
  costs: Awaited<ReturnType<typeof listTransactions>>;
  goals: Array<{ name: string; currency: string; target: string; targetDate: string; targetIsReal: boolean; current: string; progress: string | null; scenarios: Array<{ label: string; annualReturn: string; finalNominal: string; meetsTarget: boolean }> }>;
  methodology: string[];
  disclosures: string[];
}

export const MAX_REPORT_TRANSACTIONS = 500;

/**
 * Everything a wealth statement shows, assembled from the same services as the screens, so
 * report figures always equal what the app displays. No figure is computed here.
 */
export async function buildWealthStatement(ctx: TenantContext, opts: { baseCurrency: string; period: PeriodKey }): Promise<WealthStatement> {
  const dash = await buildDashboard(ctx, { baseCurrency: opts.baseCurrency, period: opts.period });
  const start = dash.performance?.start ?? dash.asOf;
  const end = dash.performance?.end ?? dash.asOf;
  const all = (await listTransactions(ctx)).filter((t) => t.date >= start && t.date <= end);
  const goals = [];
  for (const g of await listGoals(ctx)) {
    const v = await getGoalView(ctx, g.id);
    goals.push({ name: g.name, currency: g.currency, target: g.targetAmount, targetDate: g.targetDate, targetIsReal: g.targetIsReal, current: v.current, progress: v.progress, scenarios: v.scenarios.map((s) => ({ label: s.label, annualReturn: s.annualReturn, finalNominal: s.finalNominal, meetsTarget: s.meetsTarget })) });
  }
  return {
    generatedAt: new Date().toISOString(),
    orgName: dash.orgName,
    periodLabel: REPORT_PERIODS.find((p) => p.key === opts.period)?.label ?? opts.period,
    dash,
    transactions: all.slice(0, MAX_REPORT_TRANSACTIONS),
    transactionsTruncated: Math.max(0, all.length - MAX_REPORT_TRANSACTIONS),
    income: all.filter((t) => INCOME_TYPES.has(t.type) && !t.reversedBy && !t.reversesEventId),
    costs: all.filter((t) => COST_TYPES.has(t.type) && !t.reversedBy && !t.reversesEventId),
    goals,
    methodology: [
      `Values are in ${dash.baseCurrency} as of ${dash.asOf}. Foreign-currency items use the exchange rate published on or before each date (never a later or substituted rate); items that can't be converted are left out and listed under data quality.`,
      "Holdings are valued at the latest price on or before the statement date. Treasury bills without a price accrue straight-line to face value; items without any price are shown at cost and flagged.",
      "Investment gain = end value − start value − net contributions; deposits are never counted as gains. Time-weighted return removes the effect of when money was added; money-weighted return (XIRR) includes it. Periods under a year are not annualised.",
      "Cost basis uses first-in, first-out lots; fees are part of cost. Income is shown gross with withholding tax separately.",
      "Goal outcomes are hypothetical projections under the return, inflation and fee assumptions saved with each goal.",
    ],
    disclosures: [DISCLOSURES.not_advice, DISCLOSURES.past_performance, DISCLOSURES.data_freshness, DISCLOSURES.non_custodial, ...(dash.isDemo ? [DISCLOSURES.demo_data] : [])],
  };
}
