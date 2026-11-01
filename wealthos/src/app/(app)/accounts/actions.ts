"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAppForAction } from "@/server/auth/context";
import { addValuation, createAccount } from "@/server/accounts/service";
import { toActionError, type ActionResult } from "@/server/platform/errors";

export type FormState = ActionResult<string | undefined> | null;

export async function createAccountAction(_: FormState, form: FormData): Promise<FormState> {
  let id: string;
  try {
    const app = await requireAppForAction();
    const row = await createAccount(app.ctx, {
      name: form.get("name"),
      type: form.get("type"),
      institutionName: form.get("institutionName") ?? undefined,
      currency: form.get("currency"),
      ownershipPercent: String(form.get("ownershipPercent") || "100"),
      maskedNumber: form.get("maskedNumber") ?? undefined,
      notes: form.get("notes") ?? undefined,
      openingValue: form.get("openingValue") ? String(form.get("openingValue")).replace(/,/g, "") : undefined,
      openingValueDate: form.get("openingValueDate") || undefined,
    });
    id = row.id;
  } catch (err) {
    return toActionError(err);
  }
  revalidatePath("/", "layout");
  redirect(`/accounts/${id}`);
}

export async function addValuationAction(_: FormState, form: FormData): Promise<FormState> {
  try {
    const app = await requireAppForAction();
    await addValuation(app.ctx, { accountId: form.get("accountId"), valuedOn: form.get("valuedOn"), amount: String(form.get("amount") ?? "").replace(/,/g, ""), valuationType: form.get("valuationType"), note: form.get("note") ?? undefined });
  } catch (err) {
    return toActionError(err);
  }
  revalidatePath("/", "layout");
  return { ok: true, data: "Valuation saved." };
}
