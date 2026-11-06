import { bigint, boolean, date, index, jsonb, pgEnum, pgTable, primaryKey, text, timestamp, unique, uuid, integer } from "drizzle-orm/pg-core";
import { createdAt, id, quantity, rate } from "./_shared";
import { instruments, marketDataSources, verificationState } from "./market";

/**
 * Research reference data: an open sector/industry taxonomy, corporate actions (for total
 * returns), macro series (inflation, policy rates) and a cache of computed long-run performance.
 * All global (no org); written only by platform administrators (RLS, migration 0030).
 */
export const sectors = pgTable("sectors", {
  key: text("key").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  sort: integer("sort").notNull().default(0),
});

export const industries = pgTable("industries", {
  key: text("key").primaryKey(),
  sectorKey: text("sector_key").notNull().references(() => sectors.key),
  name: text("name").notNull(),
});

export const corporateActionKind = pgEnum("corporate_action_kind", ["cash_dividend", "split"]);

export const corporateActions = pgTable("corporate_actions", {
  id: id(),
  instrumentId: uuid("instrument_id").notNull().references(() => instruments.id, { onDelete: "cascade" }),
  kind: corporateActionKind("kind").notNull(),
  exDate: date("ex_date", { mode: "string" }).notNull(),
  payDate: date("pay_date", { mode: "string" }),
  /** Cash per share (dividends), in `currency`. */
  amount: quantity("amount"),
  currency: text("currency"),
  /** Shares after per share before (splits and bonus issues). */
  ratio: quantity("ratio"),
  sourceId: uuid("source_id").notNull().references(() => marketDataSources.id),
  sourceUrl: text("source_url"),
  verificationState: verificationState("verification_state").notNull(),
  retrievedAt: timestamp("retrieved_at", { withTimezone: true }).notNull().defaultNow(),
  createdAt: createdAt(),
}, (t) => [unique("corporate_actions_unique_obs").on(t.instrumentId, t.kind, t.exDate, t.sourceId), index("corporate_actions_lookup").on(t.instrumentId, t.exDate)]);

export const macroSeries = pgTable("macro_series", {
  id: id(),
  /** e.g. NG.CPI, US.CPI, UK.CPI, NG.MPR, US.POLICY, UK.POLICY */
  key: text("key").notNull().unique(),
  name: text("name").notNull(),
  country: text("country").notNull(),
  /** index (a price index level) | percent (a rate, stored as a decimal fraction) */
  unit: text("unit").notNull(),
  /** monthly | daily | event (changes on decision dates) */
  frequency: text("frequency").notNull(),
  description: text("description").notNull(),
  sourceId: uuid("source_id").notNull().references(() => marketDataSources.id),
  isDemo: boolean("is_demo").notNull().default(false),
  createdAt: createdAt(),
});

export const macroObservations = pgTable("macro_observations", {
  id: id(),
  seriesId: uuid("series_id").notNull().references(() => macroSeries.id, { onDelete: "cascade" }),
  /** For monthly series, the last day of the month the value refers to. */
  observedOn: date("observed_on", { mode: "string" }).notNull(),
  value: rate("value").notNull(),
  sourceId: uuid("source_id").notNull().references(() => marketDataSources.id),
  verificationState: verificationState("verification_state").notNull(),
  retrievedAt: timestamp("retrieved_at", { withTimezone: true }).notNull().defaultNow(),
  createdAt: createdAt(),
}, (t) => [unique("macro_observations_unique_obs").on(t.seriesId, t.observedOn, t.sourceId), index("macro_observations_lookup").on(t.seriesId, t.observedOn)]);

/** Cache of computed performance per instrument and currency lens, valid for one market data version. */
export const instrumentPerformance = pgTable("instrument_performance", {
  instrumentId: uuid("instrument_id").notNull().references(() => instruments.id, { onDelete: "cascade" }),
  currency: text("currency").notNull(),
  engineVersion: integer("engine_version").notNull(),
  marketVersion: bigint("market_version", { mode: "number" }).notNull(),
  result: jsonb("result").$type<Record<string, unknown>>().notNull(),
  computedAt: timestamp("computed_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [primaryKey({ columns: [t.instrumentId, t.currency] })]);

/** Latest company/fund fundamentals per instrument (profile, snapshot, annual statements, ETF data). */
export const instrumentFundamentals = pgTable("instrument_fundamentals", {
  instrumentId: uuid("instrument_id").primaryKey().references(() => instruments.id, { onDelete: "cascade" }),
  sourceId: uuid("source_id").notNull().references(() => marketDataSources.id),
  data: jsonb("data").$type<Record<string, unknown>>().notNull(),
  retrievedAt: timestamp("retrieved_at", { withTimezone: true }).notNull().defaultNow(),
});
