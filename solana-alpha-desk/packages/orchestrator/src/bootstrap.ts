import { versionConfig, type StrategyConfig } from '@alpha-desk/config';
import type { SqlDb, Statement } from '@alpha-desk/db';
import { capitalJournal, type Journal } from '@alpha-desk/ledger';
import { providerStatuses, type ProviderEnv } from '@alpha-desk/providers';
import { newId, usdToMicro, type RuntimeMode } from '@alpha-desk/shared';
import { auditStmt } from './audit-writer.ts';

export const OWNER_USER_ID = 'usr_owner';

export function journalStmts(j: Journal): Statement[] {
  return [
    {
      sql: 'INSERT INTO ledger_journals (id, portfolio_id, kind, reference_id, memo, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      params: [j.id, j.portfolioId, j.kind, j.referenceId, j.memo, j.createdAt],
    },
    ...j.entries.map((e, i) => ({
      sql: 'INSERT INTO ledger_entries (id, journal_id, portfolio_id, account, unit, amount, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      params: [`${j.id}_${i}`, j.id, j.portfolioId, e.account, e.unit, e.amount.toString(), j.createdAt],
    })),
  ];
}

export function localDate(ms: number, timezone: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(ms));
}

/**
 * Idempotent first-run setup: stores the strategy configuration (content-addressed), the runtime row,
 * provider registry, owner record and an initial paper portfolio funded by a capital journal.
 */
export async function bootstrap(
  db: SqlDb,
  opts: {
    config: StrategyConfig;
    env: ProviderEnv;
    ownerEmail: string;
    now: number;
    actor: string;
    initialMode?: RuntimeMode;
    timezone?: string;
  },
): Promise<{ configVersion: string; portfolioId: string }> {
  const { config, configVersion } = await versionConfig(opts.config);
  const stmts: Statement[] = [
    {
      sql: 'INSERT OR IGNORE INTO users (id, email, role, created_at) VALUES (?, ?, ?, ?)',
      params: [OWNER_USER_ID, opts.ownerEmail.toLowerCase(), 'OWNER', opts.now],
    },
    {
      sql: 'INSERT OR IGNORE INTO strategy_configs (config_version, strategy_version, body, created_at, created_by) VALUES (?, ?, ?, ?, ?)',
      params: [configVersion, config.strategyVersion, JSON.stringify(config), opts.now, opts.actor],
    },
    {
      sql: `INSERT OR IGNORE INTO runtime_state (id, mode, active_config_version, timezone, updated_at, updated_by) VALUES (1, ?, ?, ?, ?, ?)`,
      params: [
        opts.initialMode ?? 'DISCOVERY_ONLY',
        configVersion,
        opts.timezone ?? 'UTC',
        opts.now,
        opts.actor,
      ],
    },
  ];
  for (const p of providerStatuses(opts.env)) {
    stmts.push({
      sql: `INSERT INTO data_providers (id, kind, base_url, integration_status, requires_credentials, licence_note, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET integration_status = excluded.integration_status, licence_note = excluded.licence_note, updated_at = excluded.updated_at`,
      params: [p.id, 'market-data', p.id, p.integration, p.requiresCredentials ? 1 : 0, p.note, opts.now],
    });
  }
  await db.batch(stmts);

  const rt = await db.first<{ active_portfolio_id: string | null }>(
    'SELECT active_portfolio_id FROM runtime_state WHERE id = 1',
  );
  let portfolioId = rt?.active_portfolio_id ?? null;
  if (!portfolioId)
    portfolioId = await createPortfolio(db, {
      name: 'Paper portfolio 1',
      startingEquityUsd: config.risk.startingEquityUsd,
      now: opts.now,
      actor: opts.actor,
      timezone: opts.timezone ?? 'UTC',
    });
  const active = await db.first<{ active_config_version: string }>(
    'SELECT active_config_version FROM runtime_state WHERE id = 1',
  );
  return { configVersion: active!.active_config_version, portfolioId };
}

export async function createPortfolio(
  db: SqlDb,
  o: { name: string; startingEquityUsd: number; now: number; actor: string; timezone: string },
): Promise<string> {
  const id = newId('pf', o.now);
  const equity = usdToMicro(o.startingEquityUsd);
  const day = localDate(o.now, o.timezone);
  await db.batch([
    {
      sql: `INSERT INTO portfolios (id, user_id, name, status, starting_equity_micro, peak_equity_micro, day_open_equity_micro, day_open_date, version, created_at)
            VALUES (?, ?, ?, 'ACTIVE', ?, ?, ?, ?, 0, ?)`,
      params: [
        id,
        OWNER_USER_ID,
        o.name,
        equity.toString(),
        equity.toString(),
        equity.toString(),
        day,
        o.now,
      ],
    },
    {
      sql: 'INSERT INTO portfolio_versions (portfolio_id, version, committed_at, reason) VALUES (?, 0, ?, ?)',
      params: [id, o.now, 'created'],
    },
    ...journalStmts(capitalJournal(id, equity, o.now)),
    {
      sql: 'UPDATE runtime_state SET active_portfolio_id = ?, updated_at = ?, updated_by = ? WHERE id = 1',
      params: [id, o.now, o.actor],
    },
    await auditStmt({
      category: 'ADMIN',
      action: 'PORTFOLIO_CREATED',
      actor: o.actor,
      subjectType: 'portfolio',
      subjectId: id,
      detail: { startingEquityUsd: o.startingEquityUsd },
      at: o.now,
    }),
  ]);
  return id;
}

/**
 * Paper portfolio reset: the previous experiment is archived (never deleted) and a fresh portfolio starts.
 * Refused while positions are open, so no exposure is orphaned.
 */
export async function resetPortfolio(
  db: SqlDb,
  o: { reason: string; startingEquityUsd: number; now: number; actor: string; timezone: string },
): Promise<string> {
  const rt = await db.first<{ active_portfolio_id: string | null }>(
    'SELECT active_portfolio_id FROM runtime_state WHERE id = 1',
  );
  const prev = rt?.active_portfolio_id;
  if (prev) {
    const open = await db.first<{ n: number }>(
      `SELECT COUNT(*) AS n FROM positions WHERE portfolio_id = ? AND status <> 'CLOSED'`,
      [prev],
    );
    if (Number(open?.n ?? 0) > 0)
      throw new Error('close or liquidate open paper positions before resetting the portfolio');
    await db.batch([
      {
        sql: `UPDATE portfolios SET status = 'ARCHIVED', archived_at = ?, archived_reason = ? WHERE id = ?`,
        params: [o.now, o.reason, prev],
      },
      await auditStmt({
        category: 'ADMIN',
        action: 'PORTFOLIO_ARCHIVED',
        actor: o.actor,
        subjectType: 'portfolio',
        subjectId: prev,
        detail: { reason: o.reason },
        at: o.now,
      }),
    ]);
  }
  return createPortfolio(db, {
    name: `Paper portfolio ${new Date(o.now).toISOString().slice(0, 10)}`,
    startingEquityUsd: o.startingEquityUsd,
    now: o.now,
    actor: o.actor,
    timezone: o.timezone,
  });
}
