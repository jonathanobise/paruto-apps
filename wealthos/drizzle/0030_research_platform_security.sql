-- Research platform: security, cache invalidation and the open sector taxonomy.
-- Reference tables are readable by everyone and written only by platform administrators with
-- two-step verification (app_is_platform_admin(), checked in Postgres). The performance cache is
-- written by the app, only for global catalogue instruments.
ALTER TABLE instruments ADD CONSTRAINT instruments_market_check CHECK (market IS NULL OR market IN ('ng', 'us', 'uk', 'global'));
--> statement-breakpoint
ALTER TABLE sectors ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY public_read ON sectors FOR SELECT USING (true);
--> statement-breakpoint
CREATE POLICY admin_write ON sectors FOR ALL USING ((SELECT app_is_platform_admin())) WITH CHECK ((SELECT app_is_platform_admin()));
--> statement-breakpoint
ALTER TABLE industries ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY public_read ON industries FOR SELECT USING (true);
--> statement-breakpoint
CREATE POLICY admin_write ON industries FOR ALL USING ((SELECT app_is_platform_admin())) WITH CHECK ((SELECT app_is_platform_admin()));
--> statement-breakpoint
ALTER TABLE corporate_actions ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY public_read ON corporate_actions FOR SELECT USING (EXISTS (SELECT 1 FROM instruments i WHERE i.id = instrument_id));
--> statement-breakpoint
CREATE POLICY admin_write ON corporate_actions FOR INSERT WITH CHECK ((SELECT app_is_platform_admin()) AND EXISTS (SELECT 1 FROM instruments i WHERE i.id = instrument_id AND i.org_id IS NULL));
--> statement-breakpoint
CREATE POLICY admin_update ON corporate_actions FOR UPDATE USING ((SELECT app_is_platform_admin()));
--> statement-breakpoint
ALTER TABLE macro_series ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY public_read ON macro_series FOR SELECT USING (true);
--> statement-breakpoint
CREATE POLICY admin_write ON macro_series FOR INSERT WITH CHECK ((SELECT app_is_platform_admin()));
--> statement-breakpoint
CREATE POLICY admin_update ON macro_series FOR UPDATE USING ((SELECT app_is_platform_admin()));
--> statement-breakpoint
ALTER TABLE macro_observations ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY public_read ON macro_observations FOR SELECT USING (true);
--> statement-breakpoint
CREATE POLICY admin_write ON macro_observations FOR INSERT WITH CHECK ((SELECT app_is_platform_admin()));
--> statement-breakpoint
CREATE POLICY admin_update ON macro_observations FOR UPDATE USING ((SELECT app_is_platform_admin()));
--> statement-breakpoint
ALTER TABLE instrument_performance ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY visible_read ON instrument_performance FOR SELECT USING (EXISTS (SELECT 1 FROM instruments i WHERE i.id = instrument_id));
--> statement-breakpoint
CREATE POLICY catalogue_write ON instrument_performance FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM instruments i WHERE i.id = instrument_id AND i.org_id IS NULL));
--> statement-breakpoint
CREATE POLICY catalogue_update ON instrument_performance FOR UPDATE USING (EXISTS (SELECT 1 FROM instruments i WHERE i.id = instrument_id AND i.org_id IS NULL)) WITH CHECK (EXISTS (SELECT 1 FROM instruments i WHERE i.id = instrument_id AND i.org_id IS NULL));
--> statement-breakpoint
CREATE TRIGGER corporate_actions_version AFTER INSERT OR UPDATE OR DELETE ON corporate_actions FOR EACH STATEMENT EXECUTE FUNCTION bump_market_version();
--> statement-breakpoint
CREATE TRIGGER macro_observations_version AFTER INSERT OR UPDATE OR DELETE ON macro_observations FOR EACH STATEMENT EXECUTE FUNCTION bump_market_version();
--> statement-breakpoint
GRANT SELECT ON sectors, industries, macro_series TO wealthos_runtime;
--> statement-breakpoint
GRANT INSERT, UPDATE ON sectors, industries, macro_series TO wealthos_runtime;
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE ON corporate_actions, macro_observations, instrument_performance TO wealthos_runtime;
--> statement-breakpoint
-- An open taxonomy of our own (not GICS or ICB, which are licensed). Keys are stable; names may change.
INSERT INTO sectors (key, name, description, sort) VALUES
  ('financials', 'Financials', 'Banks, insurers, asset managers and other financial services.', 10),
  ('consumer-goods', 'Consumer goods', 'Food, beverages, household and personal products.', 20),
  ('consumer-services', 'Consumer services', 'Retail, media, travel and leisure.', 30),
  ('industrials', 'Industrials', 'Construction, building materials, industrial goods, transport and logistics.', 40),
  ('materials', 'Materials', 'Chemicals, metals and mining.', 50),
  ('energy', 'Energy', 'Oil and gas production and marketing, and renewable energy.', 60),
  ('utilities', 'Utilities', 'Power generation and distribution, water.', 70),
  ('technology', 'Technology', 'Software, hardware, semiconductors and IT services.', 80),
  ('telecoms', 'Telecommunications', 'Mobile, fixed-line and data network operators.', 90),
  ('healthcare', 'Healthcare', 'Pharmaceuticals, healthcare providers and medical devices.', 100),
  ('real-estate', 'Real estate', 'Real estate investment trusts and property developers.', 110),
  ('agriculture', 'Agriculture', 'Farming, agro-processing and agro-allied businesses.', 120),
  ('conglomerates', 'Conglomerates', 'Diversified groups spanning several sectors.', 130),
  ('government', 'Government and sovereign', 'Treasury bills and government bonds.', 140),
  ('broad-market', 'Broad market', 'Funds, ETFs and indices spread across many sectors.', 150),
  ('commodities', 'Commodities', 'Precious metals and other commodities.', 160)
ON CONFLICT (key) DO NOTHING;
--> statement-breakpoint
INSERT INTO industries (key, sector_key, name) VALUES
  ('financials.banking', 'financials', 'Banking'),
  ('financials.insurance', 'financials', 'Insurance'),
  ('financials.asset-management', 'financials', 'Asset management and capital markets'),
  ('consumer-goods.food-beverages', 'consumer-goods', 'Food and beverages'),
  ('consumer-goods.household', 'consumer-goods', 'Household and personal products'),
  ('consumer-services.retail', 'consumer-services', 'Retail'),
  ('consumer-services.media', 'consumer-services', 'Media and entertainment'),
  ('industrials.building-materials', 'industrials', 'Construction and building materials'),
  ('industrials.transport', 'industrials', 'Transport and logistics'),
  ('materials.mining', 'materials', 'Metals and mining'),
  ('materials.chemicals', 'materials', 'Chemicals'),
  ('energy.oil-gas', 'energy', 'Oil and gas'),
  ('energy.renewables', 'energy', 'Renewable energy'),
  ('utilities.power', 'utilities', 'Power'),
  ('technology.software', 'technology', 'Software and IT services'),
  ('technology.hardware', 'technology', 'Hardware and semiconductors'),
  ('telecoms.operators', 'telecoms', 'Network operators'),
  ('healthcare.pharma', 'healthcare', 'Pharmaceuticals'),
  ('healthcare.providers', 'healthcare', 'Healthcare providers'),
  ('real-estate.reits', 'real-estate', 'Real estate investment trusts'),
  ('agriculture.agro', 'agriculture', 'Agro-allied'),
  ('conglomerates.diversified', 'conglomerates', 'Diversified groups'),
  ('government.bills', 'government', 'Treasury bills'),
  ('government.bonds', 'government', 'Government bonds'),
  ('broad-market.equity', 'broad-market', 'Broad equity'),
  ('broad-market.fixed-income', 'broad-market', 'Broad fixed income'),
  ('broad-market.money-market', 'broad-market', 'Money market'),
  ('commodities.gold', 'commodities', 'Gold')
ON CONFLICT (key) DO NOTHING;
--> statement-breakpoint
ALTER TABLE instruments ADD CONSTRAINT instruments_sector_key_fk FOREIGN KEY (sector_key) REFERENCES sectors(key);
--> statement-breakpoint
ALTER TABLE instruments ADD CONSTRAINT instruments_industry_key_fk FOREIGN KEY (industry_key) REFERENCES industries(key);
