import { boolean, index, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { createdAt, id, updatedAt } from "./_shared";
import { organizations } from "./tenancy";
import { users } from "./identity";

export const supportStatus = pgEnum("support_status", ["open", "answered", "closed"]);
export const supportTopic = pgEnum("support_topic", ["account", "billing", "data", "imports", "privacy", "bug", "other"]);

/** Help requests. Private to the user who raised them; visible to platform administrators. */
export const supportCases = pgTable("support_cases", {
  id: id(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  /** The space the user was in when they asked (context only; others in the space can't see it). */
  orgId: uuid("org_id").references(() => organizations.id, { onDelete: "set null" }),
  topic: supportTopic("topic").notNull(),
  subject: text("subject").notNull(),
  status: supportStatus("status").notNull().default("open"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
  closedAt: timestamp("closed_at", { withTimezone: true }),
}, (t) => [index("support_cases_user_idx").on(t.userId, t.updatedAt), index("support_cases_status_idx").on(t.status, t.updatedAt)]);

export const supportMessages = pgTable("support_messages", {
  id: id(),
  caseId: uuid("case_id").notNull().references(() => supportCases.id, { onDelete: "cascade" }),
  authorId: uuid("author_id").notNull().references(() => users.id),
  fromStaff: boolean("from_staff").notNull(),
  body: text("body").notNull(),
  createdAt: createdAt(),
}, (t) => [index("support_messages_case_idx").on(t.caseId, t.createdAt)]);
