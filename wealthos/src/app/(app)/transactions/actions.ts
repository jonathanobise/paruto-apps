"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAppForAction } from "@/server/auth/context";
import { postEvent, reverseEvent } from "@/server/ledger/service";
import { createPrivateInstrument } from "@/server/market-data/private-instruments";
import { toActionError, type ActionResult } from "@/server/platform/errors";

export type FormState = ActionResult<string | undefined> | null;

const FIELDS = ["type", "accountId", "fromAccountId", "toAccountId", "instrumentId", "currency", "amount", "quantity", "price", "fees", "grossAmount", "withholdingTax", "fromCurrency", "fromAmount", "toCurrency", "toAmount", "numerator", "denominator", "proceeds", "costBasis", "acquiredOn", "occurredOn", "description", "idempotencyKey"];

export async function postEventAction(_: FormState, form: FormData): Promise<FormState> {
  try {
    const app = await requireAppForAction();
    const input: Record<string, string> = {};
    for (const f of FIELDS) {
      const v = form.get(f);
      if (typeof v === "string" && v.trim() !== "") input[f] = v.trim();
    }
    await postEvent(app.ctx, input);
  } catch (err) {
    return toActionError(err);
  }
  revalidatePath("/", "layout");
  redirect("/transactions?saved=1");
}

export async function reverseEventAction(_: FormState, form: FormData): Promise<FormState> {
  try {
    const app = await requireAppForAction();
    await reverseEvent(app.ctx, String(form.get("eventId") ?? ""), String(form.get("reason") ?? ""));
  } catch (err) {
    return toActionError(err);
  }
  revalidatePath("/", "layout");
  redirect("/transactions?reversed=1");
}

export async function createInstrumentAction(_: FormState, form: FormData): Promise<FormState> {
  try {
    const app = await requireAppForAction();
    const inst = await createPrivateInstrument(app.ctx, Object.fromEntries([...form.entries()].map(([k, v]) => [k, String(v)])));
    revalidatePath("/transactions/new");
    return { ok: true, data: `Added “${inst.name}”. You can now select it.` };
  } catch (err) {
    return toActionError(err);
  }
}
