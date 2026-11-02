ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY tenant_read ON goals FOR SELECT USING (org_id = (SELECT app_current_org()));
--> statement-breakpoint
CREATE POLICY tenant_write ON goals FOR ALL USING (org_id = (SELECT app_current_org()) AND (SELECT app_can_write())) WITH CHECK (org_id = (SELECT app_current_org()) AND (SELECT app_can_write()));
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON goals TO wealthos_runtime;
