import "server-only";
import { desc, eq, sql } from "drizzle-orm";
import { accountValuations, aiConversations, aiMessages, aiSourceReferences, alerts, consentRecords, financialAccounts, goals, importBatches, importMappings, instruments, ledgerEntries, ledgerEvents, memberships, modelPortfolios, notifications, organizations, savedComparisons, securityEvents, userPreferences, users, watchlistItems, watchlists } from "@/server/db/schema";
import { db, withTenant, withUser } from "@/server/db/client";
import { AppError } from "@/server/platform/errors";
import { recordSecurityEvent, type RequestMeta } from "@/server/audit/audit";
import { verifyPassword } from "@/server/identity/crypto";
import { rateLimit } from "@/server/platform/rate-limit";

export const EXPORT_FORMAT_VERSION = "wealthos-export/1";

/**
 * Portable export of everything WealthOS holds about the user (NDPA 2023 data portability):
 * profile, preferences, consents, security log, and every organisation they belong to with its
 * accounts, ledger, entries, valuations, private instruments and model portfolios, plus their own
 * alerts, notifications and research-assistant conversations.
 */
export async function exportUserData(userId: string, meta: RequestMeta) {
  await rateLimit(`export:${userId}`, 5, 3600);
  const [user] = await db().select().from(users).where(eq(users.id, userId));
  if (!user) throw new AppError("NOT_FOUND", "User not found.");
  const [prefs] = await db().select().from(userPreferences).where(eq(userPreferences.userId, userId));
  const consents = await db().select().from(consentRecords).where(eq(consentRecords.userId, userId)).orderBy(desc(consentRecords.recordedAt));
  const security = await db().select().from(securityEvents).where(eq(securityEvents.userId, userId)).orderBy(desc(securityEvents.createdAt));
  const orgs = await withUser(userId, (tx) => tx.select({ id: organizations.id, name: organizations.name, kind: organizations.kind, isDemo: organizations.isDemo, role: memberships.role }).from(memberships).innerJoin(organizations, eq(organizations.id, memberships.orgId)));
  const orgData = [];
  for (const org of orgs) {
    const data = await withTenant({ userId, orgId: org.id }, async (tx) => ({
      accounts: await tx.select().from(financialAccounts),
      ledgerEvents: await tx.select().from(ledgerEvents).orderBy(ledgerEvents.occurredOn, ledgerEvents.createdAt),
      ledgerEntries: await tx.select().from(ledgerEntries),
      valuations: await tx.select().from(accountValuations),
      privateInstruments: await tx.select().from(instruments).where(eq(instruments.orgId, org.id)),
      modelPortfolios: await tx.select().from(modelPortfolios),
      // Raw file text is never exported (it is deleted after commit/discard anyway).
      imports: (await tx.select().from(importBatches)).map(({ rawText: _r, ...rest }) => rest),
      importMappings: await tx.select().from(importMappings),
      goals: await tx.select().from(goals),
      watchlists: await tx.select().from(watchlists),
      watchlistItems: await tx.select().from(watchlistItems),
      savedComparisons: await tx.select().from(savedComparisons),
      // Personal rows (RLS returns only this user's).
      alerts: await tx.select().from(alerts),
      notifications: await tx.select().from(notifications),
      assistantConversations: await tx.select().from(aiConversations),
      assistantMessages: await tx.select().from(aiMessages).orderBy(aiMessages.createdAt),
      assistantSources: await tx.select().from(aiSourceReferences),
    }));
    orgData.push({ organization: org, ...data });
  }
  await recordSecurityEvent(userId, "privacy.export", meta);
  return {
    format: EXPORT_FORMAT_VERSION,
    exportedAt: new Date().toISOString(),
    note: "Amounts are exact decimal strings. Ledger events are append-only; reversals reference the event they cancel.",
    user: { id: user.id, email: user.email, displayName: user.displayName, emailVerifiedAt: user.emailVerifiedAt, createdAt: user.createdAt, mfaEnabled: Boolean(user.mfaEnabledAt) },
    preferences: prefs ?? null,
    consents,
    securityEvents: security,
    organizations: orgData,
  };
}

/**
 * Erase the account. Requires the password and the typed confirmation phrase. Organisations
 * where the user is the only owner are deleted with all their records.
 */
export async function eraseAccount(userId: string, password: string, confirmation: string, meta: RequestMeta): Promise<void> {
  if (confirmation.trim() !== "DELETE MY ACCOUNT") throw new AppError("VALIDATION", 'Type "DELETE MY ACCOUNT" to confirm.', { fieldErrors: { confirmation: ["Type the phrase exactly"] } });
  const [user] = await db().select({ hash: users.passwordHash }).from(users).where(eq(users.id, userId));
  if (!user || !(await verifyPassword(password, user.hash))) throw new AppError("UNAUTHENTICATED", "Password is incorrect.");
  await recordSecurityEvent(userId, "privacy.erasure", meta);
  await withUser(userId, (tx) => tx.execute(sql`select app_erase_user(${userId}::uuid)`));
}
