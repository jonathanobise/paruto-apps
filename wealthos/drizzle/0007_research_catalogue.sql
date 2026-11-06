CREATE TYPE "public"."market_import_status" AS ENUM('previewed', 'committed', 'discarded');--> statement-breakpoint
CREATE TYPE "public"."rate_methodology" AS ENUM('discount_rate', 'true_yield', 'effective_annual_yield', 'yield_to_maturity', 'trailing_return', 'distribution_yield', 'advertised_deposit_rate', 'money_market_yield', 'expected_return', 'coupon_rate');--> statement-breakpoint
CREATE TABLE "market_data_imports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" text NOT NULL,
	"source_id" uuid NOT NULL,
	"file_name" text NOT NULL,
	"file_sha256" text NOT NULL,
	"rows" jsonb NOT NULL,
	"summary" jsonb NOT NULL,
	"status" "market_import_status" DEFAULT 'previewed' NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"committed_by" uuid,
	"committed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "published_rates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"instrument_id" uuid NOT NULL,
	"methodology" "rate_methodology" NOT NULL,
	"value" numeric(38, 16) NOT NULL,
	"tenor_days" integer,
	"basis" text,
	"as_of" date NOT NULL,
	"source_id" uuid NOT NULL,
	"source_url" text,
	"verification_state" "verification_state" NOT NULL,
	"retrieved_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "saved_comparisons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"name" text NOT NULL,
	"instrument_ids" uuid[] NOT NULL,
	"note" text,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "watchlist_items" (
	"org_id" uuid NOT NULL,
	"watchlist_id" uuid NOT NULL,
	"instrument_id" uuid NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "watchlist_items_watchlist_id_instrument_id_pk" PRIMARY KEY("watchlist_id","instrument_id")
);
--> statement-breakpoint
CREATE TABLE "watchlists" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"name" text NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "instruments" ADD COLUMN "facts" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "instruments" ADD COLUMN "facts_source_url" text;--> statement-breakpoint
ALTER TABLE "instruments" ADD COLUMN "facts_as_of" date;--> statement-breakpoint
ALTER TABLE "market_data_imports" ADD CONSTRAINT "market_data_imports_source_id_market_data_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."market_data_sources"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "market_data_imports" ADD CONSTRAINT "market_data_imports_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "market_data_imports" ADD CONSTRAINT "market_data_imports_committed_by_users_id_fk" FOREIGN KEY ("committed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "published_rates" ADD CONSTRAINT "published_rates_instrument_id_instruments_id_fk" FOREIGN KEY ("instrument_id") REFERENCES "public"."instruments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "published_rates" ADD CONSTRAINT "published_rates_source_id_market_data_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."market_data_sources"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_comparisons" ADD CONSTRAINT "saved_comparisons_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_comparisons" ADD CONSTRAINT "saved_comparisons_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "watchlist_items" ADD CONSTRAINT "watchlist_items_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "watchlist_items" ADD CONSTRAINT "watchlist_items_watchlist_id_watchlists_id_fk" FOREIGN KEY ("watchlist_id") REFERENCES "public"."watchlists"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "watchlist_items" ADD CONSTRAINT "watchlist_items_instrument_id_instruments_id_fk" FOREIGN KEY ("instrument_id") REFERENCES "public"."instruments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "watchlists" ADD CONSTRAINT "watchlists_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "watchlists" ADD CONSTRAINT "watchlists_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "market_data_imports_created_idx" ON "market_data_imports" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "published_rates_unique_obs" ON "published_rates" USING btree ("instrument_id","methodology","tenor_days","as_of","source_id");--> statement-breakpoint
CREATE INDEX "published_rates_lookup" ON "published_rates" USING btree ("instrument_id","as_of");--> statement-breakpoint
CREATE INDEX "saved_comparisons_org_idx" ON "saved_comparisons" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "watchlist_items_org_idx" ON "watchlist_items" USING btree ("org_id");--> statement-breakpoint
CREATE UNIQUE INDEX "watchlists_org_name" ON "watchlists" USING btree ("org_id","name");