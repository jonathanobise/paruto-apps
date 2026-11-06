import "server-only";
import { and, asc, desc, eq, inArray, lte, sql } from "drizzle-orm";
import { invoices, memberships, notifications, organizations, subscriptions, users, type InvoiceLine } from "@/server/db/schema";
import { withBillingSystem, withTenant, type TenantContext, type Tx } from "@/server/db/client";
import { AppError } from "@/server/platform/errors";
import { recordAudit } from "@/server/audit/audit";
import { sendEmail, appUrl } from "@/server/identity/email";
import { d, ZERO, type Decimal } from "@/engine";
import { effectivePlan, listPlans, type PlanView } from "./entitlements";
import { getBillingSettings, type BillingSettings } from "./settings";
import { assertNotDemo } from "@/server/demo/mode";

/**
 * Provider-neutral subscription billing.
 *
 * - Customers (owners/admins) start a trial, request a plan, upgrade, schedule downgrades and
 *   cancel. Anything that creates an amount owed is issued by the billing system after the app
 *   has checked the customer's role, so customers never write invoice amounts.
 * - Payment is applied by an administrator (manual bank-transfer reconciliation) or by a verified
 *   provider notification. No payment provider is connected (docs/BILLING.md).
 * - The lifecycle job issues renewal invoices, moves unpaid subscriptions to past-due with a grace
 *   period, then expires them (back to Free; data is never deleted).
 */
const DAY = 86_400_000;
const money = (x: Decimal) => x.toDecimalPlaces(2);

export function addInterval(date: Date, interval: "month" | "year", n = 1): Date {
  const r = new Date(date);
  const day = r.getUTCDate();
  r.setUTCDate(1);
  if (interval === "month") r.setUTCMonth(r.getUTCMonth() + n);
  else r.setUTCFullYear(r.getUTCFullYear() + n);
  const last = new Date(Date.UTC(r.getUTCFullYear(), r.getUTCMonth() + 1, 0)).getUTCDate();
  r.setUTCDate(Math.min(day, last));
  return r;
}

/** Credit for the unused part of the current period when moving to a dearer plan (day-based). */
export function prorate(oldPrice: Decimal, newPrice: Decimal, periodStart: Date, periodEnd: Date, now: Date): Decimal {
  const total = Math.max(1, Math.round((periodEnd.getTime() - periodStart.getTime()) / DAY));
  const remaining = Math.max(0, Math.min(total, Math.ceil((periodEnd.getTime() - now.getTime()) / DAY)));
  const diff = newPrice.minus(oldPrice);
  return diff.lte(0) ? ZERO : money(diff.times(remaining).div(total));
}

export function computeTax(amountDue: Decimal, s: Pick<BillingSettings, "taxRatePercent" | "taxMode">): { subtotal: Decimal; tax: Decimal; total: Decimal } {
  const rate = d(s.taxRatePercent).div(100);
  if (rate.isZero()) return { subtotal: money(amountDue), tax: ZERO, total: money(amountDue) };
  if (s.taxMode === "inclusive") {
    const total = money(amountDue);
    const subtotal = money(total.div(rate.plus(1)));
    return { subtotal, tax: total.minus(subtotal), total };
  }
  const subtotal = money(amountDue);
  const tax = money(subtotal.times(rate));
  return { subtotal, tax, total: subtotal.plus(tax) };
}

async function ownersOf(tx: Tx, orgId: string) {
  return tx.select({ userId: users.id, email: users.email, name: users.displayName }).from(memberships).innerJoin(users, eq(users.id, memberships.userId)).where(and(eq(memberships.orgId, orgId), eq(memberships.role, "owner")));
}

async function notifyOwners(tx: Tx, orgId: string, n: { kind: string; title: string; body: string; link: string; dedupeKey: string; email?: boolean }) {
  const owners = await ownersOf(tx, orgId);
  for (const o of owners) {
    await tx.insert(notifications).values({ orgId, userId: o.userId, kind: n.kind, title: n.title, body: n.body, link: n.link, dedupeKey: `${n.dedupeKey}:${o.userId}` }).onConflictDoNothing();
    if (n.email) await sendEmail({ to: o.email, subject: n.title, text: `${n.body}\n\n${appUrl(n.link)}`, purpose: "billing" });
  }
}

/** Issue an invoice (billing-system or admin transaction only). */
export async function issueInvoice(tx: Tx, args: { orgId: string; subscriptionId: string | null; purpose: string; lines: InvoiceLine[]; currency: string; periodStart?: Date; periodEnd?: Date; dueAt?: Date }) {
  const s = await getBillingSettings(tx);
  const gross = args.lines.reduce((a, l) => a.plus(d(l.amount)), ZERO);
  if (gross.lte(0)) throw new AppError("VALIDATION", "Nothing to invoice.");
  const { subtotal, tax, total } = computeTax(gross, s);
  const [org] = await tx.select({ name: organizations.name }).from(organizations).where(eq(organizations.id, args.orgId));
  const [owner] = await ownersOf(tx, args.orgId);
  const seq = await tx.execute<{ n: string }>(sql`select nextval('invoice_number_seq') as n`);
  const number = `${s.invoicePrefix}-${new Date().getUTCFullYear()}-${String(seq.rows[0]!.n).padStart(6, "0")}`;
  const [row] = await tx
    .insert(invoices)
    .values({
      orgId: args.orgId,
      subscriptionId: args.subscriptionId,
      number,
      currency: args.currency,
      subtotal: subtotal.toFixed(2),
      taxLabel: tax.isZero() ? null : s.taxLabel,
      taxRatePercent: s.taxRatePercent,
      tax: tax.toFixed(2),
      total: total.toFixed(2),
      lines: args.lines,
      purpose: args.purpose,
      periodStart: args.periodStart ?? null,
      periodEnd: args.periodEnd ?? null,
      billedTo: { name: org?.name ?? "Customer", email: owner?.email ?? null },
      dueAt: args.dueAt ?? new Date(Date.now() + s.paymentDueDays * DAY),
    })
    .returning();
  await notifyOwners(tx, args.orgId, { kind: "billing.invoice", title: `Invoice ${number} for ${args.currency} ${total.toFixed(2)}`, body: `${args.lines.map((l) => l.description).join("; ")}. Due ${row!.dueAt.toISOString().slice(0, 10)}.`, link: `/settings/billing/invoices/${row!.id}`, dedupeKey: `invoice:${row!.id}`, email: true });
  return row!;
}

async function requireBillingRole(ctx: TenantContext) {
  return withTenant(ctx, async (tx) => {
    const r = await tx.execute<{ role: string | null }>(sql`select app_org_role() as role`);
    if (!["owner", "admin"].includes(r.rows[0]?.role ?? "")) throw new AppError("FORBIDDEN", "Only owners and admins can manage the plan.");
    const [org] = await tx.select({ isDemo: organizations.isDemo }).from(organizations).where(eq(organizations.id, ctx.orgId));
    if (org?.isDemo) throw new AppError("VALIDATION", "Demo spaces aren't billed.");
    return effectivePlan(tx, ctx.orgId);
  });
}

async function planOrThrow(tx: Tx, code: string): Promise<PlanView> {
  const p = (await listPlans(tx, { publicOnly: true })).find((x) => x.code === code && x.code !== "free");
  if (!p) throw new AppError("NOT_FOUND", "That plan isn't available.");
  return p;
}

export async function startTrial(ctx: TenantContext, planCode: string): Promise<void> {
  assertNotDemo("Starting a trial");
  const eff = await requireBillingRole(ctx);
  if (eff.subscription && ["trialing", "active", "past_due"].includes(eff.subscription.status)) throw new AppError("CONFLICT", "You already have a plan. Change it instead.");
  await withTenant(ctx, async (tx) => {
    const p = await planOrThrow(tx, planCode);
    if (p.trialDays <= 0) throw new AppError("VALIDATION", "This plan has no free trial.");
    const [prior] = await tx.select({ id: subscriptions.id }).from(subscriptions).where(and(eq(subscriptions.orgId, ctx.orgId), sql`${subscriptions.trialEndsAt} is not null`)).limit(1);
    if (prior) throw new AppError("CONFLICT", "This space has already had a free trial.");
    const now = new Date();
    const end = new Date(now.getTime() + p.trialDays * DAY);
    const [s] = await tx.insert(subscriptions).values({ orgId: ctx.orgId, planCode: p.code, status: "trialing", price: p.price, currency: p.currency, interval: p.interval, currentPeriodStart: now, currentPeriodEnd: end, trialEndsAt: end, createdBy: ctx.userId }).returning({ id: subscriptions.id });
    await recordAudit(tx, { orgId: ctx.orgId, actorUserId: ctx.userId, action: "billing.trial_started", targetType: "subscription", targetId: s!.id, metadata: { plan: p.code, trialDays: p.trialDays } });
  });
}

/**
 * Ask to pay for a plan. From Free or a trial: invoice for the first period (the subscription
 * becomes active when it's paid). On a paid plan moving to a dearer one: a prorated invoice for
 * the rest of the period. Moving to a cheaper plan or Free: scheduled for the period end.
 */
export async function changePlan(ctx: TenantContext, planCode: string): Promise<{ invoiceId: string | null; scheduled: boolean }> {
  assertNotDemo("Changing plan");
  const eff = await requireBillingRole(ctx);
  const sub = eff.subscription && ["trialing", "active", "past_due"].includes(eff.subscription.status) ? eff.subscription : null;
  if (planCode === "free") {
    if (!sub) throw new AppError("CONFLICT", "You're already on Free.");
    await cancelAtPeriodEnd(ctx, true);
    return { invoiceId: null, scheduled: true };
  }
  const target = await withTenant(ctx, (tx) => planOrThrow(tx, planCode));
  if (sub?.complimentary) throw new AppError("CONFLICT", "This space has a complimentary plan. Contact support to change it.");
  const open = await withTenant(ctx, (tx) => tx.select({ id: invoices.id }).from(invoices).where(and(eq(invoices.orgId, ctx.orgId), eq(invoices.status, "open"), sql`(${invoices.purpose} like 'start:%' or ${invoices.purpose} like 'upgrade:%')`)).limit(1));
  if (open.length) throw new AppError("CONFLICT", "There's already an unpaid plan invoice. Pay or cancel it first.");

  if (sub && sub.status !== "trialing") {
    if (sub.planCode === target.code) {
      if (sub.pendingPlanCode || sub.cancelAtPeriodEnd) {
        await withTenant(ctx, (tx) => tx.update(subscriptions).set({ pendingPlanCode: null, cancelAtPeriodEnd: false, updatedAt: new Date() }).where(eq(subscriptions.id, sub.id)));
        return { invoiceId: null, scheduled: false };
      }
      throw new AppError("CONFLICT", `You're already on ${target.name}.`);
    }
    if (d(target.price).lte(d(sub.price))) {
      await withTenant(ctx, async (tx) => {
        await tx.update(subscriptions).set({ pendingPlanCode: target.code, cancelAtPeriodEnd: false, updatedAt: new Date() }).where(eq(subscriptions.id, sub.id));
        await recordAudit(tx, { orgId: ctx.orgId, actorUserId: ctx.userId, action: "billing.downgrade_scheduled", targetType: "subscription", targetId: sub.id, metadata: { to: target.code } });
      });
      return { invoiceId: null, scheduled: true };
    }
    const amount = prorate(d(sub.price), d(target.price), sub.currentPeriodStart, sub.currentPeriodEnd, new Date());
    const inv = await withBillingSystem((tx) =>
      issueInvoice(tx, { orgId: ctx.orgId, subscriptionId: sub.id, purpose: `upgrade:${target.code}`, currency: target.currency, lines: [{ description: `Upgrade to ${target.name} for the rest of the current period (to ${sub.currentPeriodEnd.toISOString().slice(0, 10)}), prorated by day`, amount: amount.toFixed(2) }] }),
    );
    await withTenant(ctx, (tx) => recordAudit(tx, { orgId: ctx.orgId, actorUserId: ctx.userId, action: "billing.upgrade_requested", targetType: "invoice", targetId: inv.id, metadata: { to: target.code } }));
    return { invoiceId: inv.id, scheduled: false };
  }

  // From Free or a trial: first period starts when paid (or when the trial ends, if later).
  const inv = await withBillingSystem((tx) =>
    issueInvoice(tx, { orgId: ctx.orgId, subscriptionId: sub?.id ?? null, purpose: `start:${target.code}`, currency: target.currency, lines: [{ description: `${target.name}, one ${target.interval}`, amount: d(target.price).toFixed(2) }] }),
  );
  await withTenant(ctx, (tx) => recordAudit(tx, { orgId: ctx.orgId, actorUserId: ctx.userId, action: "billing.plan_requested", targetType: "invoice", targetId: inv.id, metadata: { plan: target.code } }));
  return { invoiceId: inv.id, scheduled: false };
}

export async function cancelAtPeriodEnd(ctx: TenantContext, cancel: boolean): Promise<void> {
  assertNotDemo("Cancelling a plan");
  const eff = await requireBillingRole(ctx);
  const sub = eff.subscription;
  if (!sub || !["trialing", "active", "past_due"].includes(sub.status)) throw new AppError("CONFLICT", "There's no plan to cancel.");
  await withTenant(ctx, async (tx) => {
    if (sub.status === "trialing" && cancel) {
      await tx.update(subscriptions).set({ status: "expired", endedAt: new Date(), updatedAt: new Date() }).where(eq(subscriptions.id, sub.id));
    } else {
      await tx.update(subscriptions).set({ cancelAtPeriodEnd: cancel, pendingPlanCode: null, updatedAt: new Date() }).where(eq(subscriptions.id, sub.id));
    }
    await recordAudit(tx, { orgId: ctx.orgId, actorUserId: ctx.userId, action: cancel ? "billing.cancel_requested" : "billing.cancel_withdrawn", targetType: "subscription", targetId: sub.id });
  });
}

/** Withdraw an unpaid plan or upgrade invoice the customer asked for. */
export async function withdrawInvoice(ctx: TenantContext, invoiceId: string): Promise<void> {
  assertNotDemo("Withdrawing an invoice");
  await requireBillingRole(ctx);
  const [inv] = await withTenant(ctx, (tx) => tx.select().from(invoices).where(eq(invoices.id, invoiceId)));
  if (!inv) throw new AppError("NOT_FOUND", "Invoice not found.");
  if (inv.status !== "open" || !/^(start|upgrade):/.test(inv.purpose)) throw new AppError("CONFLICT", "Only unpaid plan requests can be withdrawn.");
  await withBillingSystem((tx) => tx.update(invoices).set({ status: "void", voidReason: "Withdrawn by customer" }).where(eq(invoices.id, invoiceId)));
  await withTenant(ctx, (tx) => recordAudit(tx, { orgId: ctx.orgId, actorUserId: ctx.userId, action: "billing.invoice_withdrawn", targetType: "invoice", targetId: invoiceId }));
}

export interface PaymentInput {
  method: string;
  reference: string;
  amount: string;
  currency: string;
  paidAt: Date;
}

/**
 * Apply a payment to an invoice inside an admin or billing-system transaction. The amount and
 * currency must match exactly; anything else is refused and left for reconciliation.
 */
export async function applyPayment(tx: Tx, invoiceId: string, p: PaymentInput, actorUserId: string | null): Promise<void> {
  const [inv] = await tx.select().from(invoices).where(eq(invoices.id, invoiceId)).for("update");
  if (!inv) throw new AppError("NOT_FOUND", "Invoice not found.");
  if (inv.status !== "open") throw new AppError("CONFLICT", `Invoice ${inv.number} is already ${inv.status}.`);
  if (!inv.orgId) throw new AppError("CONFLICT", "The organisation for this invoice no longer exists.");
  if (p.currency !== inv.currency || !d(p.amount).eq(d(inv.total))) throw new AppError("VALIDATION", `Payment of ${p.currency} ${p.amount} doesn't match invoice ${inv.number} (${inv.currency} ${inv.total}).`);
  await tx.update(invoices).set({ status: "paid", paidAt: p.paidAt, paymentMethod: p.method, paymentRef: p.reference.slice(0, 120) }).where(eq(invoices.id, inv.id));

  const allPlans = await listPlans(tx);
  const [kind, code] = inv.purpose.split(":") as [string, string | undefined];
  const [current] = await tx.select().from(subscriptions).where(and(eq(subscriptions.orgId, inv.orgId), inArray(subscriptions.status, ["trialing", "active", "past_due"]))).limit(1).for("update");
  const now = new Date();
  if (kind === "start") {
    const plan = allPlans.find((x) => x.code === code);
    if (!plan) throw new AppError("NOT_FOUND", "Plan not found.");
    const start = current?.status === "trialing" && current.currentPeriodEnd > now ? current.currentPeriodEnd : now;
    const end = addInterval(start, plan.interval);
    if (current) {
      await tx.update(subscriptions).set({ planCode: plan.code, status: "active", price: plan.price, currency: plan.currency, interval: plan.interval, currentPeriodStart: current.status === "trialing" ? current.currentPeriodStart : start, currentPeriodEnd: end, graceEndsAt: null, cancelAtPeriodEnd: false, pendingPlanCode: null, updatedAt: now }).where(eq(subscriptions.id, current.id));
    } else {
      await tx.insert(subscriptions).values({ orgId: inv.orgId, planCode: plan.code, status: "active", price: plan.price, currency: plan.currency, interval: plan.interval, currentPeriodStart: start, currentPeriodEnd: end });
    }
  } else if (kind === "upgrade") {
    const plan = allPlans.find((x) => x.code === code);
    if (!plan || !current) throw new AppError("CONFLICT", "No subscription to upgrade.");
    await tx.update(subscriptions).set({ planCode: plan.code, price: plan.price, pendingPlanCode: null, updatedAt: now }).where(eq(subscriptions.id, current.id));
  } else if (kind === "renew") {
    if (!current) throw new AppError("CONFLICT", "The subscription has ended; issue a new plan invoice instead.");
    const plan = allPlans.find((x) => x.code === (code ?? current.planCode)) ?? allPlans.find((x) => x.code === current.planCode)!;
    await tx.update(subscriptions).set({ status: "active", planCode: plan.code, price: plan.price, pendingPlanCode: null, currentPeriodStart: current.currentPeriodEnd, currentPeriodEnd: addInterval(current.currentPeriodEnd, current.interval), graceEndsAt: null, updatedAt: now }).where(eq(subscriptions.id, current.id));
  }
  await recordAudit(tx, { orgId: inv.orgId, actorUserId, action: "billing.payment_applied", targetType: "invoice", targetId: inv.id, metadata: { method: p.method, amount: p.amount, currency: p.currency } });
  await notifyOwners(tx, inv.orgId, { kind: "billing.paid", title: `Payment received for ${inv.number}`, body: `Thank you. Your receipt is available.`, link: `/settings/billing/invoices/${inv.id}`, dedupeKey: `paid:${inv.id}`, email: true });
}

/**
 * Billing lifecycle (run by the worker): renewal invoices, trial ends, past-due grace, expiry,
 * scheduled cancellations and downgrades. Idempotent: safe to run as often as you like.
 */
export async function runBillingLifecycle(now = new Date()): Promise<Record<string, number>> {
  const out = { renewalInvoices: 0, trialsEnded: 0, pastDue: 0, expired: 0, canceled: 0 };
  return withBillingSystem(async (tx) => {
    const s = await getBillingSettings(tx);
    const allPlans = await listPlans(tx);
    const subs = await tx.select().from(subscriptions).where(inArray(subscriptions.status, ["trialing", "active", "past_due"])).orderBy(asc(subscriptions.currentPeriodEnd));
    for (const sub of subs) {
      const end = sub.currentPeriodEnd;
      if (sub.status === "trialing") {
        if (end <= now) {
          await tx.update(subscriptions).set({ status: "expired", endedAt: now, updatedAt: now }).where(eq(subscriptions.id, sub.id));
          await notifyOwners(tx, sub.orgId, { kind: "billing.trial_ended", title: "Your free trial has ended", body: "This space is back on Free. Nothing has been deleted; items above Free limits are kept but you can't add more. Choose a plan to continue.", link: "/settings/billing", dedupeKey: `trial-ended:${sub.id}`, email: true });
          out.trialsEnded++;
        }
        continue;
      }
      if (sub.complimentary) {
        if (end <= now) {
          await tx.update(subscriptions).set({ status: "expired", endedAt: now, updatedAt: now }).where(eq(subscriptions.id, sub.id));
          out.expired++;
        }
        continue;
      }
      const renewal = await tx.select().from(invoices).where(and(eq(invoices.subscriptionId, sub.id), sql`${invoices.purpose} like 'renew%'`, eq(invoices.periodStart, end))).orderBy(desc(invoices.issuedAt)).limit(1);
      const nextPlan = sub.pendingPlanCode ? allPlans.find((p) => p.code === sub.pendingPlanCode) : allPlans.find((p) => p.code === sub.planCode);
      if (sub.status === "active" && !sub.cancelAtPeriodEnd && nextPlan && end.getTime() - now.getTime() <= s.renewalNoticeDays * DAY && !renewal.length) {
        await issueInvoice(tx, { orgId: sub.orgId, subscriptionId: sub.id, purpose: `renew:${nextPlan.code}`, currency: nextPlan.currency, periodStart: end, periodEnd: addInterval(end, sub.interval), dueAt: end, lines: [{ description: `${nextPlan.name}, ${end.toISOString().slice(0, 10)} to ${addInterval(end, sub.interval).toISOString().slice(0, 10)}`, amount: d(nextPlan.price).toFixed(2), periodStart: end.toISOString().slice(0, 10), periodEnd: addInterval(end, sub.interval).toISOString().slice(0, 10) }] });
        out.renewalInvoices++;
      }
      if (end > now) continue;
      if (sub.cancelAtPeriodEnd) {
        await tx.update(subscriptions).set({ status: "canceled", endedAt: now, updatedAt: now }).where(eq(subscriptions.id, sub.id));
        await notifyOwners(tx, sub.orgId, { kind: "billing.canceled", title: "Your plan has ended", body: "As you asked, this space is now on Free. Nothing has been deleted.", link: "/settings/billing", dedupeKey: `canceled:${sub.id}`, email: true });
        out.canceled++;
      } else if (sub.status === "active") {
        const graceEndsAt = new Date(end.getTime() + s.graceDays * DAY);
        await tx.update(subscriptions).set({ status: "past_due", graceEndsAt, updatedAt: now }).where(eq(subscriptions.id, sub.id));
        await notifyOwners(tx, sub.orgId, { kind: "billing.past_due", title: "Payment overdue", body: `We haven't received payment for your renewal. Your plan stays on until ${graceEndsAt.toISOString().slice(0, 10)}; after that this space moves to Free (nothing is deleted).`, link: "/settings/billing", dedupeKey: `past-due:${sub.id}:${end.toISOString()}`, email: true });
        out.pastDue++;
      } else if (sub.status === "past_due" && (sub.graceEndsAt ?? end) <= now) {
        await tx.update(subscriptions).set({ status: "expired", endedAt: now, updatedAt: now }).where(eq(subscriptions.id, sub.id));
        await tx.update(invoices).set({ status: "void", voidReason: "Subscription expired unpaid" }).where(and(eq(invoices.subscriptionId, sub.id), eq(invoices.status, "open")));
        await notifyOwners(tx, sub.orgId, { kind: "billing.expired", title: "Your plan has ended", body: "We didn't receive payment, so this space is now on Free. Nothing has been deleted. Choose a plan to continue.", link: "/settings/billing", dedupeKey: `expired:${sub.id}`, email: true });
        out.expired++;
      }
    }
    // Plan-start invoices nobody paid are voided after their due date plus grace.
    await tx.update(invoices).set({ status: "void", voidReason: "Not paid by the due date" }).where(and(eq(invoices.status, "open"), sql`(${invoices.purpose} like 'start:%' or ${invoices.purpose} like 'upgrade:%')`, lte(invoices.dueAt, new Date(now.getTime() - s.graceDays * DAY))));
    return out;
  });
}

export async function listInvoices(ctx: TenantContext) {
  return withTenant(ctx, (tx) => tx.select().from(invoices).where(eq(invoices.orgId, ctx.orgId)).orderBy(desc(invoices.issuedAt)).limit(100));
}

export async function getInvoice(ctx: TenantContext, id: string) {
  return withTenant(ctx, async (tx) => {
    const [inv] = await tx.select().from(invoices).where(eq(invoices.id, id));
    if (!inv) throw new AppError("NOT_FOUND", "Invoice not found.");
    return { invoice: inv, settings: await getBillingSettings(tx) };
  });
}

export async function billingPaymentDetails(ctx: TenantContext) {
  return withTenant(ctx, async (tx) => (await getBillingSettings(tx)).bankTransfer);
}


/** Hourly lifecycle run through the durable job queue (deduplicated per hour). */
export async function scheduleBillingLifecycle(now = new Date()): Promise<boolean> {
  const { enqueue } = await import("@/server/jobs/queue");
  return (await enqueue("billing.lifecycle", {}, { dedupeKey: `billing:${now.toISOString().slice(0, 13)}` })) !== null;
}

export const billingJobHandlers = {
  "billing.lifecycle": async () => {
    const r = await runBillingLifecycle();
    if (Object.values(r).some(Boolean)) console.log(`[billing] ${JSON.stringify(r)}`);
  },
};
