-- Household ownership: members of the space only; shares per account total at most 100%.
ALTER TABLE account_owners ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY tenant_read ON account_owners FOR SELECT USING (org_id = (SELECT app_current_org()));
--> statement-breakpoint
CREATE POLICY tenant_write ON account_owners FOR ALL USING (org_id = (SELECT app_current_org()) AND (SELECT app_can_write())) WITH CHECK (org_id = (SELECT app_current_org()) AND (SELECT app_can_write()));
--> statement-breakpoint
ALTER TABLE account_owners ADD CONSTRAINT account_owners_percent_range CHECK (percent > 0 AND percent <= 100);
--> statement-breakpoint
CREATE OR REPLACE FUNCTION app_is_member(p_org uuid, p_user uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM memberships WHERE org_id = p_org AND user_id = p_user)
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION app_is_member(uuid, uuid) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION app_is_member(uuid, uuid) TO wealthos_runtime;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION guard_account_owner() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF NOT app_is_member(NEW.org_id, NEW.user_id) THEN
    RAISE EXCEPTION 'WOS_HOUSEHOLD: owners must be members of this space' USING ERRCODE = 'check_violation';
  END IF;
  IF (SELECT COALESCE(SUM(percent), 0) FROM account_owners WHERE account_id = NEW.account_id AND id <> NEW.id) + NEW.percent > 100 THEN
    RAISE EXCEPTION 'WOS_HOUSEHOLD: ownership shares for an account can''t exceed 100%%' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END $$;
--> statement-breakpoint
CREATE TRIGGER account_owners_guard BEFORE INSERT OR UPDATE ON account_owners FOR EACH ROW EXECUTE FUNCTION guard_account_owner();
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON account_owners TO wealthos_runtime;
--> statement-breakpoint
-- Leaving or being removed from a space, and account erasure, also clear ownership assignments.
CREATE OR REPLACE FUNCTION app_remove_member(p_user uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE org uuid := app_current_org(); my_role member_role := app_org_role(); target_role member_role; org_kind_v org_kind;
BEGIN
  IF org IS NULL OR my_role IS NULL THEN
    RAISE EXCEPTION 'WOS_FORBIDDEN: not a member' USING ERRCODE = 'insufficient_privilege';
  END IF;
  SELECT kind INTO org_kind_v FROM organizations WHERE id = org;
  IF org_kind_v = 'personal' THEN
    RAISE EXCEPTION 'WOS_FORBIDDEN: personal spaces have a single member' USING ERRCODE = 'insufficient_privilege';
  END IF;
  SELECT role INTO target_role FROM memberships WHERE org_id = org AND user_id = p_user FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'WOS_NOT_FOUND: not a member' USING ERRCODE = 'no_data_found'; END IF;
  IF p_user <> app_user_id() AND NOT (my_role = 'owner' OR (my_role = 'admin' AND target_role IN ('member', 'viewer'))) THEN
    RAISE EXCEPTION 'WOS_FORBIDDEN: you cannot remove this member' USING ERRCODE = 'insufficient_privilege';
  END IF;
  IF target_role = 'owner' AND (SELECT count(*) FROM memberships WHERE org_id = org AND role = 'owner') = 1 THEN
    RAISE EXCEPTION 'WOS_LAST_OWNER: an organisation needs at least one owner' USING ERRCODE = 'check_violation';
  END IF;
  DELETE FROM ai_conversations WHERE org_id = org AND user_id = p_user;
  DELETE FROM notifications WHERE org_id = org AND user_id = p_user;
  DELETE FROM alerts WHERE org_id = org AND user_id = p_user;
  DELETE FROM account_owners WHERE org_id = org AND user_id = p_user;
  DELETE FROM memberships WHERE org_id = org AND user_id = p_user;
END $$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION app_erase_user(p_user uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF p_user IS NULL OR p_user <> app_user_id() THEN
    RAISE EXCEPTION 'WOS_FORBIDDEN: users can only erase themselves' USING ERRCODE = 'insufficient_privilege';
  END IF;
  DELETE FROM organizations o
   WHERE EXISTS (SELECT 1 FROM memberships m WHERE m.org_id = o.id AND m.user_id = p_user AND m.role = 'owner')
     AND NOT EXISTS (SELECT 1 FROM memberships m WHERE m.org_id = o.id AND m.user_id <> p_user AND m.role = 'owner');
  DELETE FROM ai_conversations WHERE user_id = p_user;
  DELETE FROM support_cases WHERE user_id = p_user;
  DELETE FROM account_owners WHERE user_id = p_user;
  DELETE FROM notifications WHERE user_id = p_user;
  DELETE FROM alerts WHERE user_id = p_user;
  DELETE FROM memberships WHERE user_id = p_user;
  DELETE FROM sessions WHERE user_id = p_user;
  DELETE FROM verification_tokens WHERE user_id = p_user;
  DELETE FROM user_preferences WHERE user_id = p_user;
  UPDATE users SET email = 'erased-' || id || '@invalid.wealthos', display_name = 'Erased user', password_hash = NULL,
         mfa_totp_secret_enc = NULL, mfa_enabled_at = NULL, mfa_recovery_code_hashes = NULL, deleted_at = now(), updated_at = now()
   WHERE id = p_user;
END $$;
