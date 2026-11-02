ALTER TABLE ai_conversations ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY owner_all ON ai_conversations FOR ALL USING (org_id = (SELECT app_current_org()) AND user_id = app_user_id()) WITH CHECK (org_id = (SELECT app_current_org()) AND user_id = app_user_id());
--> statement-breakpoint
ALTER TABLE ai_messages ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY owner_all ON ai_messages FOR ALL USING (org_id = (SELECT app_current_org()) AND user_id = app_user_id()) WITH CHECK (org_id = (SELECT app_current_org()) AND user_id = app_user_id() AND EXISTS (SELECT 1 FROM ai_conversations c WHERE c.id = conversation_id AND c.user_id = app_user_id()));
--> statement-breakpoint
ALTER TABLE ai_source_references ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY owner_all ON ai_source_references FOR ALL USING (org_id = (SELECT app_current_org()) AND user_id = app_user_id()) WITH CHECK (org_id = (SELECT app_current_org()) AND user_id = app_user_id());
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON ai_conversations, ai_messages, ai_source_references TO wealthos_runtime;
--> statement-breakpoint
-- Organisation-wide AI token usage this month, for cost controls (aggregate only, no content).
CREATE OR REPLACE FUNCTION app_ai_tokens_this_month(p_org uuid) RETURNS bigint
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(SUM(input_tokens + output_tokens), 0)::bigint FROM ai_messages
  WHERE org_id = p_org AND p_org = app_current_org() AND created_at >= date_trunc('month', now())
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION app_ai_tokens_this_month(uuid) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION app_ai_tokens_this_month(uuid) TO wealthos_runtime;
