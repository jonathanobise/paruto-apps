import "server-only";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/server/db/client";
import { userPreferences } from "@/server/db/schema";
import { resolveSession, SESSION_ABSOLUTE_HOURS, type SessionRecord } from "@/server/identity/sessions";
import { listOrganizations, pickActiveOrg, type OrgSummary } from "@/server/identity/tenancy";
import { AppError } from "@/server/platform/errors";
import type { RequestMeta } from "@/server/audit/audit";
import { isDisplayCurrency } from "@/engine";

export const SESSION_COOKIE = process.env.NODE_ENV === "production" ? "__Host-wos_session" : "wos_session";
export const THEME_COOKIE = "wos_theme";
export const CURRENCY_COOKIE = "wos_ccy";

export async function setSessionCookie(token: string, expiresAt: Date): Promise<void> {
  (await cookies()).set(SESSION_COOKIE, token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", expires: expiresAt, maxAge: SESSION_ABSOLUTE_HOURS * 3600 });
}

export async function clearSessionCookie(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
}

export async function requestMeta(): Promise<RequestMeta> {
  const h = await headers();
  return { ip: h.get("x-forwarded-for") ?? h.get("x-real-ip") ?? null, userAgent: h.get("user-agent") };
}

/** Current session (memoised per request). */
export const getSession = cache(async (): Promise<SessionRecord | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return resolveSession(token);
});

export interface AppContext {
  session: SessionRecord;
  org: OrgSummary;
  orgs: OrgSummary[];
  ctx: { userId: string; orgId: string };
  baseCurrency: string;
  canWrite: boolean;
  preferences: typeof userPreferences.$inferSelect;
}

/** For pages: redirect to the right step if the visitor is not fully signed in. */
export const requireApp = cache(async (): Promise<AppContext> => {
  const session = await getSession();
  if (!session) redirect("/sign-in");
  if (session.user.mfaEnabled && !session.mfaSatisfied) redirect("/sign-in/mfa");
  if (!session.user.emailVerified) redirect("/verify-email");
  return buildContext(session);
});

/** For server actions and route handlers: throw instead of redirecting. */
export async function requireAppForAction(): Promise<AppContext> {
  const session = await getSession();
  if (!session || (session.user.mfaEnabled && !session.mfaSatisfied)) throw new AppError("UNAUTHENTICATED", "Your session has ended. Please sign in again.");
  if (!session.user.emailVerified) throw new AppError("FORBIDDEN", "Confirm your email address first.");
  return buildContext(session);
}

async function buildContext(session: SessionRecord): Promise<AppContext> {
  const orgs = await listOrganizations(session.userId);
  const org = pickActiveOrg(orgs, session.activeOrgId);
  if (!org) throw new AppError("FORBIDDEN", "No organisation is available for this account.");
  const [prefs] = await db().select().from(userPreferences).where(eq(userPreferences.userId, session.userId));
  const cookieCcy = (await cookies()).get(CURRENCY_COOKIE)?.value;
  const baseCurrency = cookieCcy && isDisplayCurrency(cookieCcy) ? cookieCcy : (prefs?.baseCurrency ?? "NGN");
  return {
    session,
    org,
    orgs,
    ctx: { userId: session.userId, orgId: org.id },
    baseCurrency,
    canWrite: org.role !== "viewer",
    preferences: prefs ?? { userId: session.userId, baseCurrency: "NGN", locale: "en-NG", timezone: "Africa/Lagos", theme: "system", notifications: { inApp: true, email: false, productUpdates: false }, updatedAt: new Date() },
  };
}
