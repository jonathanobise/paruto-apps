import { StrategyConfigSchema, versionConfig, type StrategyConfig, type VersionedConfig } from '@alpha-desk/config';
import { big, type SqlDb } from '@alpha-desk/db';
import { balancesFrom, bal, type Balances } from '@alpha-desk/ledger';
import type { Breaker } from '@alpha-desk/risk';
import { markValueMicro } from '@alpha-desk/execution';
import { Decimal, type CandidateState, type RuntimeMode } from '@alpha-desk/shared';
import type { CandidateRow } from './handoffs.ts';

export interface RuntimeState {
  mode: RuntimeMode;
  active_config_version: string | null;
  active_portfolio_id: string | null;
  entries_paused_reason: string | null;
  timezone: string;
  report_hour_local: number;
  api_daily_call_cap: number;
}

export async function getRuntime(db: SqlDb): Promise<RuntimeState> {
  const r = await db.first<RuntimeState>('SELECT mode, active_config_version, active_portfolio_id, entries_paused_reason, timezone, report_hour_local, api_daily_call_cap FROM runtime_state WHERE id = 1');
  if (!r) throw new Error('runtime_state not initialised — run bootstrap');
  return r;
}

export async function loadConfig(db: SqlDb, version?: string | null): Promise<VersionedConfig> {
  const v = version ?? (await getRuntime(db)).active_config_version;
  if (!v) throw new Error('no active configuration');
  const row = await db.first<{ body: string }>('SELECT body FROM strategy_configs WHERE config_version = ?', [v]);
  if (!row) throw new Error(`configuration ${v} not found`);
  const parsed = StrategyConfigSchema.parse(JSON.parse(row.body)) as StrategyConfig;
  const versioned = await versionConfig(parsed);
  if (versioned.configVersion !== v) throw new Error(`configuration ${v} fails its integrity check`);
  return versioned;
}

export async function getCandidate(db: SqlDb, id: string): Promise<(CandidateRow & Record<string, unknown>) | null> {
  return db.first(`SELECT * FROM candidate_discoveries WHERE id = ?`, [id]);
}

export interface PortfolioRow {
  id: string;
  status: string;
  starting_equity_micro: string;
  peak_equity_micro: string;
  day_open_equity_micro: string;
  day_open_date: string;
  version: number;
}

export async function getPortfolio(db: SqlDb, id: string): Promise<PortfolioRow> {
  const p = await db.first<PortfolioRow>('SELECT id, status, starting_equity_micro, peak_equity_micro, day_open_equity_micro, day_open_date, version FROM portfolios WHERE id = ?', [id]);
  if (!p) throw new Error(`portfolio ${id} not found`);
  return p;
}

export async function ledgerBalances(db: SqlDb, portfolioId: string): Promise<Balances> {
  const rows = await db.all<{ account: string; unit: string; amount: string }>(
    `SELECT account, unit, amount FROM ledger_entries WHERE portfolio_id = ?`,
    [portfolioId],
  );
  return balancesFrom(rows);
}

export async function cashMicro(db: SqlDb, portfolioId: string): Promise<bigint> {
  return bal(await ledgerBalances(db, portfolioId), 'CASH');
}

export interface PositionRow {
  id: string;
  portfolio_id: string;
  candidate_id: string;
  mint: string;
  symbol: string | null;
  status: 'OPEN' | 'EXIT_PENDING' | 'EXIT_FAILED' | 'CLOSED';
  entry_at: number;
  quantity: string;
  token_decimals: number;
  entry_price_usd: string;
  entry_reference_price_usd: string;
  entry_cost_micro: string;
  entry_fees_micro: string;
  planned_risk_micro: string;
  initial_stop_usd: string;
  effective_stop_usd: string;
  trailing_active: number;
  highest_reference_usd: string;
  lowest_reference_usd: string;
  last_mark_usd: string | null;
  last_mark_at: number | null;
  exit_reason: string | null;
  exit_attempts: number;
  realized_pnl_micro: string | null;
  exit_fees_micro: string | null;
  config_version: string;
  strategy_version: string;
}

export async function openPositions(db: SqlDb, portfolioId: string): Promise<PositionRow[]> {
  return db.all<PositionRow>(`SELECT * FROM positions WHERE portfolio_id = ? AND status <> 'CLOSED' ORDER BY entry_at`, [portfolioId]);
}

export async function activeBreakers(db: SqlDb, portfolioId: string): Promise<Breaker[]> {
  const rows = await db.all<{ breaker: Breaker }>(`SELECT breaker FROM circuit_breakers WHERE tripped = 1 AND (portfolio_id = ? OR portfolio_id = '*')`, [portfolioId]);
  return rows.map((r) => r.breaker);
}

/** Equity = ledger cash + open positions at their latest executable mark (cost when never marked). */
export async function equityOf(db: SqlDb, portfolioId: string): Promise<{ cash: bigint; positionsValue: bigint; equity: bigint; complete: boolean; positions: PositionRow[] }> {
  const cash = await cashMicro(db, portfolioId);
  const positions = await openPositions(db, portfolioId);
  let value = 0n;
  let complete = true;
  for (const p of positions) {
    if (p.last_mark_usd) {
      value += markValueMicro({ quantity: big(p.quantity), tokenDecimals: p.token_decimals }, new Decimal(p.last_mark_usd));
    } else {
      value += big(p.entry_cost_micro) - big(p.entry_fees_micro);
      complete = false;
    }
  }
  return { cash, positionsValue: value, equity: cash + value, complete, positions };
}

export async function candidatesInState(db: SqlDb, states: CandidateState[], limit = 50): Promise<Array<CandidateRow & Record<string, unknown>>> {
  return db.all(`SELECT * FROM candidate_discoveries WHERE state IN (${states.map(() => '?').join(',')}) ORDER BY updated_at LIMIT ?`, [...states, limit]);
}
