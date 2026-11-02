import { index, pgTable, primaryKey, text, uuid, uniqueIndex } from "drizzle-orm/pg-core";
import { createdAt, id, updatedAt } from "./_shared";
import { organizations } from "./tenancy";
import { users } from "./identity";
import { instruments } from "./market";

export const watchlists = pgTable("watchlists", {
  id: id(),
  orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  createdBy: uuid("created_by").references(() => users.id),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (t) => [uniqueIndex("watchlists_org_name").on(t.orgId, t.name)]);

export const watchlistItems = pgTable("watchlist_items", {
  orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  watchlistId: uuid("watchlist_id").notNull().references(() => watchlists.id, { onDelete: "cascade" }),
  instrumentId: uuid("instrument_id").notNull().references(() => instruments.id, { onDelete: "cascade" }),
  note: text("note"),
  createdAt: createdAt(),
}, (t) => [primaryKey({ columns: [t.watchlistId, t.instrumentId] }), index("watchlist_items_org_idx").on(t.orgId)]);

/** Saved side-by-side comparisons ("saved research"). */
export const savedComparisons = pgTable("saved_comparisons", {
  id: id(),
  orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  instrumentIds: uuid("instrument_ids").array().notNull(),
  note: text("note"),
  createdBy: uuid("created_by").references(() => users.id),
  createdAt: createdAt(),
}, (t) => [index("saved_comparisons_org_idx").on(t.orgId)]);
