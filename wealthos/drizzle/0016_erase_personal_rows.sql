-- Account erasure also removes the user's personal rows in organisations they don't solely own
-- (shared organisations survive erasure): AI conversations (messages and source references cascade),
-- alerts and notifications. Shared records such as goals and watchlists stay with the organisation.
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
