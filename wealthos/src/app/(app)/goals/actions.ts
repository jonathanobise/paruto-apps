"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAppForAction } from "@/server/auth/context";
import { requireFeature } from "@/server/compliance/gate";
import { archiveGoal, saveGoal } from "@/server/planning/goals";
import { deleteModel, saveModel } from "@/server/models/service";
import { toActionError, type ActionResult } from "@/server/platform/errors";

export type FormState = ActionResult<string | undefined> | null;

export async function saveGoalAction(_: FormState, form: FormData): Promise<FormState> {
  let id: string;
  try {
    const app = await requireAppForAction();
    await requireFeature("GOAL_PROJECTIONS", app.org.jurisdiction);
    const labels = form.getAll("scenarioLabel").map(String);
    const returns = form.getAll("scenarioReturn").map(String);
    id = await saveGoal(app.ctx, String(form.get("id") ?? "") || null, {
      name: form.get("name"),
      kind: form.get("kind"),
      targetAmount: String(form.get("targetAmount") ?? ""),
      currency: form.get("currency"),
      targetDate: form.get("targetDate"),
      targetIsReal: form.get("targetIsReal") === "real",
      scope: form.get("scope"),
      accountIds: form.getAll("accountIds").map(String),
      monthlyContribution: String(form.get("monthlyContribution") || "0"),
      contributionTiming: form.get("contributionTiming"),
      contributionGrowthPct: String(form.get("contributionGrowthPct") || "0"),
      inflationPct: String(form.get("inflationPct") ?? ""),
      annualFeePct: String(form.get("annualFeePct") || "0"),
      scenarios: labels.map((label, i) => ({ label, annualReturnPct: returns[i] ?? "" })).filter((s) => s.label.trim() || s.annualReturnPct.trim()),
      notes: form.get("notes") ?? undefined,
    });
  } catch (err) {
    return toActionError(err);
  }
  revalidatePath("/goals");
  redirect(`/goals/${id}`);
}

export async function archiveGoalAction(form: FormData): Promise<void> {
  const app = await requireAppForAction();
  await archiveGoal(app.ctx, String(form.get("id")));
  revalidatePath("/goals");
  redirect("/goals");
}

export async function saveModelAction(_: FormState, form: FormData): Promise<FormState> {
  try {
    const app = await requireAppForAction();
    await requireFeature("MODEL_PORTFOLIO_USER_DEFINED", app.org.jurisdiction);
    const weights: Record<string, string> = {};
    for (const [k, v] of form.entries()) if (k.startsWith("w_") && String(v).trim()) weights[k.slice(2)] = String(v).trim();
    await saveModel(app.ctx, null, { name: form.get("name"), description: form.get("description") ?? undefined, weights });
  } catch (err) {
    return toActionError(err);
  }
  revalidatePath("/model");
  return { ok: true, data: "Target mix saved." };
}

export async function deleteModelAction(form: FormData): Promise<void> {
  const app = await requireAppForAction();
  await deleteModel(app.ctx, String(form.get("id")));
  revalidatePath("/model");
}
