import { index, pgEnum, pgTable, text, uuid, boolean, jsonb } from "drizzle-orm/pg-core";
import { createdAt, id, updatedAt } from "./_shared";
import { users } from "./identity";

export const approvalStatus = pgEnum("approval_status", ["not_required", "pending_review", "approved", "rejected", "suspended"]);

/** Append-only history of compliance decisions per feature and jurisdiction. Latest row wins. */
export const regulatoryFeatureApprovals = pgTable("regulatory_feature_approvals", {
  id: id(),
  featureKey: text("feature_key").notNull(),
  jurisdiction: text("jurisdiction").notNull(),
  status: approvalStatus("status").notNull(),
  reviewerUserId: uuid("reviewer_user_id").references(() => users.id),
  reference: text("reference"),
  notes: text("notes"),
  createdAt: createdAt(),
}, (t) => [index("regulatory_feature_approvals_lookup").on(t.featureKey, t.jurisdiction, t.createdAt)]);

/** Operational feature flags (rollout), separate from regulatory approval. Both must allow a feature. */
export const featureFlags = pgTable("feature_flags", {
  key: text("key").primaryKey(),
  enabled: boolean("enabled").notNull().default(false),
  config: jsonb("config").$type<Record<string, unknown>>().notNull().default({}),
  updatedBy: uuid("updated_by").references(() => users.id),
  updatedAt: updatedAt(),
});
