"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import QRCode from "qrcode";
import { CURRENCY_COOKIE, THEME_COOKIE, clearSessionCookie, requestMeta, requireAppForAction } from "@/server/auth/context";
import { updatePreferences, setMarketingConsent } from "@/server/identity/preferences";
import { beginMfaEnrollment, changePassword, confirmMfaEnrollment, disableMfa } from "@/server/identity/service";
import { revokeSession } from "@/server/identity/sessions";
import { eraseAccount } from "@/server/privacy/service";
import { toActionError, type ActionResult } from "@/server/platform/errors";
import { assertNotDemo } from "@/server/demo/mode";

export type FormState = ActionResult<string | undefined> | null;
export type MfaState = (ActionResult<{ secret: string; uri: string; qrSvg: string } | { recoveryCodes: string[] }> & { stage?: "setup" | "done" }) | null;

export async function preferencesAction(_: FormState, form: FormData): Promise<FormState> {
  try {
    const app = await requireAppForAction();
    const theme = String(form.get("theme"));
    await updatePreferences(app.session.userId, {
      displayName: form.get("displayName"),
      baseCurrency: form.get("baseCurrency"),
      timezone: form.get("timezone"),
      locale: form.get("locale"),
      theme,
      notifyInApp: form.get("notifyInApp") === "on",
      notifyEmail: form.get("notifyEmail") === "on",
    });
    const jar = await cookies();
    jar.delete(CURRENCY_COOKIE);
    jar.set(THEME_COOKIE, theme === "light" ? "light" : "dark", { path: "/", sameSite: "lax", maxAge: 31536000 });
  } catch (err) {
    return toActionError(err);
  }
  revalidatePath("/", "layout");
  return { ok: true, data: "Preferences saved." };
}

export async function beginMfaAction(): Promise<MfaState> {
  try {
    const app = await requireAppForAction();
    const r = await beginMfaEnrollment(app.session.userId);
    // QR rendered on the server so the secret is never placed in a URL or sent to a third party.
    const qrSvg = await QRCode.toString(r.uri, { type: "svg", margin: 1, errorCorrectionLevel: "M" });
    return { ok: true, data: { ...r, qrSvg }, stage: "setup" };
  } catch (err) {
    return toActionError(err);
  }
}

export async function confirmMfaAction(prev: MfaState, form: FormData): Promise<MfaState> {
  try {
    const app = await requireAppForAction();
    const r = await confirmMfaEnrollment(app.session.userId, app.session.id, String(form.get("code") ?? ""), await requestMeta());
    revalidatePath("/settings/security");
    return { ok: true, data: r, stage: "done" };
  } catch (err) {
    return { ...toActionError(err), ...(prev && prev.ok ? { stage: "setup" as const } : {}) };
  }
}

export async function disableMfaAction(_: FormState, form: FormData): Promise<FormState> {
  try {
    const app = await requireAppForAction();
    await disableMfa(app.session.userId, String(form.get("password") ?? ""), await requestMeta());
  } catch (err) {
    return toActionError(err);
  }
  revalidatePath("/settings/security");
  return { ok: true, data: "Two-step verification is off." };
}

export async function changePasswordAction(_: FormState, form: FormData): Promise<FormState> {
  try {
    const app = await requireAppForAction();
    await changePassword(app.session.userId, app.session.id, String(form.get("current") ?? ""), form.get("password"), await requestMeta());
  } catch (err) {
    return toActionError(err);
  }
  return { ok: true, data: "Password changed. Other devices were signed out." };
}

export async function revokeSessionAction(form: FormData): Promise<void> {
  assertNotDemo("Signing out other devices");
  const app = await requireAppForAction();
  await revokeSession(String(form.get("sessionId") ?? ""), app.session.userId);
  revalidatePath("/settings/security");
}

export async function marketingConsentAction(form: FormData): Promise<void> {
  const app = await requireAppForAction();
  await setMarketingConsent(app.session.userId, form.get("granted") === "true", await requestMeta());
  revalidatePath("/settings/privacy");
}

export async function eraseAccountAction(_: FormState, form: FormData): Promise<FormState> {
  try {
    const app = await requireAppForAction();
    await eraseAccount(app.session.userId, String(form.get("password") ?? ""), String(form.get("confirmation") ?? ""), await requestMeta());
    await clearSessionCookie();
  } catch (err) {
    return toActionError(err);
  }
  redirect("/?deleted=1");
}
