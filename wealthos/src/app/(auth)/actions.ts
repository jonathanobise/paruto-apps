"use server";

import { redirect } from "next/navigation";
import { safeNext } from "@/lib/safe-next";
import { clearSessionCookie, getSession, requestMeta, setSessionCookie } from "@/server/auth/context";
import { completeMfaChallenge, requestPasswordReset, resendVerification, resetPassword, signIn, signUp } from "@/server/identity/service";
import { revokeSession } from "@/server/identity/sessions";
import { startDemoSession } from "@/server/demo/session";
import { toActionError, type ActionResult } from "@/server/platform/errors";

export type FormState = ActionResult<string | undefined> | null;

export async function signUpAction(_: FormState, form: FormData): Promise<FormState> {
  let ok = false;
  try {
    const r = await signUp(
      { displayName: form.get("displayName"), email: form.get("email"), password: form.get("password"), acceptTerms: form.get("acceptTerms") === "on", marketingOptIn: form.get("marketingOptIn") === "on" },
      await requestMeta(),
    );
    if (r.session) await setSessionCookie(r.session.token, r.session.expiresAt);
    ok = true;
  } catch (err) {
    return toActionError(err);
  }
  if (ok) redirect("/verify-email");
  return null;
}

export async function signInAction(_: FormState, form: FormData): Promise<FormState> {
  let next = safeNext(form.get("next"));
  try {
    const r = await signIn({ email: form.get("email"), password: form.get("password") }, await requestMeta());
    await setSessionCookie(r.session.token, r.session.expiresAt);
    if (r.status === "mfa_required") next = next === "/dashboard" ? "/sign-in/mfa" : `/sign-in/mfa?next=${encodeURIComponent(next)}`;
  } catch (err) {
    return toActionError(err);
  }
  redirect(next);
}

export async function mfaChallengeAction(_: FormState, form: FormData): Promise<FormState> {
  try {
    const session = await getSession();
    if (!session) return { ok: false, code: "UNAUTHENTICATED", message: "Your sign-in expired. Start again." };
    await completeMfaChallenge(session.id, session.userId, String(form.get("code") ?? ""), await requestMeta());
  } catch (err) {
    return toActionError(err);
  }
  redirect(safeNext(form.get("next")));
}

export async function resendVerificationAction(): Promise<FormState> {
  try {
    const session = await getSession();
    if (!session) return { ok: false, code: "UNAUTHENTICATED", message: "Sign in first." };
    await resendVerification(session.userId, await requestMeta());
    return { ok: true, data: "We've sent a new link. Check your inbox." };
  } catch (err) {
    return toActionError(err);
  }
}

export async function requestResetAction(_: FormState, form: FormData): Promise<FormState> {
  try {
    await requestPasswordReset({ email: form.get("email") }, await requestMeta());
    return { ok: true, data: "If an account exists for that address, a reset link is on its way. It expires in 1 hour." };
  } catch (err) {
    return toActionError(err);
  }
}

export async function resetPasswordAction(_: FormState, form: FormData): Promise<FormState> {
  try {
    await resetPassword(String(form.get("token") ?? ""), form.get("password"), await requestMeta());
  } catch (err) {
    return toActionError(err);
  }
  redirect("/sign-in?reset=1");
}

export async function signOutAction(): Promise<void> {
  const session = await getSession();
  if (session) await revokeSession(session.id, session.userId);
  await clearSessionCookie();
  redirect("/sign-in");
}

/** Public demo only: enter as the shared demo user (src/server/demo/session.ts). */
export async function demoSignInAction(): Promise<void> {
  const s = await startDemoSession();
  await setSessionCookie(s.token, s.expiresAt);
  redirect("/dashboard");
}
