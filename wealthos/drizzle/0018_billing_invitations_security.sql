-- Billing, plans and shared organisations: RLS, guards, privileged functions, plan seed.

-- Helpers ------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION app_org_role() RETURNS member_role
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT m.role FROM memberships m
  WHERE m.org_id = NULLIF(current_setting('app.org_id', true), '')::uuid
    AND m.user_id = NULLIF(current_setting('app.user_id', true), '')::uuid
$$;
--> statement-breakpoint
-- Billing system context (worker lifecycle job, verified payment webhooks). Set only by
-- withBillingSystem() in application code, never from user input.
CREATE OR REPLACE FUNCTION app_billing_system() RETURNS boolean
LANGUAGE sql STABLE AS $$ SELECT current_setting('app.system', true) = 'billing' $$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION app_org_role() FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION app_org_role(), app_billing_system() TO wealthos_runtime;
--> statement-breakpoint

-- Plans: readable by everyone, edited by platform admins -------------------------------------
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY plans_read ON plans FOR SELECT USING (true);
--> statement-breakpoint
CREATE POLICY plans_admin_insert ON plans FOR INSERT WITH CHECK ((SELECT app_is_platform_admin()));
--> statement-breakpoint
CREATE POLICY plans_admin_update ON plans FOR UPDATE USING ((SELECT app_is_platform_admin())) WITH CHECK ((SELECT app_is_platform_admin()));
--> statement-breakpoint

-- Subscriptions --------------------------------------------------------------------------------
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY subscriptions_read ON subscriptions FOR SELECT USING (org_id = (SELECT app_current_org()) OR (SELECT app_is_platform_admin()) OR app_billing_system());
--> statement-breakpoint
CREATE POLICY subscriptions_insert ON subscriptions FOR INSERT WITH CHECK ((org_id = (SELECT app_current_org()) AND (SELECT app_org_role()) IN ('owner', 'admin')) OR (SELECT app_is_platform_admin()) OR app_billing_system());
--> statement-breakpoint
CREATE POLICY subscriptions_update ON subscriptions FOR UPDATE
  USING ((org_id = (SELECT app_current_org()) AND (SELECT app_org_role()) IN ('owner', 'admin')) OR (SELECT app_is_platform_admin()) OR app_billing_system())
  WITH CHECK ((org_id = (SELECT app_current_org()) AND (SELECT app_org_role()) IN ('owner', 'admin')) OR (SELECT app_is_platform_admin()) OR app_billing_system());
--> statement-breakpoint
-- Customers may not grant themselves complimentary plans or change the price they pay.
CREATE OR REPLACE FUNCTION guard_subscription() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE owner_name text;
BEGIN
  SELECT pg_get_userbyid(c.relowner) INTO owner_name FROM pg_class c WHERE c.oid = TG_RELID;
  IF current_user = owner_name OR app_is_platform_admin() OR app_billing_system() THEN RETURN NEW; END IF;
  IF TG_OP = 'INSERT' THEN
    -- Customers can only start one free trial, at the catalogue price, for the plan's trial length.
    -- Paid subscriptions are created by the billing system when the first invoice is paid.
    IF NEW.complimentary OR NEW.status <> 'trialing' OR NEW.provider <> 'manual'
       OR NOT EXISTS (SELECT 1 FROM plans p WHERE p.code = NEW.plan_code AND p.active AND p.is_public AND p.trial_days > 0
                      AND p.price = NEW.price AND p.currency = NEW.currency
                      AND NEW.current_period_end <= now() + make_interval(days => p.trial_days) + interval '1 hour'
                      AND NEW.trial_ends_at = NEW.current_period_end)
       OR EXISTS (SELECT 1 FROM subscriptions s WHERE s.org_id = NEW.org_id AND s.trial_ends_at IS NOT NULL) THEN
      RAISE EXCEPTION 'WOS_BILLING: customers can only start one trial per organisation' USING ERRCODE = 'check_violation';
    END IF;
    RETURN NEW;
  END IF;
  IF NEW.org_id <> OLD.org_id OR NEW.price <> OLD.price OR NEW.currency <> OLD.currency OR NEW.complimentary <> OLD.complimentary
     OR NEW.current_period_end > OLD.current_period_end OR NEW.provider <> OLD.provider
     OR (NEW.status <> OLD.status AND NOT (NEW.status = 'expired' AND OLD.status = 'trialing'))
     OR (NEW.plan_code <> OLD.plan_code AND OLD.status <> 'trialing') THEN
    RAISE EXCEPTION 'WOS_BILLING: this change needs a payment or an administrator' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END $$;
--> statement-breakpoint
CREATE TRIGGER subscriptions_guard BEFORE INSERT OR UPDATE ON subscriptions FOR EACH ROW EXECUTE FUNCTION guard_subscription();
--> statement-breakpoint

-- Invoices: issued by the billing system or customers' owners (upgrade), settled only by the
-- billing system or administrators; amounts never change; open → paid | void only.
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY invoices_read ON invoices FOR SELECT USING ((org_id IS NOT NULL AND org_id = (SELECT app_current_org())) OR (SELECT app_is_platform_admin()) OR app_billing_system());
--> statement-breakpoint
CREATE POLICY invoices_insert ON invoices FOR INSERT WITH CHECK ((org_id = (SELECT app_current_org()) AND (SELECT app_org_role()) IN ('owner', 'admin') AND status = 'open') OR (SELECT app_is_platform_admin()) OR app_billing_system());
--> statement-breakpoint
CREATE POLICY invoices_update ON invoices FOR UPDATE USING ((SELECT app_is_platform_admin()) OR app_billing_system()) WITH CHECK ((SELECT app_is_platform_admin()) OR app_billing_system());
--> statement-breakpoint
CREATE OR REPLACE FUNCTION guard_invoice() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'WOS_IMMUTABLE: invoices cannot be deleted' USING ERRCODE = 'insufficient_privilege';
  END IF;
  -- Organisation erasure clears org_id (ON DELETE SET NULL); nothing else may change it.
  IF NEW.org_id IS DISTINCT FROM OLD.org_id AND NEW.org_id IS NOT NULL THEN
    RAISE EXCEPTION 'WOS_IMMUTABLE: invoice organisation cannot change' USING ERRCODE = 'check_violation';
  END IF;
  IF NEW.number <> OLD.number OR NEW.subtotal <> OLD.subtotal OR NEW.tax <> OLD.tax OR NEW.total <> OLD.total
     OR NEW.currency <> OLD.currency OR NEW.lines <> OLD.lines OR NEW.issued_at <> OLD.issued_at OR NEW.purpose <> OLD.purpose THEN
    RAISE EXCEPTION 'WOS_IMMUTABLE: issued invoice amounts cannot change' USING ERRCODE = 'check_violation';
  END IF;
  IF OLD.status <> 'open' AND NEW.status <> OLD.status THEN
    RAISE EXCEPTION 'WOS_IMMUTABLE: % invoices are final', OLD.status USING ERRCODE = 'check_violation';
  END IF;
  IF NEW.status = 'paid' AND (NEW.paid_at IS NULL OR NEW.payment_ref IS NULL OR NEW.payment_method IS NULL) THEN
    RAISE EXCEPTION 'WOS_BILLING: a paid invoice needs a payment date, method and reference' USING ERRCODE = 'check_violation';
  END IF;
  IF NEW.status = 'void' AND NEW.void_reason IS NULL THEN
    RAISE EXCEPTION 'WOS_BILLING: voiding an invoice needs a reason' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END $$;
--> statement-breakpoint
CREATE TRIGGER invoices_guard BEFORE UPDATE OR DELETE ON invoices FOR EACH ROW EXECUTE FUNCTION guard_invoice();
--> statement-breakpoint
CREATE SEQUENCE invoice_number_seq START 1;
--> statement-breakpoint
GRANT USAGE ON SEQUENCE invoice_number_seq TO wealthos_runtime;
--> statement-breakpoint

-- Payment events: system and administrators only -------------------------------------------
ALTER TABLE payment_events ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY payment_events_system ON payment_events FOR ALL USING ((SELECT app_is_platform_admin()) OR app_billing_system()) WITH CHECK ((SELECT app_is_platform_admin()) OR app_billing_system());
--> statement-breakpoint

-- Invitations ------------------------------------------------------------------------------------
ALTER TABLE org_invitations ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY invitations_manage ON org_invitations FOR ALL
  USING (org_id = (SELECT app_current_org()) AND (SELECT app_org_role()) IN ('owner', 'admin'))
  WITH CHECK (org_id = (SELECT app_current_org()) AND (SELECT app_org_role()) IN ('owner', 'admin') AND invited_by = app_user_id());
--> statement-breakpoint
CREATE POLICY invitations_admin_read ON org_invitations FOR SELECT USING ((SELECT app_is_platform_admin()));
--> statement-breakpoint

-- What an invitation link shows before accepting (no other organisation data).
CREATE OR REPLACE FUNCTION app_invitation_preview(p_hash text)
RETURNS TABLE(org_name text, role member_role, email text, state text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT o.name, i.role, i.email::text,
         CASE WHEN i.revoked_at IS NOT NULL THEN 'revoked' WHEN i.accepted_at IS NOT NULL THEN 'accepted'
              WHEN i.expires_at < now() THEN 'expired' ELSE 'open' END
  FROM org_invitations i JOIN organizations o ON o.id = i.org_id
  WHERE i.token_hash = p_hash AND o.deleted_at IS NULL
$$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION app_accept_invitation(p_hash text) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE inv org_invitations%ROWTYPE; me users%ROWTYPE;
BEGIN
  SELECT * INTO me FROM users WHERE id = app_user_id() AND deleted_at IS NULL;
  IF NOT FOUND THEN RAISE EXCEPTION 'WOS_FORBIDDEN: sign in to accept' USING ERRCODE = 'insufficient_privilege'; END IF;
  SELECT * INTO inv FROM org_invitations WHERE token_hash = p_hash FOR UPDATE;
  IF NOT FOUND OR inv.revoked_at IS NOT NULL OR inv.accepted_at IS NOT NULL OR inv.expires_at < now() THEN
    RAISE EXCEPTION 'WOS_INVITE: this invitation is no longer valid' USING ERRCODE = 'check_violation';
  END IF;
  IF lower(inv.email::text) <> lower(me.email::text) THEN
    RAISE EXCEPTION 'WOS_INVITE: this invitation was sent to a different email address' USING ERRCODE = 'insufficient_privilege';
  END IF;
  INSERT INTO memberships (org_id, user_id, role) VALUES (inv.org_id, me.id, inv.role) ON CONFLICT DO NOTHING;
  UPDATE org_invitations SET accepted_at = now(), accepted_by = me.id WHERE id = inv.id;
  RETURN inv.org_id;
END $$;
--> statement-breakpoint
-- Members of the organisation in context (memberships RLS only shows a user their own rows).
CREATE OR REPLACE FUNCTION app_org_members()
RETURNS TABLE(user_id uuid, display_name text, email text, role member_role, joined_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT u.id, u.display_name, u.email::text, m.role, m.created_at
  FROM memberships m JOIN users u ON u.id = m.user_id
  WHERE m.org_id = app_current_org() AND app_current_org() IS NOT NULL
  ORDER BY m.created_at
$$;
--> statement-breakpoint
-- Only owners change roles; the last owner cannot be demoted.
CREATE OR REPLACE FUNCTION app_set_member_role(p_user uuid, p_role member_role) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE org uuid := app_current_org(); v_role member_role;
BEGIN
  IF org IS NULL OR app_org_role() <> 'owner' THEN
    RAISE EXCEPTION 'WOS_FORBIDDEN: only owners can change roles' USING ERRCODE = 'insufficient_privilege';
  END IF;
  SELECT role INTO v_role FROM memberships WHERE org_id = org AND user_id = p_user FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'WOS_NOT_FOUND: not a member' USING ERRCODE = 'no_data_found'; END IF;
  IF v_role = 'owner' AND p_role <> 'owner' AND (SELECT count(*) FROM memberships WHERE org_id = org AND role = 'owner') = 1 THEN
    RAISE EXCEPTION 'WOS_LAST_OWNER: an organisation needs at least one owner' USING ERRCODE = 'check_violation';
  END IF;
  UPDATE memberships SET role = p_role WHERE org_id = org AND user_id = p_user;
END $$;
--> statement-breakpoint
-- Owners remove anyone, admins remove members and viewers, anyone may leave; never the last
-- owner. The leaving user's private rows in this organisation go with them.
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
  DELETE FROM memberships WHERE org_id = org AND user_id = p_user;
END $$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION app_invitation_preview(text), app_accept_invitation(text), app_org_members(), app_set_member_role(uuid, member_role), app_remove_member(uuid) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION app_invitation_preview(text), app_accept_invitation(text), app_org_members(), app_set_member_role(uuid, member_role), app_remove_member(uuid) TO wealthos_runtime;
--> statement-breakpoint

-- Usage metering (organisation-wide counts; no content) -------------------------------------
CREATE OR REPLACE FUNCTION app_ai_usage_this_month(p_org uuid) RETURNS TABLE(questions bigint, tokens bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT count(*) FILTER (WHERE role = 'assistant'), COALESCE(SUM(input_tokens + output_tokens), 0)::bigint
  FROM ai_messages
  WHERE org_id = p_org AND created_at >= date_trunc('month', now())
    AND (p_org = app_current_org() OR app_is_platform_admin() OR app_billing_system())
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION app_ai_usage_this_month(uuid) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION app_ai_usage_this_month(uuid) TO wealthos_runtime;
--> statement-breakpoint

-- Administrator read access to organisations and audit events --------------------------------
CREATE POLICY organizations_admin_read ON organizations FOR SELECT USING ((SELECT app_is_platform_admin()));
--> statement-breakpoint
CREATE POLICY audit_events_admin_read ON audit_events FOR SELECT USING ((SELECT app_is_platform_admin()));
--> statement-breakpoint

GRANT SELECT, INSERT, UPDATE ON plans, subscriptions, invoices, payment_events, org_invitations TO wealthos_runtime;
--> statement-breakpoint

-- Plan catalogue seed. Prices are the directive's initial test pricing (hypotheses, editable).
INSERT INTO plans (code, name, description, price, currency, interval, trial_days, entitlements, is_public, active, sort_order) VALUES
  ('free', 'Free', 'Track your accounts and investments with correct performance.', 0, 'NGN', 'month', 0,
   '{"accounts": 5, "goals": 2, "alerts": 3, "watchlists": 1, "members": 1, "csvImportsPerMonth": 2, "aiQuestionsPerMonth": 10, "pdfReports": false}', true, true, 0),
  ('plus', 'Wealth Plus', 'For a growing portfolio: more accounts, goals and alerts, PDF reports and a shared household space.', 4500, 'NGN', 'month', 14,
   '{"accounts": 30, "goals": 10, "alerts": 25, "watchlists": 10, "members": 2, "csvImportsPerMonth": 20, "aiQuestionsPerMonth": 150, "pdfReports": true}', true, true, 1),
  ('pro', 'Wealth Pro', 'Unlimited accounts and goals, more research assistant questions and up to five members.', 12500, 'NGN', 'month', 14,
   '{"accounts": null, "goals": null, "alerts": 100, "watchlists": null, "members": 5, "csvImportsPerMonth": null, "aiQuestionsPerMonth": 600, "pdfReports": true}', true, true, 2),
  ('adviser', 'Adviser', 'For authorised advisers. Custom pricing; not available yet.', 0, 'NGN', 'month', 0,
   '{"accounts": null, "goals": null, "alerts": 100, "watchlists": null, "members": 10, "csvImportsPerMonth": null, "aiQuestionsPerMonth": 600, "pdfReports": true}', false, false, 3)
ON CONFLICT (code) DO NOTHING;
