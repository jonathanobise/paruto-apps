import { index, jsonb, pgTable, text, timestamp, uuid, uniqueIndex } from "drizzle-orm/pg-core";
import { id } from "./_shared";
import { organizations } from "./tenancy";

/**
 * Cache of computed analytics (dashboard, account and holding performance). NEVER authoritative:
 * each row stores the fingerprint of every input it was computed from, and is used only when the
 * current inputs produce the same fingerprint. The ledger, valuations and market data remain the
 * source of truth; rows can be deleted at any time without losing information.
 */
export const valuationSnapshots = pgTable("valuation_snapshots", {
  id: id(),
  orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  /** e.g. "dashboard", "account-performance:<id>", "holdings-performance". */
  kind: text("kind").notNull(),
  /** Parameters that select the view (display currency, period, as-of date). */
  paramsKey: text("params_key").notNull(),
  inputFingerprint: text("input_fingerprint").notNull(),
  payload: jsonb("payload").notNull(),
  computedAt: timestamp("computed_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [uniqueIndex("valuation_snapshots_key").on(t.orgId, t.kind, t.paramsKey), index("valuation_snapshots_org_idx").on(t.orgId)]);
