import { boolean, index, pgEnum, pgTable, primaryKey, text, timestamp, uuid, jsonb } from "drizzle-orm/pg-core";
import { citext } from "./_shared";
import { createdAt, id } from "./_shared";
import { users } from "./identity";

export const orgKind = pgEnum("org_kind", ["personal", "household", "business", "adviser", "demo"]);
export const memberRole = pgEnum("member_role", ["owner", "admin", "member", "viewer"]);

/** A tenant. Every financial record belongs to exactly one organisation. */
export const organizations = pgTable("organizations", {
  id: id(),
  name: text("name").notNull(),
  kind: orgKind("kind").notNull().default("personal"),
  /** Demo organisations hold only synthetic, labelled SAMPLE data. */
  isDemo: boolean("is_demo").notNull().default(false),
  jurisdiction: text("jurisdiction").notNull().default("NG"),
  createdAt: createdAt(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

export const memberships = pgTable("memberships", {
  orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  role: memberRole("role").notNull(),
  createdAt: createdAt(),
}, (t) => [primaryKey({ columns: [t.orgId, t.userId] }), index("memberships_user_idx").on(t.userId)]);

/** Append-only audit trail for sensitive actions (admin and tenant level). */
export const auditEvents = pgTable("audit_events", {
  id: id(),
  orgId: uuid("org_id"),
  actorUserId: uuid("actor_user_id"),
  action: text("action").notNull(),
  targetType: text("target_type"),
  targetId: text("target_id"),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
  createdAt: createdAt(),
}, (t) => [index("audit_events_org_idx").on(t.orgId, t.createdAt), index("audit_events_actor_idx").on(t.actorUserId, t.createdAt)]);

/** Invitation to join an organisation. Only a hash of the token is stored. */
export const orgInvitations = pgTable("org_invitations", {
  id: id(),
  orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  email: citext("email").notNull(),
  role: memberRole("role").notNull(),
  tokenHash: text("token_hash").notNull().unique(),
  invitedBy: uuid("invited_by").notNull().references(() => users.id),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  acceptedAt: timestamp("accepted_at", { withTimezone: true }),
  acceptedBy: uuid("accepted_by").references(() => users.id),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
  createdAt: createdAt(),
}, (t) => [index("org_invitations_org_idx").on(t.orgId, t.createdAt)]);
