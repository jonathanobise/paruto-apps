import "server-only";
import { and, count, desc, eq, ilike, inArray, isNull, like, or, sql } from "drizzle-orm";
import { auditEvents, invoices, jobs, memberships, organizations, regulatoryFeatureApprovals, securityEvents, sessions, subscriptions, supportCases, users } from "@/server/db/schema";
import { AppError } from "@/server/platform/errors";
import { recordAudit } from "@/server/audit/audit";
import { FEATURES } from "@/server/compliance/features";
import { featureDecision } from "@/server/compliance/gate";
import { asAdmin, asStaff, type AdminContext } from "./context";

/**
 * Platform administration reads. Each runs in an admin transaction (Postgres re-checks the role
 * and 2FA). Views of a specific person's or organisation's data are audited; nothing here reads
 * financial records or assistant conversation content.
 */
const escapeLike = (q: string) => `%${q.replace(/[%_\\]/g, (m) => `\\${m}`)}%`;
const isUuid = (s: string) => /^[0-9a-f-]{36}$/i.test(s);

export async function adminOverview(admin: AdminContext) {
  return asStaff(admin, ["support", "compliance"], async (tx) => {
    const one = async (q: Promise<Array<{ n: number }>>) => Number((await q)[0]?.n ?? 0);
    const [usersN, orgsN, activeSubs, openInvoices, openCases, deadJobs, queuedJobs] = await Promise.all([
      one(tx.select({ n: count() }).from(users).where(isNull(users.deletedAt))),
      one(tx.select({ n: count() }).from(organizations).where(and(isNull(organizations.deletedAt), eq(organizations.isDemo, false)))),
      one(tx.select({ n: count() }).from(subscriptions).where(inArray(subscriptions.status, ["trialing", "active", "past_due"]))),
      one(tx.select({ n: count() }).from(invoices).where(eq(invoices.status, "open"))),
      one(tx.select({ n: count() }).from(supportCases).where(eq(supportCases.status, "open"))),
      one(tx.select({ n: count() }).from(jobs).where(eq(jobs.status, "dead"))),
      one(tx.select({ n: count() }).from(jobs).where(eq(jobs.status, "queued"))),
    ]);
    return { users: usersN, orgs: orgsN, activeSubs, openInvoices, openCases, deadJobs, queuedJobs };
  });
}

/** Latest observation per source and kind, against the source's freshness threshold. */
export async function sourceFreshness(admin: AdminContext) {
  return asAdmin(admin, async (tx) => {
    const r = await tx.execute<{ name: string; kind: string; fresh_days: number; prices: string | null; fx: string | null; rates: string | null }>(sql`
      select s.name, s.kind::text as kind, s.default_freshness_days as fresh_days,
        (select max(observed_on)::text from market_prices p where p.source_id = s.id and p.org_id is null) as prices,
        (select max(observed_on)::text from fx_rates f where f.source_id = s.id) as fx,
        (select max(as_of)::text from published_rates r where r.source_id = s.id) as rates
      from market_data_sources s order by s.name`);
    const today = Date.now();
    return r.rows.map((s) => {
      const latest = [s.prices, s.fx, s.rates].filter(Boolean).sort().at(-1) ?? null;
      const ageDays = latest ? Math.floor((today - Date.parse(`${latest}T00:00:00Z`)) / 86_400_000) : null;
      return { ...s, latest, ageDays, stale: ageDays === null || ageDays > s.fresh_days };
    });
  });
}

export async function searchUsers(admin: AdminContext, q: string) {
  const query = q.trim().slice(0, 80);
  return asStaff(admin, ["support"], async (tx) => {
    if (query) await recordAudit(tx, { orgId: null, actorUserId: admin.userId, action: "admin.users_searched", metadata: { query } });
    return tx
      .select({ id: users.id, email: users.email, name: users.displayName, role: users.platformRole, verified: users.emailVerifiedAt, mfa: users.mfaEnabledAt, lockedUntil: users.lockedUntil, deletedAt: users.deletedAt, createdAt: users.createdAt })
      .from(users)
      .where(query ? or(ilike(users.email, escapeLike(query)), ilike(users.displayName, escapeLike(query)), isUuid(query) ? eq(users.id, query) : undefined) : undefined)
      .orderBy(desc(users.createdAt))
      .limit(100);
  });
}

export async function userDetail(admin: AdminContext, id: string) {
  if (!isUuid(id)) throw new AppError("NOT_FOUND", "User not found.");
  return asStaff(admin, ["support"], async (tx) => {
    const [u] = await tx.select().from(users).where(eq(users.id, id));
    if (!u) throw new AppError("NOT_FOUND", "User not found.");
    const orgs = await tx.select({ id: organizations.id, name: organizations.name, kind: organizations.kind, isDemo: organizations.isDemo, role: memberships.role }).from(memberships).innerJoin(organizations, eq(organizations.id, memberships.orgId)).where(eq(memberships.userId, id));
    const [activeSessions] = await tx.select({ n: count() }).from(sessions).where(and(eq(sessions.userId, id), isNull(sessions.revokedAt), sql`${sessions.expiresAt} > now()`));
    const events = await tx.select({ type: securityEvents.type, createdAt: securityEvents.createdAt, ip: securityEvents.ip }).from(securityEvents).where(eq(securityEvents.userId, id)).orderBy(desc(securityEvents.createdAt)).limit(30);
    const cases = await tx.select({ id: supportCases.id, subject: supportCases.subject, status: supportCases.status, updatedAt: supportCases.updatedAt }).from(supportCases).where(eq(supportCases.userId, id)).orderBy(desc(supportCases.updatedAt)).limit(20);
    await recordAudit(tx, { orgId: null, actorUserId: admin.userId, action: "admin.user_viewed", targetType: "user", targetId: id });
    return {
      user: { id: u.id, email: u.email, name: u.displayName, role: u.platformRole, verified: u.emailVerifiedAt, mfa: u.mfaEnabledAt, lockedUntil: u.lockedUntil, failedLogins: u.failedLoginCount, deletedAt: u.deletedAt, createdAt: u.createdAt },
      orgs,
      activeSessions: Number(activeSessions?.n ?? 0),
      events,
      cases,
    };
  });
}

/** Sign a user out everywhere (e.g. suspected compromise). */
export async function revokeUserSessions(admin: AdminContext, id: string): Promise<number> {
  return asStaff(admin, ["support"], async (tx) => {
    const r = await tx.update(sessions).set({ revokedAt: new Date() }).where(and(eq(sessions.userId, id), isNull(sessions.revokedAt))).returning({ id: sessions.id });
    await tx.insert(securityEvents).values({ userId: id, type: "admin.sessions_revoked", metadata: { by: admin.userId, count: r.length } });
    await recordAudit(tx, { orgId: null, actorUserId: admin.userId, action: "admin.sessions_revoked", targetType: "user", targetId: id, metadata: { count: r.length } });
    return r.length;
  });
}

export async function searchOrgs(admin: AdminContext, q: string) {
  const query = q.trim().slice(0, 80);
  return asStaff(admin, ["support"], async (tx) => {
    const rows = await tx
      .select({ id: organizations.id, name: organizations.name, kind: organizations.kind, isDemo: organizations.isDemo, createdAt: organizations.createdAt, members: sql<number>`(select count(*) from memberships m where m.org_id = ${organizations.id})`.mapWith(Number) })
      .from(organizations)
      .where(and(isNull(organizations.deletedAt), query ? or(ilike(organizations.name, escapeLike(query)), isUuid(query) ? eq(organizations.id, query) : undefined) : undefined))
      .orderBy(desc(organizations.createdAt))
      .limit(100);
    const subs = rows.length ? await tx.select().from(subscriptions).where(and(inArray(subscriptions.orgId, rows.map((r) => r.id)), inArray(subscriptions.status, ["trialing", "active", "past_due"]))) : [];
    return rows.map((r) => ({ ...r, subscription: subs.find((s) => s.orgId === r.id) ?? null }));
  });
}

export async function orgDetail(admin: AdminContext, id: string) {
  if (!isUuid(id)) throw new AppError("NOT_FOUND", "Organisation not found.");
  return asStaff(admin, ["support"], async (tx) => {
    const [org] = await tx.select().from(organizations).where(eq(organizations.id, id));
    if (!org) throw new AppError("NOT_FOUND", "Organisation not found.");
    const members = await tx.select({ userId: users.id, email: users.email, name: users.displayName, role: memberships.role, joinedAt: memberships.createdAt }).from(memberships).innerJoin(users, eq(users.id, memberships.userId)).where(eq(memberships.orgId, id));
    const subs = await tx.select().from(subscriptions).where(eq(subscriptions.orgId, id)).orderBy(desc(subscriptions.createdAt));
    const invs = await tx.select().from(invoices).where(eq(invoices.orgId, id)).orderBy(desc(invoices.issuedAt));
    await recordAudit(tx, { orgId: null, actorUserId: admin.userId, action: "admin.org_viewed", targetType: "organization", targetId: id });
    return { org, members, subscriptions: subs, invoices: invs };
  });
}

export async function listJobs(admin: AdminContext, status: "dead" | "queued" | "running" | "succeeded" = "dead") {
  return asAdmin(admin, (tx) => tx.select().from(jobs).where(eq(jobs.status, status)).orderBy(desc(jobs.createdAt)).limit(100));
}

/** Put a dead-lettered job back on the queue for one more attempt. */
export async function retryJob(admin: AdminContext, id: string): Promise<void> {
  await asAdmin(admin, async (tx) => {
    const r = await tx.update(jobs).set({ status: "queued", runAt: new Date(), maxAttempts: sql`${jobs.attempts} + 1`, lockedAt: null, lockedBy: null }).where(and(eq(jobs.id, id), eq(jobs.status, "dead"))).returning({ id: jobs.id, queue: jobs.queue });
    if (!r.length) throw new AppError("CONFLICT", "Only dead-lettered jobs can be retried.");
    await recordAudit(tx, { orgId: null, actorUserId: admin.userId, action: "admin.job_retried", targetType: "job", targetId: id, metadata: { queue: r[0]!.queue } });
  });
}

export async function auditLog(admin: AdminContext, f: { action?: string; orgId?: string; actorId?: string }) {
  return asStaff(admin, ["compliance"], (tx) =>
    tx.select().from(auditEvents)
      .where(and(f.action ? like(auditEvents.action, `${f.action.replace(/[%_\\]/g, "")}%`) : undefined, f.orgId && isUuid(f.orgId) ? eq(auditEvents.orgId, f.orgId) : undefined, f.actorId && isUuid(f.actorId) ? eq(auditEvents.actorUserId, f.actorId) : undefined))
      .orderBy(desc(auditEvents.createdAt))
      .limit(200),
  );
}

export async function securityLog(admin: AdminContext, f: { type?: string; userId?: string }) {
  return asStaff(admin, ["compliance"], (tx) =>
    tx.select().from(securityEvents)
      .where(and(f.type ? like(securityEvents.type, `${f.type.replace(/[%_\\]/g, "")}%`) : undefined, f.userId && isUuid(f.userId) ? eq(securityEvents.userId, f.userId) : undefined))
      .orderBy(desc(securityEvents.createdAt))
      .limit(200),
  );
}

export async function aiUsage(admin: AdminContext) {
  return asStaff(admin, ["compliance"], async (tx) => {
    const usage = await tx.execute<{ org_id: string; org_name: string; questions: string; tokens: string; flagged_conversations: string; users: string }>(sql`select * from app_admin_ai_usage()`);
    const flags = await tx.execute<{ conversation_id: string; org_name: string; flagged_at: string; policy_flags: string[]; tools: string[]; model: string | null }>(sql`select * from app_admin_ai_flags()`);
    return { usage: usage.rows, flags: flags.rows };
  });
}

/** Every registered feature with its current decision and recorded compliance decisions. */
export async function featureGates(admin: AdminContext) {
  const approvals = await asStaff(admin, ["compliance"], (tx) => tx.select().from(regulatoryFeatureApprovals).orderBy(desc(regulatoryFeatureApprovals.createdAt)).limit(200));
  const rows = [];
  for (const f of FEATURES) rows.push({ ...f, decision: await featureDecision(f.key, "NG"), approvals: approvals.filter((a) => a.featureKey === f.key) });
  return rows;
}
