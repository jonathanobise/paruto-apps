-- Support cases: the requester and platform administrators only.
ALTER TABLE support_cases ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY support_cases_owner_read ON support_cases FOR SELECT USING (user_id = app_user_id());
--> statement-breakpoint
CREATE POLICY support_cases_owner_insert ON support_cases FOR INSERT WITH CHECK (user_id = app_user_id() AND status = 'open' AND (org_id IS NULL OR org_id = (SELECT app_current_org())));
--> statement-breakpoint
CREATE POLICY support_cases_owner_update ON support_cases FOR UPDATE USING (user_id = app_user_id()) WITH CHECK (user_id = app_user_id());
--> statement-breakpoint
-- Requesters may only reopen (by replying) or close their case; administrators manage the rest.
CREATE OR REPLACE FUNCTION guard_support_case() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE owner_name text;
BEGIN
  SELECT pg_get_userbyid(c.relowner) INTO owner_name FROM pg_class c WHERE c.oid = TG_RELID;
  IF current_user = owner_name OR app_is_platform_admin() THEN RETURN NEW; END IF;
  IF NEW.user_id <> OLD.user_id OR NEW.org_id IS DISTINCT FROM OLD.org_id OR NEW.topic <> OLD.topic OR NEW.subject <> OLD.subject OR NEW.created_at <> OLD.created_at
     OR NEW.status = 'answered' AND OLD.status <> 'answered' OR (OLD.status = 'closed' AND NEW.status <> 'closed') THEN
    RAISE EXCEPTION 'WOS_FORBIDDEN: this change to a support request is not allowed' USING ERRCODE = 'insufficient_privilege';
  END IF;
  RETURN NEW;
END $$;
--> statement-breakpoint
CREATE TRIGGER support_cases_guard BEFORE UPDATE ON support_cases FOR EACH ROW EXECUTE FUNCTION guard_support_case();
--> statement-breakpoint
CREATE POLICY support_cases_admin ON support_cases FOR ALL USING ((SELECT app_is_platform_admin())) WITH CHECK ((SELECT app_is_platform_admin()));
--> statement-breakpoint
ALTER TABLE support_messages ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY support_messages_owner_read ON support_messages FOR SELECT USING (EXISTS (SELECT 1 FROM support_cases c WHERE c.id = case_id AND c.user_id = app_user_id()));
--> statement-breakpoint
CREATE POLICY support_messages_owner_write ON support_messages FOR INSERT WITH CHECK (author_id = app_user_id() AND NOT from_staff AND EXISTS (SELECT 1 FROM support_cases c WHERE c.id = case_id AND c.user_id = app_user_id() AND c.status <> 'closed'));
--> statement-breakpoint
CREATE POLICY support_messages_admin ON support_messages FOR ALL USING ((SELECT app_is_platform_admin())) WITH CHECK ((SELECT app_is_platform_admin()) AND author_id = app_user_id());
--> statement-breakpoint
-- Messages are a record: never edited or deleted (except with their case on account erasure).
CREATE TRIGGER support_messages_append_only BEFORE UPDATE OR DELETE ON support_messages FOR EACH ROW EXECUTE FUNCTION forbid_mutation();
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE ON support_cases TO wealthos_runtime;
--> statement-breakpoint
GRANT SELECT, INSERT ON support_messages TO wealthos_runtime;
--> statement-breakpoint

-- Administrators read memberships and subscriptions of any organisation (support and billing).
CREATE POLICY memberships_admin_read ON memberships FOR SELECT USING ((SELECT app_is_platform_admin()));
--> statement-breakpoint

-- AI usage per organisation this month for administrators: counts only, never content.
CREATE OR REPLACE FUNCTION app_admin_ai_usage()
RETURNS TABLE(org_id uuid, org_name text, questions bigint, tokens bigint, flagged_conversations bigint, users bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT o.id, o.name,
         count(*) FILTER (WHERE m.role = 'assistant'),
         COALESCE(SUM(m.input_tokens + m.output_tokens), 0)::bigint,
         (SELECT count(*) FROM ai_conversations c WHERE c.org_id = o.id AND c.review_status = 'needs_review'),
         count(DISTINCT m.user_id)
  FROM ai_messages m JOIN organizations o ON o.id = m.org_id
  WHERE m.created_at >= date_trunc('month', now()) AND app_is_platform_admin()
  GROUP BY o.id, o.name
  ORDER BY 4 DESC
$$;
--> statement-breakpoint
-- Flagged assistant turns for review: policy flags and tool names only (content stays private).
CREATE OR REPLACE FUNCTION app_admin_ai_flags()
RETURNS TABLE(conversation_id uuid, org_name text, flagged_at timestamptz, policy_flags text[], tools text[], model text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT m.conversation_id, o.name, m.created_at, m.policy_flags,
         ARRAY(SELECT jsonb_array_elements(m.tool_calls)->>'name'), m.model
  FROM ai_messages m JOIN organizations o ON o.id = m.org_id
  WHERE app_is_platform_admin() AND m.role = 'assistant'
    AND (m.policy_flags && ARRAY['model_refusal', 'tool_round_limit']::text[] OR EXISTS (SELECT 1 FROM unnest(m.policy_flags) f WHERE f LIKE 'output:%'))
  ORDER BY m.created_at DESC
  LIMIT 200
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION app_admin_ai_usage(), app_admin_ai_flags() FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION app_admin_ai_usage(), app_admin_ai_flags() TO wealthos_runtime;

--> statement-breakpoint
-- Erasure also removes the user's support cases (free text may contain personal data).
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
