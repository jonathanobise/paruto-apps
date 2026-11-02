"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAppForAction, getSession } from "@/server/auth/context";
import { requireFeature } from "@/server/compliance/gate";
import { createSharedSpace, inviteMember, removeMember, revokeInvitation, setMemberRole, acceptInvitation } from "@/server/identity/members";
import { setActiveOrg } from "@/server/identity/sessions";
import { AppError, toActionError, type ActionResult } from "@/server/platform/errors";

export type FormState = ActionResult<string | undefined> | null;

export async function createSpaceAction(_: FormState, form: FormData): Promise<FormState> {
  try {
    const app = await requireAppForAction();
    await requireFeature("SHARED_SPACES", app.org.jurisdiction);
    const orgId = await createSharedSpace(app.session.userId, { name: form.get("name"), kind: form.get("kind") });
    await setActiveOrg(app.session.id, orgId);
  } catch (err) {
    return toActionError(err);
  }
  revalidatePath("/", "layout");
  redirect("/settings/members?created=1");
}

export async function inviteAction(_: FormState, form: FormData): Promise<FormState> {
  try {
    const app = await requireAppForAction();
    await requireFeature("SHARED_SPACES", app.org.jurisdiction);
    await inviteMember(app.ctx, { email: form.get("email"), role: form.get("role") });
  } catch (err) {
    return toActionError(err);
  }
  revalidatePath("/settings/members");
  return { ok: true, data: "Invitation sent. It works for 7 days." };
}

export async function roleAction(form: FormData): Promise<void> {
  const app = await requireAppForAction();
  await setMemberRole(app.ctx, String(form.get("userId")), form.get("role"));
  revalidatePath("/settings/members");
}

export async function removeAction(form: FormData): Promise<void> {
  const app = await requireAppForAction();
  const userId = String(form.get("userId"));
  await removeMember(app.ctx, userId);
  if (userId === app.session.userId) {
    revalidatePath("/", "layout");
    redirect("/dashboard?left=1");
  }
  revalidatePath("/settings/members");
}

export async function revokeAction(form: FormData): Promise<void> {
  const app = await requireAppForAction();
  await revokeInvitation(app.ctx, String(form.get("id")));
  revalidatePath("/settings/members");
}

export async function acceptInviteAction(_: FormState, form: FormData): Promise<FormState> {
  try {
    const session = await getSession();
    if (!session || (session.user.mfaEnabled && !session.mfaSatisfied)) throw new AppError("UNAUTHENTICATED", "Sign in first.");
    if (!session.user.emailVerified) throw new AppError("FORBIDDEN", "Confirm your email address first, then open the invitation link again.");
    const orgId = await acceptInvitation(session.userId, String(form.get("token") ?? ""));
    await setActiveOrg(session.id, orgId);
  } catch (err) {
    return toActionError(err);
  }
  revalidatePath("/", "layout");
  redirect("/dashboard?joined=1");
}
