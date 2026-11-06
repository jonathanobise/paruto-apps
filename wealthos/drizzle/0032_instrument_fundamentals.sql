CREATE TABLE "instrument_fundamentals" (
	"instrument_id" uuid PRIMARY KEY NOT NULL,
	"source_id" uuid NOT NULL,
	"data" jsonb NOT NULL,
	"retrieved_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "instrument_fundamentals" ADD CONSTRAINT "instrument_fundamentals_instrument_id_instruments_id_fk" FOREIGN KEY ("instrument_id") REFERENCES "public"."instruments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "instrument_fundamentals" ADD CONSTRAINT "instrument_fundamentals_source_id_market_data_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."market_data_sources"("id") ON DELETE no action ON UPDATE no action;