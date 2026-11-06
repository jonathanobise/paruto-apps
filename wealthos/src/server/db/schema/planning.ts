import { boolean, date, index, jsonb, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { amount, createdAt, id, rate, updatedAt } from "./_shared";
import { organizations } from "./tenancy";
import { users } from "./identity";

export const goalKind = pgEnum("goal_kind", ["net_worth", "retirement", "financial_independence", "education", "home", "emergency", "other"]);
export const goalScope = pgEnum("goal_scope", ["net_worth", "accounts"]);

/**
 * A user's financial goal with its own hypothetical assumptions. At least two return scenarios are
 * always stored so no single projection is presented on its own.
 */
export const goals = pgTable("goals", {
  id: id(),
  orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  kind: goalKind("kind").notNull(),
  targetAmount: amount("target_amount").notNull(),
  currency: text("currency").notNull(),
  targetDate: date("target_date", { mode: "string" }).notNull(),
  /** Target expressed in today's money (inflation-adjusted) rather than future naira/dollars. */
  targetIsReal: boolean("target_is_real").notNull().default(true),
  scope: goalScope("scope").notNull().default("net_worth"),
  accountIds: uuid("account_ids").array().notNull().default([]),
  monthlyContribution: amount("monthly_contribution").notNull().default("0"),
  contributionTiming: text("contribution_timing").notNull().default("end"),
  contributionGrowth: rate("contribution_growth").notNull().default("0"),
  inflation: rate("inflation").notNull(),
  annualFee: rate("annual_fee").notNull().default("0"),
  scenarios: jsonb("scenarios").$type<Array<{ label: string; annualReturn: string }>>().notNull(),
  notes: text("notes"),
  createdBy: uuid("created_by").references(() => users.id),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
  archivedAt: timestamp("archived_at", { withTimezone: true }),
}, (t) => [index("goals_org_idx").on(t.orgId)]);
