import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { and, eq, sql } from "drizzle-orm";
import { closeDb, db, withBillingSystem, withTenant } from "@/server/db/client";
import { invoices, notifications, paymentEvents, subscriptions } from "@/server/db/schema";
import { effectivePlan } from "@/server/billing/entitlements";
import { cancelAtPeriodEnd, changePlan, listInvoices, prorate, computeTax, runBillingLifecycle, startTrial, withdrawInvoice, addInterval } from "@/server/billing/service";
import { adminGrantPlan, adminRecordPayment, adminRevenue, adminSaveBillingSettings, adminSavePlan, adminVoidInvoice } from "@/server/billing/admin";
import { handlePaymentWebhook, signTestPayload } from "@/server/billing/providers";
import { createSharedSpace, inviteMember } from "@/server/identity/members";
import { d } from "@/engine";
import { expectDbRejection, makeUser, ownerPool } from "./helpers";

const SECRET = "test-webhook-secret-do-not-use";
let admin: Awaited<ReturnType<typeof makeUser>>;
let cust: Awaited<ReturnType<typeof makeUser>>;
const today = () => new Date().toISOString().slice(0, 10);
const plan = (ctx: { orgId: string; userId: string }) => withTenant(ctx, (tx) => effectivePlan(tx, ctx.orgId));
const shift = async (orgId: string, days: number) => {
  const pool = ownerPool();
  await pool.query("update subscriptions set current_period_start = current_period_start - make_interval(days => $2), current_period_end = current_period_end - make_interval(days => $2), trial_ends_at = trial_ends_at - make_interval(days => $2), grace_ends_at = grace_ends_at - make_interval(days => $2) where org_id = $1 and status in ('trialing','active','past_due')", [orgId, days]);
  await pool.end();
};
const webhook = (body: object, opts: { secret?: string; t?: number } = {}) => {
  const raw = JSON.stringify(body);
  return handlePaymentWebhook("test", raw, new Headers({ "x-wealthos-signature": signTestPayload(opts.secret ?? SECRET, raw, opts.t) }));
};

beforeAll(async () => {
  process.env.BILLING_TEST_WEBHOOK_SECRET = SECRET;
  admin = await makeUser("Billing Admin");
  const pool = ownerPool();
  await pool.query("update users set platform_role = 'admin', mfa_enabled_at = now() where id = $1", [admin.userId]);
  await pool.end();
  await adminSaveBillingSettings({ userId: admin.userId }, { taxLabel: "VAT", taxRatePercent: "7.5", taxMode: "exclusive", bankTransfer: { accountName: "Test Billing Ltd", bankName: "Test Bank", accountNumber: "0123456789", instructions: "Use the invoice number as the reference." } });
  cust = await makeUser("Billing Customer");
});
afterAll(async () => {
  // Reset settings so other test files see defaults.
  const pool = ownerPool();
  await pool.query("delete from platform_settings where key = 'billing'");
  await pool.end();
  await closeDb();
});

describe("billing maths", () => {
  it("prorates by day and computes tax both ways", () => {
    const start = new Date("2026-01-01T00:00:00Z");
    const end = addInterval(start, "month"); // 31 days
    expect(prorate(d(4500), d(12500), start, end, new Date("2026-01-16T00:00:00Z")).toFixed(2)).toBe("4129.03"); // 8000 × 16/31
    expect(prorate(d(12500), d(4500), start, end, start).toFixed(2)).toBe("0.00");
    expect(computeTax(d(4500), { taxRatePercent: "7.5", taxMode: "exclusive" })).toMatchObject({ subtotal: d("4500.00"), tax: d("337.50"), total: d("4837.50") });
    const inc = computeTax(d(4500), { taxRatePercent: "7.5", taxMode: "inclusive" });
    expect([inc.subtotal.toFixed(2), inc.tax.toFixed(2), inc.total.toFixed(2)]).toEqual(["4186.05", "313.95", "4500.00"]);
    expect(addInterval(new Date("2026-01-31T00:00:00Z"), "month").toISOString().slice(0, 10)).toBe("2026-02-28");
  });
});

describe("subscription lifecycle", () => {
  it("trial → invoice → payment → active; only owners and admins manage the plan", async () => {
    await startTrial(cust.ctx, "plus");
    expect(await plan(cust.ctx)).toMatchObject({ source: "subscription", plan: { code: "plus" }, subscription: { status: "trialing" } });
    await expect(startTrial(cust.ctx, "pro")).rejects.toMatchObject({ code: "CONFLICT" });

    const { invoiceId } = await changePlan(cust.ctx, "plus");
    const [inv] = (await listInvoices(cust.ctx)).filter((i) => i.id === invoiceId);
    expect(inv).toMatchObject({ status: "open", subtotal: "4500.0000000000", tax: "337.5000000000", total: "4837.5000000000", taxLabel: "VAT", purpose: "start:plus" });
    expect(inv!.number).toMatch(/^WOS-\d{4}-\d{6}$/);
    await expect(changePlan(cust.ctx, "pro")).rejects.toMatchObject({ code: "CONFLICT" }); // one open plan invoice at a time

    // Wrong amount is refused and nothing changes.
    await expect(adminRecordPayment({ userId: admin.userId }, invoiceId!, { method: "bank_transfer", reference: "TRF-1", amount: "4500", paidOn: today() })).rejects.toMatchObject({ code: "VALIDATION" });
    await adminRecordPayment({ userId: admin.userId }, invoiceId!, { method: "bank_transfer", reference: "TRF-123456", amount: "4837.50", paidOn: today() });
    const eff = await plan(cust.ctx);
    expect(eff).toMatchObject({ plan: { code: "plus" }, subscription: { status: "active" } });
    // Paying during the trial starts the paid period when the trial ends.
    expect(eff.subscription!.currentPeriodEnd.getTime()).toBeGreaterThan(Date.now() + 40 * 86_400_000);
    await expect(adminRecordPayment({ userId: admin.userId }, invoiceId!, { method: "bank_transfer", reference: "TRF-123456", amount: "4837.50", paidOn: today() })).rejects.toMatchObject({ code: "CONFLICT" });
    const notes = await withTenant(cust.ctx, (tx) => tx.select().from(notifications).where(eq(notifications.kind, "billing.paid")));
    expect(notes).toHaveLength(1);
  });

  it("upgrade is prorated; downgrade waits for the period end; cancel and resume", async () => {
    const { invoiceId } = await changePlan(cust.ctx, "pro");
    const [inv] = (await listInvoices(cust.ctx)).filter((i) => i.id === invoiceId);
    expect(inv!.purpose).toBe("upgrade:pro");
    expect(d(inv!.subtotal).gt(0) && d(inv!.subtotal).lte(8000)).toBe(true);
    await adminRecordPayment({ userId: admin.userId }, invoiceId!, { method: "bank_transfer", reference: "TRF-UP-1", amount: d(inv!.total).toFixed(2), paidOn: today() });
    expect((await plan(cust.ctx)).plan.code).toBe("pro");

    expect(await changePlan(cust.ctx, "plus")).toEqual({ invoiceId: null, scheduled: true });
    expect((await plan(cust.ctx)).subscription).toMatchObject({ planCode: "pro", pendingPlanCode: "plus" });
    await cancelAtPeriodEnd(cust.ctx, true);
    expect((await plan(cust.ctx)).subscription).toMatchObject({ cancelAtPeriodEnd: true, pendingPlanCode: null });
    await cancelAtPeriodEnd(cust.ctx, false);
    expect((await plan(cust.ctx)).subscription).toMatchObject({ cancelAtPeriodEnd: false });
  });

  it("renewal invoice, past-due grace, then expiry back to Free without deleting data", async () => {
    const sub = (await plan(cust.ctx)).subscription!;
    const daysLeft = Math.ceil((sub.currentPeriodEnd.getTime() - Date.now()) / 86_400_000);
    await shift(cust.orgId, daysLeft - 3); // 3 days to renewal
    const r1 = await runBillingLifecycle();
    expect(r1.renewalInvoices).toBeGreaterThanOrEqual(1);
    const renewals = (await listInvoices(cust.ctx)).filter((i) => i.purpose.startsWith("renew"));
    expect(renewals).toHaveLength(1);
    await runBillingLifecycle(); // idempotent
    expect((await listInvoices(cust.ctx)).filter((i) => i.purpose.startsWith("renew"))).toHaveLength(1);

    await shift(cust.orgId, 4); // period ended, unpaid
    await runBillingLifecycle();
    const pd = await plan(cust.ctx);
    expect(pd).toMatchObject({ source: "subscription", subscription: { status: "past_due" } }); // still Pro during grace

    await shift(cust.orgId, 8); // grace over
    await runBillingLifecycle();
    expect(await plan(cust.ctx)).toMatchObject({ source: "free" });
    expect((await listInvoices(cust.ctx)).find((i) => i.id === renewals[0]!.id)!.status).toBe("void");
  });

  it("scheduled cancellation ends at the period end", async () => {
    const u = await makeUser("Canceller");
    await adminGrantPlan({ userId: admin.userId }, u.orgId, { planCode: "plus", months: 1, note: "beta tester" });
    expect(await plan(u.ctx)).toMatchObject({ plan: { code: "plus" }, subscription: { complimentary: true } });
    await expect(changePlan(u.ctx, "pro")).rejects.toMatchObject({ code: "CONFLICT" });
    await shift(u.orgId, 40);
    await runBillingLifecycle();
    expect(await plan(u.ctx)).toMatchObject({ source: "free" });
  });

  it("members can't manage the plan", async () => {
    const owner = await makeUser("Space Billing Owner");
    const space = await createSharedSpace(owner.userId, { name: "Billing house", kind: "household" });
    await adminGrantPlan({ userId: admin.userId }, space, { planCode: "pro", months: 1, note: "test" });
    const member = await makeUser("Space Billing Member");
    const { link } = await inviteMember({ userId: owner.userId, orgId: space }, { email: member.email, role: "member" });
    const { acceptInvitation } = await import("@/server/identity/members");
    await acceptInvitation(member.userId, new URL(link).searchParams.get("token")!);
    await expect(cancelAtPeriodEnd({ userId: member.userId, orgId: space }, true)).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(withTenant({ userId: member.userId, orgId: space }, (tx) => tx.update(subscriptions).set({ cancelAtPeriodEnd: true }).where(eq(subscriptions.orgId, space)).returning())).resolves.toHaveLength(0);
  });
});

describe("invoices are tamper-proof", () => {
  it("customers can't create, edit or delete invoices; amounts never change; paid is final", async () => {
    await expectDbRejection(
      withTenant(cust.ctx, (tx) => tx.insert(invoices).values({ orgId: cust.orgId, number: "FAKE-1", currency: "NGN", subtotal: "1", tax: "0", total: "1", lines: [], purpose: "start:pro", billedTo: { name: "x", email: null }, dueAt: new Date() })),
      /row-level security/,
    );
    const [paid] = (await listInvoices(cust.ctx)).filter((i) => i.status === "paid");
    expect(await withTenant(cust.ctx, (tx) => tx.update(invoices).set({ status: "void", voidReason: "x" }).where(eq(invoices.id, paid!.id)).returning())).toHaveLength(0);
    await expectDbRejection(withBillingSystem((tx) => tx.update(invoices).set({ total: "1" }).where(eq(invoices.id, paid!.id))), /WOS_IMMUTABLE/);
    await expectDbRejection(withBillingSystem((tx) => tx.update(invoices).set({ status: "void", voidReason: "x" }).where(eq(invoices.id, paid!.id))), /WOS_IMMUTABLE/);
    await expectDbRejection(withBillingSystem((tx) => tx.delete(invoices).where(eq(invoices.id, paid!.id))), /WOS_IMMUTABLE|permission denied/);
    // Other tenants can't see them.
    const other = await makeUser("Invoice Snoop");
    expect(await withTenant(other.ctx, (tx) => tx.select().from(invoices).where(eq(invoices.orgId, cust.orgId)))).toHaveLength(0);
  });

  it("customers can withdraw an unpaid plan request; admins can void with a reason", async () => {
    const u = await makeUser("Withdrawer");
    const { invoiceId } = await changePlan(u.ctx, "pro");
    await withdrawInvoice(u.ctx, invoiceId!);
    const { invoiceId: second } = await changePlan(u.ctx, "plus");
    await expect(adminVoidInvoice({ userId: admin.userId }, second!, "no")).rejects.toMatchObject({ code: "VALIDATION" });
    await adminVoidInvoice({ userId: admin.userId }, second!, "Customer asked by phone");
    expect((await listInvoices(u.ctx)).map((i) => i.status)).toEqual(["void", "void"]);
    await expect(adminVoidInvoice({ userId: cust.userId }, second!, "Customer asked by phone")).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});

describe("payment notifications (webhooks)", () => {
  it("rejects unknown providers, bad signatures, stale timestamps and tampered bodies", async () => {
    expect((await handlePaymentWebhook("paystack", "{}", new Headers())).status).toBe(404);
    expect((await handlePaymentWebhook("test", "{}", new Headers())).status).toBe(401);
    expect((await webhook({ id: "evt_bad", type: "payment.succeeded" }, { secret: "wrong" })).status).toBe(401);
    expect((await webhook({ id: "evt_old", type: "payment.succeeded" }, { t: Math.floor(Date.now() / 1000) - 3600 })).status).toBe(401);
    const raw = JSON.stringify({ id: "evt_t", type: "payment.succeeded" });
    const sig = signTestPayload(SECRET, raw);
    expect((await handlePaymentWebhook("test", raw.replace("evt_t", "evt_x"), new Headers({ "x-wealthos-signature": sig }))).status).toBe(401);
    expect((await handlePaymentWebhook("test", "x".repeat(70_000), new Headers({ "x-wealthos-signature": signTestPayload(SECRET, "x".repeat(70_000)) }))).status).toBe(413);
    const rejected = await withBillingSystem((tx) => tx.select().from(paymentEvents).where(eq(paymentEvents.outcome, "rejected")));
    expect(rejected.length).toBeGreaterThanOrEqual(3);
    expect(rejected.every((r) => !r.signatureValid)).toBe(true);
  });

  it("applies a verified payment once, and records mismatches for reconciliation", async () => {
    const u = await makeUser("Webhook Payer");
    const { invoiceId } = await changePlan(u.ctx, "plus");
    const [inv] = await withTenant(u.ctx, (tx) => tx.select().from(invoices).where(eq(invoices.id, invoiceId!)));
    const evt = { id: `evt_${Date.now()}`, type: "payment.succeeded", data: { invoice: inv!.number, amount: "4837.50", currency: "NGN", reference: "PSK-REF-1" } };
    expect(await webhook(evt)).toMatchObject({ status: 200, body: { received: true } });
    expect(await webhook(evt)).toMatchObject({ status: 200, body: { duplicate: true } });
    expect(await plan(u.ctx)).toMatchObject({ plan: { code: "plus" }, subscription: { status: "active" } });
    const [row] = await withBillingSystem((tx) => tx.select().from(paymentEvents).where(and(eq(paymentEvents.provider, "test"), eq(paymentEvents.eventId, evt.id))));
    expect(row).toMatchObject({ outcome: "processed", invoiceId: inv!.id, signatureValid: true });

    const v = await makeUser("Webhook Underpayer");
    const { invoiceId: i2 } = await changePlan(v.ctx, "pro");
    const [inv2] = await withTenant(v.ctx, (tx) => tx.select().from(invoices).where(eq(invoices.id, i2!)));
    await webhook({ id: `evt_under_${Date.now()}`, type: "payment.succeeded", data: { invoice: inv2!.number, amount: "100.00", currency: "NGN", reference: "PSK-REF-2" } });
    expect(await plan(v.ctx)).toMatchObject({ source: "free" });
    const rev = await adminRevenue({ userId: admin.userId });
    expect(rev.failedEvents.some((e) => e.detail?.includes("doesn't match"))).toBe(true);
    expect(d(rev.mrr).gt(0)).toBe(true);
  });

  it("the test provider is unavailable without its secret", async () => {
    delete process.env.BILLING_TEST_WEBHOOK_SECRET;
    expect((await webhook({ id: "evt_nosecret", type: "payment.succeeded" })).status).toBe(404);
    process.env.BILLING_TEST_WEBHOOK_SECRET = SECRET;
  });
});

describe("plan administration", () => {
  it("admins edit plans (audited); Free stays free; non-admins can't", async () => {
    const ent = { accounts: 6, goals: 2, alerts: 3, watchlists: 1, members: 1, csvImportsPerMonth: 2, aiQuestionsPerMonth: 10, pdfReports: false };
    await expect(adminSavePlan({ userId: admin.userId }, "free", { name: "Free", description: "x", price: "100", trialDays: 0, isPublic: true, active: true, entitlements: ent })).rejects.toMatchObject({ code: "VALIDATION" });
    await adminSavePlan({ userId: admin.userId }, "free", { name: "Free", description: "Track your accounts.", price: "0", trialDays: 0, isPublic: true, active: true, entitlements: ent });
    const u = await makeUser("Six Accounts");
    expect((await plan(u.ctx)).plan.entitlements.accounts).toBe(6);
    await expect(adminSavePlan({ userId: cust.userId }, "free", { name: "Free", description: "", price: "0", trialDays: 0, isPublic: true, active: true, entitlements: ent })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await adminSavePlan({ userId: admin.userId }, "free", { name: "Free", description: "Track your accounts and investments with correct performance.", price: "0", trialDays: 0, isPublic: true, active: true, entitlements: { ...ent, accounts: 5 } });
    const { asAdmin } = await import("@/server/admin/context");
    const audits = await asAdmin({ userId: admin.userId }, (tx) => tx.execute<{ n: string }>(sql`select count(*) as n from audit_events where action = 'admin.plan_updated' and actor_user_id = ${admin.userId}`));
    expect(Number(audits.rows[0]!.n)).toBe(2);
    // Without admin context the audit rows aren't visible.
    expect((await db().execute<{ n: string }>(sql`select count(*) as n from audit_events where action = 'admin.plan_updated'`)).rows[0]!.n).toBe("0");
  });
});
