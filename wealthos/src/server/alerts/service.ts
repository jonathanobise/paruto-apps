import "server-only";
import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { z } from "zod";
import { alerts, instruments, notifications } from "@/server/db/schema";
import { db, withTenant, type TenantContext, type Tx } from "@/server/db/client";
import { AppError } from "@/server/platform/errors";
import { parseOrThrow } from "@/server/identity/service";
import { buildDashboard } from "@/server/analytics/portfolio";
import { getGoalView, listGoals } from "@/server/planning/goals";
import { loadFxTable } from "@/server/market-data/service";
import { MissingFxRateError, d, daysBetween } from "@/engine";
import { formatDate, formatMoney, formatPercent } from "@/lib/format";
import { enqueue } from "@/server/jobs/queue";
import { messages } from "./messages";

const positive = z.string().trim().transform((v) => v.replace(/,/g, "")).pipe(z.string().regex(/^\d{1,15}(\.\d{1,8})?$/, "Enter a number")).refine((v) => d(v).gt(0), "Must be more than zero");
const uuid = z.string().uuid("Choose one");

export const alertInputSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.enum(["price_above", "price_below"]), instrumentId: uuid, level: positive, repeat: z.boolean().default(false) }),
  z.object({ kind: z.enum(["fx_above", "fx_below"]), base: z.enum(["USD", "GBP", "EUR"]), quote: z.literal("NGN"), level: positive, repeat: z.boolean().default(false) }),
  z.object({ kind: z.literal("maturity_reminder"), daysBefore: z.coerce.number().int().min(0).max(90), repeat: z.boolean().default(true) }),
  z.object({ kind: z.literal("data_stale"), repeat: z.boolean().default(true) }),
  z.object({ kind: z.literal("concentration"), maxWeightPct: z.coerce.number().min(5).max(100), repeat: z.boolean().default(true) }),
  z.object({ kind: z.literal("goal_progress"), goalId: uuid, repeat: z.boolean().default(true) }),
]);
export type AlertInput = z.infer<typeof alertInputSchema>;

export const ALERT_LABELS: Record<AlertInput["kind"], string> = {
  price_above: "Price rises above",
  price_below: "Price falls below",
  fx_above: "Exchange rate rises above",
  fx_below: "Exchange rate falls below",
  maturity_reminder: "Maturity reminder",
  data_stale: "Data goes out of date",
  concentration: "One holding becomes too large",
  goal_progress: "Goal milestones (25/50/75/100%)",
};

export async function createAlert(ctx: TenantContext, input: unknown): Promise<string> {
  const a = parseOrThrow(alertInputSchema, input);
  const { kind, repeat, ...params } = a;
  return withTenant(ctx, async (tx) => {
    if ("instrumentId" in params) {
      const [i] = await tx.select({ id: instruments.id }).from(instruments).where(eq(instruments.id, params.instrumentId)).limit(1);
      if (!i) throw new AppError("NOT_FOUND", "Instrument not found.");
    }
    if ("goalId" in params) {
      const goals = await listGoals(ctx);
      if (!goals.some((g) => g.id === params.goalId)) throw new AppError("NOT_FOUND", "Goal not found.");
    }
    const [row] = await tx.insert(alerts).values({ orgId: ctx.orgId, userId: ctx.userId, kind, params: params as Record<string, string | number>, repeat }).returning({ id: alerts.id });
    return row!.id;
  });
}

export async function listAlerts(ctx: TenantContext) {
  return withTenant(ctx, (tx) => tx.select().from(alerts).orderBy(desc(alerts.createdAt)));
}

export async function setAlertEnabled(ctx: TenantContext, id: string, enabled: boolean): Promise<void> {
  await withTenant(ctx, (tx) => tx.update(alerts).set({ enabled }).where(eq(alerts.id, id)));
}

export async function deleteAlert(ctx: TenantContext, id: string): Promise<void> {
  await withTenant(ctx, (tx) => tx.delete(alerts).where(eq(alerts.id, id)));
}

export async function listNotifications(ctx: TenantContext, limit = 50) {
  return withTenant(ctx, (tx) => tx.select().from(notifications).orderBy(desc(notifications.createdAt)).limit(limit));
}

export async function unreadCount(ctx: TenantContext): Promise<number> {
  const r = await withTenant(ctx, (tx) => tx.select({ n: sql<number>`count(*)::int` }).from(notifications).where(isNull(notifications.readAt)));
  return r[0]?.n ?? 0;
}

export async function markRead(ctx: TenantContext, id?: string): Promise<void> {
  await withTenant(ctx, (tx) => tx.update(notifications).set({ readAt: new Date() }).where(id ? and(eq(notifications.id, id), isNull(notifications.readAt)) : isNull(notifications.readAt)));
}

type AlertRow = typeof alerts.$inferSelect;

/** Insert a notification at most once per dedupe key; one-shot alerts switch off after firing. */
async function notify(tx: Tx, ctx: TenantContext, alert: AlertRow, n: { title: string; body: string; link: string | null; key: string }): Promise<boolean> {
  const rows = await tx
    .insert(notifications)
    .values({ orgId: ctx.orgId, userId: ctx.userId, alertId: alert.id, kind: alert.kind, title: n.title, body: n.body, link: n.link, dedupeKey: `${alert.id}:${n.key}` })
    .onConflictDoNothing()
    .returning({ id: notifications.id });
  if (!rows.length) return false;
  await tx.update(alerts).set({ lastTriggeredAt: new Date(), ...(alert.repeat ? {} : { enabled: false }) }).where(eq(alerts.id, alert.id));
  return true;
}

/**
 * Evaluate every enabled alert of the user in context and create notifications. Idempotent: the
 * same event produces at most one notification however often this runs.
 */
export async function evaluateAlerts(ctx: TenantContext, asOf = new Date().toISOString().slice(0, 10)): Promise<{ evaluated: number; notified: number }> {
  const rules = (await listAlerts(ctx)).filter((a) => a.enabled);
  if (!rules.length) return { evaluated: 0, notified: 0 };
  const dash = rules.some((r) => ["maturity_reminder", "data_stale", "concentration"].includes(r.kind)) ? await buildDashboard(ctx, { baseCurrency: "NGN", period: "1M", asOf }) : null;
  let notified = 0;
  await withTenant(ctx, async (tx) => {
    const fx = rules.some((r) => r.kind.startsWith("fx_")) ? await loadFxTable(tx, asOf, asOf) : null;
    for (const alert of rules) {
      const p = alert.params;
      const fire = async (n: { title: string; body: string }, link: string | null, key: string) => {
        if (await notify(tx, ctx, alert, { ...n, link, key })) notified++;
      };
      switch (alert.kind) {
        case "price_above":
        case "price_below": {
          const [inst] = await tx.select({ name: instruments.name, symbol: instruments.symbol, currency: instruments.currency, staleAfterDays: instruments.staleAfterDays }).from(instruments).where(eq(instruments.id, String(p.instrumentId))).limit(1);
          if (!inst) break;
          const r = await tx.execute<{ price: string; observed_on: string }>(sql`select price::text, observed_on::text from market_prices where instrument_id = ${String(p.instrumentId)} and observed_on <= ${asOf} order by observed_on desc limit 1`);
          const last = r.rows[0];
          // Stale prices never trigger price alerts.
          if (!last || daysBetween(last.observed_on, asOf) > inst.staleAfterDays) break;
          const price = d(last.price);
          const level = d(String(p.level));
          const hit = alert.kind === "price_above" ? price.gt(level) : price.lt(level);
          if (!hit) break;
          const fmt = (v: string) => formatMoney(v, inst.currency, { decimals: Number(v) < 10 ? 4 : 2 });
          const name = inst.symbol ?? inst.name;
          await fire(alert.kind === "price_above" ? messages.priceAbove(name, fmt(last.price), formatDate(last.observed_on), fmt(level.toFixed())) : messages.priceBelow(name, fmt(last.price), formatDate(last.observed_on), fmt(level.toFixed())), `/explore/${String(p.instrumentId)}`, alert.repeat ? asOf : last.observed_on);
          break;
        }
        case "fx_above":
        case "fx_below": {
          try {
            const q = fx!.quote(String(p.base), String(p.quote), asOf);
            if (q.ageDays > 3) break;
            const level = d(String(p.level));
            const hit = alert.kind === "fx_above" ? q.rate.gt(level) : q.rate.lt(level);
            if (!hit) break;
            const pair = `${String(p.base)}/${String(p.quote)}`;
            await fire(alert.kind === "fx_above" ? messages.fxAbove(pair, q.rate.toFixed(2), formatDate(q.observedOn), level.toFixed(2)) : messages.fxBelow(pair, q.rate.toFixed(2), formatDate(q.observedOn), level.toFixed(2)), null, alert.repeat ? asOf : q.observedOn);
          } catch (err) {
            if (!(err instanceof MissingFxRateError)) throw err;
          }
          break;
        }
        case "maturity_reminder": {
          for (const m of dash!.maturities) {
            if (m.daysToGo < 0 || m.daysToGo > Number(p.daysBefore)) continue;
            await fire(messages.maturity(m.name, formatDate(m.maturityDate), m.daysToGo, m.accountName), "/holdings", `${m.instrumentId}:${m.maturityDate}`);
          }
          break;
        }
        case "data_stale": {
          const serious = dash!.issues.filter((i) => ["STALE_PRICE", "MISSING_PRICE", "MISSING_FX", "STALE_FX", "VALUED_AT_COST"].includes(i.code));
          if (serious.length) await fire(messages.dataStale(serious.length, serious[0]!.message), "/dashboard", asOf);
          break;
        }
        case "concentration": {
          const c = dash!.concentration;
          if (c?.largestWeight && d(c.largestWeight).times(100).gt(Number(p.maxWeightPct))) {
            await fire(messages.concentration(c.largestName ?? "One holding", formatPercent(c.largestWeight), `${p.maxWeightPct}%`), "/holdings", asOf);
          }
          break;
        }
        case "goal_progress": {
          try {
            const v = await getGoalView(ctx, String(p.goalId));
            const progress = v.progress === null ? 0 : Number(v.progress);
            for (const milestone of [0.25, 0.5, 0.75, 1]) {
              if (progress >= milestone) await fire(messages.goalMilestone(v.goal.name, formatPercent(milestone, { decimals: 0 })), `/goals/${v.goal.id}`, `m${milestone}`);
            }
          } catch (err) {
            if (!(err instanceof AppError && err.code === "NOT_FOUND")) throw err;
          }
          break;
        }
      }
      await tx.update(alerts).set({ lastEvaluatedAt: new Date() }).where(eq(alerts.id, alert.id));
    }
  });
  return { evaluated: rules.length, notified };
}

/** Queue an evaluation for every user with enabled alerts. Hourly dedupe keys make this safe to call often. */
export async function scheduleAlertEvaluations(now = new Date()): Promise<number> {
  const r = await db().execute<{ org_id: string; user_id: string }>(sql`select org_id, user_id from app_alert_subjects()`);
  const hour = now.toISOString().slice(0, 13);
  let queued = 0;
  for (const s of r.rows) if (await enqueue("alerts.evaluate", { orgId: s.org_id, userId: s.user_id }, { dedupeKey: `alerts:${s.org_id}:${s.user_id}:${hour}` })) queued++;
  return queued;
}

export const jobHandlers = {
  "alerts.evaluate": async (payload: Record<string, unknown>) => {
    await evaluateAlerts({ orgId: String(payload.orgId), userId: String(payload.userId) });
  },
};
