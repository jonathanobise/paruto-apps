import { boolean, date, foreignKey, index, jsonb, pgEnum, pgTable, text, uuid, uniqueIndex, unique, check } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { amount, createdAt, id, quantity, updatedAt } from "./_shared";
import { organizations } from "./tenancy";
import { users } from "./identity";
import { institutions, instruments } from "./market";

export interface ModelTarget {
  label: string;
  weight: string;
  match: { assetClasses: string[]; currencies?: string[]; countries?: string[] };
}

export const accountType = pgEnum("account_type", [
  "bank",
  "brokerage",
  "mutual_fund",
  "treasury_bills",
  "bonds",
  "cash_wallet",
  "pension",
  "real_estate",
  "business",
  "other_asset",
  "loan",
  "credit_card",
  "other_liability",
]);
/** ledger: valued by replaying the transaction ledger; manual_asset / liability: valued by declared valuations. */
export const accountClass = pgEnum("account_class", ["ledger", "manual_asset", "liability"]);
export const accountStatus = pgEnum("account_status", ["open", "closed"]);

export const financialAccounts = pgTable("financial_accounts", {
  id: id(),
  orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  type: accountType("type").notNull(),
  accountClass: accountClass("account_class").notNull(),
  institutionId: uuid("institution_id").references(() => institutions.id),
  institutionName: text("institution_name"),
  /** Main currency of the account (cash in other currencies is still tracked separately). */
  currency: text("currency").notNull(),
  /** Included in investment performance (TWR/XIRR) scope. */
  isInvestment: boolean("is_investment").notNull().default(false),
  /** Ownership share in percent (e.g. 50 for a jointly owned property). */
  ownershipPercent: amount("ownership_percent").notNull().default("100"),
  ownershipNote: text("ownership_note"),
  /** Last four characters of the account number, for recognition only. Never credentials. */
  maskedNumber: text("masked_number"),
  dataSource: text("data_source").notNull().default("manual"),
  status: accountStatus("status").notNull().default("open"),
  closedOn: date("closed_on", { mode: "string" }),
  notes: text("notes"),
  createdBy: uuid("created_by").references(() => users.id),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (t) => [
  unique("financial_accounts_org_id_key").on(t.orgId, t.id),
  index("financial_accounts_org_idx").on(t.orgId),
  check("financial_accounts_ownership_range", sql`${t.ownershipPercent} > 0 AND ${t.ownershipPercent} <= 100`),
  check("financial_accounts_masked_number_len", sql`${t.maskedNumber} IS NULL OR length(${t.maskedNumber}) <= 4`),
]);

export const ledgerSource = pgEnum("ledger_source", ["manual", "import", "demo", "system"]);

/**
 * Immutable financial event ledger. Rows are never updated or deleted by the application
 * (enforced by a trigger); corrections are new reversal events.
 */
export const ledgerEvents = pgTable("ledger_events", {
  id: id(),
  orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  occurredOn: date("occurred_on", { mode: "string" }).notNull(),
  /** Event fields as validated by the ledger schema; decimals are strings. */
  payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
  description: text("description"),
  reversesEventId: uuid("reverses_event_id"),
  source: ledgerSource("source").notNull().default("manual"),
  idempotencyKey: text("idempotency_key"),
  createdBy: uuid("created_by").references(() => users.id),
  createdAt: createdAt(),
}, (t) => [
  unique("ledger_events_org_id_key").on(t.orgId, t.id),
  uniqueIndex("ledger_events_idempotency").on(t.orgId, t.idempotencyKey),
  uniqueIndex("ledger_events_single_reversal").on(t.reversesEventId),
  index("ledger_events_org_date_idx").on(t.orgId, t.occurredOn),
  foreignKey({ columns: [t.orgId, t.reversesEventId], foreignColumns: [t.orgId, t.id], name: "ledger_events_reverses_fk" }),
]);

/** Normalised effects of each event per account (cash and position deltas), for querying and reconciliation. */
export const ledgerEntries = pgTable("ledger_entries", {
  id: id(),
  orgId: uuid("org_id").notNull(),
  eventId: uuid("event_id").notNull(),
  accountId: uuid("account_id").notNull(),
  instrumentId: uuid("instrument_id").references(() => instruments.id),
  currency: text("currency").notNull(),
  cashDelta: amount("cash_delta").notNull().default("0"),
  quantityDelta: quantity("quantity_delta").notNull().default("0"),
  createdAt: createdAt(),
}, (t) => [
  index("ledger_entries_account_idx").on(t.orgId, t.accountId),
  index("ledger_entries_event_idx").on(t.eventId),
  foreignKey({ columns: [t.orgId, t.eventId], foreignColumns: [ledgerEvents.orgId, ledgerEvents.id], name: "ledger_entries_event_fk" }).onDelete("cascade"),
  foreignKey({ columns: [t.orgId, t.accountId], foreignColumns: [financialAccounts.orgId, financialAccounts.id], name: "ledger_entries_account_fk" }).onDelete("cascade"),
]);

export const valuationType = pgEnum("valuation_type", ["estimate", "statement", "appraisal"]);

/** Declared valuations for manual assets and liability balances. Append-only; latest by date wins. */
export const accountValuations = pgTable("account_valuations", {
  id: id(),
  orgId: uuid("org_id").notNull(),
  accountId: uuid("account_id").notNull(),
  valuedOn: date("valued_on", { mode: "string" }).notNull(),
  amount: amount("amount").notNull(),
  currency: text("currency").notNull(),
  valuationType: valuationType("valuation_type").notNull().default("estimate"),
  note: text("note"),
  createdBy: uuid("created_by").references(() => users.id),
  createdAt: createdAt(),
}, (t) => [
  index("account_valuations_account_idx").on(t.orgId, t.accountId, t.valuedOn),
  foreignKey({ columns: [t.orgId, t.accountId], foreignColumns: [financialAccounts.orgId, financialAccounts.id], name: "account_valuations_account_fk" }).onDelete("cascade"),
  check("account_valuations_non_negative", sql`${t.amount} >= 0`),
]);

/** User-defined hypothetical target mix (e.g. the founder's model portfolio). Never a recommendation. */
export const modelPortfolios = pgTable("model_portfolios", {
  id: id(),
  orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  /**
   * { [bucket]: { label, weight, match } }: weights are decimal strings summing to 1; `match` assigns
   * holdings to the bucket by asset class and optionally currency / country.
   */
  targets: jsonb("targets").$type<Record<string, ModelTarget>>().notNull(),
  isHypothetical: boolean("is_hypothetical").notNull().default(true),
  createdBy: uuid("created_by").references(() => users.id),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (t) => [index("model_portfolios_org_idx").on(t.orgId)]);

