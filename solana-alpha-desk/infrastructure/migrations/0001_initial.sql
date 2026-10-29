-- Solana Alpha Desk — initial schema (D1 / SQLite).
-- Conventions: ids are TEXT; timestamps are UTC epoch milliseconds (INTEGER);
-- money is micro-USD and token quantities are base units, both as decimal-integer TEXT;
-- prices and ratios are decimal TEXT. Audit tables are append-only (see triggers at the end).


-- ───────────────────────────── identity ─────────────────────────────
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL CHECK (role IN ('OWNER', 'VIEWER')),
  created_at INTEGER NOT NULL
);

CREATE TABLE accounts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  kind TEXT NOT NULL CHECK (kind IN ('PASSWORD')),
  password_hash TEXT NOT NULL,           -- pbkdf2-sha256$iterations$salt$hash
  totp_secret TEXT,                      -- base32; NULL until MFA is enrolled
  totp_enabled INTEGER NOT NULL DEFAULT 0 CHECK (totp_enabled IN (0, 1)),
  failed_attempts INTEGER NOT NULL DEFAULT 0,
  locked_until INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  UNIQUE (user_id, kind)
);

CREATE TABLE sessions (
  id_hash TEXT PRIMARY KEY,              -- sha256 of the session token; the token itself is never stored
  user_id TEXT NOT NULL REFERENCES users(id),
  csrf_token TEXT NOT NULL,
  mfa_verified INTEGER NOT NULL DEFAULT 0 CHECK (mfa_verified IN (0, 1)),
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  last_seen_at INTEGER NOT NULL,
  revoked_at INTEGER,
  ip_hash TEXT,
  user_agent TEXT
);
CREATE INDEX sessions_user ON sessions(user_id, expires_at);

CREATE TABLE rate_limits (
  bucket TEXT NOT NULL,
  window_start INTEGER NOT NULL,
  count INTEGER NOT NULL,
  PRIMARY KEY (bucket, window_start)
);

CREATE TABLE internal_nonces (
  nonce TEXT PRIMARY KEY,
  seen_at INTEGER NOT NULL
);

-- ───────────────────────────── configuration ─────────────────────────────
CREATE TABLE strategy_configs (
  config_version TEXT PRIMARY KEY,       -- content hash
  strategy_version TEXT NOT NULL,
  body TEXT NOT NULL,                    -- JSON
  created_at INTEGER NOT NULL,
  created_by TEXT NOT NULL
);

CREATE TABLE configuration_changes (
  id TEXT PRIMARY KEY,
  scope TEXT NOT NULL CHECK (scope IN ('STRATEGY', 'RUNTIME', 'PORTFOLIO', 'PROVIDER', 'SECURITY')),
  previous_value TEXT,
  new_value TEXT NOT NULL,
  reason TEXT NOT NULL,
  actor TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE runtime_state (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  mode TEXT NOT NULL CHECK (mode IN ('STOPPED', 'DISCOVERY_ONLY', 'PAPER_MANUAL', 'PAPER_AUTONOMOUS', 'EMERGENCY_PAUSED')),
  active_config_version TEXT REFERENCES strategy_configs(config_version),
  active_portfolio_id TEXT,
  entries_paused_reason TEXT,            -- non-NULL blocks new entries (integrity incident, outage, ...)
  timezone TEXT NOT NULL DEFAULT 'UTC',
  report_hour_local INTEGER NOT NULL DEFAULT 7 CHECK (report_hour_local BETWEEN 0 AND 23),
  api_daily_call_cap INTEGER NOT NULL DEFAULT 200000,
  updated_at INTEGER NOT NULL,
  updated_by TEXT NOT NULL
);

-- ───────────────────────────── providers ─────────────────────────────
CREATE TABLE data_providers (
  id TEXT PRIMARY KEY,                   -- dexscreener, solana-rpc, jupiter, rugcheck, geckoterminal, helius
  kind TEXT NOT NULL,
  base_url TEXT NOT NULL,
  integration_status TEXT NOT NULL CHECK (integration_status IN ('OPERATIONAL', 'BLOCKED_BY_CREDENTIALS', 'DISABLED')),
  requires_credentials INTEGER NOT NULL CHECK (requires_credentials IN (0, 1)),
  licence_note TEXT,
  updated_at INTEGER NOT NULL
);

CREATE TABLE provider_health (
  provider_id TEXT NOT NULL REFERENCES data_providers(id),
  window_start INTEGER NOT NULL,         -- minute bucket
  calls INTEGER NOT NULL DEFAULT 0,
  errors INTEGER NOT NULL DEFAULT 0,
  rate_limited INTEGER NOT NULL DEFAULT 0,
  total_latency_ms INTEGER NOT NULL DEFAULT 0,
  max_latency_ms INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  last_success_at INTEGER,
  circuit_state TEXT NOT NULL DEFAULT 'CLOSED' CHECK (circuit_state IN ('CLOSED', 'OPEN', 'HALF_OPEN')),
  PRIMARY KEY (provider_id, window_start)
);

-- ───────────────────────────── evidence ─────────────────────────────
CREATE TABLE evidence (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL,                    -- e.g. RPC_ACCOUNT, DEX_PAIRS, JUP_QUOTE, HOLDERS, POOL_STATE
  provider_id TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  observed_at INTEGER NOT NULL,
  ingested_at INTEGER NOT NULL,
  slot INTEGER,
  storage_key TEXT NOT NULL,             -- R2 key or local path
  sha256 TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  verification TEXT NOT NULL CHECK (verification IN ('ON_CHAIN', 'PROVIDER_CLAIM', 'DERIVED')),
  UNIQUE (sha256, kind, observed_at)
);
CREATE INDEX evidence_observed ON evidence(observed_at);

-- ───────────────────────────── tokens and discovery ─────────────────────────────
CREATE TABLE tokens (
  mint TEXT PRIMARY KEY,
  symbol TEXT,
  name TEXT,
  token_program TEXT,
  decimals INTEGER,
  first_seen_at INTEGER NOT NULL,
  last_seen_at INTEGER NOT NULL,
  earliest_pool_at INTEGER,              -- earliest known pool creation (relaunch / duplicate pool detection)
  updated_at INTEGER NOT NULL
);

CREATE TABLE token_pools (
  pair_address TEXT PRIMARY KEY,
  mint TEXT NOT NULL REFERENCES tokens(mint),
  dex_id TEXT NOT NULL,
  pool_program TEXT,                     -- resolved on-chain owner program
  pool_type TEXT,                        -- PUMPSWAP_AMM | RAYDIUM_CPMM | RAYDIUM_AMM_V4 | UNSUPPORTED:<label>
  quote_mint TEXT NOT NULL,
  quote_symbol TEXT,
  pair_created_at INTEGER,
  first_seen_at INTEGER NOT NULL,
  last_seen_at INTEGER NOT NULL
);
CREATE INDEX token_pools_mint ON token_pools(mint);

-- A candidate is one evaluation run of one token. A token is re-evaluated only as a new run.
CREATE TABLE candidate_discoveries (
  id TEXT PRIMARY KEY,
  correlation_id TEXT NOT NULL,
  mint TEXT NOT NULL REFERENCES tokens(mint),
  pair_address TEXT NOT NULL,
  state TEXT NOT NULL CHECK (state IN (
    'DISCOVERED','DISCOVERY_REJECTED','FILTER_PENDING','FILTER_APPROVED','FILTER_REJECTED','FILTER_UNVERIFIED',
    'FILTER_ERROR','ANALYST_PENDING','ANALYST_APPROVED','ANALYST_REJECTED','ANALYST_UNVERIFIED','RISK_PENDING',
    'RISK_AUTHORIZED','RISK_REJECTED','RISK_PAUSED','PAPER_ORDER_PENDING','PAPER_FILLED','PAPER_REJECTED',
    'POSITION_OPEN','EXIT_PENDING','EXIT_FAILED','POSITION_CLOSED','EXPIRED')),
  state_version INTEGER NOT NULL DEFAULT 1,
  terminal INTEGER NOT NULL DEFAULT 0 CHECK (terminal IN (0, 1)),
  rejection_codes TEXT,                  -- JSON array
  source TEXT NOT NULL,                  -- discovery feed(s)
  snapshot_id TEXT,                      -- discovery market snapshot
  config_version TEXT NOT NULL,
  strategy_version TEXT NOT NULL,
  pair_created_at INTEGER,
  earliest_pool_at INTEGER,
  market_cap_usd TEXT,
  fdv_usd TEXT,
  liquidity_usd TEXT,
  volume_1h_usd TEXT,
  price_change_1h_pct TEXT,
  filter_status TEXT,
  analyst_score TEXT,
  eligible_until INTEGER,
  discovered_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX candidates_state ON candidate_discoveries(state, updated_at);
CREATE INDEX candidates_mint ON candidate_discoveries(mint, discovered_at);
CREATE INDEX candidates_discovered ON candidate_discoveries(discovered_at);
-- At most one non-terminal run per token.
CREATE UNIQUE INDEX candidates_one_active_per_mint ON candidate_discoveries(mint) WHERE terminal = 0;

CREATE TABLE market_snapshots (
  id TEXT PRIMARY KEY,
  mint TEXT NOT NULL,
  pair_address TEXT NOT NULL,
  provider_id TEXT NOT NULL,
  external_id TEXT NOT NULL,             -- provider-specific observation identity
  observed_at INTEGER NOT NULL,
  ingested_at INTEGER NOT NULL,
  price_usd TEXT,
  price_native TEXT,
  market_cap_usd TEXT,
  fdv_usd TEXT,
  liquidity_usd TEXT,
  total_liquidity_usd TEXT,
  volume_m5 TEXT, volume_h1 TEXT, volume_h6 TEXT, volume_h24 TEXT,
  change_m5 TEXT, change_h1 TEXT, change_h6 TEXT, change_h24 TEXT,
  buys_h1 INTEGER, sells_h1 INTEGER, buys_h24 INTEGER, sells_h24 INTEGER,
  txns_h1 INTEGER,
  evidence_id TEXT REFERENCES evidence(id),
  UNIQUE (provider_id, external_id)
);
CREATE INDEX market_snapshots_mint ON market_snapshots(mint, observed_at);

-- ───────────────────────────── security ─────────────────────────────
CREATE TABLE token_security_assessments (
  id TEXT PRIMARY KEY,
  candidate_id TEXT NOT NULL REFERENCES candidate_discoveries(id),
  mint TEXT NOT NULL,
  outcome TEXT NOT NULL CHECK (outcome IN ('FILTER_APPROVED', 'FILTER_REJECTED', 'FILTER_UNVERIFIED', 'FILTER_ERROR')),
  config_version TEXT NOT NULL,
  observed_at INTEGER NOT NULL,
  completed_at INTEGER NOT NULL,
  valid_until INTEGER,
  slot INTEGER,
  summary TEXT NOT NULL                  -- JSON
);
CREATE INDEX security_candidate ON token_security_assessments(candidate_id);
CREATE INDEX security_mint ON token_security_assessments(mint, completed_at);

CREATE TABLE security_rule_results (
  id TEXT PRIMARY KEY,
  assessment_id TEXT NOT NULL REFERENCES token_security_assessments(id),
  rule_id TEXT NOT NULL,                 -- F001..F018
  outcome TEXT NOT NULL CHECK (outcome IN ('PASS', 'FAIL', 'UNVERIFIED', 'ERROR', 'NOT_REQUIRED')),
  observed TEXT,                         -- JSON
  threshold TEXT,
  reason TEXT NOT NULL,
  evidence_ids TEXT NOT NULL,            -- JSON array
  UNIQUE (assessment_id, rule_id)
);
CREATE INDEX rule_results_rule ON security_rule_results(rule_id, outcome);

CREATE TABLE holder_snapshots (
  id TEXT PRIMARY KEY,
  mint TEXT NOT NULL,
  observed_at INTEGER NOT NULL,
  slot INTEGER,
  provider_id TEXT NOT NULL,
  total_supply TEXT NOT NULL,
  circulating_supply TEXT,
  holder_count INTEGER,                  -- NULL when the provider cannot count holders
  top10_pct_lower_bound TEXT,
  top10_pct_clustered TEXT,
  classification TEXT NOT NULL,          -- JSON: per-account class
  evidence_id TEXT REFERENCES evidence(id)
);
CREATE INDEX holder_snapshots_mint ON holder_snapshots(mint, observed_at);

CREATE TABLE wallet_clusters (
  id TEXT PRIMARY KEY,
  label TEXT,
  kind TEXT NOT NULL CHECK (kind IN ('INDIVIDUAL', 'DEVELOPER', 'SMART_WALLET', 'BUNDLER', 'PROTOCOL', 'UNKNOWN')),
  confidence TEXT NOT NULL CHECK (confidence IN ('CONFIRMED', 'PROBABLE', 'WEAK')),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE wallet_relationships (
  id TEXT PRIMARY KEY,
  wallet_a TEXT NOT NULL,
  wallet_b TEXT NOT NULL,
  relation TEXT NOT NULL CHECK (relation IN ('FUNDED_BY', 'DEPLOYED', 'SAME_SLOT_BUY', 'SHARED_FUNDER', 'TRANSFER', 'CLUSTER_MEMBER')),
  strength TEXT NOT NULL CHECK (strength IN ('CONFIRMED', 'PROBABLE', 'WEAK')),
  cluster_id TEXT REFERENCES wallet_clusters(id),
  evidence_id TEXT REFERENCES evidence(id),
  observed_at INTEGER NOT NULL,
  UNIQUE (wallet_a, wallet_b, relation)
);
CREATE INDEX wallet_rel_b ON wallet_relationships(wallet_b);

CREATE TABLE developer_histories (
  id TEXT PRIMARY KEY,
  mint TEXT NOT NULL,
  deployer TEXT,
  linked_wallets TEXT NOT NULL,          -- JSON
  developer_ownership_pct TEXT,
  prior_tokens INTEGER,
  confirmed_rugs INTEGER,
  status TEXT NOT NULL CHECK (status IN ('PASS', 'FAIL', 'UNVERIFIED', 'ERROR')),
  findings TEXT NOT NULL,                -- JSON
  observed_at INTEGER NOT NULL
);
CREATE INDEX developer_histories_mint ON developer_histories(mint, observed_at);

CREATE TABLE launch_bundle_assessments (
  id TEXT PRIMARY KEY,
  mint TEXT NOT NULL,
  pair_address TEXT NOT NULL,
  window_seconds INTEGER NOT NULL,
  bundled_pct TEXT,
  linked_buyers INTEGER,
  status TEXT NOT NULL CHECK (status IN ('PASS', 'FAIL', 'UNVERIFIED', 'ERROR')),
  findings TEXT NOT NULL,
  observed_at INTEGER NOT NULL
);

-- ───────────────────────────── analyst ─────────────────────────────
CREATE TABLE analyst_scores (
  id TEXT PRIMARY KEY,
  candidate_id TEXT NOT NULL REFERENCES candidate_discoveries(id),
  mint TEXT NOT NULL,
  total_score TEXT NOT NULL,
  verified_weight TEXT NOT NULL,
  outcome TEXT NOT NULL CHECK (outcome IN ('ANALYST_APPROVED', 'ANALYST_REJECTED', 'ANALYST_UNVERIFIED')),
  config_version TEXT NOT NULL,
  observed_at INTEGER NOT NULL,
  scored_at INTEGER NOT NULL,
  valid_until INTEGER,
  reasons TEXT NOT NULL
);
CREATE INDEX analyst_scores_candidate ON analyst_scores(candidate_id);
CREATE INDEX analyst_scores_mint ON analyst_scores(mint, scored_at);

CREATE TABLE score_factors (
  id TEXT PRIMARY KEY,
  score_id TEXT NOT NULL REFERENCES analyst_scores(id),
  factor TEXT NOT NULL,
  version TEXT NOT NULL,
  raw_metric TEXT,
  normalized TEXT,
  factor_score TEXT NOT NULL,
  weight TEXT NOT NULL,
  data_quality TEXT NOT NULL CHECK (data_quality IN ('VERIFIED', 'PARTIAL', 'INSUFFICIENT', 'UNAVAILABLE', 'STALE')),
  window_start INTEGER,
  window_end INTEGER,
  evidence TEXT NOT NULL,
  UNIQUE (score_id, factor)
);

CREATE TABLE opportunities (
  id TEXT PRIMARY KEY,
  candidate_id TEXT NOT NULL UNIQUE REFERENCES candidate_discoveries(id),
  mint TEXT NOT NULL,
  score TEXT NOT NULL,
  data_quality TEXT NOT NULL,
  execution_depth_usd TEXT,
  buyer_clusters INTEGER,
  signal_at INTEGER NOT NULL,
  rank INTEGER,
  status TEXT NOT NULL CHECK (status IN ('ACTIVE', 'TAKEN', 'EXPIRED', 'REJECTED')),
  updated_at INTEGER NOT NULL
);

CREATE TABLE ranking_changes (
  id TEXT PRIMARY KEY,
  opportunity_id TEXT NOT NULL REFERENCES opportunities(id),
  previous_rank INTEGER,
  new_rank INTEGER,
  reason TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

-- ───────────────────────────── portfolio, risk, execution ─────────────────────────────
CREATE TABLE portfolios (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  name TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('ACTIVE', 'ARCHIVED')),
  base_currency TEXT NOT NULL DEFAULT 'USD',
  starting_equity_micro TEXT NOT NULL,
  peak_equity_micro TEXT NOT NULL,
  day_open_equity_micro TEXT NOT NULL,
  day_open_date TEXT NOT NULL,           -- YYYY-MM-DD in the configured timezone
  version INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  archived_at INTEGER,
  archived_reason TEXT
);

-- Optimistic lock: each execution-plane commit inserts (portfolio, version + 1) in the same atomic batch.
CREATE TABLE portfolio_versions (
  portfolio_id TEXT NOT NULL REFERENCES portfolios(id),
  version INTEGER NOT NULL,
  committed_at INTEGER NOT NULL,
  reason TEXT NOT NULL,
  PRIMARY KEY (portfolio_id, version)
);

CREATE TABLE proposed_orders (
  id TEXT PRIMARY KEY,
  candidate_id TEXT NOT NULL REFERENCES candidate_discoveries(id),
  portfolio_id TEXT NOT NULL REFERENCES portfolios(id),
  mint TEXT NOT NULL,
  side TEXT NOT NULL CHECK (side IN ('BUY', 'SELL')),
  requested_notional_micro TEXT NOT NULL,
  reference_price_usd TEXT NOT NULL,
  quote_evidence_id TEXT REFERENCES evidence(id),
  sizing TEXT NOT NULL,                  -- JSON breakdown of every cap
  status TEXT NOT NULL CHECK (status IN ('PROPOSED', 'AUTHORIZED', 'REJECTED', 'EXPIRED', 'CONSUMED')),
  config_version TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  UNIQUE (candidate_id, side)
);

CREATE TABLE risk_authorizations (
  id TEXT PRIMARY KEY,
  proposed_order_id TEXT NOT NULL UNIQUE REFERENCES proposed_orders(id),
  portfolio_id TEXT NOT NULL REFERENCES portfolios(id),
  mint TEXT NOT NULL,
  max_notional_micro TEXT NOT NULL,
  reference_price_usd TEXT NOT NULL,
  config_version TEXT NOT NULL,
  decision TEXT NOT NULL CHECK (decision IN ('RISK_AUTHORIZED', 'RISK_REJECTED', 'RISK_PAUSED')),
  reasons TEXT NOT NULL,
  issued_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  consumed_at INTEGER,
  consumed_by_order TEXT,
  invalidated_at INTEGER,
  invalidated_reason TEXT
);
CREATE INDEX risk_auth_open ON risk_authorizations(decision, consumed_at, expires_at);

CREATE TABLE paper_orders (
  id TEXT PRIMARY KEY,
  portfolio_id TEXT NOT NULL REFERENCES portfolios(id),
  authorization_id TEXT UNIQUE REFERENCES risk_authorizations(id),  -- one order per authorization: no double fills
  position_id TEXT,
  candidate_id TEXT REFERENCES candidate_discoveries(id),
  mint TEXT NOT NULL,
  side TEXT NOT NULL CHECK (side IN ('BUY', 'SELL')),
  kind TEXT NOT NULL CHECK (kind IN ('MARKET')),
  reason TEXT NOT NULL,                  -- ENTRY | STOP | TRAILING_STOP | MANUAL | EMERGENCY | LIQUIDITY | DEVELOPER
  requested_in_amount TEXT NOT NULL,     -- micro-USD for BUY, token base units for SELL
  status TEXT NOT NULL CHECK (status IN ('PENDING', 'FILLED', 'REJECTED', 'FAILED')),
  failure_reason TEXT,
  idempotency_key TEXT NOT NULL UNIQUE,
  attempt INTEGER NOT NULL DEFAULT 1,
  config_version TEXT NOT NULL,
  strategy_version TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  resolved_at INTEGER
);
CREATE INDEX paper_orders_status ON paper_orders(status, created_at);

CREATE TABLE fills (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL UNIQUE REFERENCES paper_orders(id),
  portfolio_id TEXT NOT NULL REFERENCES portfolios(id),
  mint TEXT NOT NULL,
  side TEXT NOT NULL CHECK (side IN ('BUY', 'SELL')),
  token_quantity TEXT NOT NULL,          -- base units
  token_decimals INTEGER NOT NULL,
  usd_amount_micro TEXT NOT NULL,        -- USDC paid (BUY) or received (SELL), before network fees
  network_fee_micro TEXT NOT NULL,
  price_usd TEXT NOT NULL,               -- executed price per whole token
  quote_price_usd TEXT NOT NULL,         -- indicative price at quote time
  slippage_bps TEXT NOT NULL,
  price_impact_pct TEXT NOT NULL,
  route TEXT NOT NULL,                   -- JSON route labels
  quote_evidence_id TEXT REFERENCES evidence(id),
  requote_evidence_id TEXT REFERENCES evidence(id),
  latency_ms INTEGER NOT NULL,
  simulated_at INTEGER NOT NULL,
  model_version TEXT NOT NULL
);

CREATE TABLE positions (
  id TEXT PRIMARY KEY,
  portfolio_id TEXT NOT NULL REFERENCES portfolios(id),
  candidate_id TEXT NOT NULL REFERENCES candidate_discoveries(id),
  mint TEXT NOT NULL,
  symbol TEXT,
  status TEXT NOT NULL CHECK (status IN ('OPEN', 'EXIT_PENDING', 'EXIT_FAILED', 'CLOSED')),
  entry_order_id TEXT NOT NULL REFERENCES paper_orders(id),
  entry_at INTEGER NOT NULL,
  quantity TEXT NOT NULL,
  token_decimals INTEGER NOT NULL,
  entry_price_usd TEXT NOT NULL,         -- executed
  entry_reference_price_usd TEXT NOT NULL, -- executable reference at entry (stop base)
  entry_cost_micro TEXT NOT NULL,        -- USDC paid incl. network fees
  entry_fees_micro TEXT NOT NULL,
  planned_risk_micro TEXT NOT NULL,      -- for R-multiples
  initial_stop_usd TEXT NOT NULL,
  effective_stop_usd TEXT NOT NULL,
  trailing_active INTEGER NOT NULL DEFAULT 0 CHECK (trailing_active IN (0, 1)),
  highest_reference_usd TEXT NOT NULL,
  lowest_reference_usd TEXT NOT NULL,
  last_mark_usd TEXT,
  last_mark_at INTEGER,
  exit_reason TEXT,
  exit_order_id TEXT REFERENCES paper_orders(id),
  exit_at INTEGER,
  exit_price_usd TEXT,
  exit_proceeds_micro TEXT,
  exit_fees_micro TEXT,
  realized_pnl_micro TEXT,
  exit_attempts INTEGER NOT NULL DEFAULT 0,
  config_version TEXT NOT NULL,
  strategy_version TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX positions_status ON positions(portfolio_id, status);
-- No duplicate exposure to the same token within a portfolio.
CREATE UNIQUE INDEX positions_one_open_per_mint ON positions(portfolio_id, mint) WHERE status <> 'CLOSED';

CREATE TABLE position_marks (
  id TEXT PRIMARY KEY,
  position_id TEXT NOT NULL REFERENCES positions(id),
  observed_at INTEGER NOT NULL,
  reference_price_usd TEXT,              -- executable (sell-quote) price; NULL when no route
  value_micro TEXT,
  price_impact_pct TEXT,
  route_ok INTEGER NOT NULL CHECK (route_ok IN (0, 1)),
  liquidity_usd TEXT,
  evidence_id TEXT REFERENCES evidence(id)
);
CREATE INDEX position_marks_pos ON position_marks(position_id, observed_at);

CREATE TABLE stop_events (
  id TEXT PRIMARY KEY,
  position_id TEXT NOT NULL REFERENCES positions(id),
  kind TEXT NOT NULL CHECK (kind IN ('INITIALIZED', 'TRAILING_ACTIVATED', 'RAISED', 'TRIGGERED', 'EXIT_RETRY')),
  previous_stop_usd TEXT,
  new_stop_usd TEXT NOT NULL,
  reference_price_usd TEXT,
  created_at INTEGER NOT NULL
);
CREATE INDEX stop_events_pos ON stop_events(position_id, created_at);

-- Double-entry ledger. Each journal balances to zero per unit ('USD' in micro-USD, or a mint in base units).
CREATE TABLE ledger_journals (
  id TEXT PRIMARY KEY,
  portfolio_id TEXT NOT NULL REFERENCES portfolios(id),
  kind TEXT NOT NULL CHECK (kind IN ('CAPITAL', 'BUY', 'SELL', 'FEE', 'CORRECTION', 'ARCHIVE')),
  reference_id TEXT NOT NULL,
  memo TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  UNIQUE (portfolio_id, kind, reference_id)
);

CREATE TABLE ledger_entries (
  id TEXT PRIMARY KEY,
  journal_id TEXT NOT NULL REFERENCES ledger_journals(id),
  portfolio_id TEXT NOT NULL REFERENCES portfolios(id),
  account TEXT NOT NULL,                 -- CASH | POSITION_COST | FEES | REALIZED_PNL | CAPITAL | HOLDINGS | EXTERNAL
  unit TEXT NOT NULL,                    -- 'USD' or token mint
  amount TEXT NOT NULL,                  -- signed integer; debits positive, credits negative
  created_at INTEGER NOT NULL
);
CREATE INDEX ledger_entries_acct ON ledger_entries(portfolio_id, account, unit);
CREATE INDEX ledger_entries_journal ON ledger_entries(journal_id);

CREATE TABLE portfolio_equity_snapshots (
  id TEXT PRIMARY KEY,
  portfolio_id TEXT NOT NULL REFERENCES portfolios(id),
  observed_at INTEGER NOT NULL,
  cash_micro TEXT NOT NULL,
  positions_value_micro TEXT NOT NULL,
  equity_micro TEXT NOT NULL,
  exposure_pct TEXT NOT NULL,
  unrealized_pnl_micro TEXT NOT NULL,
  realized_pnl_micro TEXT NOT NULL,
  peak_equity_micro TEXT NOT NULL,
  drawdown_pct TEXT NOT NULL,
  marks_complete INTEGER NOT NULL CHECK (marks_complete IN (0, 1))
);
CREATE INDEX equity_snapshots ON portfolio_equity_snapshots(portfolio_id, observed_at);

CREATE TABLE circuit_breaker_events (
  id TEXT PRIMARY KEY,
  portfolio_id TEXT REFERENCES portfolios(id),
  breaker TEXT NOT NULL CHECK (breaker IN (
    'DAILY_LOSS', 'MAX_DRAWDOWN', 'DATA_OUTAGE', 'VERIFICATION_QUALITY', 'DB_INTEGRITY',
    'ROUTE_FAILURES', 'EMERGENCY_PAUSE', 'LIQUIDITY_WITHDRAWAL', 'DEVELOPER_MOVEMENT', 'API_BUDGET')),
  action TEXT NOT NULL CHECK (action IN ('TRIPPED', 'RESET')),
  detail TEXT NOT NULL,
  actor TEXT NOT NULL,
  reset_confirmation TEXT,
  created_at INTEGER NOT NULL
);
CREATE INDEX breaker_events ON circuit_breaker_events(breaker, created_at);

-- Current breaker state, derived from events and kept for fast checks.
CREATE TABLE circuit_breakers (
  breaker TEXT NOT NULL,
  portfolio_id TEXT NOT NULL DEFAULT '*',
  tripped INTEGER NOT NULL CHECK (tripped IN (0, 1)),
  tripped_at INTEGER,
  detail TEXT,
  last_event_id TEXT NOT NULL REFERENCES circuit_breaker_events(id),
  PRIMARY KEY (breaker, portfolio_id)
);

-- ───────────────────────────── operations and audit ─────────────────────────────
CREATE TABLE handoff_events (
  event_id TEXT PRIMARY KEY,
  idempotency_key TEXT NOT NULL UNIQUE,
  correlation_id TEXT NOT NULL,
  candidate_id TEXT NOT NULL,
  token_mint TEXT NOT NULL,
  source_agent TEXT NOT NULL,
  destination_agent TEXT NOT NULL,
  event_type TEXT NOT NULL,
  previous_state TEXT,
  next_state TEXT NOT NULL,
  observed_at INTEGER NOT NULL,
  generated_at INTEGER NOT NULL,
  expires_at INTEGER,
  config_version TEXT NOT NULL,
  strategy_version TEXT NOT NULL,
  body TEXT NOT NULL,                    -- the full validated handoff JSON
  checksum TEXT NOT NULL
);
CREATE INDEX handoff_candidate ON handoff_events(candidate_id, generated_at);
CREATE INDEX handoff_generated ON handoff_events(generated_at);

CREATE TABLE audit_events (
  id TEXT PRIMARY KEY,
  seq INTEGER NOT NULL UNIQUE,
  category TEXT NOT NULL,                -- DISCOVERY | RULE | SCORE | RISK | ORDER | FILL | POSITION | STOP | API_ERROR | AUTOMATION | BREAKER | CONFIG | ADMIN | REPORT | RECONCILIATION | CORRECTION
  action TEXT NOT NULL,
  actor TEXT NOT NULL,
  subject_type TEXT,
  subject_id TEXT,
  correlation_id TEXT,
  detail TEXT NOT NULL,                  -- JSON
  evidence_ids TEXT NOT NULL,            -- JSON
  checksum TEXT NOT NULL,                -- sha256(canonical row without checksum)
  created_at INTEGER NOT NULL
);
CREATE INDEX audit_category ON audit_events(category, created_at);
CREATE INDEX audit_subject ON audit_events(subject_type, subject_id);

CREATE TABLE system_alerts (
  id TEXT PRIMARY KEY,
  severity TEXT NOT NULL CHECK (severity IN ('INFO', 'WARNING', 'CRITICAL')),
  source TEXT NOT NULL,
  title TEXT NOT NULL,
  detail TEXT NOT NULL,
  dedupe_key TEXT,
  created_at INTEGER NOT NULL,
  acknowledged_at INTEGER,
  acknowledged_by TEXT
);
CREATE INDEX alerts_open ON system_alerts(acknowledged_at, created_at);
CREATE UNIQUE INDEX alerts_dedupe_open ON system_alerts(dedupe_key) WHERE acknowledged_at IS NULL AND dedupe_key IS NOT NULL;

CREATE TABLE background_jobs (
  id TEXT PRIMARY KEY,                   -- agent/job name, e.g. scout, filter, monitor-loop
  kind TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('HEALTHY', 'DEGRADED', 'UNAVAILABLE', 'PAUSED')),
  instance_id TEXT,
  started_at INTEGER,
  heartbeat_at INTEGER,
  last_success_at INTEGER,
  last_error TEXT,
  last_error_at INTEGER,
  queue_depth INTEGER NOT NULL DEFAULT 0,
  processed INTEGER NOT NULL DEFAULT 0,
  rejected INTEGER NOT NULL DEFAULT 0,
  last_latency_ms INTEGER,
  restarts INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE work_items (
  id TEXT PRIMARY KEY,
  queue TEXT NOT NULL,
  candidate_id TEXT,
  idempotency_key TEXT NOT NULL UNIQUE,
  payload TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('PENDING', 'IN_PROGRESS', 'DONE', 'DEAD')),
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 5,
  available_at INTEGER NOT NULL,
  leased_until INTEGER,
  last_error TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX work_items_ready ON work_items(queue, status, available_at);

CREATE TABLE report_runs (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL CHECK (kind IN ('MORNING', 'DAILY_PNL', 'REJECTION_FUNNEL', 'AGENT_RELIABILITY', 'WEEKLY', 'STRATEGY_COMPARISON', 'INCIDENT')),
  period_start INTEGER NOT NULL,
  period_end INTEGER NOT NULL,
  timezone TEXT NOT NULL,
  portfolio_id TEXT,
  status TEXT NOT NULL CHECK (status IN ('COMPLETED', 'FAILED')),
  body TEXT NOT NULL,                    -- JSON report
  storage_key TEXT,
  sha256 TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  UNIQUE (kind, period_start, period_end, portfolio_id)
);

-- ───────────────────────────── immutability guards ─────────────────────────────
CREATE TRIGGER audit_events_no_update BEFORE UPDATE ON audit_events BEGIN SELECT RAISE(ABORT, 'audit_events is append-only'); END;
CREATE TRIGGER audit_events_no_delete BEFORE DELETE ON audit_events BEGIN SELECT RAISE(ABORT, 'audit_events is append-only'); END;
CREATE TRIGGER handoff_no_update BEFORE UPDATE ON handoff_events BEGIN SELECT RAISE(ABORT, 'handoff_events is append-only'); END;
CREATE TRIGGER handoff_no_delete BEFORE DELETE ON handoff_events BEGIN SELECT RAISE(ABORT, 'handoff_events is append-only'); END;
CREATE TRIGGER fills_no_update BEFORE UPDATE ON fills BEGIN SELECT RAISE(ABORT, 'fills are immutable'); END;
CREATE TRIGGER fills_no_delete BEFORE DELETE ON fills BEGIN SELECT RAISE(ABORT, 'fills are immutable'); END;
CREATE TRIGGER ledger_entries_no_update BEFORE UPDATE ON ledger_entries BEGIN SELECT RAISE(ABORT, 'ledger is append-only'); END;
CREATE TRIGGER ledger_entries_no_delete BEFORE DELETE ON ledger_entries BEGIN SELECT RAISE(ABORT, 'ledger is append-only'); END;
CREATE TRIGGER ledger_journals_no_update BEFORE UPDATE ON ledger_journals BEGIN SELECT RAISE(ABORT, 'ledger is append-only'); END;
CREATE TRIGGER ledger_journals_no_delete BEFORE DELETE ON ledger_journals BEGIN SELECT RAISE(ABORT, 'ledger is append-only'); END;
CREATE TRIGGER breaker_events_no_update BEFORE UPDATE ON circuit_breaker_events BEGIN SELECT RAISE(ABORT, 'breaker events are append-only'); END;
CREATE TRIGGER breaker_events_no_delete BEFORE DELETE ON circuit_breaker_events BEGIN SELECT RAISE(ABORT, 'breaker events are append-only'); END;
CREATE TRIGGER config_changes_no_update BEFORE UPDATE ON configuration_changes BEGIN SELECT RAISE(ABORT, 'configuration changes are append-only'); END;
CREATE TRIGGER config_changes_no_delete BEFORE DELETE ON configuration_changes BEGIN SELECT RAISE(ABORT, 'configuration changes are append-only'); END;
CREATE TRIGGER stop_events_no_update BEFORE UPDATE ON stop_events BEGIN SELECT RAISE(ABORT, 'stop events are append-only'); END;
CREATE TRIGGER stop_events_no_delete BEFORE DELETE ON stop_events BEGIN SELECT RAISE(ABORT, 'stop events are append-only'); END;
CREATE TRIGGER rule_results_no_update BEFORE UPDATE ON security_rule_results BEGIN SELECT RAISE(ABORT, 'rule results are immutable'); END;
CREATE TRIGGER rule_results_no_delete BEFORE DELETE ON security_rule_results BEGIN SELECT RAISE(ABORT, 'rule results are immutable'); END;
CREATE TRIGGER positions_no_delete BEFORE DELETE ON positions BEGIN SELECT RAISE(ABORT, 'positions are never deleted'); END;
CREATE TRIGGER paper_orders_no_delete BEFORE DELETE ON paper_orders BEGIN SELECT RAISE(ABORT, 'orders are never deleted'); END;
CREATE TRIGGER fill_quantity_positive BEFORE INSERT ON fills
  WHEN CAST(NEW.token_quantity AS INTEGER) <= 0 OR CAST(NEW.usd_amount_micro AS INTEGER) <= 0
  BEGIN SELECT RAISE(ABORT, 'fill amounts must be positive'); END;
-- A closed position stays closed.
CREATE TRIGGER positions_closed_final BEFORE UPDATE ON positions
  WHEN OLD.status = 'CLOSED' BEGIN SELECT RAISE(ABORT, 'closed positions are final'); END;
-- The effective stop of a long position never decreases.
CREATE TRIGGER positions_stop_monotonic BEFORE UPDATE OF effective_stop_usd ON positions
  WHEN CAST(NEW.effective_stop_usd AS REAL) < CAST(OLD.effective_stop_usd AS REAL) * (1 - 1e-12)
  BEGIN SELECT RAISE(ABORT, 'effective stop may not be lowered'); END;
-- Authorizations are single-use.
CREATE TRIGGER risk_auth_single_use BEFORE UPDATE OF consumed_at ON risk_authorizations
  WHEN OLD.consumed_at IS NOT NULL BEGIN SELECT RAISE(ABORT, 'authorization already consumed'); END;
