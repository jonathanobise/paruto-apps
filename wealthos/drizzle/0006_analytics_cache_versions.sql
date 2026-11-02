-- Version counters that make the analytics cache key exact even when reference data is corrected
-- in place. Statement-level triggers bump the counter on any insert/update/delete.
CREATE TABLE data_versions (key text PRIMARY KEY, version bigint NOT NULL DEFAULT 0, changed_at timestamptz NOT NULL DEFAULT now());
--> statement-breakpoint
INSERT INTO data_versions (key) VALUES ('market') ON CONFLICT DO NOTHING;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION bump_market_version() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE data_versions SET version = version + 1, changed_at = now() WHERE key = 'market';
  RETURN NULL;
END $$;
--> statement-breakpoint
CREATE TRIGGER market_prices_version AFTER INSERT OR UPDATE OR DELETE ON market_prices FOR EACH STATEMENT EXECUTE FUNCTION bump_market_version();
--> statement-breakpoint
CREATE TRIGGER fx_rates_version AFTER INSERT OR UPDATE OR DELETE ON fx_rates FOR EACH STATEMENT EXECUTE FUNCTION bump_market_version();
--> statement-breakpoint
CREATE TRIGGER instruments_version AFTER INSERT OR UPDATE OR DELETE ON instruments FOR EACH STATEMENT EXECUTE FUNCTION bump_market_version();
--> statement-breakpoint
-- financial_accounts.updated_at always moves on update (part of the cache key).
CREATE OR REPLACE FUNCTION touch_updated_at() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END $$;
--> statement-breakpoint
CREATE TRIGGER financial_accounts_touch BEFORE UPDATE ON financial_accounts FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
--> statement-breakpoint
GRANT SELECT ON data_versions TO wealthos_runtime;
