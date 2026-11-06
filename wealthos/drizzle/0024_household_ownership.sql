CREATE TABLE "account_owners" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"account_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"percent" numeric(7, 4) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account_owners" ADD CONSTRAINT "account_owners_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account_owners" ADD CONSTRAINT "account_owners_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account_owners" ADD CONSTRAINT "account_owners_account_fk" FOREIGN KEY ("org_id","account_id") REFERENCES "public"."financial_accounts"("org_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "account_owners_account_user_idx" ON "account_owners" USING btree ("account_id","user_id");--> statement-breakpoint
CREATE INDEX "account_owners_org_idx" ON "account_owners" USING btree ("org_id");