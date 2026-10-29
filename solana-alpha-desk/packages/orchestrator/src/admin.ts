import { StrategyConfigSchema, versionConfig, type StrategyConfig } from '@alpha-desk/config';
import { big, type Statement } from '@alpha-desk/db';
import { canReset, type Breaker } from '@alpha-desk/risk';
import { newId, RUNTIME_MODES, type RuntimeMode } from '@alpha-desk/shared';
import { auditStmt } from './audit-writer.ts';
import { localDate } from './bootstrap.ts';
import type { Ctx } from './context.ts';
import { requestExit } from './execution-stage.ts';
import { transition } from './handoffs.ts';
import { tripBreaker, runReconciliation } from './monitor-stage.ts';
import { enqueue } from './queue.ts';
import { equityOf, getCandidate, getPortfolio, getRuntime, openPositions } from './repo.ts';
import { providerErrorRates } from './health.ts';

export async function setMode(ctx: Ctx, mode: RuntimeMode, actor: string, reason: string): Promise<void> {
  if (!RUNTIME_MODES.includes(mode)) throw new Error('unknown mode');
  const rt = await getRuntime(ctx.db);
  const now = ctx.clock.now();
  if (rt.mode === 'EMERGENCY_PAUSED' && mode !== 'EMERGENCY_PAUSED') {
    const tripped = await ctx.db.first<{ tripped: number }>(
      `SELECT tripped FROM circuit_breakers WHERE breaker = 'EMERGENCY_PAUSE' AND portfolio_id = '*'`,
    );
    if (tripped?.tripped === 1)
      throw new Error('reset the EMERGENCY_PAUSE breaker before leaving emergency pause');
  }
  await ctx.db.batch([
    {
      sql: `INSERT INTO configuration_changes (id, scope, previous_value, new_value, reason, actor, created_at) VALUES (?, 'RUNTIME', ?, ?, ?, ?, ?)`,
      params: [newId('cc', now), rt.mode, mode, reason, actor, now],
    },
    {
      sql: 'UPDATE runtime_state SET mode = ?, updated_at = ?, updated_by = ? WHERE id = 1',
      params: [mode, now, actor],
    },
    await auditStmt({
      category: 'ADMIN',
      action: 'MODE_CHANGED',
      actor,
      detail: { from: rt.mode, to: mode, reason },
      at: now,
    }),
  ]);
  if (mode === 'EMERGENCY_PAUSED')
    await tripBreaker(ctx, 'EMERGENCY_PAUSE', null, `emergency pause by ${actor}: ${reason}`, actor);
}

/** Documented reset procedure (docs/risk-policy.md): phrase + reason + the tripping condition has cleared. */
export async function resetBreaker(
  ctx: Ctx,
  breaker: Breaker,
  phrase: string,
  reason: string,
  actor: string,
): Promise<void> {
  const rt = await getRuntime(ctx.db);
  const pid = rt.active_portfolio_id!;
  const { config: cfg } = await ctx.config();
  const row = await ctx.db.first<{ portfolio_id: string; tripped_at: number }>(
    `SELECT portfolio_id, tripped_at FROM circuit_breakers WHERE breaker = ? AND tripped = 1`,
    [breaker],
  );
  if (!row) throw new Error(`${breaker} is not tripped`);
  const now = ctx.clock.now();
  const eq = await equityOf(ctx.db, pid);
  const pf = await getPortfolio(ctx.db, pid);
  const rates = await providerErrorRates(ctx.db, now, 5 * 60_000);
  const dataHealthy = ['dexscreener', 'jupiter', 'solana-rpc'].every(
    (p) => !rates[p] || rates[p]!.rate < 0.5,
  );
  const integrityOk = breaker === 'DB_INTEGRITY' ? (await runReconciliation(ctx)).ok : true;
  const check = canReset(breaker, {
    phrase,
    reason,
    equity: {
      equityMicro: eq.equity,
      dayOpenEquityMicro: big(pf.day_open_equity_micro),
      peakEquityMicro: big(pf.peak_equity_micro),
    },
    cfg: cfg.risk,
    dataHealthy,
    integrityOk,
    today: localDate(now, rt.timezone),
    trippedDay: localDate(row.tripped_at, rt.timezone),
  });
  if (!check.allowed) throw new Error(check.reason);
  const id = newId('cb', now);
  const stmts: Statement[] = [
    {
      sql: `INSERT INTO circuit_breaker_events (id, portfolio_id, breaker, action, detail, actor, reset_confirmation, created_at) VALUES (?, ?, ?, 'RESET', ?, ?, ?, ?)`,
      params: [id, row.portfolio_id === '*' ? null : row.portfolio_id, breaker, reason, actor, phrase, now],
    },
    {
      sql: `UPDATE circuit_breakers SET tripped = 0, last_event_id = ? WHERE breaker = ? AND portfolio_id = ?`,
      params: [id, breaker, row.portfolio_id],
    },
    await auditStmt({
      category: 'BREAKER',
      action: 'RESET',
      actor,
      subjectType: 'breaker',
      subjectId: breaker,
      detail: { reason },
      at: now,
    }),
  ];
  // A drawdown reset re-bases the peak to current equity (recorded), otherwise it would re-trip immediately.
  if (breaker === 'MAX_DRAWDOWN')
    stmts.push({
      sql: 'UPDATE portfolios SET peak_equity_micro = ? WHERE id = ?',
      params: [eq.equity.toString(), pid],
    });
  if (breaker === 'DB_INTEGRITY')
    stmts.push({
      sql: `UPDATE runtime_state SET entries_paused_reason = NULL, updated_at = ?, updated_by = ? WHERE id = 1 AND entries_paused_reason = 'ledger reconciliation failed'`,
      params: [now, actor],
    });
  await ctx.db.batch(stmts);
}

/** Emergency liquidation simulation: requests a paper exit for every open position. */
export async function liquidateAll(ctx: Ctx, actor: string, reason: string): Promise<number> {
  const rt = await getRuntime(ctx.db);
  if (!rt.active_portfolio_id) return 0;
  let n = 0;
  for (const p of await openPositions(ctx.db, rt.active_portfolio_id)) {
    if (p.status === 'OPEN' || p.status === 'EXIT_FAILED')
      if (await requestExit(ctx, p, 'EMERGENCY', 'OWNER', { actor, reason })) n++;
  }
  await ctx.db.batch([
    await auditStmt({
      category: 'ADMIN',
      action: 'LIQUIDATION_REQUESTED',
      actor,
      detail: { positions: n, reason },
      at: ctx.clock.now(),
    }),
  ]);
  return n;
}

export async function closePosition(ctx: Ctx, positionId: string, actor: string): Promise<boolean> {
  const p = await ctx.db.first<Parameters<typeof requestExit>[1]>('SELECT * FROM positions WHERE id = ?', [
    positionId,
  ]);
  if (!p) throw new Error('position not found');
  return requestExit(ctx, p, 'MANUAL', 'OWNER', { actor });
}

/** PAPER_MANUAL: the owner approves an Analyst-approved opportunity; Risk still decides independently. */
export async function approveOpportunity(ctx: Ctx, candidateId: string, actor: string): Promise<void> {
  const rt = await getRuntime(ctx.db);
  if (rt.mode !== 'PAPER_MANUAL') throw new Error('manual approval is only used in PAPER_MANUAL mode');
  const c = await getCandidate(ctx.db, candidateId);
  if (!c || c.state !== 'ANALYST_APPROVED')
    throw new Error(`candidate is ${c?.state ?? 'missing'}, not ANALYST_APPROVED`);
  const now = ctx.clock.now();
  const r = await transition(ctx.db, {
    candidate: c,
    next: 'RISK_PENDING',
    by: 'OWNER',
    to: 'RISK',
    eventType: 'OWNER_APPROVED',
    observedAt: now,
    now,
    payload: { actor },
  });
  if (r.status !== 'COMMITTED') throw new Error(`approval not applied: ${r.status}`);
  await enqueue(ctx.db, 'risk', `risk:${c.id}`, { candidateId: c.id }, now, c.id);
}

export async function updateStrategy(
  ctx: Ctx,
  next: StrategyConfig,
  actor: string,
  reason: string,
): Promise<string> {
  const parsed = StrategyConfigSchema.parse(next);
  const { configVersion } = await versionConfig(parsed);
  const rt = await getRuntime(ctx.db);
  const now = ctx.clock.now();
  await ctx.db.batch([
    {
      sql: 'INSERT OR IGNORE INTO strategy_configs (config_version, strategy_version, body, created_at, created_by) VALUES (?, ?, ?, ?, ?)',
      params: [configVersion, parsed.strategyVersion, JSON.stringify(parsed), now, actor],
    },
    {
      sql: `INSERT INTO configuration_changes (id, scope, previous_value, new_value, reason, actor, created_at) VALUES (?, 'STRATEGY', ?, ?, ?, ?, ?)`,
      params: [newId('cc', now), rt.active_config_version, configVersion, reason, actor, now],
    },
    {
      sql: 'UPDATE runtime_state SET active_config_version = ?, updated_at = ?, updated_by = ? WHERE id = 1',
      params: [configVersion, now, actor],
    },
    await auditStmt({
      category: 'CONFIG',
      action: 'STRATEGY_ACTIVATED',
      actor,
      detail: {
        from: rt.active_config_version,
        to: configVersion,
        strategyVersion: parsed.strategyVersion,
        reason,
      },
      at: now,
    }),
  ]);
  return configVersion;
}

export async function updateRuntimeSettings(
  ctx: Ctx,
  s: { timezone?: string; reportHourLocal?: number; apiDailyCallCap?: number },
  actor: string,
): Promise<void> {
  const rt = await getRuntime(ctx.db);
  const now = ctx.clock.now();
  if (s.timezone) new Intl.DateTimeFormat('en', { timeZone: s.timezone }); // throws on an invalid zone
  const next = {
    timezone: s.timezone ?? rt.timezone,
    report_hour_local: s.reportHourLocal ?? rt.report_hour_local,
    api_daily_call_cap: s.apiDailyCallCap ?? rt.api_daily_call_cap,
  };
  await ctx.db.batch([
    {
      sql: 'UPDATE runtime_state SET timezone = ?, report_hour_local = ?, api_daily_call_cap = ?, updated_at = ?, updated_by = ? WHERE id = 1',
      params: [next.timezone, next.report_hour_local, next.api_daily_call_cap, now, actor],
    },
    {
      sql: `INSERT INTO configuration_changes (id, scope, previous_value, new_value, reason, actor, created_at) VALUES (?, 'RUNTIME', ?, ?, 'settings', ?, ?)`,
      params: [
        newId('cc', now),
        JSON.stringify({
          timezone: rt.timezone,
          report_hour_local: rt.report_hour_local,
          api_daily_call_cap: rt.api_daily_call_cap,
        }),
        JSON.stringify(next),
        actor,
        now,
      ],
    },
    await auditStmt({ category: 'CONFIG', action: 'RUNTIME_SETTINGS', actor, detail: next, at: now }),
  ]);
}
