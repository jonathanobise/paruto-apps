import "server-only";
import { and, eq, gt, isNull, sql } from "drizzle-orm";
import { sessions, users } from "@/server/db/schema";
import { db } from "@/server/db/client";
import { randomToken, sha256 } from "./crypto";
import type { RequestMeta } from "@/server/audit/audit";

/** Absolute session lifetime and idle timeout (financial data: keep both short). */
export const SESSION_ABSOLUTE_HOURS = 12;
export const SESSION_IDLE_MINUTES = 60;

export interface SessionRecord {
  id: string;
  userId: string;
  mfaSatisfied: boolean;
  activeOrgId: string | null;
  user: { id: string; email: string; displayName: string; emailVerified: boolean; mfaEnabled: boolean; platformRole: "user" | "support" | "compliance" | "admin" };
}

export async function createSession(userId: string, opts: { mfaSatisfied: boolean } & RequestMeta): Promise<{ token: string; expiresAt: Date }> {
  const token = randomToken();
  const expiresAt = new Date(Date.now() + SESSION_ABSOLUTE_HOURS * 3600_000);
  await db().insert(sessions).values({ userId, tokenHash: sha256(token), mfaSatisfied: opts.mfaSatisfied, expiresAt, ip: opts.ip ?? null, userAgent: opts.userAgent?.slice(0, 500) ?? null });
  return { token, expiresAt };
}

export async function resolveSession(token: string | undefined | null): Promise<SessionRecord | null> {
  if (!token || token.length < 20 || token.length > 100) return null;
  const rows = await db()
    .select({ s: sessions, u: users })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(and(eq(sessions.tokenHash, sha256(token)), isNull(sessions.revokedAt), gt(sessions.expiresAt, new Date()), isNull(users.deletedAt)))
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  if (Date.now() - row.s.lastSeenAt.getTime() > SESSION_IDLE_MINUTES * 60_000) {
    await db().update(sessions).set({ revokedAt: new Date() }).where(eq(sessions.id, row.s.id));
    return null;
  }
  if (Date.now() - row.s.lastSeenAt.getTime() > 60_000) {
    await db().update(sessions).set({ lastSeenAt: new Date() }).where(eq(sessions.id, row.s.id));
  }
  return {
    id: row.s.id,
    userId: row.u.id,
    mfaSatisfied: row.s.mfaSatisfied,
    activeOrgId: row.s.activeOrgId,
    user: { id: row.u.id, email: row.u.email, displayName: row.u.displayName, emailVerified: Boolean(row.u.emailVerifiedAt), mfaEnabled: Boolean(row.u.mfaEnabledAt), platformRole: row.u.platformRole },
  };
}

export async function revokeSession(sessionId: string, userId: string): Promise<void> {
  await db().update(sessions).set({ revokedAt: new Date() }).where(and(eq(sessions.id, sessionId), eq(sessions.userId, userId)));
}

export async function revokeAllSessions(userId: string, exceptSessionId?: string): Promise<void> {
  await db()
    .update(sessions)
    .set({ revokedAt: new Date() })
    .where(and(eq(sessions.userId, userId), isNull(sessions.revokedAt), exceptSessionId ? sql`${sessions.id} <> ${exceptSessionId}` : sql`true`));
}

export async function markSessionMfa(sessionId: string): Promise<void> {
  await db().update(sessions).set({ mfaSatisfied: true }).where(eq(sessions.id, sessionId));
}

export async function setActiveOrg(sessionId: string, orgId: string): Promise<void> {
  await db().update(sessions).set({ activeOrgId: orgId }).where(eq(sessions.id, sessionId));
}

export async function listSessions(userId: string) {
  return db()
    .select({ id: sessions.id, createdAt: sessions.createdAt, lastSeenAt: sessions.lastSeenAt, ip: sessions.ip, userAgent: sessions.userAgent, expiresAt: sessions.expiresAt })
    .from(sessions)
    .where(and(eq(sessions.userId, userId), isNull(sessions.revokedAt), gt(sessions.expiresAt, new Date())))
    .orderBy(sql`${sessions.lastSeenAt} desc`);
}
