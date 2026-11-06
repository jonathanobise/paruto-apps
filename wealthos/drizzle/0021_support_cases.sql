CREATE TYPE "public"."support_status" AS ENUM('open', 'answered', 'closed');--> statement-breakpoint
CREATE TYPE "public"."support_topic" AS ENUM('account', 'billing', 'data', 'imports', 'privacy', 'bug', 'other');--> statement-breakpoint
CREATE TABLE "support_cases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"org_id" uuid,
	"topic" "support_topic" NOT NULL,
	"subject" text NOT NULL,
	"status" "support_status" DEFAULT 'open' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"closed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "support_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"case_id" uuid NOT NULL,
	"author_id" uuid NOT NULL,
	"from_staff" boolean NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "support_cases" ADD CONSTRAINT "support_cases_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_cases" ADD CONSTRAINT "support_cases_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_messages" ADD CONSTRAINT "support_messages_case_id_support_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."support_cases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_messages" ADD CONSTRAINT "support_messages_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "support_cases_user_idx" ON "support_cases" USING btree ("user_id","updated_at");--> statement-breakpoint
CREATE INDEX "support_cases_status_idx" ON "support_cases" USING btree ("status","updated_at");--> statement-breakpoint
CREATE INDEX "support_messages_case_idx" ON "support_messages" USING btree ("case_id","created_at");