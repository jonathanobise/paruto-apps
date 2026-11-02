import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { sql } from "drizzle-orm";
import { closeDb, withUser } from "@/server/db/client";
import { regulatoryFeatureApprovals } from "@/server/db/schema";
import { auditLog, aiUsage, featureGates, listJobs, orgDetail, searchUsers, userDetail } from "@/server/admin/console";
import { adminListCases, createCase, adminReply } from "@/server/support/service";
import { adminGrantPlan, adminRevenue } from "@/server/billing/admin";
import { recordComplianceDecision } from "@/server/compliance/decisions";
import { featureDecision } from "@/server/compliance/gate";
import { expectDbRejection, makeUser, ownerPool } from "./helpers";

let support: Awaited<ReturnType<typeof makeUser>>;
let compliance: Awaited<ReturnType<typeof makeUser>>;
let noMfa: Awaited<ReturnType<typeof makeUser>>;
let customer: Awaited<ReturnType<typeof makeUser>>;
const S = () => ({ userId: support.userId });
const C = () => ({ userId: compliance.userId });

beforeAll(async () => {
  [support, compliance, noMfa, customer] = await Promise.all([makeUser("Staff Support"), makeUser("Staff Compliance"), makeUser("Staff NoMfa"), makeUser("Staff Customer")]);
  const pool = ownerPool();
  await pool.query("update users set platform_role = 'support', mfa_enabled_at = now() where id = $1", [support.userId]);
  await pool.query("update users set platform_role = 'compliance', mfa_enabled_at = now() where id = $1", [compliance.userId]);
  await pool.query("update users set platform_role = 'support' where id = $1", [noMfa.userId]);
  await pool.end();
});
afterAll(async () => closeDb());

describe("support agents", () => {
  it("handle requests and look up people and organisations", async () => {
    const id = await createCase(customer.ctx, { topic: "account", subject: "Can't find my export", body: "Where is the data export?" });
    expect((await adminListCases(S())).map((c) => c.id)).toContain(id);
    await adminReply(S(), id, "Settings → Privacy & data → Download all data.");
    expect((await searchUsers(S(), "staff customer")).length).toBe(1);
    expect((await userDetail(S(), customer.userId)).orgs.length).toBe(1);
    expect((await orgDetail(S(), customer.orgId)).members.length).toBe(1);
  });
  it("can't do administrator or compliance work", async () => {
    for (const call of [() => adminRevenue(S()), () => adminGrantPlan(S(), customer.orgId, { planCode: "plus", months: 1, note: "nope" }), () => listJobs(S()), () => auditLog(S(), {}), () => aiUsage(S()), () => featureGates(S()), () => recordComplianceDecision(S(), { feature: "INSTRUMENT_EXPLORER", status: "approved", reference: "memo 123" })])
      await expect(call()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
  it("without two-step verification have no staff access", async () => {
    await expect(adminListCases({ userId: noMfa.userId })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});

describe("compliance reviewers", () => {
  it("read the audit trail, AI usage and gates, but not people or support", async () => {
    expect(Array.isArray(await auditLog(C(), { action: "admin." }))).toBe(true);
    expect(await aiUsage(C())).toHaveProperty("usage");
    expect((await featureGates(C())).length).toBeGreaterThan(10);
    for (const call of [() => searchUsers(C(), ""), () => adminListCases(C()), () => adminRevenue(C())]) await expect(call()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
  it("record decisions that take effect; regulated features can't be approved", async () => {
    await expect(recordComplianceDecision(C(), { feature: "PERSONALISED_RECOMMENDATIONS", status: "approved", reference: "anything at all" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(recordComplianceDecision(C(), { feature: "STRESS_TESTS", status: "approved", reference: "x" })).rejects.toMatchObject({ code: "VALIDATION" });
    await recordComplianceDecision(C(), { feature: "STRESS_TESTS", status: "suspended", reference: "Counsel memo 2026-11-02 (test)" });
    expect(await featureDecision("STRESS_TESTS")).toMatchObject({ available: false, status: "suspended" });
    await recordComplianceDecision(C(), { feature: "STRESS_TESTS", status: "pending_review", reference: "Reset after test (test)" });
    expect((await featureDecision("STRESS_TESTS")).status).toBe("pending_review");
  });
  it("nobody else can write compliance decisions, even with raw SQL", async () => {
    await expectDbRejection(withUser(customer.userId, (tx) => tx.insert(regulatoryFeatureApprovals).values({ featureKey: "STRESS_TESTS", jurisdiction: "NG", status: "approved", reviewerUserId: customer.userId, reference: "self-approval" })), /row-level security/);
    await expectDbRejection(withUser(compliance.userId, (tx) => tx.insert(regulatoryFeatureApprovals).values({ featureKey: "STRESS_TESTS", jurisdiction: "NG", status: "approved", reviewerUserId: support.userId, reference: "in someone else's name" })), /row-level security/);
    const r = await withUser(customer.userId, (tx) => tx.execute(sql`select count(*)::int as n from regulatory_feature_approvals`));
    expect(Number((r.rows[0] as { n: number }).n)).toBeGreaterThan(0); // still readable for gating
  });
});
