import "server-only";
import { and, desc, eq, gte, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import { invoices, organizations, paymentEvents, plans, platformSettings, subscriptions } from "@/server/db/schema";
import { withBillingSystem } from "@/server/db/client";
import { AppError } from "@/server/platform/errors";
import { recordAudit } from "@/server/audit/audit";
import { parseOrThrow } from "@/server/identity/service";
import { asAdmin, type AdminContext } from "@/server/admin/context";
import { d, ZERO } from "@/engine";
import { addInterval, applyPayment } from "./service";
import { billingSettingsSchema } from "./settings";

/** Administrator billing operations. Every one is audited. */
const paymentSchema = z.object({
  method: z.enum(["bank_transfer", "cash", "other"]),
  reference: z.string().trim().min(3, "Enter the bank or payment reference").max(120),
  amount: z.string().trim().regex(/^\d+(\.\d{1,2})?$/, "Amount, e.g. 4500.00"),
  paidOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export async function adminRecordPayment(admin: AdminContext, invoiceId: string, input: unknown): Promise<void> {
  const p = parseOrThrow(paymentSchema, input);
  if (p.paidOn > new Date().toISOString().slice(0, 10)) throw new AppError("VALIDATION", "The payment date can't be in the future.", { fieldErrors: { paidOn: ["Not in the future"] } });
  const [inv] = await asAdmin(admin, (tx) => tx.select({ currency: invoices.currency }).from(invoices).where(eq(invoices.id, invoiceId)));
  if (!inv) throw new AppError("NOT_FOUND", "Invoice not found.");
  await withBillingSystem((tx) => applyPayment(tx, invoiceId, { method: p.method, reference: p.reference, amount: p.amount, currency: inv.currency, paidAt: new Date(`${p.paidOn}T12:00:00Z`) }, admin.userId));
}

export async function adminVoidInvoice(admin: AdminContext, invoiceId: string, reason: string): Promise<void> {
  const r = parseOrThrow(z.string().trim().min(5, "Give a reason").max(300), reason);
  await asAdmin(admin, async (tx) => {
    const [inv] = await tx.select().from(invoices).where(eq(invoices.id, invoiceId));
    if (!inv) throw new AppError("NOT_FOUND", "Invoice not found.");
    if (inv.status !== "open") throw new AppError("CONFLICT", `Invoice is already ${inv.status}.`);
    await tx.update(invoices).set({ status: "void", voidReason: r }).where(eq(invoices.id, invoiceId));
    await recordAudit(tx, { orgId: null, actorUserId: admin.userId, action: "admin.invoice_voided", targetType: "invoice", targetId: invoiceId, metadata: { reason: r, orgId: inv.orgId } });
  });
}

const grantSchema = z.object({ planCode: z.enum(["plus", "pro", "adviser"]), months: z.coerce.number().int().min(1).max(24), note: z.string().trim().min(3, "Say why").max(300) });

/** Complimentary plan (e.g. beta testers, partners). Replaces any current subscription. */
export async function adminGrantPlan(admin: AdminContext, orgId: string, input: unknown): Promise<void> {
  const g = parseOrThrow(grantSchema, input);
  await asAdmin(admin, async (tx) => {
    const [org] = await tx.select({ id: organizations.id }).from(organizations).where(eq(organizations.id, orgId));
    if (!org) throw new AppError("NOT_FOUND", "Organisation not found.");
    const [plan] = await tx.select().from(plans).where(eq(plans.code, g.planCode));
    const now = new Date();
    await tx.update(subscriptions).set({ status: "canceled", endedAt: now, note: "Replaced by a complimentary plan", updatedAt: now }).where(and(eq(subscriptions.orgId, orgId), inArray(subscriptions.status, ["trialing", "active", "past_due"])));
    await tx.update(invoices).set({ status: "void", voidReason: "Replaced by a complimentary plan" }).where(and(eq(invoices.orgId, orgId), eq(invoices.status, "open")));
    await tx.insert(subscriptions).values({ orgId, planCode: plan!.code, status: "active", price: "0", currency: plan!.currency, interval: plan!.interval, currentPeriodStart: now, currentPeriodEnd: addInterval(now, "month", g.months), complimentary: true, note: g.note, createdBy: admin.userId });
    await recordAudit(tx, { orgId: null, actorUserId: admin.userId, action: "admin.plan_granted", targetType: "organization", targetId: orgId, metadata: { plan: g.planCode, months: g.months, note: g.note } });
  });
}

export async function adminEndSubscription(admin: AdminContext, orgId: string, reason: string): Promise<void> {
  const r = parseOrThrow(z.string().trim().min(5, "Give a reason").max(300), reason);
  await asAdmin(admin, async (tx) => {
    const now = new Date();
    const ended = await tx.update(subscriptions).set({ status: "canceled", endedAt: now, note: r, updatedAt: now }).where(and(eq(subscriptions.orgId, orgId), inArray(subscriptions.status, ["trialing", "active", "past_due"]))).returning({ id: subscriptions.id });
    if (!ended.length) throw new AppError("CONFLICT", "No current subscription.");
    await recordAudit(tx, { orgId: null, actorUserId: admin.userId, action: "admin.subscription_ended", targetType: "organization", targetId: orgId, metadata: { reason: r } });
  });
}

const entitlementsSchema = z.object({
  accounts: z.coerce.number().int().min(0).nullable(),
  goals: z.coerce.number().int().min(0).nullable(),
  alerts: z.coerce.number().int().min(0).nullable(),
  watchlists: z.coerce.number().int().min(0).nullable(),
  members: z.coerce.number().int().min(1).nullable(),
  csvImportsPerMonth: z.coerce.number().int().min(0).nullable(),
  aiQuestionsPerMonth: z.coerce.number().int().min(0).nullable(),
  pdfReports: z.boolean(),
});
const planSchema = z.object({
  name: z.string().trim().min(2).max(40),
  description: z.string().trim().max(300),
  price: z.string().trim().regex(/^\d+(\.\d{1,2})?$/),
  trialDays: z.coerce.number().int().min(0).max(90),
  isPublic: z.boolean(),
  active: z.boolean(),
  entitlements: entitlementsSchema,
});

/** Edit a plan. Existing subscriptions keep their price until their next renewal. */
export async function adminSavePlan(admin: AdminContext, code: string, input: unknown): Promise<void> {
  const p = parseOrThrow(planSchema, input);
  if (code === "free" && (!d(p.price).isZero() || !p.active || !p.isPublic)) throw new AppError("VALIDATION", "Free must stay free, active and public.");
  await asAdmin(admin, async (tx) => {
    const [before] = await tx.select().from(plans).where(eq(plans.code, code));
    if (!before) throw new AppError("NOT_FOUND", "Plan not found.");
    await tx.update(plans).set({ ...p, updatedAt: new Date() }).where(eq(plans.code, code));
    await recordAudit(tx, { orgId: null, actorUserId: admin.userId, action: "admin.plan_updated", targetType: "plan", targetId: code, metadata: { before: { price: before.price, trialDays: before.trialDays, entitlements: before.entitlements, active: before.active, isPublic: before.isPublic }, after: p } });
  });
}

export async function adminSaveBillingSettings(admin: AdminContext, input: unknown): Promise<void> {
  const s = parseOrThrow(billingSettingsSchema, input);
  await asAdmin(admin, async (tx) => {
    await tx.insert(platformSettings).values({ key: "billing", value: s, updatedBy: admin.userId }).onConflictDoUpdate({ target: platformSettings.key, set: { value: s, updatedBy: admin.userId, updatedAt: new Date() } });
    await recordAudit(tx, { orgId: null, actorUserId: admin.userId, action: "admin.billing_settings_updated", targetType: "platform_settings", targetId: "billing", metadata: { taxRatePercent: s.taxRatePercent, taxMode: s.taxMode, bankTransfer: s.bankTransfer ? "set" : "none" } });
  });
}

/** Revenue figures from WealthOS's own records (no provider data). */
export async function adminRevenue(admin: AdminContext) {
  return asAdmin(admin, async (tx) => {
    const current = await tx.select({ planCode: subscriptions.planCode, status: subscriptions.status, price: subscriptions.price, interval: subscriptions.interval, complimentary: subscriptions.complimentary }).from(subscriptions).where(inArray(subscriptions.status, ["trialing", "active", "past_due"]));
    let mrr = ZERO;
    const byPlan: Record<string, { trialing: number; active: number; past_due: number; complimentary: number }> = {};
    for (const s of current) {
      const b = (byPlan[s.planCode] ??= { trialing: 0, active: 0, past_due: 0, complimentary: 0 });
      if (s.complimentary) b.complimentary++;
      else b[s.status as "trialing" | "active" | "past_due"]++;
      if (!s.complimentary && s.status !== "trialing") mrr = mrr.plus(s.interval === "year" ? d(s.price).div(12) : d(s.price));
    }
    const since = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth() - 11, 1));
    const monthly = await tx.execute<{ month: string; currency: string; collected: string; invoices: string }>(sql`
      select to_char(date_trunc('month', paid_at), 'YYYY-MM') as month, currency, sum(total)::text as collected, count(*)::text as invoices
      from invoices where status = 'paid' and paid_at >= ${since.toISOString()} group by 1, 2 order by 1`);
    const [open] = await tx.select({ n: sql<string>`count(*)`, total: sql<string>`coalesce(sum(total), 0)` }).from(invoices).where(eq(invoices.status, "open"));
    const failedEvents = await tx.select().from(paymentEvents).where(inArray(paymentEvents.outcome, ["failed", "rejected"])).orderBy(desc(paymentEvents.receivedAt)).limit(50);
    const recentInvoices = await tx.select().from(invoices).where(gte(invoices.issuedAt, since)).orderBy(desc(invoices.issuedAt)).limit(100);
    return { mrr: mrr.toFixed(2), byPlan, monthly: monthly.rows, openInvoices: { count: Number(open?.n ?? 0), total: open?.total ?? "0" }, failedEvents, recentInvoices };
  });
}

export async function adminBillingConfig(admin: AdminContext) {
  const { listPlans } = await import("./entitlements");
  const { getBillingSettings } = await import("./settings");
  return asAdmin(admin, async (tx) => ({ plans: await listPlans(tx), settings: await getBillingSettings(tx) }));
}
