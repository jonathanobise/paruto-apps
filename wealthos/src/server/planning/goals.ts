import "server-only";
import { and, asc, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { financialAccounts, goals } from "@/server/db/schema";
import { withTenant, type TenantContext } from "@/server/db/client";
import { AppError } from "@/server/platform/errors";
import { parseOrThrow } from "@/server/identity/service";
import { recordAudit } from "@/server/audit/audit";
import { buildDashboard, type DashboardData } from "@/server/analytics/portfolio";
import { loadFxTable } from "@/server/market-data/service";
import { MissingFxRateError, SUPPORTED_CURRENCIES, d, isISODate, project, requiredContribution, sum, type Decimal } from "@/engine";

export const GOAL_KINDS = { net_worth: "Net-worth target", retirement: "Retirement", financial_independence: "Financial independence", education: "Education", home: "Home purchase", emergency: "Emergency reserve", other: "Other" } as const;

const pct = (label: string, min: number, max: number) =>
  z.string().trim().regex(/^-?\d{1,3}(\.\d{1,4})?$/, `${label}: a percentage like 12.5`).refine((v) => Number(v) >= min && Number(v) <= max, `${label}: between ${min}% and ${max}%`);
const money = z.string().trim().transform((v) => v.replace(/,/g, "")).pipe(z.string().regex(/^\d{1,15}(\.\d{1,2})?$/, "Enter an amount"));

export const goalInputSchema = z
  .object({
    name: z.string().trim().min(2).max(80),
    kind: z.enum(Object.keys(GOAL_KINDS) as [keyof typeof GOAL_KINDS, ...Array<keyof typeof GOAL_KINDS>]),
    targetAmount: money.refine((v) => d(v).gt(0), "Must be more than zero"),
    currency: z.enum(SUPPORTED_CURRENCIES),
    targetDate: z.string().refine(isISODate, "Use a valid date"),
    targetIsReal: z.boolean(),
    scope: z.enum(["net_worth", "accounts"]),
    accountIds: z.array(z.string().uuid()).max(50).default([]),
    monthlyContribution: money,
    contributionTiming: z.enum(["beginning", "end"]),
    contributionGrowthPct: pct("Contribution growth", 0, 100),
    inflationPct: pct("Inflation", -10, 200),
    annualFeePct: pct("Fees", 0, 10),
    scenarios: z
      .array(z.object({ label: z.string().trim().min(1).max(30), annualReturnPct: pct("Return", -50, 200) }))
      .min(2, "Give at least two return scenarios — a single projection is never shown on its own")
      .max(4),
    notes: z.string().trim().max(500).optional().transform((v) => v || null),
  })
  .refine((g) => g.targetDate > new Date().toISOString().slice(0, 10), { path: ["targetDate"], message: "Choose a date in the future" })
  .refine((g) => g.scope === "net_worth" || g.accountIds.length > 0, { path: ["accountIds"], message: "Choose at least one account" });

const toRow = (g: z.infer<typeof goalInputSchema>) => ({
  name: g.name,
  kind: g.kind,
  targetAmount: g.targetAmount,
  currency: g.currency,
  targetDate: g.targetDate,
  targetIsReal: g.targetIsReal,
  scope: g.scope,
  accountIds: g.scope === "accounts" ? g.accountIds : [],
  monthlyContribution: g.monthlyContribution,
  contributionTiming: g.contributionTiming,
  contributionGrowth: d(g.contributionGrowthPct).div(100).toFixed(),
  inflation: d(g.inflationPct).div(100).toFixed(),
  annualFee: d(g.annualFeePct).div(100).toFixed(),
  scenarios: g.scenarios.map((s) => ({ label: s.label, annualReturn: d(s.annualReturnPct).div(100).toFixed() })),
  notes: g.notes,
});

export async function saveGoal(ctx: TenantContext, id: string | null, input: unknown): Promise<string> {
  const g = parseOrThrow(goalInputSchema, input);
  return withTenant(ctx, async (tx) => {
    if (g.scope === "accounts") {
      const accs = await tx.select({ id: financialAccounts.id }).from(financialAccounts);
      if (g.accountIds.some((a) => !accs.some((x) => x.id === a))) throw new AppError("NOT_FOUND", "Account not found.");
    }
    let goalId = id;
    if (id) {
      const [row] = await tx.update(goals).set({ ...toRow(g), updatedAt: new Date() }).where(eq(goals.id, id)).returning({ id: goals.id });
      if (!row) throw new AppError("NOT_FOUND", "Goal not found.");
    } else {
      const [row] = await tx.insert(goals).values({ ...toRow(g), orgId: ctx.orgId, createdBy: ctx.userId }).returning({ id: goals.id });
      goalId = row!.id;
    }
    await recordAudit(tx, { orgId: ctx.orgId, actorUserId: ctx.userId, action: id ? "goal.updated" : "goal.created", targetType: "goal", targetId: goalId! });
    return goalId!;
  });
}

export async function archiveGoal(ctx: TenantContext, id: string): Promise<void> {
  await withTenant(ctx, (tx) => tx.update(goals).set({ archivedAt: new Date() }).where(eq(goals.id, id)));
}

export async function listGoals(ctx: TenantContext) {
  return withTenant(ctx, (tx) => tx.select().from(goals).where(isNull(goals.archivedAt)).orderBy(asc(goals.targetDate)));
}

export async function getGoalRow(ctx: TenantContext, id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw new AppError("NOT_FOUND", "Goal not found.");
  const [row] = await withTenant(ctx, (tx) => tx.select().from(goals).where(and(eq(goals.id, id), isNull(goals.archivedAt))).limit(1));
  if (!row) throw new AppError("NOT_FOUND", "Goal not found.");
  return row;
}

/** Current value counted towards a goal, in the goal's currency (null if it can't be fully valued). */
export function goalCurrentValue(goal: { scope: string; accountIds: string[] }, dash: DashboardData): { value: Decimal; complete: boolean } {
  if (goal.scope === "net_worth") return { value: d(dash.totals.netWorth), complete: dash.totals.complete };
  const ids = new Set(goal.accountIds);
  const parts: Decimal[] = [];
  let complete = true;
  const add = (value: string | null, share: string, sign: 1 | -1 = 1) => {
    if (value === null) complete = false;
    else parts.push(d(value).times(share).times(sign));
  };
  for (const h of dash.holdings) if (ids.has(h.accountId)) add(h.marketValueBase, h.ownershipShare);
  for (const c of dash.cash) if (ids.has(c.accountId)) add(c.amountBase, c.ownershipShare);
  // Manual values already include the ownership share.
  for (const m of dash.manual) if (ids.has(m.accountId)) add(m.amountBase, "1", m.kind === "liability" ? -1 : 1);
  return { value: sum(parts), complete };
}

function monthsBetween(from: string, to: string): number {
  const [fy, fm, fd] = from.split("-").map(Number) as [number, number, number];
  const [ty, tm, td] = to.split("-").map(Number) as [number, number, number];
  return Math.max(1, (ty - fy) * 12 + (tm - fm) - (td < fd ? 1 : 0));
}

export interface GoalView {
  goal: Awaited<ReturnType<typeof getGoalRow>>;
  asOf: string;
  months: number;
  current: string;
  currentComplete: boolean;
  progress: string | null;
  /** Target in future money at the target date (equals the target if it is already nominal). */
  targetNominal: string;
  scenarios: Array<{ label: string; annualReturn: string; finalNominal: string; finalReal: string; meetsTarget: boolean; requiredMonthly: string; path: Array<{ year: number; nominal: number; real: number }> }>;
  currencySensitivity: null | { fxRate: string; ngnToday: string; rows: Array<{ label: string; ngn: string }> };
  disclosures: string[];
}

export async function getGoalView(ctx: TenantContext, id: string): Promise<GoalView> {
  const goal = await getGoalRow(ctx, id);
  const asOf = new Date().toISOString().slice(0, 10);
  const dash = await buildDashboard(ctx, { baseCurrency: goal.currency, period: "1M" });
  const { value: current, complete } = goalCurrentValue(goal, dash);
  const months = monthsBetween(asOf, goal.targetDate);
  const inflation = d(goal.inflation);
  const target = d(goal.targetAmount);
  const targetNominal = goal.targetIsReal ? target.times(inflation.plus(1).pow(d(months).div(12))) : target;
  const common = {
    startingBalance: current.gt(0) ? current : d(0),
    contributionPerPeriod: d(goal.monthlyContribution),
    contributionGrowthAnnual: d(goal.contributionGrowth),
    annualFee: d(goal.annualFee),
    annualInflation: inflation,
    periodsPerYear: 12 as const,
    years: 0,
    horizonPeriods: months,
    timing: goal.contributionTiming === "beginning" ? ("beginning" as const) : ("end" as const),
    taxesModelled: false as const,
  };
  const results = goal.scenarios.map((s) => {
    const r = project({ ...common, annualReturn: d(s.annualReturn) });
    const req = requiredContribution(targetNominal, { startingBalance: common.startingBalance, annualReturn: d(s.annualReturn), annualFee: common.annualFee, annualInflation: inflation, periodsPerYear: 12, years: 0, horizonPeriods: months, timing: common.timing, taxesModelled: false });
    return {
      label: s.label,
      annualReturn: s.annualReturn,
      finalNominal: r.finalNominal.toFixed(2),
      finalReal: r.finalReal.toFixed(2),
      meetsTarget: r.finalNominal.gte(targetNominal),
      requiredMonthly: req.toFixed(2),
      path: r.path.map((p) => ({ year: p.year, nominal: p.nominal.toNumber(), real: p.real.toNumber() })),
      disclosures: r.disclosures,
    };
  });

  let currencySensitivity: GoalView["currencySensitivity"] = null;
  if (goal.currency !== "NGN") {
    const fx = await withTenant(ctx, (tx) => loadFxTable(tx, asOf, asOf));
    try {
      const q = fx.quote(goal.currency, "NGN", asOf);
      const ngnToday = targetNominal.times(q.rate);
      currencySensitivity = {
        fxRate: q.rate.toFixed(4),
        ngnToday: ngnToday.toFixed(2),
        rows: [0.1, 0.3, 0.5].map((p) => ({ label: `If the naira weakens ${p * 100}% by then`, ngn: ngnToday.div(d(1).minus(p)).toFixed(2) })),
      };
    } catch (err) {
      if (!(err instanceof MissingFxRateError)) throw err;
    }
  }

  return {
    goal,
    asOf,
    months,
    current: current.toFixed(2),
    currentComplete: complete,
    progress: target.isZero() ? null : current.div(goal.targetIsReal ? target : targetNominal).toFixed(6),
    targetNominal: targetNominal.toFixed(2),
    scenarios: results.map(({ disclosures: _d, ...r }) => r),
    currencySensitivity,
    disclosures: [
      ...new Set([
        `Projections compound monthly over ${months} months with contributions at the ${goal.contributionTiming} of each month${d(goal.contributionGrowth).isZero() ? "" : `, rising ${d(goal.contributionGrowth).times(100).toFixed(1)}% a year`}.`,
        `Each scenario assumes a constant annual return before fees of ${goal.scenarios.map((s) => `${d(s.annualReturn).times(100).toFixed(1)}%`).join(" / ")}; real returns vary from year to year and can be negative.`,
        `Fees of ${d(goal.annualFee).times(100).toFixed(2)}% a year are deducted. Inflation is assumed at ${inflation.times(100).toFixed(1)}% a year${goal.targetIsReal ? "; the target is in today's money and is inflated to the target date" : ""}.`,
        "Taxes are not modelled. Your starting value is today's value of the linked accounts in the goal's currency.",
        ...(current.isNegative() ? ["The linked value is currently negative (debts exceed assets); projections start from zero and do not model paying down debt."] : []),
        "Outcomes are not guaranteed. These are illustrations based on your assumptions, not forecasts or advice.",
      ]),
    ],
  };
}
