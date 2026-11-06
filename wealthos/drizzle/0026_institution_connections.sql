CREATE TYPE "public"."connection_status" AS ENUM('active', 'error', 'expired', 'revoked');--> statement-breakpoint
CREATE TABLE "institution_connections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"account_id" uuid NOT NULL,
	"provider" text NOT NULL,
	"provider_account_ref" text NOT NULL,
	"institution_name" text NOT NULL,
	"status" "connection_status" DEFAULT 'active' NOT NULL,
	"scopes" text[] NOT NULL,
	"consent_granted_by" uuid NOT NULL,
	"consent_granted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"consent_expires_at" timestamp with time zone NOT NULL,
	"credentials_enc" text,
	"last_sync_at" timestamp with time zone,
	"last_sync_result" text,
	"last_error" text,
	"revoked_at" timestamp with time zone,
	"revoked_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "institution_connections" ADD CONSTRAINT "institution_connections_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "institution_connections" ADD CONSTRAINT "institution_connections_consent_granted_by_users_id_fk" FOREIGN KEY ("consent_granted_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "institution_connections" ADD CONSTRAINT "institution_connections_revoked_by_users_id_fk" FOREIGN KEY ("revoked_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "institution_connections" ADD CONSTRAINT "institution_connections_account_fk" FOREIGN KEY ("org_id","account_id") REFERENCES "public"."financial_accounts"("org_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "institution_connections_org_idx" ON "institution_connections" USING btree ("org_id","status");