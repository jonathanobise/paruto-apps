import "server-only";
import { and, desc, eq, gte, isNull, sql } from "drizzle-orm";
import { z } from "zod";
import { orgInvitations, organizations, users } from "@/server/db/schema";
import { db, withTenant, withUser, type TenantContext } from "@/server/db/client";
import { AppError } from "@/server/platform/errors";
import { rateLimit } from "@/server/platform/rate-limit";
import { recordAudit } from "@/server/audit/audit";
import { enforceLimit } from "@/server/billing/entitlements";
import { appUrl, sendEmail } from "./email";
import { randomToken, sha256 } from "./crypto";
import { parseOrThrow } from "./service";
import { BRAND } from "@/lib/brand";

/**
 * Shared spaces (household / business organisations), invitations and member roles.
 * Membership changes go through SECURITY DEFINER functions that enforce the rules in Postgres:
 * only owners change roles, the last owner can't be removed or demoted, personal spaces have one member.
 */
export const INVITE_DAYS = 7;
export const ROLE_LABELS = { owner: "Owner", admin: "Admin", member: "Member", viewer: "Viewer" } as const;
export const ROLE_HELP = {
  owner: "Full control, including billing, roles and deleting the space.",
  admin: "Can record and edit everything and invite people; can't change roles or billing ownership.",
  member: "Can record and edit accounts, transactions, goals and alerts.",
  viewer: "Can see everything in the space but change nothing.",
} as const;

function dbMessage(err: unknown): string | null {
  let cur: unknown = err;
  for (let i = 0; i < 5 && cur; i++) {
    const m = (cur as { message?: string }).message;
    if (m && /WOS_[A-Z_]+:/.test(m)) return m.replace(/^.*WOS_[A-Z_]+:\s*/, "");
    cur = (cur as { cause?: unknown }).cause;
  }
  return null;
}

async function mapDbErrors<T>(p: Promise<T>): Promise<T> {
  try {
    return await p;
  } catch (err) {
    const m = dbMessage(err);
    if (m) throw new AppError(/owner|forbidden|cannot|only/i.test(m) ? "FORBIDDEN" : "CONFLICT", m.charAt(0).toUpperCase() + m.slice(1) + ".");
    throw err;
  }
}

const spaceSchema = z.object({ name: z.string().trim().min(2, "Give the space a name").max(80), kind: z.enum(["household", "business"]), jurisdiction: z.string().default("NG") });

export async function createSharedSpace(userId: string, input: unknown): Promise<string> {
  const s = parseOrThrow(spaceSchema, input);
  await rateLimit(`space-create:${userId}`, 5, 86_400);
  return withUser(userId, async (tx) => {
    const r = await tx.execute<{ id: string }>(sql`select app_create_organization(${userId}::uuid, ${s.name}, ${s.kind}::org_kind, false) as id`);
    const orgId = r.rows[0]!.id;
    // Only offered jurisdictions (Nigeria today); the organisation row defaults to NG.
    if (s.jurisdiction !== "NG") throw new AppError("VALIDATION", `${BRAND} is only available in Nigeria for now.`, { fieldErrors: { jurisdiction: ["Not offered yet"] } });
    await tx.execute(sql`select set_config('app.org_id', ${orgId}, true)`);
    await recordAudit(tx, { orgId, actorUserId: userId, action: "org.created", targetType: "organization", targetId: orgId, metadata: { kind: s.kind } });
    return orgId;
  });
}

export async function listMembers(ctx: TenantContext) {
  return withTenant(ctx, async (tx) => {
    const r = await tx.execute<{ user_id: string; display_name: string; email: string; role: keyof typeof ROLE_LABELS; joined_at: string }>(sql`select * from app_org_members()`);
    return r.rows.map((m) => ({ userId: m.user_id, displayName: m.display_name, email: m.email, role: m.role, joinedAt: new Date(m.joined_at) }));
  });
}

export async function listInvitations(ctx: TenantContext) {
  return withTenant(ctx, (tx) =>
    tx.select({ id: orgInvitations.id, email: orgInvitations.email, role: orgInvitations.role, expiresAt: orgInvitations.expiresAt, createdAt: orgInvitations.createdAt })
      .from(orgInvitations)
      .where(and(isNull(orgInvitations.acceptedAt), isNull(orgInvitations.revokedAt), gte(orgInvitations.expiresAt, new Date())))
      .orderBy(desc(orgInvitations.createdAt)),
  );
}

const inviteSchema = z.object({ email: z.string().trim().toLowerCase().email("Enter an email address").max(254), role: z.enum(["admin", "member", "viewer"]) });

/** Returns the invitation link (also emailed). Owners and admins only; shared spaces only. */
export async function inviteMember(ctx: TenantContext, input: unknown): Promise<{ id: string; link: string }> {
  const inv = parseOrThrow(inviteSchema, input);
  await rateLimit(`invite:${ctx.userId}`, 20, 86_400);
  const token = randomToken(32);
  const result = await withTenant(ctx, async (tx) => {
    const [org] = await tx.select({ name: organizations.name, kind: organizations.kind, isDemo: organizations.isDemo }).from(organizations).where(eq(organizations.id, ctx.orgId));
    if (!org) throw new AppError("NOT_FOUND", "Organisation not found.");
    if (org.kind === "personal" || org.isDemo) throw new AppError("VALIDATION", "Personal and demo spaces can't be shared. Create a household or business space to invite people.");
    const role = await tx.execute<{ role: string | null }>(sql`select app_org_role() as role`);
    if (!["owner", "admin"].includes(role.rows[0]?.role ?? "")) throw new AppError("FORBIDDEN", "Only owners and admins can invite people.");
    const members = await tx.execute<{ email: string }>(sql`select email from app_org_members()`);
    if (members.rows.some((m) => m.email.toLowerCase() === inv.email)) throw new AppError("CONFLICT", "That person is already a member.", { fieldErrors: { email: ["Already a member"] } });
    // A new invitation to the same address replaces any open one.
    await tx.update(orgInvitations).set({ revokedAt: new Date() }).where(and(eq(orgInvitations.email, inv.email), isNull(orgInvitations.acceptedAt), isNull(orgInvitations.revokedAt)));
    await enforceLimit(tx, ctx, "members");
    const [row] = await tx.insert(orgInvitations).values({ orgId: ctx.orgId, email: inv.email, role: inv.role, tokenHash: sha256(token), invitedBy: ctx.userId, expiresAt: new Date(Date.now() + INVITE_DAYS * 86_400_000) }).returning({ id: orgInvitations.id });
    await recordAudit(tx, { orgId: ctx.orgId, actorUserId: ctx.userId, action: "member.invited", targetType: "org_invitation", targetId: row!.id, metadata: { role: inv.role } });
    return { id: row!.id, orgName: org.name };
  });
  const [inviter] = await db().select({ name: users.displayName }).from(users).where(eq(users.id, ctx.userId));
  const link = appUrl(`/invite?token=${token}`);
  await sendEmail({
    to: inv.email,
    subject: `${inviter?.name ?? "Someone"} invited you to "${result.orgName}" on ${BRAND}`,
    text: `${inviter?.name ?? "Someone"} invited you to join "${result.orgName}" on ${BRAND} as ${ROLE_LABELS[inv.role].toLowerCase()}.\n\n${ROLE_HELP[inv.role]}\n\nAccept within ${INVITE_DAYS} days: ${link}\n\nYou'll need a ${BRAND} account with this email address. If you weren't expecting this, ignore this email.`,
    purpose: "invitation",
  });
  return { id: result.id, link };
}

export async function revokeInvitation(ctx: TenantContext, id: string): Promise<void> {
  await withTenant(ctx, async (tx) => {
    const r = await tx.update(orgInvitations).set({ revokedAt: new Date() }).where(and(eq(orgInvitations.id, id), isNull(orgInvitations.acceptedAt))).returning({ id: orgInvitations.id });
    if (!r.length) throw new AppError("NOT_FOUND", "Invitation not found.");
    await recordAudit(tx, { orgId: ctx.orgId, actorUserId: ctx.userId, action: "member.invitation_revoked", targetType: "org_invitation", targetId: id });
  });
}

export async function previewInvitation(token: string) {
  if (!/^[A-Za-z0-9_-]{20,100}$/.test(token)) return null;
  const r = await db().execute<{ org_name: string; role: keyof typeof ROLE_LABELS; email: string; state: "open" | "accepted" | "expired" | "revoked" }>(sql`select * from app_invitation_preview(${sha256(token)})`);
  return r.rows[0] ?? null;
}

export async function acceptInvitation(userId: string, token: string): Promise<string> {
  await rateLimit(`invite-accept:${userId}`, 20, 3600);
  if (!/^[A-Za-z0-9_-]{20,100}$/.test(token)) throw new AppError("NOT_FOUND", "This invitation link isn't valid.");
  return mapDbErrors(
    withUser(userId, async (tx) => {
      const r = await tx.execute<{ id: string }>(sql`select app_accept_invitation(${sha256(token)}) as id`);
      const orgId = r.rows[0]!.id;
      await tx.execute(sql`select set_config('app.org_id', ${orgId}, true)`);
      await recordAudit(tx, { orgId, actorUserId: userId, action: "member.joined", targetType: "organization", targetId: orgId });
      return orgId;
    }),
  );
}

export async function setMemberRole(ctx: TenantContext, userId: string, role: unknown): Promise<void> {
  const r = parseOrThrow(z.enum(["owner", "admin", "member", "viewer"]), role);
  await mapDbErrors(
    withTenant(ctx, async (tx) => {
      await tx.execute(sql`select app_set_member_role(${userId}::uuid, ${r}::member_role)`);
      await recordAudit(tx, { orgId: ctx.orgId, actorUserId: ctx.userId, action: "member.role_changed", targetType: "user", targetId: userId, metadata: { role: r } });
    }),
  );
}

export async function removeMember(ctx: TenantContext, userId: string): Promise<void> {
  await mapDbErrors(
    withTenant(ctx, async (tx) => {
      await tx.execute(sql`select app_remove_member(${userId}::uuid)`);
      await recordAudit(tx, { orgId: ctx.orgId, actorUserId: ctx.userId, action: userId === ctx.userId ? "member.left" : "member.removed", targetType: "user", targetId: userId });
    }),
  );
}
