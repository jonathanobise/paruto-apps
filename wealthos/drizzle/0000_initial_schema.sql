CREATE EXTENSION IF NOT EXISTS citext;--> statement-breakpoint
CREATE TYPE "public"."platform_role" AS ENUM('user', 'support', 'compliance', 'admin');--> statement-breakpoint
CREATE TYPE "public"."token_purpose" AS ENUM('email_verification', 'password_reset', 'account_deletion');--> statement-breakpoint
CREATE TYPE "public"."member_role" AS ENUM('owner', 'admin', 'member', 'viewer');--> statement-breakpoint
CREATE TYPE "public"."org_kind" AS ENUM('personal', 'household', 'business', 'adviser', 'demo');--> statement-breakpoint
CREATE TYPE "public"."asset_class" AS ENUM('cash', 'money_market', 'treasury_bill', 'government_bond', 'corporate_bond', 'fixed_deposit', 'equity', 'equity_fund', 'etf', 'fixed_income_fund', 'real_estate', 'business', 'pension', 'other');--> statement-breakpoint
CREATE TYPE "public"."pricing_model" AS ENUM('market', 'nav', 'discount_accrual', 'manual');--> statement-breakpoint
CREATE TYPE "public"."source_kind" AS ENUM('official', 'licensed', 'admin_verified_import', 'user', 'synthetic');--> statement-breakpoint
CREATE TYPE "public"."verification_state" AS ENUM('verified', 'unverified', 'synthetic', 'user_provided');--> statement-breakpoint
CREATE TYPE "public"."account_class" AS ENUM('ledger', 'manual_asset', 'liability');--> statement-breakpoint
CREATE TYPE "public"."account_status" AS ENUM('open', 'closed');--> statement-breakpoint
CREATE TYPE "public"."account_type" AS ENUM('bank', 'brokerage', 'mutual_fund', 'treasury_bills', 'bonds', 'cash_wallet', 'pension', 'real_estate', 'business', 'other_asset', 'loan', 'credit_card', 'other_liability');--> statement-breakpoint
CREATE TYPE "public"."ledger_source" AS ENUM('manual', 'import', 'demo', 'system');--> statement-breakpoint
CREATE TYPE "public"."valuation_type" AS ENUM('estimate', 'statement', 'appraisal');--> statement-breakpoint
CREATE TYPE "public"."approval_status" AS ENUM('not_required', 'pending_review', 'approved', 'rejected', 'suspended');--> statement-breakpoint
CREATE TABLE "consent_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"consent_key" text NOT NULL,
	"version" text NOT NULL,
	"granted" boolean NOT NULL,
	"ip" "inet",
	"user_agent" text,
	"recorded_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_outbox" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"to_address" text NOT NULL,
	"subject" text NOT NULL,
	"text_body" text NOT NULL,
	"purpose" text NOT NULL,
	"transport" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"sent_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "rate_limit_buckets" (
	"key" text NOT NULL,
	"window_start" timestamp with time zone NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "rate_limit_buckets_key_window_start_pk" PRIMARY KEY("key","window_start")
);
--> statement-breakpoint
CREATE TABLE "security_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"type" text NOT NULL,
	"ip" "inet",
	"user_agent" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"mfa_satisfied" boolean DEFAULT false NOT NULL,
	"active_org_id" uuid,
	"ip" "inet",
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "user_preferences" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"base_currency" text DEFAULT 'NGN' NOT NULL,
	"locale" text DEFAULT 'en-NG' NOT NULL,
	"timezone" text DEFAULT 'Africa/Lagos' NOT NULL,
	"theme" text DEFAULT 'system' NOT NULL,
	"notifications" jsonb DEFAULT '{"inApp":true,"email":false,"productUpdates":false}'::jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" "citext" NOT NULL,
	"email_verified_at" timestamp with time zone,
	"password_hash" text,
	"display_name" text NOT NULL,
	"platform_role" "platform_role" DEFAULT 'user' NOT NULL,
	"mfa_totp_secret_enc" text,
	"mfa_enabled_at" timestamp with time zone,
	"mfa_recovery_code_hashes" jsonb,
	"failed_login_count" integer DEFAULT 0 NOT NULL,
	"locked_until" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "verification_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"purpose" "token_purpose" NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"consumed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid,
	"actor_user_id" uuid,
	"action" text NOT NULL,
	"target_type" text,
	"target_id" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "memberships" (
	"org_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" "member_role" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "memberships_org_id_user_id_pk" PRIMARY KEY("org_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"kind" "org_kind" DEFAULT 'personal' NOT NULL,
	"is_demo" boolean DEFAULT false NOT NULL,
	"jurisdiction" text DEFAULT 'NG' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "fx_rates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"base" text NOT NULL,
	"quote" text NOT NULL,
	"rate" numeric(38, 16) NOT NULL,
	"observed_on" date NOT NULL,
	"source_id" uuid NOT NULL,
	"methodology" text NOT NULL,
	"verification_state" "verification_state" NOT NULL,
	"retrieved_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "institutions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"country" text DEFAULT 'NG' NOT NULL,
	"kind" text NOT NULL,
	"website" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "instrument_identifiers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"instrument_id" uuid NOT NULL,
	"scheme" text NOT NULL,
	"value" text NOT NULL,
	"verification_state" "verification_state" DEFAULT 'unverified' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "instruments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid,
	"symbol" text,
	"name" text NOT NULL,
	"issuer" text,
	"asset_class" "asset_class" NOT NULL,
	"country" text NOT NULL,
	"region" text NOT NULL,
	"currency" text NOT NULL,
	"pricing_model" "pricing_model" NOT NULL,
	"stale_after_days" integer DEFAULT 5 NOT NULL,
	"face_value_per_unit" numeric(38, 12),
	"maturity_date" date,
	"price_multiplier" numeric(38, 12),
	"verification_state" "verification_state" DEFAULT 'unverified' NOT NULL,
	"verified_at" timestamp with time zone,
	"verified_by" uuid,
	"official_url" text,
	"is_demo" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "instruments_org_id_id_key" UNIQUE("org_id","id")
);
--> statement-breakpoint
CREATE TABLE "market_data_sources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"name" text NOT NULL,
	"kind" "source_kind" NOT NULL,
	"url" text,
	"license_note" text NOT NULL,
	"default_freshness_days" integer DEFAULT 5 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "market_prices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid,
	"instrument_id" uuid NOT NULL,
	"source_id" uuid NOT NULL,
	"observed_on" date NOT NULL,
	"price" numeric(38, 12) NOT NULL,
	"currency" text NOT NULL,
	"methodology" text NOT NULL,
	"verification_state" "verification_state" NOT NULL,
	"retrieved_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "account_valuations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"account_id" uuid NOT NULL,
	"valued_on" date NOT NULL,
	"amount" numeric(38, 10) NOT NULL,
	"currency" text NOT NULL,
	"valuation_type" "valuation_type" DEFAULT 'estimate' NOT NULL,
	"note" text,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "account_valuations_non_negative" CHECK ("account_valuations"."amount" >= 0)
);
--> statement-breakpoint
CREATE TABLE "financial_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"name" text NOT NULL,
	"type" "account_type" NOT NULL,
	"account_class" "account_class" NOT NULL,
	"institution_id" uuid,
	"institution_name" text,
	"currency" text NOT NULL,
	"is_investment" boolean DEFAULT false NOT NULL,
	"ownership_percent" numeric(38, 10) DEFAULT '100' NOT NULL,
	"ownership_note" text,
	"masked_number" text,
	"data_source" text DEFAULT 'manual' NOT NULL,
	"status" "account_status" DEFAULT 'open' NOT NULL,
	"closed_on" date,
	"notes" text,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "financial_accounts_org_id_key" UNIQUE("org_id","id"),
	CONSTRAINT "financial_accounts_ownership_range" CHECK ("financial_accounts"."ownership_percent" > 0 AND "financial_accounts"."ownership_percent" <= 100),
	CONSTRAINT "financial_accounts_masked_number_len" CHECK ("financial_accounts"."masked_number" IS NULL OR length("financial_accounts"."masked_number") <= 4)
);
--> statement-breakpoint
CREATE TABLE "ledger_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"event_id" uuid NOT NULL,
	"account_id" uuid NOT NULL,
	"instrument_id" uuid,
	"currency" text NOT NULL,
	"cash_delta" numeric(38, 10) DEFAULT '0' NOT NULL,
	"quantity_delta" numeric(38, 12) DEFAULT '0' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ledger_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"type" text NOT NULL,
	"occurred_on" date NOT NULL,
	"payload" jsonb NOT NULL,
	"description" text,
	"reverses_event_id" uuid,
	"source" "ledger_source" DEFAULT 'manual' NOT NULL,
	"idempotency_key" text,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ledger_events_org_id_key" UNIQUE("org_id","id")
);
--> statement-breakpoint
CREATE TABLE "model_portfolios" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"targets" jsonb NOT NULL,
	"is_hypothetical" boolean DEFAULT true NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "feature_flags" (
	"key" text PRIMARY KEY NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	"config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"updated_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "regulatory_feature_approvals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"feature_key" text NOT NULL,
	"jurisdiction" text NOT NULL,
	"status" "approval_status" NOT NULL,
	"reviewer_user_id" uuid,
	"reference" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verification_tokens" ADD CONSTRAINT "verification_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fx_rates" ADD CONSTRAINT "fx_rates_source_id_market_data_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."market_data_sources"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "instrument_identifiers" ADD CONSTRAINT "instrument_identifiers_instrument_id_instruments_id_fk" FOREIGN KEY ("instrument_id") REFERENCES "public"."instruments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "instruments" ADD CONSTRAINT "instruments_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "instruments" ADD CONSTRAINT "instruments_verified_by_users_id_fk" FOREIGN KEY ("verified_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "market_prices" ADD CONSTRAINT "market_prices_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "market_prices" ADD CONSTRAINT "market_prices_instrument_id_instruments_id_fk" FOREIGN KEY ("instrument_id") REFERENCES "public"."instruments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "market_prices" ADD CONSTRAINT "market_prices_source_id_market_data_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."market_data_sources"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account_valuations" ADD CONSTRAINT "account_valuations_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account_valuations" ADD CONSTRAINT "account_valuations_account_fk" FOREIGN KEY ("org_id","account_id") REFERENCES "public"."financial_accounts"("org_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financial_accounts" ADD CONSTRAINT "financial_accounts_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financial_accounts" ADD CONSTRAINT "financial_accounts_institution_id_institutions_id_fk" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financial_accounts" ADD CONSTRAINT "financial_accounts_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_instrument_id_instruments_id_fk" FOREIGN KEY ("instrument_id") REFERENCES "public"."instruments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_event_fk" FOREIGN KEY ("org_id","event_id") REFERENCES "public"."ledger_events"("org_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_account_fk" FOREIGN KEY ("org_id","account_id") REFERENCES "public"."financial_accounts"("org_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ledger_events" ADD CONSTRAINT "ledger_events_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ledger_events" ADD CONSTRAINT "ledger_events_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ledger_events" ADD CONSTRAINT "ledger_events_reverses_fk" FOREIGN KEY ("org_id","reverses_event_id") REFERENCES "public"."ledger_events"("org_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "model_portfolios" ADD CONSTRAINT "model_portfolios_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "model_portfolios" ADD CONSTRAINT "model_portfolios_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feature_flags" ADD CONSTRAINT "feature_flags_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "regulatory_feature_approvals" ADD CONSTRAINT "regulatory_feature_approvals_reviewer_user_id_users_id_fk" FOREIGN KEY ("reviewer_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "consent_records_user_idx" ON "consent_records" USING btree ("user_id","consent_key","recorded_at");--> statement-breakpoint
CREATE INDEX "email_outbox_to_idx" ON "email_outbox" USING btree ("to_address","created_at");--> statement-breakpoint
CREATE INDEX "security_events_user_idx" ON "security_events" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "sessions_token_hash_key" ON "sessions" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "sessions_user_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_key" ON "users" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "verification_tokens_hash_key" ON "verification_tokens" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "verification_tokens_user_idx" ON "verification_tokens" USING btree ("user_id","purpose");--> statement-breakpoint
CREATE INDEX "audit_events_org_idx" ON "audit_events" USING btree ("org_id","created_at");--> statement-breakpoint
CREATE INDEX "audit_events_actor_idx" ON "audit_events" USING btree ("actor_user_id","created_at");--> statement-breakpoint
CREATE INDEX "memberships_user_idx" ON "memberships" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "fx_rates_unique_obs" ON "fx_rates" USING btree ("base","quote","source_id","observed_on");--> statement-breakpoint
CREATE INDEX "fx_rates_lookup" ON "fx_rates" USING btree ("base","quote","observed_on");--> statement-breakpoint
CREATE UNIQUE INDEX "institutions_name_country_key" ON "institutions" USING btree ("name","country");--> statement-breakpoint
CREATE UNIQUE INDEX "instrument_identifiers_scheme_value" ON "instrument_identifiers" USING btree ("scheme","value");--> statement-breakpoint
CREATE INDEX "instruments_org_idx" ON "instruments" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "instruments_symbol_idx" ON "instruments" USING btree ("symbol");--> statement-breakpoint
CREATE UNIQUE INDEX "market_data_sources_key" ON "market_data_sources" USING btree ("key");--> statement-breakpoint
CREATE UNIQUE INDEX "market_prices_unique_obs" ON "market_prices" USING btree ("instrument_id","source_id","observed_on");--> statement-breakpoint
CREATE INDEX "market_prices_lookup" ON "market_prices" USING btree ("instrument_id","observed_on");--> statement-breakpoint
CREATE INDEX "account_valuations_account_idx" ON "account_valuations" USING btree ("org_id","account_id","valued_on");--> statement-breakpoint
CREATE INDEX "financial_accounts_org_idx" ON "financial_accounts" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "ledger_entries_account_idx" ON "ledger_entries" USING btree ("org_id","account_id");--> statement-breakpoint
CREATE INDEX "ledger_entries_event_idx" ON "ledger_entries" USING btree ("event_id");--> statement-breakpoint
CREATE UNIQUE INDEX "ledger_events_idempotency" ON "ledger_events" USING btree ("org_id","idempotency_key");--> statement-breakpoint
CREATE UNIQUE INDEX "ledger_events_single_reversal" ON "ledger_events" USING btree ("reverses_event_id");--> statement-breakpoint
CREATE INDEX "ledger_events_org_date_idx" ON "ledger_events" USING btree ("org_id","occurred_on");--> statement-breakpoint
CREATE INDEX "model_portfolios_org_idx" ON "model_portfolios" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "regulatory_feature_approvals_lookup" ON "regulatory_feature_approvals" USING btree ("feature_key","jurisdiction","created_at");