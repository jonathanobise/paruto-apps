-- Historical replay and walk-forward runs (research output; never mixed with paper-trading results).
CREATE TABLE replay_runs (
  id TEXT PRIMARY KEY,
  config_version TEXT NOT NULL,
  strategy_version TEXT NOT NULL,
  filter_mode TEXT NOT NULL CHECK (filter_mode IN ('RECORDED', 'MARKET_RULES_ONLY')),
  period_start INTEGER NOT NULL,
  period_end INTEGER NOT NULL,
  params TEXT NOT NULL,
  result TEXT NOT NULL,
  sha256 TEXT NOT NULL,
  created_by TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX replay_runs_created ON replay_runs(created_at);
