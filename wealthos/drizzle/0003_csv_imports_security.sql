-- CSV imports: tenant isolation, grants and status-transition guard.
ALTER TABLE import_batches ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY tenant_read ON import_batches FOR SELECT USING (org_id = (SELECT app_current_org()));
--> statement-breakpoint
CREATE POLICY tenant_insert ON import_batches FOR INSERT WITH CHECK (org_id = (SELECT app_current_org()) AND (SELECT app_can_write()));
--> statement-breakpoint
CREATE POLICY tenant_update ON import_batches FOR UPDATE USING (org_id = (SELECT app_current_org()) AND (SELECT app_can_write())) WITH CHECK (org_id = (SELECT app_current_org()));
--> statement-breakpoint
ALTER TABLE import_mappings ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY tenant_read ON import_mappings FOR SELECT USING (org_id = (SELECT app_current_org()));
--> statement-breakpoint
CREATE POLICY tenant_write ON import_mappings FOR ALL USING (org_id = (SELECT app_current_org()) AND (SELECT app_can_write())) WITH CHECK (org_id = (SELECT app_current_org()) AND (SELECT app_can_write()));
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE ON import_batches TO wealthos_runtime;
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON import_mappings TO wealthos_runtime;
--> statement-breakpoint
-- Only legal lifecycle moves; identity of the file, account and organisation never changes, and
-- the previewed rows are frozen once committed.
CREATE OR REPLACE FUNCTION guard_import_batch() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.org_id <> OLD.org_id OR NEW.account_id <> OLD.account_id OR NEW.file_sha256 <> OLD.file_sha256 OR NEW.created_at <> OLD.created_at THEN
    RAISE EXCEPTION 'WOS_IMMUTABLE: import batch identity cannot change' USING ERRCODE = 'insufficient_privilege';
  END IF;
  IF OLD.status = NEW.status THEN
    IF OLD.status <> 'previewed' THEN
      RAISE EXCEPTION 'WOS_IMMUTABLE: a % import cannot be modified', OLD.status USING ERRCODE = 'insufficient_privilege';
    END IF;
    RETURN NEW;
  END IF;
  IF NOT ((OLD.status = 'previewed' AND NEW.status IN ('committed', 'discarded'))
       OR (OLD.status = 'committed' AND NEW.status = 'rolled_back')) THEN
    RAISE EXCEPTION 'WOS_INVALID_TRANSITION: import cannot move from % to %', OLD.status, NEW.status USING ERRCODE = 'check_violation';
  END IF;
  IF OLD.status = 'committed' AND (NEW.rows::text <> OLD.rows::text OR NEW.mapping::text <> OLD.mapping::text) THEN
    RAISE EXCEPTION 'WOS_IMMUTABLE: committed rows cannot change' USING ERRCODE = 'insufficient_privilege';
  END IF;
  RETURN NEW;
END $$;
--> statement-breakpoint
CREATE TRIGGER import_batches_guard BEFORE UPDATE ON import_batches FOR EACH ROW EXECUTE FUNCTION guard_import_batch();
