"use server";

import { revalidatePath } from "next/cache";
import { requireAppForAction } from "@/server/auth/context";
import { requireFeature } from "@/server/compliance/gate";
import { createAlert, deleteAlert, evaluateAlerts, markRead, setAlertEnabled } from "@/server/alerts/service";
import { rateLimit } from "@/server/platform/rate-limit";
import { toActionError, type ActionResult } from "@/server/platform/errors";

export type FormState = ActionResult<string | undefined> | null;

export async function createAlertAction(_: FormState, form: FormData): Promise<FormState> {
  try {
    const app = await requireAppForAction();
    await requireFeature("ALERTS_USER_DEFINED", app.org.jurisdiction);
    const kind = String(form.get("kind"));
    const raw: Record<string, unknown> = { kind, repeat: form.get("repeat") === "on" };
    for (const k of ["instrumentId", "level", "base", "daysBefore", "maxWeightPct", "goalId"]) {
      const v = form.get(k);
      if (typeof v === "string" && v.trim()) raw[k] = v.trim();
    }
    if (kind.startsWith("fx_")) raw.quote = "NGN";
    await createAlert(app.ctx, raw);
  } catch (err) {
    return toActionError(err);
  }
  revalidatePath("/alerts");
  return { ok: true, data: "Alert created. It is checked about once an hour." };
}

export async function toggleAlertAction(form: FormData): Promise<void> {
  const app = await requireAppForAction();
  await setAlertEnabled(app.ctx, String(form.get("id")), form.get("enabled") === "true");
  revalidatePath("/alerts");
}

export async function deleteAlertAction(form: FormData): Promise<void> {
  const app = await requireAppForAction();
  await deleteAlert(app.ctx, String(form.get("id")));
  revalidatePath("/alerts");
}

export async function checkNowAction(_: FormState): Promise<FormState> {
  try {
    const app = await requireAppForAction();
    await rateLimit(`alerts-check:${app.session.userId}`, 10, 3600);
    const r = await evaluateAlerts(app.ctx);
    revalidatePath("/", "layout");
    return { ok: true, data: r.notified ? `${r.notified} new notification${r.notified > 1 ? "s" : ""}.` : `Checked ${r.evaluated} alert${r.evaluated === 1 ? "" : "s"}: nothing new.` };
  } catch (err) {
    return toActionError(err);
  }
}

export async function markReadAction(form: FormData): Promise<void> {
  const app = await requireAppForAction();
  const id = String(form.get("id") ?? "");
  await markRead(app.ctx, id || undefined);
  revalidatePath("/", "layout");
}
