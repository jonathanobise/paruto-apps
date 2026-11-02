"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { CURRENCY_COOKIE, THEME_COOKIE, getSession } from "@/server/auth/context";
import { setActiveOrg } from "@/server/identity/sessions";
import { listOrganizations } from "@/server/identity/tenancy";
import { isDisplayCurrency } from "@/engine";
import { eq } from "drizzle-orm";
import { db } from "@/server/db/client";
import { userPreferences } from "@/server/db/schema";

export async function switchOrgAction(form: FormData): Promise<void> {
  const session = await getSession();
  if (!session) return;
  const orgId = String(form.get("orgId") ?? "");
  // Only switch to an organisation the user is a member of (verified server-side).
  const orgs = await listOrganizations(session.userId);
  if (orgs.some((o) => o.id === orgId)) await setActiveOrg(session.id, orgId);
  revalidatePath("/", "layout");
}

export async function setCurrencyAction(form: FormData): Promise<void> {
  const ccy = String(form.get("currency") ?? "");
  if (isDisplayCurrency(ccy)) (await cookies()).set(CURRENCY_COOKIE, ccy, { path: "/", sameSite: "lax", maxAge: 31536000 });
  revalidatePath("/", "layout");
}

/** Header sun/moon toggle: dark is the default; light is opt-in (cookie + saved preference). */
export async function setThemeAction(form: FormData): Promise<void> {
  const theme = String(form.get("theme")) === "light" ? "light" : "dark";
  (await cookies()).set(THEME_COOKIE, theme, { path: "/", sameSite: "lax", maxAge: 31536000 });
  const session = await getSession();
  if (session) await db().update(userPreferences).set({ theme, updatedAt: new Date() }).where(eq(userPreferences.userId, session.userId));
  revalidatePath("/", "layout");
}
