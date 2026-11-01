"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { CURRENCY_COOKIE, THEME_COOKIE, getSession } from "@/server/auth/context";
import { setActiveOrg } from "@/server/identity/sessions";
import { listOrganizations } from "@/server/identity/tenancy";
import { isDisplayCurrency } from "@/engine";

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

export async function setThemeAction(form: FormData): Promise<void> {
  const theme = String(form.get("theme") ?? "system");
  const jar = await cookies();
  if (theme === "light" || theme === "dark") jar.set(THEME_COOKIE, theme, { path: "/", sameSite: "lax", maxAge: 31536000 });
  else jar.delete(THEME_COOKIE);
  revalidatePath("/", "layout");
}
