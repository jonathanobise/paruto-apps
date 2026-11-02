import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq, sql } from "drizzle-orm";
import { closeDb, db, withTenant, withUser } from "@/server/db/client";
import { jobs, sessions, supportCases, supportMessages } from "@/server/db/schema";
import { adminOverview, auditLog, aiUsage, featureGates, listJobs, orgDetail, retryJob, revokeUserSessions, searchOrgs, searchUsers, sourceFreshness, userDetail } from "@/server/admin/console";
import { adminCloseCase, adminGetCase, adminListCases, adminReply, closeMyCase, createCase, getMyCase, listMyCases, replyToMyCase } from "@/server/support/service";
import { createSession } from "@/server/identity/sessions";
import { expectDbRejection, makeUser, ownerPool } from "./helpers";

let admin: Awaited<ReturnType<typeof makeUser>>;
let alice: Awaited<ReturnType<typeof makeUser>>;
let bob: Awaited<ReturnType<typeof makeUser>>;
const A = () => ({ userId: admin.userId });

beforeAll(async () => {
  admin = await makeUser("Console Admin");
  alice = await makeUser("Console Alice");
  bob = await makeUser("Console Bob");
  const pool = ownerPool();
  await pool.query("update users set platform_role = 'admin', mfa_enabled_at = now() where id = $1", [admin.userId]);
  await pool.end();
});
afterAll(async () => closeDb());

describe("admin console", () => {
  it("refuses non-administrators everywhere", async () => {
    const not = { userId: alice.userId };
    const calls = [() => adminOverview(not), () => searchUsers(not, ""), () => userDetail(not, bob.userId), () => searchOrgs(not, ""), () => orgDetail(not, bob.orgId), () => listJobs(not), () => auditLog(not, {}), () => aiUsage(not), () => sourceFreshness(not), () => featureGates(not), () => revokeUserSessions(not, bob.userId), () => adminListCases(not)];
    for (const call of calls) await expect(call()).rejects.toMatchObject({ code: "FORBIDDEN" });
    // The SECURITY DEFINER usage functions return nothing outside an admin context.
    const r = await withTenant(alice.ctx, (tx) => tx.execute(sql`select * from app_admin_ai_usage()`));
    expect(r.rows).toHaveLength(0);
    const f = await withTenant(alice.ctx, (tx) => tx.execute(sql`select * from app_admin_ai_flags()`));
    expect(f.rows).toHaveLength(0);
  });

  it("finds users and organisations, and audits every detail view", async () => {
    expect((await searchUsers(A(), "console alice")).map((u) => u.id)).toEqual([alice.userId]);
    expect((await searchUsers(A(), "%")).length).toBe(0); // LIKE wildcards are escaped
    const d = await userDetail(A(), alice.userId);
    expect(d.orgs.map((o) => o.id)).toContain(alice.orgId);
    const o = await orgDetail(A(), alice.orgId);
    expect(o.members.map((m) => m.userId)).toEqual([alice.userId]);
    const log = await auditLog(A(), { action: "admin.", actorId: admin.userId });
    expect(log.map((l) => l.action)).toEqual(expect.arrayContaining(["admin.users_searched", "admin.user_viewed", "admin.org_viewed"]));
    expect((await adminOverview(A())).users).toBeGreaterThanOrEqual(3);
  });

  it("signs a user out everywhere", async () => {
    await createSession(bob.userId, { mfaSatisfied: false, ip: "10.0.0.1", userAgent: "test" });
    expect(await revokeUserSessions(A(), bob.userId)).toBeGreaterThanOrEqual(1);
    const live = await db().select().from(sessions).where(eq(sessions.userId, bob.userId));
    expect(live.every((s) => s.revokedAt)).toBe(true);
  });

  it("retries only dead-lettered jobs", async () => {
    const [j] = await db().insert(jobs).values({ queue: "test.dead", payload: {}, status: "dead", attempts: 5, maxAttempts: 5, lastError: "boom", dedupeKey: `dead:${Date.now()}` }).returning();
    expect((await listJobs(A(), "dead")).map((x) => x.id)).toContain(j!.id);
    await retryJob(A(), j!.id);
    const [after] = await db().select().from(jobs).where(eq(jobs.id, j!.id));
    expect(after).toMatchObject({ status: "queued", maxAttempts: 6 });
    await expect(retryJob(A(), j!.id)).rejects.toMatchObject({ code: "CONFLICT" });
  });

  it("lists every registered feature with its decision; regulated ones blocked", async () => {
    const g = await featureGates(A());
    expect(g.find((x) => x.key === "PERSONALISED_RECOMMENDATIONS")!.decision.available).toBe(false);
    expect(g.find((x) => x.key === "PORTFOLIO_TRACKING")!.decision.available).toBe(true);
  });
});

describe("support", () => {
  let caseId: string;
  it("users raise requests that only they and administrators can see", async () => {
    caseId = await createCase(alice.ctx, { topic: "data", subject: "Dividend missing", body: "My March dividend doesn't show." });
    expect((await listMyCases(alice.userId)).map((c) => c.id)).toEqual([caseId]);
    await expect(getMyCase(bob.userId, caseId)).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(await withUser(bob.userId, (tx) => tx.select().from(supportMessages))).toHaveLength(0);
    // Bob can't reply into Alice's case, and nobody can post as staff without being an admin.
    await expect(replyToMyCase(bob.userId, caseId, "hello")).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expectDbRejection(withUser(alice.userId, (tx) => tx.insert(supportMessages).values({ caseId, authorId: alice.userId, fromStaff: true, body: "I am staff" })), /row-level security/);
    await expectDbRejection(withUser(bob.userId, (tx) => tx.insert(supportMessages).values({ caseId, authorId: bob.userId, fromStaff: false, body: "x" })), /row-level security/);
    // Can't attach a case to someone else's organisation.
    await expectDbRejection(withTenant(alice.ctx, (tx) => tx.insert(supportCases).values({ userId: alice.userId, orgId: bob.orgId, topic: "other", subject: "x" })), /row-level security/);
  });

  it("administrators reply (emailed), users answer back, messages are permanent, closed means closed", async () => {
    expect((await adminListCases(A())).map((c) => c.id)).toContain(caseId);
    await adminReply(A(), caseId, "Thanks, we've found the cause.");
    const r = await getMyCase(alice.userId, caseId);
    expect(r.case.status).toBe("answered");
    expect(r.messages.map((m) => m.fromStaff)).toEqual([false, true]);
    await replyToMyCase(alice.userId, caseId, "Great, thank you");
    expect((await getMyCase(alice.userId, caseId)).case.status).toBe("open");
    await expectDbRejection(withUser(alice.userId, (tx) => tx.update(supportMessages).set({ body: "edited" }).where(eq(supportMessages.caseId, caseId))), /WOS_IMMUTABLE|permission denied/);
    await expectDbRejection(withUser(alice.userId, (tx) => tx.update(supportCases).set({ status: "answered" }).where(eq(supportCases.id, caseId))), /WOS_FORBIDDEN/);
    await expectDbRejection(withUser(alice.userId, (tx) => tx.update(supportCases).set({ userId: bob.userId }).where(eq(supportCases.id, caseId))), /WOS_FORBIDDEN|row-level security/);
    expect((await adminGetCase(A(), caseId)).messages).toHaveLength(3);
    await adminCloseCase(A(), caseId);
    await expect(replyToMyCase(alice.userId, caseId, "one more")).rejects.toMatchObject({ code: "CONFLICT" });
    const second = await createCase(alice.ctx, { topic: "other", subject: "Another one", body: "A second question here." });
    await closeMyCase(alice.userId, second);
    expect((await getMyCase(alice.userId, second)).case.status).toBe("closed");
  });

  it("support cases are removed when the user erases their account", async () => {
    await withUser(alice.userId, (tx) => tx.execute(sql`select app_erase_user(${alice.userId}::uuid)`));
    const pool = ownerPool();
    const n = await pool.query("select count(*)::int as n from support_cases where user_id = $1", [alice.userId]);
    await pool.end();
    expect(n.rows[0].n).toBe(0);
  });
});
