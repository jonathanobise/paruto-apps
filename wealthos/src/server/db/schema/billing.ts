import { boolean, index, integer, jsonb, numeric, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { amount, createdAt, id, updatedAt } from "./_shared";
import { organizations } from "./tenancy";
import { users } from "./identity";

/** Limits a plan grants. `null` means unlimited. Downgrades never delete data; they only stop new items. */
export interface Entitlements {
  accounts: number | null;
  goals: number | null;
  alerts: number | null;
  watchlists: number | null;
  members: number | null;
  csvImportsPerMonth: number | null;
  aiQuestionsPerMonth: number | null;
  pdfReports: boolean;
}

export const billingInterval = pgEnum("billing_interval", ["month", "year"]);
export const subscriptionStatus = pgEnum("subscription_status", ["trialing", "active", "past_due", "canceled", "expired"]);
export const invoiceStatus = pgEnum("invoice_status", ["open", "paid", "void"]);

/** Plan catalogue. Prices and limits are business hypotheses, editable by platform admins (audited). */
export const plans = pgTable("plans", {
  code: text("code").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  price: amount("price").notNull(),
  currency: text("currency").notNull().default("NGN"),
  interval: billingInterval("interval").notNull().default("month"),
  trialDays: integer("trial_days").notNull().default(0),
  entitlements: jsonb("entitlements").$type<Entitlements>().notNull(),
  /** Shown to customers and selectable. Free is public; Adviser is not yet. */
  isPublic: boolean("is_public").notNull().default(true),
  active: boolean("active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  updatedAt: updatedAt(),
});

/** One current subscription per organisation (Free has none). History is kept: ended rows stay. */
export const subscriptions = pgTable("subscriptions", {
  id: id(),
  orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  planCode: text("plan_code").notNull().references(() => plans.code),
  status: subscriptionStatus("status").notNull(),
  /** Price per interval when the current period started (later catalogue changes don't reprice it). */
  price: amount("price").notNull(),
  currency: text("currency").notNull(),
  interval: billingInterval("interval").notNull(),
  currentPeriodStart: timestamp("current_period_start", { withTimezone: true }).notNull(),
  currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }).notNull(),
  trialEndsAt: timestamp("trial_ends_at", { withTimezone: true }),
  graceEndsAt: timestamp("grace_ends_at", { withTimezone: true }),
  cancelAtPeriodEnd: boolean("cancel_at_period_end").notNull().default(false),
  /** Downgrade scheduled for the end of the current period. */
  pendingPlanCode: text("pending_plan_code").references(() => plans.code),
  /** "manual" (bank transfer reconciled by an administrator) or a payment provider key. */
  provider: text("provider").notNull().default("manual"),
  providerRef: text("provider_ref"),
  /** Set by an administrator for complimentary plans; never invoiced. */
  complimentary: boolean("complimentary").notNull().default(false),
  note: text("note"),
  createdBy: uuid("created_by").references(() => users.id),
  endedAt: timestamp("ended_at", { withTimezone: true }),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (t) => [
  uniqueIndex("subscriptions_current_idx").on(t.orgId).where(sql`status in ('trialing', 'active', 'past_due')`),
  index("subscriptions_org_idx").on(t.orgId, t.createdAt),
]);

export interface InvoiceLine {
  description: string;
  amount: string;
  periodStart?: string;
  periodEnd?: string;
}

/**
 * Invoices are accounting records: they outlive the organisation (org_id is cleared when an
 * organisation is erased) and keep only the billing name and email given at issue.
 */
export const invoices = pgTable("invoices", {
  id: id(),
  orgId: uuid("org_id").references(() => organizations.id, { onDelete: "set null" }),
  subscriptionId: uuid("subscription_id").references(() => subscriptions.id, { onDelete: "set null" }),
  number: text("number").notNull().unique(),
  status: invoiceStatus("status").notNull().default("open"),
  currency: text("currency").notNull(),
  subtotal: amount("subtotal").notNull(),
  taxLabel: text("tax_label"),
  taxRatePercent: numeric("tax_rate_percent", { precision: 7, scale: 4 }).notNull().default("0"),
  tax: amount("tax").notNull(),
  total: amount("total").notNull(),
  lines: jsonb("lines").$type<InvoiceLine[]>().notNull(),
  /** What the invoice is for: activates or extends the subscription when paid. */
  purpose: text("purpose").notNull(),
  periodStart: timestamp("period_start", { withTimezone: true }),
  periodEnd: timestamp("period_end", { withTimezone: true }),
  billedTo: jsonb("billed_to").$type<{ name: string; email: string | null }>().notNull(),
  issuedAt: timestamp("issued_at", { withTimezone: true }).notNull().defaultNow(),
  dueAt: timestamp("due_at", { withTimezone: true }).notNull(),
  paidAt: timestamp("paid_at", { withTimezone: true }),
  paymentMethod: text("payment_method"),
  paymentRef: text("payment_ref"),
  voidReason: text("void_reason"),
  createdAt: createdAt(),
}, (t) => [index("invoices_org_idx").on(t.orgId, t.issuedAt), index("invoices_status_idx").on(t.status, t.dueAt)]);

/** Every payment notification received (verified or not), for idempotency and reconciliation. */
export const paymentEvents = pgTable("payment_events", {
  id: id(),
  provider: text("provider").notNull(),
  eventId: text("event_id").notNull(),
  type: text("type").notNull(),
  signatureValid: boolean("signature_valid").notNull(),
  payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
  invoiceId: uuid("invoice_id").references(() => invoices.id),
  /** received | processed | ignored | rejected | failed */
  outcome: text("outcome").notNull().default("received"),
  detail: text("detail"),
  receivedAt: createdAt(),
  processedAt: timestamp("processed_at", { withTimezone: true }),
}, (t) => [uniqueIndex("payment_events_provider_event_idx").on(t.provider, t.eventId)]);
