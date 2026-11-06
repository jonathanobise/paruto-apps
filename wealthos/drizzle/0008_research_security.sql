-- Research catalogue security.
-- Platform administrators (with MFA enabled) are the only writers of the global catalogue; the
-- check runs in Postgres against the user in context, so a forged role in application memory is not enough.
CREATE OR REPLACE FUNCTION app_is_platform_admin() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = NULLIF(current_setting('app.user_id', true), '')::uuid
      AND u.platform_role = 'admin' AND u.deleted_at IS NULL AND u.mfa_enabled_at IS NOT NULL
  )
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION app_is_platform_admin() FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION app_is_platform_admin() TO wealthos_runtime;
--> statement-breakpoint
CREATE POLICY catalogue_admin_insert ON instruments FOR INSERT WITH CHECK (org_id IS NULL AND (SELECT app_is_platform_admin()));
--> statement-breakpoint
CREATE POLICY catalogue_admin_update ON instruments FOR UPDATE USING (org_id IS NULL AND (SELECT app_is_platform_admin())) WITH CHECK (org_id IS NULL);
--> statement-breakpoint
CREATE POLICY catalogue_admin_insert ON market_prices FOR INSERT WITH CHECK (org_id IS NULL AND (SELECT app_is_platform_admin()));
--> statement-breakpoint
CREATE POLICY catalogue_admin_update ON market_prices FOR UPDATE USING (org_id IS NULL AND (SELECT app_is_platform_admin())) WITH CHECK (org_id IS NULL);
--> statement-breakpoint
-- Reference tables that previously relied on service-layer checks only.
ALTER TABLE fx_rates ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY public_read ON fx_rates FOR SELECT USING (true);
--> statement-breakpoint
CREATE POLICY admin_write ON fx_rates FOR INSERT WITH CHECK ((SELECT app_is_platform_admin()));
--> statement-breakpoint
CREATE POLICY admin_update ON fx_rates FOR UPDATE USING ((SELECT app_is_platform_admin()));
--> statement-breakpoint
ALTER TABLE market_data_sources ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY public_read ON market_data_sources FOR SELECT USING (true);
--> statement-breakpoint
CREATE POLICY admin_write ON market_data_sources FOR INSERT WITH CHECK ((SELECT app_is_platform_admin()));
--> statement-breakpoint
CREATE POLICY admin_update ON market_data_sources FOR UPDATE USING ((SELECT app_is_platform_admin()));
--> statement-breakpoint
ALTER TABLE institutions ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY public_read ON institutions FOR SELECT USING (true);
--> statement-breakpoint
CREATE POLICY admin_write ON institutions FOR INSERT WITH CHECK ((SELECT app_is_platform_admin()));
--> statement-breakpoint
CREATE POLICY admin_update ON institutions FOR UPDATE USING ((SELECT app_is_platform_admin()));
--> statement-breakpoint
ALTER TABLE instrument_identifiers ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY visible_read ON instrument_identifiers FOR SELECT USING (EXISTS (SELECT 1 FROM instruments i WHERE i.id = instrument_id));
--> statement-breakpoint
CREATE POLICY owner_write ON instrument_identifiers FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM instruments i WHERE i.id = instrument_id AND ((i.org_id IS NULL AND (SELECT app_is_platform_admin())) OR (i.org_id = (SELECT app_current_org()) AND (SELECT app_can_write()))))
);
--> statement-breakpoint
ALTER TABLE published_rates ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY public_read ON published_rates FOR SELECT USING (EXISTS (SELECT 1 FROM instruments i WHERE i.id = instrument_id));
--> statement-breakpoint
CREATE POLICY admin_write ON published_rates FOR INSERT WITH CHECK ((SELECT app_is_platform_admin()));
--> statement-breakpoint
CREATE POLICY admin_update ON published_rates FOR UPDATE USING ((SELECT app_is_platform_admin()));
--> statement-breakpoint
CREATE TRIGGER published_rates_version AFTER INSERT OR UPDATE OR DELETE ON published_rates FOR EACH STATEMENT EXECUTE FUNCTION bump_market_version();
--> statement-breakpoint
ALTER TABLE market_data_imports ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY admin_all ON market_data_imports FOR ALL USING ((SELECT app_is_platform_admin())) WITH CHECK ((SELECT app_is_platform_admin()));
--> statement-breakpoint
-- Tenant research data.
ALTER TABLE watchlists ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY tenant_read ON watchlists FOR SELECT USING (org_id = (SELECT app_current_org()));
--> statement-breakpoint
CREATE POLICY tenant_write ON watchlists FOR ALL USING (org_id = (SELECT app_current_org()) AND (SELECT app_can_write())) WITH CHECK (org_id = (SELECT app_current_org()) AND (SELECT app_can_write()));
--> statement-breakpoint
ALTER TABLE watchlist_items ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY tenant_read ON watchlist_items FOR SELECT USING (org_id = (SELECT app_current_org()));
--> statement-breakpoint
CREATE POLICY tenant_write ON watchlist_items FOR ALL USING (org_id = (SELECT app_current_org()) AND (SELECT app_can_write())) WITH CHECK (org_id = (SELECT app_current_org()) AND (SELECT app_can_write()) AND EXISTS (SELECT 1 FROM watchlists w WHERE w.id = watchlist_id AND w.org_id = (SELECT app_current_org())));
--> statement-breakpoint
ALTER TABLE saved_comparisons ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY tenant_read ON saved_comparisons FOR SELECT USING (org_id = (SELECT app_current_org()));
--> statement-breakpoint
CREATE POLICY tenant_write ON saved_comparisons FOR ALL USING (org_id = (SELECT app_current_org()) AND (SELECT app_can_write())) WITH CHECK (org_id = (SELECT app_current_org()) AND (SELECT app_can_write()));
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE ON published_rates, market_data_imports TO wealthos_runtime;
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON watchlists, watchlist_items, saved_comparisons TO wealthos_runtime;
