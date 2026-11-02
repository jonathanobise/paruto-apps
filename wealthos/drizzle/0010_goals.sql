CREATE TYPE "public"."goal_kind" AS ENUM('net_worth', 'retirement', 'financial_independence', 'education', 'home', 'emergency', 'other');--> statement-breakpoint
CREATE TYPE "public"."goal_scope" AS ENUM('net_worth', 'accounts');--> statement-breakpoint
CREATE TABLE "goals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"name" text NOT NULL,
	"kind" "goal_kind" NOT NULL,
	"target_amount" numeric(38, 10) NOT NULL,
	"currency" text NOT NULL,
	"target_date" date NOT NULL,
	"target_is_real" boolean DEFAULT true NOT NULL,
	"scope" "goal_scope" DEFAULT 'net_worth' NOT NULL,
	"account_ids" uuid[] DEFAULT '{}' NOT NULL,
	"monthly_contribution" numeric(38, 10) DEFAULT '0' NOT NULL,
	"contribution_timing" text DEFAULT 'end' NOT NULL,
	"contribution_growth" numeric(38, 16) DEFAULT '0' NOT NULL,
	"inflation" numeric(38, 16) NOT NULL,
	"annual_fee" numeric(38, 16) DEFAULT '0' NOT NULL,
	"scenarios" jsonb NOT NULL,
	"notes" text,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"archived_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "goals" ADD CONSTRAINT "goals_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goals" ADD CONSTRAINT "goals_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "goals_org_idx" ON "goals" USING btree ("org_id");