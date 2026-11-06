import "server-only";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { consentRecords, securityEvents, userPreferences, users } from "@/server/db/schema";
import { db } from "@/server/db/client";
import { parseOrThrow } from "./service";
import { CONSENT_VERSIONS } from "./validation";
import type { RequestMeta } from "@/server/audit/audit";
import { SUPPORTED_CURRENCIES } from "@/engine";
import { assertNotDemo } from "@/server/demo/mode";

export const preferencesSchema = z.object({
  displayName: z.string().trim().min(1).max(80),
  baseCurrency: z.enum(SUPPORTED_CURRENCIES),
  timezone: z.string().refine((tz) => {
    try {
      new Intl.DateTimeFormat("en", { timeZone: tz });
      return true;
    } catch {
      return false;
    }
  }, "Unknown time zone"),
  locale: z.enum(["en-NG", "en-GB", "en-US"]),
  theme: z.enum(["system", "light", "dark"]),
  notifyInApp: z.boolean(),
  notifyEmail: z.boolean(),
});

export async function updatePreferences(userId: string, input: unknown): Promise<void> {
  assertNotDemo("Changing profile settings");
  const data = parseOrThrow(preferencesSchema, input);
  await db().update(users).set({ displayName: data.displayName, updatedAt: new Date() }).where(eq(users.id, userId));
  await db()
    .insert(userPreferences)
    .values({ userId, baseCurrency: data.baseCurrency, timezone: data.timezone, locale: data.locale, theme: data.theme, notifications: { inApp: data.notifyInApp, email: data.notifyEmail, productUpdates: false } })
    .onConflictDoUpdate({ target: userPreferences.userId, set: { baseCurrency: data.baseCurrency, timezone: data.timezone, locale: data.locale, theme: data.theme, notifications: { inApp: data.notifyInApp, email: data.notifyEmail, productUpdates: false }, updatedAt: new Date() } });
}

/** Latest decision per consent key. */
export async function currentConsents(userId: string): Promise<Record<string, { granted: boolean; version: string; recordedAt: Date }>> {
  const rows = await db().select().from(consentRecords).where(eq(consentRecords.userId, userId)).orderBy(desc(consentRecords.recordedAt));
  const out: Record<string, { granted: boolean; version: string; recordedAt: Date }> = {};
  for (const r of rows) if (!out[r.consentKey]) out[r.consentKey] = { granted: r.granted, version: r.version, recordedAt: r.recordedAt };
  return out;
}

export async function setMarketingConsent(userId: string, granted: boolean, meta: RequestMeta): Promise<void> {
  assertNotDemo("Changing email preferences");
  await db().insert(consentRecords).values({ userId, consentKey: "marketing_email", version: CONSENT_VERSIONS.marketing_email, granted, ip: meta.ip ?? null, userAgent: meta.userAgent?.slice(0, 500) ?? null });
}

export async function recentSecurityEvents(userId: string, limit = 20) {
  return db().select().from(securityEvents).where(and(eq(securityEvents.userId, userId))).orderBy(desc(securityEvents.createdAt)).limit(limit);
}
