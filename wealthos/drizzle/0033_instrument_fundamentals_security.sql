ALTER TABLE instrument_fundamentals ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY visible_read ON instrument_fundamentals FOR SELECT USING (EXISTS (SELECT 1 FROM instruments i WHERE i.id = instrument_id));
--> statement-breakpoint
CREATE POLICY admin_write ON instrument_fundamentals FOR INSERT WITH CHECK ((SELECT app_is_platform_admin()) AND EXISTS (SELECT 1 FROM instruments i WHERE i.id = instrument_id AND i.org_id IS NULL));
--> statement-breakpoint
CREATE POLICY admin_update ON instrument_fundamentals FOR UPDATE USING ((SELECT app_is_platform_admin()));
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE ON instrument_fundamentals TO wealthos_runtime;
