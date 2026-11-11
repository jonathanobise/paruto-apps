import { boolean, date, index, integer, jsonb, pgEnum, pgTable, text, timestamp, uuid, uniqueIndex, unique } from "drizzle-orm/pg-core";
import { createdAt, id, quantity, rate, updatedAt } from "./_shared";
import { organizations } from "./tenancy";
import { users } from "./identity";

export const assetClass = pgEnum("asset_class", [
  "cash",
  "money_market",
  "treasury_bill",
  "government_bond",
  "corporate_bond",
  "fixed_deposit",
  "equity",
  "equity_fund",
  "etf",
  "fixed_income_fund",
  "real_estate",
  "business",
  "pension",
  "commodity",
  "index",
  "other",
]);
export const pricingModel = pgEnum("pricing_model", ["market", "nav", "discount_accrual", "manual"]);
export const verificationState = pgEnum("verification_state", ["verified", "unverified", "synthetic", "user_provided"]);
export const sourceKind = pgEnum("source_kind", ["official", "licensed", "admin_verified_import", "user", "synthetic", "derived"]);

export const institutions = pgTable("institutions", {
  id: id(),
  name: text("name").notNull(),
  country: text("country").notNull().default("NG"),
  kind: text("kind").notNull(),
  website: text("website"),
  createdAt: createdAt(),
}, (t) => [uniqueIndex("institutions_name_country_key").on(t.name, t.country)]);

/** Registry of every source a data point can come from, with licensing and freshness metadata. */
export const marketDataSources = pgTable("market_data_sources", {
  id: id(),
  key: text("key").notNull(),
  name: text("name").notNull(),
  kind: sourceKind("kind").notNull(),
  url: text("url"),
  licenseNote: text("license_note").notNull(),
  defaultFreshnessDays: integer("default_freshness_days").notNull().default(5),
  active: boolean("active").notNull().default(true),
  createdAt: createdAt(),
}, (t) => [uniqueIndex("market_data_sources_key").on(t.key)]);

/**
 * Instrument master. Global catalogue rows have org_id NULL and are managed by administrators;
 * users may add private instruments (e.g. a specific T-bill) visible only to their organisation.
 */
export const instruments = pgTable("instruments", {
  id: id(),
  orgId: uuid("org_id").references(() => organizations.id, { onDelete: "cascade" }),
  symbol: text("symbol"),
  name: text("name").notNull(),
  issuer: text("issuer"),
  assetClass: assetClass("asset_class").notNull(),
  country: text("country").notNull(),
  region: text("region").notNull(),
  currency: text("currency").notNull(),
  pricingModel: pricingModel("pricing_model").notNull(),
  staleAfterDays: integer("stale_after_days").notNull().default(5),
  faceValuePerUnit: quantity("face_value_per_unit"),
  maturityDate: date("maturity_date", { mode: "string" }),
  priceMultiplier: quantity("price_multiplier"),
  verificationState: verificationState("verification_state").notNull().default("unverified"),
  verifiedAt: timestamp("verified_at", { withTimezone: true }),
  verifiedBy: uuid("verified_by").references(() => users.id),
  officialUrl: text("official_url"),
  /** Structured product facts (see src/server/research/facts.ts). Shown to users only once verified. */
  facts: jsonb("facts").$type<Record<string, unknown>>().notNull().default({}),
  factsSourceUrl: text("facts_source_url"),
  factsAsOf: date("facts_as_of", { mode: "string" }),
  isDemo: boolean("is_demo").notNull().default(false),
  /** Research classification (src/lib/markets.ts): ng | us | uk | global. */
  market: text("market"),
  /** Listing venue (ISO 10383 MIC where one exists, e.g. XNSA, XNYS, XLON). */
  exchange: text("exchange"),
  sectorKey: text("sector_key"),
  industryKey: text("industry_key"),
  /** Set on the instrument that represents an asset class on the markets scoreboard (unique). */
  benchmarkKey: text("benchmark_key"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (t) => [index("instruments_market_idx").on(t.market, t.sectorKey), uniqueIndex("instruments_benchmark_key").on(t.benchmarkKey), index("instruments_org_idx").on(t.orgId), index("instruments_symbol_idx").on(t.symbol), unique("instruments_org_id_id_key").on(t.orgId, t.id)]);

export const instrumentIdentifiers = pgTable("instrument_identifiers", {
  id: id(),
  instrumentId: uuid("instrument_id").notNull().references(() => instruments.id, { onDelete: "cascade" }),
  scheme: text("scheme").notNull(),
  value: text("value").notNull(),
  verificationState: verificationState("verification_state").notNull().default("unverified"),
  createdAt: createdAt(),
}, (t) => [uniqueIndex("instrument_identifiers_scheme_value").on(t.scheme, t.value)]);

/** Prices/NAVs with full provenance. org_id is set only for user-entered prices of private instruments. */
export const marketPrices = pgTable("market_prices", {
  id: id(),
  orgId: uuid("org_id").references(() => organizations.id, { onDelete: "cascade" }),
  instrumentId: uuid("instrument_id").notNull().references(() => instruments.id, { onDelete: "cascade" }),
  sourceId: uuid("source_id").notNull().references(() => marketDataSources.id),
  observedOn: date("observed_on", { mode: "string" }).notNull(),
  price: quantity("price").notNull(),
  /** The day's open, high and low (same currency and basis as `price`, the close) and shares traded, where the source publishes them. */
  open: quantity("open"),
  high: quantity("high"),
  low: quantity("low"),
  volume: quantity("volume"),
  currency: text("currency").notNull(),
  /** close | nav | mid | bid | user_estimate */
  methodology: text("methodology").notNull(),
  verificationState: verificationState("verification_state").notNull(),
  retrievedAt: timestamp("retrieved_at", { withTimezone: true }).notNull().defaultNow(),
  createdAt: createdAt(),
}, (t) => [uniqueIndex("market_prices_unique_obs").on(t.instrumentId, t.sourceId, t.observedOn), index("market_prices_lookup").on(t.instrumentId, t.observedOn)]);

export const fxRates = pgTable("fx_rates", {
  id: id(),
  base: text("base").notNull(),
  quote: text("quote").notNull(),
  rate: rate("rate").notNull(),
  observedOn: date("observed_on", { mode: "string" }).notNull(),
  sourceId: uuid("source_id").notNull().references(() => marketDataSources.id),
  /** official | interbank | parallel | sample — FX methodology matters in Nigeria. */
  methodology: text("methodology").notNull(),
  verificationState: verificationState("verification_state").notNull(),
  retrievedAt: timestamp("retrieved_at", { withTimezone: true }).notNull().defaultNow(),
  createdAt: createdAt(),
}, (t) => [uniqueIndex("fx_rates_unique_obs").on(t.base, t.quote, t.sourceId, t.observedOn), index("fx_rates_lookup").on(t.base, t.quote, t.observedOn)]);


export const rateMethodology = pgEnum("rate_methodology", [
  "discount_rate",
  "true_yield",
  "effective_annual_yield",
  "yield_to_maturity",
  "trailing_return",
  "distribution_yield",
  "advertised_deposit_rate",
  "money_market_yield",
  "expected_return",
  "coupon_rate",
]);

/**
 * Published rates and yields (fund yields, T-bill auction results, deposit rates, coupons) with
 * their methodology. Values are decimals (0.1825 = 18.25%). Rates with different methodologies are
 * never compared as if identical.
 */
export const publishedRates = pgTable("published_rates", {
  id: id(),
  instrumentId: uuid("instrument_id").notNull().references(() => instruments.id, { onDelete: "cascade" }),
  methodology: rateMethodology("methodology").notNull(),
  value: rate("value").notNull(),
  tenorDays: integer("tenor_days"),
  /** Day count / compounding / period detail needed to interpret the figure (e.g. "ACT/365", "7-day annualised"). */
  basis: text("basis"),
  asOf: date("as_of", { mode: "string" }).notNull(),
  sourceId: uuid("source_id").notNull().references(() => marketDataSources.id),
  sourceUrl: text("source_url"),
  verificationState: verificationState("verification_state").notNull(),
  retrievedAt: timestamp("retrieved_at", { withTimezone: true }).notNull().defaultNow(),
  createdAt: createdAt(),
}, (t) => [unique("published_rates_unique_obs").on(t.instrumentId, t.methodology, t.tenorDays, t.asOf, t.sourceId).nullsNotDistinct(), index("published_rates_lookup").on(t.instrumentId, t.asOf)]);

export const marketImportStatus = pgEnum("market_import_status", ["previewed", "committed", "discarded"]);

/** Administrator-controlled verified imports of market data (prices/NAVs, published rates, FX). */
export const marketDataImports = pgTable("market_data_imports", {
  id: id(),
  kind: text("kind").notNull(),
  sourceId: uuid("source_id").notNull().references(() => marketDataSources.id),
  fileName: text("file_name").notNull(),
  fileSha256: text("file_sha256").notNull(),
  rows: jsonb("rows").$type<unknown[]>().notNull(),
  summary: jsonb("summary").$type<Record<string, unknown>>().notNull(),
  status: marketImportStatus("status").notNull().default("previewed"),
  createdBy: uuid("created_by").notNull().references(() => users.id),
  createdAt: createdAt(),
  committedBy: uuid("committed_by").references(() => users.id),
  committedAt: timestamp("committed_at", { withTimezone: true }),
}, (t) => [index("market_data_imports_created_idx").on(t.createdAt)]);
