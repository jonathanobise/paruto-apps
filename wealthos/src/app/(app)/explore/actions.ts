"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAppForAction } from "@/server/auth/context";
import { requireFeature } from "@/server/compliance/gate";
import { deleteComparison, saveComparison, unwatchInstrument, watchInstrument } from "@/server/research/watchlists";
import { toActionError, type ActionResult } from "@/server/platform/errors";

export type FormState = ActionResult<string | undefined> | null;

export async function watchAction(form: FormData): Promise<void> {
  const app = await requireAppForAction();
  await requireFeature("INSTRUMENT_EXPLORER", app.org.jurisdiction);
  await watchInstrument(app.ctx, String(form.get("instrumentId")));
  revalidatePath(`/explore/${String(form.get("instrumentId"))}`);
  revalidatePath("/watchlists");
}

export async function unwatchAction(form: FormData): Promise<void> {
  const app = await requireAppForAction();
  await unwatchInstrument(app.ctx, String(form.get("watchlistId")), String(form.get("instrumentId")));
  revalidatePath("/watchlists");
  revalidatePath(`/explore/${String(form.get("instrumentId"))}`);
}

export async function saveComparisonAction(_: FormState, form: FormData): Promise<FormState> {
  try {
    const app = await requireAppForAction();
    await requireFeature("INSTRUMENT_EXPLORER", app.org.jurisdiction);
    await saveComparison(app.ctx, String(form.get("name") ?? ""), String(form.get("ids") ?? "").split(",").filter(Boolean), String(form.get("note") ?? "") || undefined);
  } catch (err) {
    return toActionError(err);
  }
  revalidatePath("/watchlists");
  return { ok: true, data: "Comparison saved to Watchlists." };
}

export async function deleteComparisonAction(form: FormData): Promise<void> {
  const app = await requireAppForAction();
  await deleteComparison(app.ctx, String(form.get("id")));
  revalidatePath("/watchlists");
}

/** Add or remove an instrument from the comparison basket (kept in the URL). */
export async function compareWithAction(form: FormData): Promise<void> {
  const ids = String(form.get("ids") ?? "").split(",").filter(Boolean);
  const add = String(form.get("add") ?? "");
  const next = [...new Set([...ids, add].filter((x) => /^[0-9a-f-]{36}$/i.test(x)))].slice(0, 4);
  redirect(`/explore/compare?ids=${next.join(",")}`);
}
