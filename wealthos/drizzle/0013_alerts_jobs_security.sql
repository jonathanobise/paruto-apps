-- Jobs: a system table. The runtime role can queue and process jobs; nothing user-facing reads it.
GRANT SELECT, INSERT, UPDATE ON jobs TO wealthos_runtime;
--> statement-breakpoint
-- Alerts belong to a user inside an organisation: visible to that user only.
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY owner_all ON alerts FOR ALL USING (org_id = (SELECT app_current_org()) AND user_id = app_user_id()) WITH CHECK (org_id = (SELECT app_current_org()) AND user_id = app_user_id());
--> statement-breakpoint
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY owner_all ON notifications FOR ALL USING (org_id = (SELECT app_current_org()) AND user_id = app_user_id()) WITH CHECK (org_id = (SELECT app_current_org()) AND user_id = app_user_id());
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON alerts TO wealthos_runtime;
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE ON notifications TO wealthos_runtime;
--> statement-breakpoint
-- Organisations with enabled alerts and their owners, for the scheduler (no row contents exposed).
CREATE OR REPLACE FUNCTION app_alert_subjects() RETURNS TABLE (org_id uuid, user_id uuid)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT DISTINCT a.org_id, a.user_id FROM alerts a
  JOIN memberships m ON m.org_id = a.org_id AND m.user_id = a.user_id
  JOIN users u ON u.id = a.user_id AND u.deleted_at IS NULL
  WHERE a.enabled
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION app_alert_subjects() FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION app_alert_subjects() TO wealthos_runtime;
