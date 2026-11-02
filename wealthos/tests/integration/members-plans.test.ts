import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq, sql } from "drizzle-orm";
import { closeDb, db, withTenant, withUser } from "@/server/db/client";
import { emailOutbox, memberships, orgInvitations, subscriptions } from "@/server/db/schema";
import { createAccount, listAccounts } from "@/server/accounts/service";
import { effectivePlan, planSummary } from "@/server/billing/entitlements";
import { acceptInvitation, createSharedSpace, inviteMember, listInvitations, listMembers, previewInvitation, removeMember, revokeInvitation, setMemberRole } from "@/server/identity/members";
import { listOrganizations } from "@/server/identity/tenancy";
import { expectDbRejection, grantPlan, makeUser } from "./helpers";

let owner: Awaited<ReturnType<typeof makeUser>>;
let friend: Awaited<ReturnType<typeof makeUser>>;
let stranger: Awaited<ReturnType<typeof makeUser>>;
let space: string;
const tokenFrom = async (email: string) => {
  const [m] = await db().select().from(emailOutbox).where(eq(emailOutbox.toAddress, email)).orderBy(sql`created_at desc`).limit(1);
  return /token=([A-Za-z0-9_-]+)/.exec(m!.textBody)![1]!;
};

beforeAll(async () => {
  owner = await makeUser("Space Owner");
  friend = await makeUser("Space Friend");
  stranger = await makeUser("Space Stranger");
  space = await createSharedSpace(owner.userId, { name: "Okafor household", kind: "household" });
});
afterAll(async () => closeDb());

describe("plans and entitlements", () => {
  it("new organisations are on Free and limits stop new items without touching existing ones", async () => {
    const eff = await withTenant(owner.ctx, (tx) => effectivePlan(tx, owner.orgId));
    expect(eff).toMatchObject({ source: "free", plan: { code: "free" } });
    for (let i = 0; i < 5; i++) await createAccount(owner.ctx, { name: `Account ${i}`, type: "bank", currency: "NGN" });
    await expect(createAccount(owner.ctx, { name: "Sixth", type: "bank", currency: "NGN" })).rejects.toMatchObject({ code: "PLAN_LIMIT", message: expect.stringMatching(/Free allows 5 open accounts/) });
    const summary = await planSummary(owner.ctx);
    expect(summary.used.accounts).toBe(5);
    expect(summary.plans.map((p) => p.code)).toEqual(["free", "plus", "pro"]);

    // Upgrade lifts the limit; a later downgrade keeps all six accounts.
    await grantPlan(owner.orgId, "plus");
    await createAccount(owner.ctx, { name: "Sixth", type: "bank", currency: "NGN" });
    const pool = (await import("./helpers")).ownerPool();
    await pool.query("update subscriptions set status = 'expired', ended_at = now() where org_id = $1", [owner.orgId]);
    await pool.end();
    expect(await listAccounts(owner.ctx)).toHaveLength(6);
    await expect(createAccount(owner.ctx, { name: "Seventh", type: "bank", currency: "NGN" })).rejects.toMatchObject({ code: "PLAN_LIMIT" });
  });

  it("customers cannot grant themselves a plan, a long trial, or a second trial", async () => {
    const start = new Date();
    const values = (days: number, extra: Partial<typeof subscriptions.$inferInsert> = {}) => ({ orgId: friend.orgId, planCode: "plus", status: "trialing" as const, price: "4500", currency: "NGN", interval: "month" as const, currentPeriodStart: start, currentPeriodEnd: new Date(start.getTime() + days * 86_400_000), trialEndsAt: new Date(start.getTime() + days * 86_400_000), ...extra });
    await expectDbRejection(withTenant(friend.ctx, (tx) => tx.insert(subscriptions).values(values(14, { status: "active" }))), /WOS_BILLING/);
    await expectDbRejection(withTenant(friend.ctx, (tx) => tx.insert(subscriptions).values(values(14, { complimentary: true }))), /WOS_BILLING/);
    await expectDbRejection(withTenant(friend.ctx, (tx) => tx.insert(subscriptions).values(values(365))), /WOS_BILLING/);
    await expectDbRejection(withTenant(friend.ctx, (tx) => tx.insert(subscriptions).values(values(14, { price: "1" }))), /WOS_BILLING/);
    const [s] = await withTenant(friend.ctx, (tx) => tx.insert(subscriptions).values(values(14)).returning());
    await expectDbRejection(withTenant(friend.ctx, (tx) => tx.update(subscriptions).set({ status: "active" }).where(eq(subscriptions.id, s!.id))), /WOS_BILLING/);
    await expectDbRejection(withTenant(friend.ctx, (tx) => tx.update(subscriptions).set({ currentPeriodEnd: new Date(start.getTime() + 400 * 86_400_000) }).where(eq(subscriptions.id, s!.id))), /WOS_BILLING/);
    await withTenant(friend.ctx, (tx) => tx.update(subscriptions).set({ status: "expired", endedAt: new Date() }).where(eq(subscriptions.id, s!.id)));
    await expectDbRejection(withTenant(friend.ctx, (tx) => tx.insert(subscriptions).values(values(14))), /WOS_BILLING/);
  });

  it("a member cannot see or change another organisation's subscription", async () => {
    await grantPlan(stranger.orgId, "pro");
    expect(await withTenant(friend.ctx, (tx) => tx.select().from(subscriptions).where(eq(subscriptions.orgId, stranger.orgId)))).toHaveLength(0);
    const r = await withTenant(friend.ctx, (tx) => tx.update(subscriptions).set({ cancelAtPeriodEnd: true }).where(eq(subscriptions.orgId, stranger.orgId)).returning());
    expect(r).toHaveLength(0);
  });
});

describe("shared spaces and invitations", () => {
  const spaceCtx = () => ({ userId: owner.userId, orgId: space });

  it("Free shared spaces can't invite; personal spaces never can", async () => {
    await expect(inviteMember(owner.ctx, { email: friend.email, role: "member" })).rejects.toMatchObject({ code: "VALIDATION" });
    await expect(inviteMember(spaceCtx(), { email: friend.email, role: "member" })).rejects.toMatchObject({ code: "PLAN_LIMIT" });
  });

  it("invites, previews and accepts only for the invited address", async () => {
    await grantPlan(space, "pro");
    const { link } = await inviteMember(spaceCtx(), { email: friend.email.toUpperCase(), role: "member" });
    const token = new URL(link).searchParams.get("token")!;
    expect(await tokenFrom(friend.email)).toBe(token);
    expect(await previewInvitation(token)).toMatchObject({ org_name: "Okafor household", role: "member", state: "open" });
    await expect(acceptInvitation(stranger.userId, token)).rejects.toMatchObject({ message: /different email address/ });
    const orgId = await acceptInvitation(friend.userId, token);
    expect(orgId).toBe(space);
    expect((await listOrganizations(friend.userId)).map((o) => o.id)).toContain(space);
    await expect(acceptInvitation(friend.userId, token)).rejects.toMatchObject({ message: /no longer valid/ });
    expect((await listMembers(spaceCtx())).map((m) => m.role)).toEqual(["owner", "member"]);
  });

  it("enforces who may manage members", async () => {
    const friendCtx = { userId: friend.userId, orgId: space };
    await expect(inviteMember(friendCtx, { email: "someone@example.test", role: "viewer" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(setMemberRole(friendCtx, friend.userId, "owner")).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(removeMember(friendCtx, owner.userId)).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(setMemberRole(spaceCtx(), owner.userId, "member")).rejects.toMatchObject({ message: /at least one owner/ });
    await expect(removeMember(spaceCtx(), owner.userId)).rejects.toMatchObject({ message: /at least one owner/ });
    // Members cannot insert memberships directly.
    await expectDbRejection(withTenant(friendCtx, (tx) => tx.insert(memberships).values({ orgId: space, userId: stranger.userId, role: "owner" })), /row-level security|permission denied/);
    // Invitations aren't visible to members or other tenants.
    expect(await withTenant(friendCtx, (tx) => tx.select().from(orgInvitations))).toHaveLength(0);
    expect(await withTenant(stranger.ctx, (tx) => tx.select().from(orgInvitations))).toHaveLength(0);
    await setMemberRole(spaceCtx(), friend.userId, "viewer");
    await expect(createAccount(friendCtx, { name: "Viewer account", type: "bank", currency: "NGN" })).rejects.toBeTruthy();
  });

  it("revoked invitations stop working; a member can leave and loses access", async () => {
    const { id, link } = await inviteMember(spaceCtx(), { email: stranger.email, role: "viewer" });
    expect((await listInvitations(spaceCtx())).map((i) => i.id)).toContain(id);
    await revokeInvitation(spaceCtx(), id);
    await expect(acceptInvitation(stranger.userId, new URL(link).searchParams.get("token")!)).rejects.toMatchObject({ message: /no longer valid/ });

    await removeMember({ userId: friend.userId, orgId: space }, friend.userId);
    expect((await listOrganizations(friend.userId)).map((o) => o.id)).not.toContain(space);
    expect(await withTenant({ userId: friend.userId, orgId: space }, (tx) => tx.select().from(subscriptions))).toHaveLength(0);
  });

  it("membership changes are audited", async () => {
    const r = await withUser(owner.userId, async (tx) => {
      await tx.execute(sql`select set_config('app.org_id', ${space}, true)`);
      return tx.execute<{ action: string }>(sql`select action from audit_events where org_id = ${space} order by created_at`);
    });
    expect(r.rows.map((x) => x.action)).toEqual(expect.arrayContaining(["org.created", "member.invited", "member.joined", "member.role_changed", "member.invitation_revoked", "member.left"]));
  });
});
