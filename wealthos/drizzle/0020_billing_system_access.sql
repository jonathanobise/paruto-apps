-- Invoices are issued only by the billing system or administrators (customers could otherwise
-- write their own amounts). The application checks the customer's role before asking for one.
DROP POLICY invoices_insert ON invoices;
--> statement-breakpoint
CREATE POLICY invoices_insert ON invoices FOR INSERT WITH CHECK ((SELECT app_is_platform_admin()) OR app_billing_system());
--> statement-breakpoint
-- The billing system needs organisation names, owners and a way to notify them.
CREATE POLICY organizations_billing_read ON organizations FOR SELECT USING (app_billing_system());
--> statement-breakpoint
CREATE POLICY memberships_billing_read ON memberships FOR SELECT USING (app_billing_system());
--> statement-breakpoint
CREATE POLICY notifications_billing_insert ON notifications FOR INSERT WITH CHECK (app_billing_system());
--> statement-breakpoint
CREATE POLICY audit_events_billing_insert ON audit_events FOR INSERT WITH CHECK (app_billing_system() AND actor_user_id IS NULL);
--> statement-breakpoint
-- Platform settings: readable by the app, written by administrators.
ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY platform_settings_read ON platform_settings FOR SELECT USING (true);
--> statement-breakpoint
CREATE POLICY platform_settings_admin_write ON platform_settings FOR INSERT WITH CHECK ((SELECT app_is_platform_admin()));
--> statement-breakpoint
CREATE POLICY platform_settings_admin_update ON platform_settings FOR UPDATE USING ((SELECT app_is_platform_admin())) WITH CHECK ((SELECT app_is_platform_admin()));
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE ON platform_settings TO wealthos_runtime;
