"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAppForAction } from "@/server/auth/context";
import { requireFeature } from "@/server/compliance/gate";
import { cancelAtPeriodEnd, changePlan, startTrial, withdrawInvoice } from "@/server/billing/service";
import { toActionError, type ActionResult } from "@/server/platform/errors";

export type FormState = ActionResult<string | undefined> | null;

export async function planAction(_: FormState, form: FormData): Promise<FormState> {
  let to = "/settings/billing";
  try {
    const app = await requireAppForAction();
    await requireFeature("SUBSCRIPTION_BILLING", app.org.jurisdiction);
    const plan = String(form.get("plan") ?? "");
    const intent = String(form.get("intent") ?? "");
    if (intent === "trial") {
      await startTrial(app.ctx, plan);
      to = "/settings/billing?trial=1";
    } else {
      const r = await changePlan(app.ctx, plan);
      to = r.invoiceId ? `/settings/billing/invoices/${r.invoiceId}?new=1` : "/settings/billing?scheduled=1";
    }
  } catch (err) {
    return toActionError(err);
  }
  revalidatePath("/", "layout");
  redirect(to);
}

export async function cancelAction(form: FormData): Promise<void> {
  const app = await requireAppForAction();
  await cancelAtPeriodEnd(app.ctx, form.get("cancel") === "true");
  revalidatePath("/settings/billing");
  redirect(`/settings/billing?${form.get("cancel") === "true" ? "canceled=1" : "resumed=1"}`);
}

export async function withdrawInvoiceAction(form: FormData): Promise<void> {
  const app = await requireAppForAction();
  await withdrawInvoice(app.ctx, String(form.get("id")));
  redirect("/settings/billing?withdrawn=1");
}
