ALTER TABLE institution_connections ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY tenant_read ON institution_connections FOR SELECT USING (org_id = (SELECT app_current_org()));
--> statement-breakpoint
CREATE POLICY tenant_write ON institution_connections FOR INSERT WITH CHECK (org_id = (SELECT app_current_org()) AND (SELECT app_can_write()) AND consent_granted_by = app_user_id());
--> statement-breakpoint
CREATE POLICY tenant_update ON institution_connections FOR UPDATE USING (org_id = (SELECT app_current_org()) AND (SELECT app_can_write())) WITH CHECK (org_id = (SELECT app_current_org()));
--> statement-breakpoint
-- A revoked connection stays revoked, and never keeps credentials.
CREATE OR REPLACE FUNCTION guard_connection() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.status = 'revoked' AND NEW.status <> 'revoked' THEN
    RAISE EXCEPTION 'WOS_CONNECTION: a revoked connection can''t be reactivated; connect again' USING ERRCODE = 'check_violation';
  END IF;
  IF NEW.status = 'revoked' THEN NEW.credentials_enc := NULL; END IF;
  IF NEW.org_id <> OLD.org_id OR NEW.account_id <> OLD.account_id OR NEW.provider <> OLD.provider OR NEW.consent_granted_by <> OLD.consent_granted_by OR NEW.consent_expires_at > OLD.consent_expires_at THEN
    RAISE EXCEPTION 'WOS_CONNECTION: a connection''s account, provider and consent can''t be changed; connect again' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END $$;
--> statement-breakpoint
CREATE TRIGGER institution_connections_guard BEFORE UPDATE ON institution_connections FOR EACH ROW EXECUTE FUNCTION guard_connection();
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE ON institution_connections TO wealthos_runtime;
--> statement-breakpoint
-- The worker lists connections due for a sync (ids and the consenting user only).
CREATE OR REPLACE FUNCTION app_connections_due() RETURNS TABLE(connection_id uuid, org_id uuid, user_id uuid)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT c.id, c.org_id, c.consent_granted_by FROM institution_connections c
  JOIN memberships m ON m.org_id = c.org_id AND m.user_id = c.consent_granted_by AND m.role IN ('owner', 'admin', 'member')
  WHERE c.status IN ('active', 'error') AND (c.last_sync_at IS NULL OR c.last_sync_at < now() - interval '20 hours')
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION app_connections_due() FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION app_connections_due() TO wealthos_runtime;
