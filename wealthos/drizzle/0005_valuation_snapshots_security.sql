-- Analytics cache: tenant isolation. Viewers may populate the cache for views they can read.
ALTER TABLE valuation_snapshots ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY tenant_all ON valuation_snapshots FOR ALL USING (org_id = (SELECT app_current_org())) WITH CHECK (org_id = (SELECT app_current_org()));
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON valuation_snapshots TO wealthos_runtime;
