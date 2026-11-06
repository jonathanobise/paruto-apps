-- WealthOS security layer: tenant row-level security, append-only tables, runtime grants.
-- The runtime role (member of wealthos_runtime) is never a table owner and has NOBYPASSRLS.
-- Tenant context is set per transaction by the application:
--   SELECT set_config('app.user_id', <uuid>, true), set_config('app.org_id', <uuid>, true);

-- 1. Tenant context helpers ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION app_user_id() RETURNS uuid
LANGUAGE sql STABLE AS $$ SELECT NULLIF(current_setting('app.user_id', true), '')::uuid $$;
--> statement-breakpoint
-- The organisation in context, but only if the user in context is a member of it.
-- SECURITY DEFINER so it can read memberships regardless of the caller's RLS view.
CREATE OR REPLACE FUNCTION app_current_org() RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT m.org_id FROM memberships m
  WHERE m.org_id = NULLIF(current_setting('app.org_id', true), '')::uuid
    AND m.user_id = NULLIF(current_setting('app.user_id', true), '')::uuid
$$;
--> statement-breakpoint
-- True if the user in context may write in the organisation in context (viewers may not).
CREATE OR REPLACE FUNCTION app_can_write() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM memberships m
    WHERE m.org_id = NULLIF(current_setting('app.org_id', true), '')::uuid
      AND m.user_id = NULLIF(current_setting('app.user_id', true), '')::uuid
      AND m.role IN ('owner', 'admin', 'member')
  )
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION app_current_org() FROM PUBLIC;
--> statement-breakpoint
REVOKE ALL ON FUNCTION app_can_write() FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION app_current_org(), app_can_write(), app_user_id() TO wealthos_runtime;
--> statement-breakpoint

-- 2. Append-only enforcement -------------------------------------------------------------
-- Only the table owner (migrations / SECURITY DEFINER erasure routine) may update or delete.
CREATE OR REPLACE FUNCTION forbid_mutation() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE owner_name text;
BEGIN
  SELECT pg_get_userbyid(c.relowner) INTO owner_name FROM pg_class c WHERE c.oid = TG_RELID;
  IF current_user = owner_name THEN
    RETURN COALESCE(OLD, NEW);
  END IF;
  RAISE EXCEPTION 'WOS_IMMUTABLE: % on % is not allowed; record a correcting entry instead', TG_OP, TG_TABLE_NAME
    USING ERRCODE = 'insufficient_privilege';
END $$;
--> statement-breakpoint
CREATE TRIGGER ledger_events_immutable BEFORE UPDATE OR DELETE ON ledger_events FOR EACH ROW EXECUTE FUNCTION forbid_mutation();
--> statement-breakpoint
CREATE TRIGGER ledger_entries_immutable BEFORE UPDATE OR DELETE ON ledger_entries FOR EACH ROW EXECUTE FUNCTION forbid_mutation();
--> statement-breakpoint
CREATE TRIGGER account_valuations_immutable BEFORE UPDATE OR DELETE ON account_valuations FOR EACH ROW EXECUTE FUNCTION forbid_mutation();
--> statement-breakpoint
CREATE TRIGGER audit_events_immutable BEFORE UPDATE OR DELETE ON audit_events FOR EACH ROW EXECUTE FUNCTION forbid_mutation();
--> statement-breakpoint
CREATE TRIGGER security_events_immutable BEFORE UPDATE OR DELETE ON security_events FOR EACH ROW EXECUTE FUNCTION forbid_mutation();
--> statement-breakpoint
CREATE TRIGGER consent_records_immutable BEFORE UPDATE OR DELETE ON consent_records FOR EACH ROW EXECUTE FUNCTION forbid_mutation();
--> statement-breakpoint
CREATE TRIGGER regulatory_feature_approvals_immutable BEFORE UPDATE OR DELETE ON regulatory_feature_approvals FOR EACH ROW EXECUTE FUNCTION forbid_mutation();
--> statement-breakpoint

-- 3. Row-level security on tenant tables ----------------------------------------------------
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY organizations_member_read ON organizations FOR SELECT
  USING (EXISTS (SELECT 1 FROM memberships m WHERE m.org_id = organizations.id AND m.user_id = app_user_id()));
--> statement-breakpoint
ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY memberships_own_read ON memberships FOR SELECT USING (user_id = app_user_id());
--> statement-breakpoint

ALTER TABLE financial_accounts ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY tenant_read ON financial_accounts FOR SELECT USING (org_id = (SELECT app_current_org()));
--> statement-breakpoint
CREATE POLICY tenant_insert ON financial_accounts FOR INSERT WITH CHECK (org_id = (SELECT app_current_org()) AND (SELECT app_can_write()));
--> statement-breakpoint
CREATE POLICY tenant_update ON financial_accounts FOR UPDATE USING (org_id = (SELECT app_current_org()) AND (SELECT app_can_write())) WITH CHECK (org_id = (SELECT app_current_org()));
--> statement-breakpoint

ALTER TABLE ledger_events ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY tenant_read ON ledger_events FOR SELECT USING (org_id = (SELECT app_current_org()));
--> statement-breakpoint
CREATE POLICY tenant_insert ON ledger_events FOR INSERT WITH CHECK (org_id = (SELECT app_current_org()) AND (SELECT app_can_write()));
--> statement-breakpoint

ALTER TABLE ledger_entries ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY tenant_read ON ledger_entries FOR SELECT USING (org_id = (SELECT app_current_org()));
--> statement-breakpoint
CREATE POLICY tenant_insert ON ledger_entries FOR INSERT WITH CHECK (org_id = (SELECT app_current_org()) AND (SELECT app_can_write()));
--> statement-breakpoint

ALTER TABLE account_valuations ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY tenant_read ON account_valuations FOR SELECT USING (org_id = (SELECT app_current_org()));
--> statement-breakpoint
CREATE POLICY tenant_insert ON account_valuations FOR INSERT WITH CHECK (org_id = (SELECT app_current_org()) AND (SELECT app_can_write()));
--> statement-breakpoint

ALTER TABLE model_portfolios ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY tenant_read ON model_portfolios FOR SELECT USING (org_id = (SELECT app_current_org()));
--> statement-breakpoint
CREATE POLICY tenant_write ON model_portfolios FOR ALL USING (org_id = (SELECT app_current_org()) AND (SELECT app_can_write())) WITH CHECK (org_id = (SELECT app_current_org()) AND (SELECT app_can_write()));
--> statement-breakpoint

-- Instruments and prices: global catalogue rows (org_id NULL) are readable by everyone;
-- private rows only inside their organisation. Writes to global rows go through the admin
-- service; tenants may only write their own private rows.
ALTER TABLE instruments ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY catalogue_read ON instruments FOR SELECT USING (org_id IS NULL OR org_id = (SELECT app_current_org()));
--> statement-breakpoint
CREATE POLICY private_write ON instruments FOR INSERT WITH CHECK (org_id = (SELECT app_current_org()) AND (SELECT app_can_write()));
--> statement-breakpoint
CREATE POLICY private_update ON instruments FOR UPDATE USING (org_id = (SELECT app_current_org()) AND (SELECT app_can_write())) WITH CHECK (org_id = (SELECT app_current_org()));
--> statement-breakpoint
ALTER TABLE market_prices ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY catalogue_read ON market_prices FOR SELECT USING (org_id IS NULL OR org_id = (SELECT app_current_org()));
--> statement-breakpoint
CREATE POLICY private_write ON market_prices FOR INSERT WITH CHECK (org_id = (SELECT app_current_org()) AND (SELECT app_can_write()));
--> statement-breakpoint

ALTER TABLE audit_events ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY tenant_read ON audit_events FOR SELECT USING (org_id = (SELECT app_current_org()));
--> statement-breakpoint
-- Any authenticated context may append audit events for itself.
CREATE POLICY actor_insert ON audit_events FOR INSERT WITH CHECK (actor_user_id IS NULL OR actor_user_id = app_user_id() OR app_user_id() IS NULL);
--> statement-breakpoint

-- 4. Privileged operations through SECURITY DEFINER functions ----------------------------
-- Create an organisation and its first owner membership atomically (RLS would otherwise
-- prevent inserting a membership for an organisation you are not yet a member of).
CREATE OR REPLACE FUNCTION app_create_organization(p_user uuid, p_name text, p_kind org_kind, p_is_demo boolean)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE new_id uuid;
BEGIN
  IF p_user IS NULL OR p_user <> app_user_id() THEN
    RAISE EXCEPTION 'WOS_FORBIDDEN: organisations can only be created for the user in context' USING ERRCODE = 'insufficient_privilege';
  END IF;
  INSERT INTO organizations (name, kind, is_demo) VALUES (p_name, p_kind, p_is_demo) RETURNING id INTO new_id;
  INSERT INTO memberships (org_id, user_id, role) VALUES (new_id, p_user, 'owner');
  RETURN new_id;
END $$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION app_create_organization(uuid, text, org_kind, boolean) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION app_create_organization(uuid, text, org_kind, boolean) TO wealthos_runtime;
--> statement-breakpoint

-- Erase a user's personal data (account deletion). Organisations where the user is the only
-- owner are deleted with all their records; the user row is anonymised; security/audit/consent
-- logs keep only the opaque user id. Runs as owner so append-only triggers allow the deletes.
CREATE OR REPLACE FUNCTION app_erase_user(p_user uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF p_user IS NULL OR p_user <> app_user_id() THEN
    RAISE EXCEPTION 'WOS_FORBIDDEN: users can only erase themselves' USING ERRCODE = 'insufficient_privilege';
  END IF;
  DELETE FROM organizations o
   WHERE EXISTS (SELECT 1 FROM memberships m WHERE m.org_id = o.id AND m.user_id = p_user AND m.role = 'owner')
     AND NOT EXISTS (SELECT 1 FROM memberships m WHERE m.org_id = o.id AND m.user_id <> p_user AND m.role = 'owner');
  DELETE FROM memberships WHERE user_id = p_user;
  DELETE FROM sessions WHERE user_id = p_user;
  DELETE FROM verification_tokens WHERE user_id = p_user;
  DELETE FROM user_preferences WHERE user_id = p_user;
  UPDATE users SET email = 'erased-' || id || '@invalid.wealthos', display_name = 'Erased user', password_hash = NULL,
         mfa_totp_secret_enc = NULL, mfa_enabled_at = NULL, mfa_recovery_code_hashes = NULL, deleted_at = now(), updated_at = now()
   WHERE id = p_user;
END $$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION app_erase_user(uuid) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION app_erase_user(uuid) TO wealthos_runtime;
--> statement-breakpoint

-- 5. Grants for the runtime role -----------------------------------------------------------
GRANT USAGE ON SCHEMA public TO wealthos_runtime;
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE ON users, sessions, verification_tokens, user_preferences, rate_limit_buckets, email_outbox TO wealthos_runtime;
--> statement-breakpoint
GRANT DELETE ON sessions, verification_tokens, rate_limit_buckets TO wealthos_runtime;
--> statement-breakpoint
GRANT SELECT, INSERT ON security_events, consent_records, audit_events, regulatory_feature_approvals TO wealthos_runtime;
--> statement-breakpoint
GRANT SELECT ON organizations, memberships, feature_flags TO wealthos_runtime;
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE ON financial_accounts, model_portfolios TO wealthos_runtime;
--> statement-breakpoint
GRANT DELETE ON model_portfolios TO wealthos_runtime;
--> statement-breakpoint
GRANT SELECT, INSERT ON ledger_events, ledger_entries, account_valuations TO wealthos_runtime;
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE ON instruments, instrument_identifiers, market_prices, fx_rates, market_data_sources, institutions TO wealthos_runtime;
