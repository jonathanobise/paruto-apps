"use server";

import { revalidatePath } from "next/cache";
import { requireAdminForAction } from "@/server/auth/context";
import { toActionError, type ActionResult } from "@/server/platform/errors";
import { revokeUserSessions, retryJob } from "@/server/admin/console";
import { adminEndSubscription, adminGrantPlan, adminRecordPayment, adminSaveBillingSettings, adminSavePlan, adminVoidInvoice } from "@/server/billing/admin";
import { adminCloseCase, adminReply } from "@/server/support/service";

type State = ActionResult<string | undefined> | null;
const s = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const run = async (fn: (adminId: string) => Promise<string>, path: string): Promise<State> => {
  try {
    const app = await requireAdminForAction();
    const msg = await fn(app.session.userId);
    revalidatePath(path);
    return { ok: true, data: msg };
  } catch (err) {
    return toActionError(err);
  }
};

export async function revokeSessionsAction(_: State, f: FormData): Promise<State> {
  return run(async (id) => `Signed out of ${await revokeUserSessions({ userId: id }, s(f, "userId"))} session(s).`, "/admin/users");
}

export async function recordPaymentAction(_: State, f: FormData): Promise<State> {
  return run(async (id) => {
    await adminRecordPayment({ userId: id }, s(f, "invoiceId"), { method: s(f, "method"), reference: s(f, "reference"), amount: s(f, "amount"), paidOn: s(f, "paidOn") });
    return "Payment recorded and applied.";
  }, "/admin");
}

export async function voidInvoiceAction(_: State, f: FormData): Promise<State> {
  return run(async (id) => {
    await adminVoidInvoice({ userId: id }, s(f, "invoiceId"), s(f, "reason"));
    return "Invoice voided.";
  }, "/admin");
}

export async function grantPlanAction(_: State, f: FormData): Promise<State> {
  return run(async (id) => {
    await adminGrantPlan({ userId: id }, s(f, "orgId"), { planCode: s(f, "planCode"), months: s(f, "months"), note: s(f, "note") });
    return "Complimentary plan granted.";
  }, "/admin/orgs");
}

export async function endSubscriptionAction(_: State, f: FormData): Promise<State> {
  return run(async (id) => {
    await adminEndSubscription({ userId: id }, s(f, "orgId"), s(f, "reason"));
    return "Subscription ended; the space is on Free.";
  }, "/admin/orgs");
}

const lim = (f: FormData, k: string) => (s(f, k) === "" ? null : s(f, k));
export async function savePlanAction(_: State, f: FormData): Promise<State> {
  return run(async (id) => {
    await adminSavePlan({ userId: id }, s(f, "code"), {
      name: s(f, "name"), description: s(f, "description"), price: s(f, "price"), trialDays: s(f, "trialDays"), isPublic: f.get("isPublic") === "on", active: f.get("active") === "on",
      entitlements: { accounts: lim(f, "accounts"), goals: lim(f, "goals"), alerts: lim(f, "alerts"), watchlists: lim(f, "watchlists"), members: lim(f, "members"), csvImportsPerMonth: lim(f, "csvImportsPerMonth"), aiQuestionsPerMonth: lim(f, "aiQuestionsPerMonth"), pdfReports: f.get("pdfReports") === "on" },
    });
    return "Plan saved. Current subscriptions keep their price until renewal.";
  }, "/admin/billing");
}

export async function saveBillingSettingsAction(_: State, f: FormData): Promise<State> {
  return run(async (id) => {
    const bank = s(f, "accountNumber") ? { accountName: s(f, "accountName"), bankName: s(f, "bankName"), accountNumber: s(f, "accountNumber"), instructions: s(f, "instructions") } : null;
    await adminSaveBillingSettings({ userId: id }, { taxLabel: s(f, "taxLabel") || null, taxRatePercent: s(f, "taxRatePercent") || "0", taxMode: s(f, "taxMode"), invoicePrefix: s(f, "invoicePrefix") || "WOS", paymentDueDays: s(f, "paymentDueDays"), graceDays: s(f, "graceDays"), renewalNoticeDays: s(f, "renewalNoticeDays"), sellerName: s(f, "sellerName"), sellerDetails: s(f, "sellerDetails"), bankTransfer: bank });
    return "Billing settings saved.";
  }, "/admin/billing");
}

export async function retryJobAction(_: State, f: FormData): Promise<State> {
  return run(async (id) => {
    await retryJob({ userId: id }, s(f, "jobId"));
    return "Job queued for another attempt.";
  }, "/admin/jobs");
}

export async function supportReplyAction(_: State, f: FormData): Promise<State> {
  return run(async (id) => {
    await adminReply({ userId: id }, s(f, "caseId"), s(f, "body"), f.get("close") === "on");
    return "Reply sent.";
  }, "/admin/support");
}

export async function supportCloseAction(_: State, f: FormData): Promise<State> {
  return run(async (id) => {
    await adminCloseCase({ userId: id }, s(f, "caseId"));
    return "Case closed.";
  }, "/admin/support");
}
