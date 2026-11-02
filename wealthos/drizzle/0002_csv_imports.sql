CREATE TYPE "public"."import_status" AS ENUM('previewed', 'committed', 'rolled_back', 'discarded');--> statement-breakpoint
CREATE TABLE "import_batches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"account_id" uuid NOT NULL,
	"file_name" text NOT NULL,
	"file_sha256" text NOT NULL,
	"file_size" integer NOT NULL,
	"mapping" jsonb NOT NULL,
	"headers" jsonb NOT NULL,
	"raw_text" text,
	"rows" jsonb NOT NULL,
	"summary" jsonb NOT NULL,
	"status" "import_status" DEFAULT 'previewed' NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"committed_at" timestamp with time zone,
	"committed_by" uuid,
	"rolled_back_at" timestamp with time zone,
	"rolled_back_by" uuid,
	"rollback_reason" text,
	CONSTRAINT "import_batches_org_id_key" UNIQUE("org_id","id")
);
--> statement-breakpoint
CREATE TABLE "import_mappings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"name" text NOT NULL,
	"mapping" jsonb NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ledger_events" ADD COLUMN "import_batch_id" uuid;--> statement-breakpoint
ALTER TABLE "ledger_events" ADD COLUMN "external_ref" text;--> statement-breakpoint
ALTER TABLE "import_batches" ADD CONSTRAINT "import_batches_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_batches" ADD CONSTRAINT "import_batches_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_batches" ADD CONSTRAINT "import_batches_committed_by_users_id_fk" FOREIGN KEY ("committed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_batches" ADD CONSTRAINT "import_batches_rolled_back_by_users_id_fk" FOREIGN KEY ("rolled_back_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_batches" ADD CONSTRAINT "import_batches_account_fk" FOREIGN KEY ("org_id","account_id") REFERENCES "public"."financial_accounts"("org_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_mappings" ADD CONSTRAINT "import_mappings_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_mappings" ADD CONSTRAINT "import_mappings_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "import_batches_org_idx" ON "import_batches" USING btree ("org_id","created_at");--> statement-breakpoint
CREATE INDEX "import_batches_file_idx" ON "import_batches" USING btree ("org_id","file_sha256");--> statement-breakpoint
CREATE UNIQUE INDEX "import_mappings_org_name" ON "import_mappings" USING btree ("org_id","name");--> statement-breakpoint
ALTER TABLE "ledger_events" ADD CONSTRAINT "ledger_events_import_fk" FOREIGN KEY ("org_id","import_batch_id") REFERENCES "public"."import_batches"("org_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ledger_events_external_ref_idx" ON "ledger_events" USING btree ("org_id","external_ref");--> statement-breakpoint
CREATE INDEX "ledger_events_import_idx" ON "ledger_events" USING btree ("org_id","import_batch_id");