-- Staff roles: support agents and compliance reviewers get narrower access than administrators.
-- All staff need two-step verification; Postgres re-checks the role on every request.
CREATE OR REPLACE FUNCTION app_staff_role() RETURNS platform_role
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT u.platform_role FROM users u
  WHERE u.id = NULLIF(current_setting('app.user_id', true), '')::uuid
    AND u.deleted_at IS NULL AND u.mfa_enabled_at IS NOT NULL AND u.platform_role <> 'user'
$$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION app_is_support() RETURNS boolean LANGUAGE sql STABLE AS $$ SELECT COALESCE(app_staff_role() IN ('support', 'admin'), false) $$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION app_is_compliance() RETURNS boolean LANGUAGE sql STABLE AS $$ SELECT COALESCE(app_staff_role() IN ('compliance', 'admin'), false) $$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION app_staff_role() FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION app_staff_role(), app_is_support(), app_is_compliance() TO wealthos_runtime;
--> statement-breakpoint

-- Support: requests, people and organisations (read), plans and invoices (read).
CREATE OR REPLACE FUNCTION guard_support_case() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE owner_name text;
BEGIN
  SELECT pg_get_userbyid(c.relowner) INTO owner_name FROM pg_class c WHERE c.oid = TG_RELID;
  IF current_user = owner_name OR app_is_support() THEN RETURN NEW; END IF;
  IF NEW.user_id <> OLD.user_id OR NEW.org_id IS DISTINCT FROM OLD.org_id OR NEW.topic <> OLD.topic OR NEW.subject <> OLD.subject OR NEW.created_at <> OLD.created_at
     OR NEW.status = 'answered' AND OLD.status <> 'answered' OR (OLD.status = 'closed' AND NEW.status <> 'closed') THEN
    RAISE EXCEPTION 'WOS_FORBIDDEN: this change to a support request is not allowed' USING ERRCODE = 'insufficient_privilege';
  END IF;
  RETURN NEW;
END $$;
--> statement-breakpoint
DROP POLICY support_cases_admin ON support_cases;
--> statement-breakpoint
CREATE POLICY support_cases_staff ON support_cases FOR ALL USING ((SELECT app_is_support())) WITH CHECK ((SELECT app_is_support()));
--> statement-breakpoint
DROP POLICY support_messages_admin ON support_messages;
--> statement-breakpoint
CREATE POLICY support_messages_staff ON support_messages FOR ALL USING ((SELECT app_is_support())) WITH CHECK ((SELECT app_is_support()) AND author_id = app_user_id());
--> statement-breakpoint
CREATE POLICY organizations_support_read ON organizations FOR SELECT USING ((SELECT app_is_support()));
--> statement-breakpoint
CREATE POLICY memberships_support_read ON memberships FOR SELECT USING ((SELECT app_is_support()));
--> statement-breakpoint
CREATE POLICY subscriptions_support_read ON subscriptions FOR SELECT USING ((SELECT app_is_support()));
--> statement-breakpoint
CREATE POLICY invoices_support_read ON invoices FOR SELECT USING ((SELECT app_is_support()));
--> statement-breakpoint

-- Compliance: audit trail and compliance decisions.
CREATE POLICY audit_events_compliance_read ON audit_events FOR SELECT USING ((SELECT app_is_compliance()));
--> statement-breakpoint
-- Compliance decisions were writable by any runtime code path; now only a compliance reviewer or
-- administrator with 2FA can record one, under their own name. Everyone can read (feature gates).
ALTER TABLE regulatory_feature_approvals ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY approvals_read ON regulatory_feature_approvals FOR SELECT USING (true);
--> statement-breakpoint
CREATE POLICY approvals_compliance_insert ON regulatory_feature_approvals FOR INSERT WITH CHECK ((SELECT app_is_compliance()) AND reviewer_user_id = app_user_id() AND reference IS NOT NULL AND length(reference) >= 5);
--> statement-breakpoint
-- AI usage metadata: administrators and compliance reviewers.
CREATE OR REPLACE FUNCTION app_admin_ai_usage()
RETURNS TABLE(org_id uuid, org_name text, questions bigint, tokens bigint, flagged_conversations bigint, users bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT o.id, o.name,
         count(*) FILTER (WHERE m.role = 'assistant'),
         COALESCE(SUM(m.input_tokens + m.output_tokens), 0)::bigint,
         (SELECT count(*) FROM ai_conversations c WHERE c.org_id = o.id AND c.review_status = 'needs_review'),
         count(DISTINCT m.user_id)
  FROM ai_messages m JOIN organizations o ON o.id = m.org_id
  WHERE m.created_at >= date_trunc('month', now()) AND app_is_compliance()
  GROUP BY o.id, o.name
  ORDER BY 4 DESC
$$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION app_admin_ai_flags()
RETURNS TABLE(conversation_id uuid, org_name text, flagged_at timestamptz, policy_flags text[], tools text[], model text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT m.conversation_id, o.name, m.created_at, m.policy_flags,
         ARRAY(SELECT jsonb_array_elements(m.tool_calls)->>'name'), m.model
  FROM ai_messages m JOIN organizations o ON o.id = m.org_id
  WHERE app_is_compliance() AND m.role = 'assistant'
    AND (m.policy_flags && ARRAY['model_refusal', 'tool_round_limit']::text[] OR EXISTS (SELECT 1 FROM unnest(m.policy_flags) f WHERE f LIKE 'output:%'))
  ORDER BY m.created_at DESC
  LIMIT 200
$$;
