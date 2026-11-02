import "server-only";
import { and, asc, count, eq, gte, inArray, isNull, ne, sql } from "drizzle-orm";
import { alerts, financialAccounts, goals, importBatches, orgInvitations, organizations, plans, subscriptions, watchlists, type Entitlements } from "@/server/db/schema";
import { withTenant, type TenantContext, type Tx } from "@/server/db/client";
import { AppError } from "@/server/platform/errors";

export type LimitKey = Exclude<keyof Entitlements, "pdfReports">;

export const LIMIT_LABELS: Record<LimitKey, { noun: string; plural: string; period?: string }> = {
  accounts: { noun: "open account", plural: "open accounts" },
  goals: { noun: "active goal", plural: "active goals" },
  alerts: { noun: "alert", plural: "alerts" },
  watchlists: { noun: "watchlist", plural: "watchlists" },
  members: { noun: "member", plural: "members (including pending invitations)" },
  csvImportsPerMonth: { noun: "CSV import", plural: "CSV imports", period: "this month" },
  aiQuestionsPerMonth: { noun: "assistant question", plural: "assistant questions", period: "this month" },
};

export interface PlanView {
  code: string;
  name: string;
  description: string;
  price: string;
  currency: string;
  interval: "month" | "year";
  trialDays: number;
  entitlements: Entitlements;
  isPublic: boolean;
  active: boolean;
}

export interface EffectivePlan {
  plan: PlanView;
  /** Where the entitlements come from. */
  source: "free" | "subscription" | "demo";
  subscription: typeof subscriptions.$inferSelect | null;
}

export async function listPlans(tx: Tx, opts: { publicOnly?: boolean } = {}): Promise<PlanView[]> {
  const rows = await tx.select().from(plans).where(opts.publicOnly ? and(eq(plans.isPublic, true), eq(plans.active, true)) : undefined).orderBy(asc(plans.sortOrder));
  return rows.map((p) => ({ code: p.code, name: p.name, description: p.description, price: p.price, currency: p.currency, interval: p.interval, trialDays: p.trialDays, entitlements: p.entitlements, isPublic: p.isPublic, active: p.active }));
}

/**
 * The plan in force for the organisation in context. A trialing, active or past-due (within
 * grace) subscription grants its plan; otherwise Free. Demo organisations get Pro limits so the
 * sample portfolio shows every feature; they are never billed.
 */
export async function effectivePlan(tx: Tx, orgId: string): Promise<EffectivePlan> {
  const all = await listPlans(tx);
  const byCode = (c: string) => all.find((p) => p.code === c);
  const free = byCode("free");
  if (!free) throw new Error("Plan catalogue is missing the free plan");
  const [org] = await tx.select({ isDemo: organizations.isDemo }).from(organizations).where(eq(organizations.id, orgId));
  if (org?.isDemo) return { plan: { ...(byCode("pro") ?? free), name: "Demo (Pro limits)" }, source: "demo", subscription: null };
  const [sub] = await tx.select().from(subscriptions).where(and(eq(subscriptions.orgId, orgId), inArray(subscriptions.status, ["trialing", "active", "past_due"]))).limit(1);
  if (!sub) return { plan: free, source: "free", subscription: null };
  const now = new Date();
  const inForce = sub.status === "past_due" ? (sub.graceEndsAt ?? sub.currentPeriodEnd) > now : sub.currentPeriodEnd > now;
  const plan = byCode(sub.planCode);
  if (!inForce || !plan) return { plan: free, source: "free", subscription: sub };
  return { plan, source: "subscription", subscription: sub };
}

/** Current usage for one limit, counted in the organisation in context (RLS applies). */
export async function usage(tx: Tx, ctx: TenantContext, key: LimitKey): Promise<number> {
  const monthStart = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1));
  const n = async (q: Promise<Array<{ n: number }>>) => Number((await q)[0]?.n ?? 0);
  switch (key) {
    case "accounts":
      return n(tx.select({ n: count() }).from(financialAccounts).where(eq(financialAccounts.status, "open")));
    case "goals":
      return n(tx.select({ n: count() }).from(goals).where(isNull(goals.archivedAt)));
    case "alerts":
      return n(tx.select({ n: count() }).from(alerts).where(eq(alerts.userId, ctx.userId)));
    case "watchlists":
      return n(tx.select({ n: count() }).from(watchlists));
    case "csvImportsPerMonth":
      return n(tx.select({ n: count() }).from(importBatches).where(and(gte(importBatches.createdAt, monthStart), ne(importBatches.status, "discarded"))));
    case "members": {
      const m = await tx.execute<{ n: string }>(sql`select count(*) as n from app_org_members()`);
      const pending = await n(tx.select({ n: count() }).from(orgInvitations).where(and(isNull(orgInvitations.acceptedAt), isNull(orgInvitations.revokedAt), gte(orgInvitations.expiresAt, new Date()))));
      return Number(m.rows[0]?.n ?? 0) + pending;
    }
    case "aiQuestionsPerMonth": {
      const r = await tx.execute<{ questions: string }>(sql`select questions from app_ai_usage_this_month(${ctx.orgId})`);
      return Number(r.rows[0]?.questions ?? 0);
    }
  }
}

/**
 * Throws PLAN_LIMIT if adding `adding` more would exceed the plan. Call inside the same tenant
 * transaction as the insert. Existing items above a limit (after a downgrade) are kept; only new
 * ones are refused.
 */
export async function enforceLimit(tx: Tx, ctx: TenantContext, key: LimitKey, adding = 1): Promise<void> {
  const { plan } = await effectivePlan(tx, ctx.orgId);
  const limit = plan.entitlements[key];
  if (limit === null || limit === undefined) return;
  const used = await usage(tx, ctx, key);
  if (used + adding > limit) {
    const l = LIMIT_LABELS[key];
    throw new AppError("PLAN_LIMIT", `${plan.name} allows ${limit} ${limit === 1 ? l.noun : l.plural}${l.period ? ` ${l.period}` : ""}. You have ${used}. Upgrade under Settings → Plan & billing${l.period ? ", or wait until next month" : ""}.`, { limit, used, key, plan: plan.code });
  }
}

export async function enforceFeature(tx: Tx, ctx: TenantContext, key: "pdfReports"): Promise<void> {
  const { plan } = await effectivePlan(tx, ctx.orgId);
  if (!plan.entitlements[key]) throw new AppError("PLAN_LIMIT", `PDF reports are included in Wealth Plus and Pro. CSV exports are available on every plan.`, { key, plan: plan.code });
}

/** Plan and usage summary for the billing page. */
export async function planSummary(ctx: TenantContext) {
  return withTenant(ctx, async (tx) => {
    const eff = await effectivePlan(tx, ctx.orgId);
    const keys = Object.keys(LIMIT_LABELS) as LimitKey[];
    const used = Object.fromEntries(await Promise.all(keys.map(async (k) => [k, await usage(tx, ctx, k)] as const))) as Record<LimitKey, number>;
    const [trial] = await tx.select({ id: subscriptions.id }).from(subscriptions).where(and(eq(subscriptions.orgId, ctx.orgId), sql`${subscriptions.trialEndsAt} is not null`)).limit(1);
    return { ...eff, used, hadTrial: Boolean(trial), plans: await listPlans(tx, { publicOnly: true }) };
  });
}
