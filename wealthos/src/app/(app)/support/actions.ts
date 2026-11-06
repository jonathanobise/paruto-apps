"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAppForAction } from "@/server/auth/context";
import { closeMyCase, createCase, replyToMyCase } from "@/server/support/service";
import { toActionError, type ActionResult } from "@/server/platform/errors";

type State = ActionResult<string | undefined> | null;

export async function newCaseAction(_: State, f: FormData): Promise<State> {
  let id: string;
  try {
    const app = await requireAppForAction();
    id = await createCase(app.ctx, { topic: f.get("topic"), subject: f.get("subject"), body: f.get("body") });
  } catch (err) {
    return toActionError(err);
  }
  redirect(`/support/${id}?new=1`);
}

export async function replyAction(_: State, f: FormData): Promise<State> {
  try {
    const app = await requireAppForAction();
    await replyToMyCase(app.session.userId, String(f.get("caseId")), f.get("body"));
  } catch (err) {
    return toActionError(err);
  }
  revalidatePath(`/support/${String(f.get("caseId"))}`);
  return { ok: true, data: "Sent." };
}

export async function closeAction(f: FormData): Promise<void> {
  const app = await requireAppForAction();
  await closeMyCase(app.session.userId, String(f.get("caseId")));
  revalidatePath("/support");
  redirect("/support");
}
