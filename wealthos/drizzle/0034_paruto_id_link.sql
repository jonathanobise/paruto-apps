ALTER TABLE "users" ADD COLUMN "paruto_id_sub" text;--> statement-breakpoint
CREATE UNIQUE INDEX "users_paruto_id_sub_key" ON "users" USING btree ("paruto_id_sub");