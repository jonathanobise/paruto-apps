import { boolean, index, integer, jsonb, pgEnum, pgTable, text, timestamp, uuid, uniqueIndex } from "drizzle-orm/pg-core";
import { createdAt, id } from "./_shared";
import { organizations } from "./tenancy";
import { users } from "./identity";

export const jobStatus = pgEnum("job_status", ["queued", "running", "succeeded", "dead"]);

/**
 * Durable job queue (system table, never exposed to users). Workers claim jobs with
 * FOR UPDATE SKIP LOCKED; failures retry with exponential backoff until max_attempts, then the
 * job is kept as "dead" for inspection. dedupe_key prevents the same job being queued twice.
 */
export const jobs = pgTable("jobs", {
  id: id(),
  queue: text("queue").notNull(),
  payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
  status: jobStatus("status").notNull().default("queued"),
  runAt: timestamp("run_at", { withTimezone: true }).notNull().defaultNow(),
  attempts: integer("attempts").notNull().default(0),
  maxAttempts: integer("max_attempts").notNull().default(5),
  lockedAt: timestamp("locked_at", { withTimezone: true }),
  lockedBy: text("locked_by"),
  lastError: text("last_error"),
  dedupeKey: text("dedupe_key"),
  createdAt: createdAt(),
  finishedAt: timestamp("finished_at", { withTimezone: true }),
}, (t) => [uniqueIndex("jobs_dedupe_key").on(t.dedupeKey), index("jobs_claim_idx").on(t.status, t.runAt)]);

export const alertKind = pgEnum("alert_kind", ["price_above", "price_below", "fx_above", "fx_below", "maturity_reminder", "data_stale", "concentration", "goal_progress"]);

/** User-defined alert rules. Evaluated by the worker in the owner's tenant context. */
export const alerts = pgTable("alerts", {
  id: id(),
  orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  kind: alertKind("kind").notNull(),
  params: jsonb("params").$type<Record<string, string | number>>().notNull(),
  /** Fire once then switch off, or keep watching (at most once per day for ongoing conditions). */
  repeat: boolean("repeat").notNull().default(false),
  enabled: boolean("enabled").notNull().default(true),
  lastEvaluatedAt: timestamp("last_evaluated_at", { withTimezone: true }),
  lastTriggeredAt: timestamp("last_triggered_at", { withTimezone: true }),
  createdAt: createdAt(),
}, (t) => [index("alerts_org_idx").on(t.orgId, t.enabled)]);

/** In-app notifications. dedupe_key makes delivery idempotent: an event notifies at most once. */
export const notifications = pgTable("notifications", {
  id: id(),
  orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  alertId: uuid("alert_id").references(() => alerts.id, { onDelete: "set null" }),
  kind: text("kind").notNull(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  link: text("link"),
  dedupeKey: text("dedupe_key").notNull(),
  createdAt: createdAt(),
  readAt: timestamp("read_at", { withTimezone: true }),
}, (t) => [uniqueIndex("notifications_dedupe_key").on(t.orgId, t.dedupeKey), index("notifications_user_idx").on(t.userId, t.readAt, t.createdAt)]);
