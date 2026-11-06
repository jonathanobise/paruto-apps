CREATE TYPE "public"."corporate_action_kind" AS ENUM('cash_dividend', 'split');--> statement-breakpoint
ALTER TYPE "public"."asset_class" ADD VALUE 'commodity' BEFORE 'other';--> statement-breakpoint
ALTER TYPE "public"."asset_class" ADD VALUE 'index' BEFORE 'other';--> statement-breakpoint
CREATE TABLE "corporate_actions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"instrument_id" uuid NOT NULL,
	"kind" "corporate_action_kind" NOT NULL,
	"ex_date" date NOT NULL,
	"pay_date" date,
	"amount" numeric(38, 12),
	"currency" text,
	"ratio" numeric(38, 12),
	"source_id" uuid NOT NULL,
	"source_url" text,
	"verification_state" "verification_state" NOT NULL,
	"retrieved_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "corporate_actions_unique_obs" UNIQUE("instrument_id","kind","ex_date","source_id")
);
--> statement-breakpoint
CREATE TABLE "industries" (
	"key" text PRIMARY KEY NOT NULL,
	"sector_key" text NOT NULL,
	"name" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "instrument_performance" (
	"instrument_id" uuid NOT NULL,
	"currency" text NOT NULL,
	"engine_version" integer NOT NULL,
	"market_version" bigint NOT NULL,
	"result" jsonb NOT NULL,
	"computed_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "instrument_performance_instrument_id_currency_pk" PRIMARY KEY("instrument_id","currency")
);
--> statement-breakpoint
CREATE TABLE "macro_observations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"series_id" uuid NOT NULL,
	"observed_on" date NOT NULL,
	"value" numeric(38, 16) NOT NULL,
	"source_id" uuid NOT NULL,
	"verification_state" "verification_state" NOT NULL,
	"retrieved_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "macro_observations_unique_obs" UNIQUE("series_id","observed_on","source_id")
);
--> statement-breakpoint
CREATE TABLE "macro_series" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"name" text NOT NULL,
	"country" text NOT NULL,
	"unit" text NOT NULL,
	"frequency" text NOT NULL,
	"description" text NOT NULL,
	"source_id" uuid NOT NULL,
	"is_demo" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "macro_series_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "sectors" (
	"key" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "instruments" ADD COLUMN "market" text;--> statement-breakpoint
ALTER TABLE "instruments" ADD COLUMN "exchange" text;--> statement-breakpoint
ALTER TABLE "instruments" ADD COLUMN "sector_key" text;--> statement-breakpoint
ALTER TABLE "instruments" ADD COLUMN "industry_key" text;--> statement-breakpoint
ALTER TABLE "instruments" ADD COLUMN "benchmark_key" text;--> statement-breakpoint
ALTER TABLE "corporate_actions" ADD CONSTRAINT "corporate_actions_instrument_id_instruments_id_fk" FOREIGN KEY ("instrument_id") REFERENCES "public"."instruments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "corporate_actions" ADD CONSTRAINT "corporate_actions_source_id_market_data_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."market_data_sources"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "industries" ADD CONSTRAINT "industries_sector_key_sectors_key_fk" FOREIGN KEY ("sector_key") REFERENCES "public"."sectors"("key") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "instrument_performance" ADD CONSTRAINT "instrument_performance_instrument_id_instruments_id_fk" FOREIGN KEY ("instrument_id") REFERENCES "public"."instruments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "macro_observations" ADD CONSTRAINT "macro_observations_series_id_macro_series_id_fk" FOREIGN KEY ("series_id") REFERENCES "public"."macro_series"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "macro_observations" ADD CONSTRAINT "macro_observations_source_id_market_data_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."market_data_sources"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "macro_series" ADD CONSTRAINT "macro_series_source_id_market_data_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."market_data_sources"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "corporate_actions_lookup" ON "corporate_actions" USING btree ("instrument_id","ex_date");--> statement-breakpoint
CREATE INDEX "macro_observations_lookup" ON "macro_observations" USING btree ("series_id","observed_on");--> statement-breakpoint
CREATE INDEX "instruments_market_idx" ON "instruments" USING btree ("market","sector_key");--> statement-breakpoint
CREATE UNIQUE INDEX "instruments_benchmark_key" ON "instruments" USING btree ("benchmark_key");