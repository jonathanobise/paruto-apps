-- Daily provider credit budget. Helius bills Enhanced Transactions at 100 credits and DAS at 10 per call;
-- calls reserve credits here before they are made and are refused once the day's cap is spent.
ALTER TABLE runtime_state ADD COLUMN helius_daily_credit_cap INTEGER NOT NULL DEFAULT 33000;

CREATE TABLE credit_usage (
  provider_id TEXT NOT NULL,
  day TEXT NOT NULL,                     -- UTC date, YYYY-MM-DD
  credits INTEGER NOT NULL,
  calls INTEGER NOT NULL,
  refused INTEGER NOT NULL DEFAULT 0,    -- calls refused because the cap was reached
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (provider_id, day)
);
