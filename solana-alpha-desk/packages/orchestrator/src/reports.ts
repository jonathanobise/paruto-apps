import { computeMetrics, segment, type ClosedTrade } from '@alpha-desk/analytics';
import { big, type SqlDb } from '@alpha-desk/db';
import { hashObject, newId } from '@alpha-desk/shared';
import { auditStmt } from './audit-writer.ts';
import type { Ctx } from './context.ts';

export type ReportKind =
  | 'MORNING'
  | 'DAILY_PNL'
  | 'REJECTION_FUNNEL'
  | 'AGENT_RELIABILITY'
  | 'WEEKLY'
  | 'STRATEGY_COMPARISON'
  | 'INCIDENT';

export const PAPER_DISCLAIMER =
  'Paper trading only. All fills are simulated from executable quotes; no transaction was signed or broadcast and no real funds were used. Simulated results are not a guarantee of live performance.';

export async function closedTrades(
  db: SqlDb,
  portfolioId: string | null,
  from: number,
  to: number,
): Promise<ClosedTrade[]> {
  const rows = await db.all<Record<string, string | number | null>>(
    `SELECT p.id, p.mint, p.symbol, p.entry_at, p.exit_at, p.entry_cost_micro, p.realized_pnl_micro, p.entry_fees_micro, p.exit_fees_micro, p.planned_risk_micro,
            p.entry_reference_price_usd, p.highest_reference_usd, p.lowest_reference_usd, p.exit_reason, p.strategy_version,
            c.pair_created_at, c.market_cap_usd, c.liquidity_usd, c.analyst_score
     FROM positions p JOIN candidate_discoveries c ON c.id = p.candidate_id
     WHERE p.status = 'CLOSED' AND p.exit_at >= ? AND p.exit_at < ? ${portfolioId ? 'AND p.portfolio_id = ?' : ''} ORDER BY p.exit_at`,
    portfolioId ? [from, to, portfolioId] : [from, to],
  );
  return rows.map((r) => {
    const entryRef = Number(r.entry_reference_price_usd);
    const pnl = big(r.realized_pnl_micro);
    const risk = big(r.planned_risk_micro);
    return {
      id: String(r.id),
      mint: String(r.mint),
      symbol: (r.symbol as string | null) ?? null,
      entryAt: Number(r.entry_at),
      exitAt: Number(r.exit_at),
      entryCostMicro: big(r.entry_cost_micro),
      realizedPnlMicro: pnl,
      feesMicro: big(r.entry_fees_micro) + big(r.exit_fees_micro),
      rMultiple: risk > 0n ? Number(pnl) / Number(risk) : null,
      mfePct: entryRef > 0 ? (Number(r.highest_reference_usd) / entryRef - 1) * 100 : null,
      maePct: entryRef > 0 ? (Number(r.lowest_reference_usd) / entryRef - 1) * 100 : null,
      exitReason: String(r.exit_reason ?? 'UNKNOWN'),
      strategyVersion: String(r.strategy_version),
      tokenAgeMinutesAtEntry: r.pair_created_at
        ? (Number(r.entry_at) - Number(r.pair_created_at)) / 60_000
        : null,
      marketCapAtEntry: r.market_cap_usd ? Number(r.market_cap_usd) : null,
      liquidityAtEntry: r.liquidity_usd ? Number(r.liquidity_usd) : null,
      scoreAtEntry: r.analyst_score ? Number(r.analyst_score) : null,
    };
  });
}

async function funnel(db: SqlDb, from: number, to: number) {
  const states = await db.all<{ state: string; n: number }>(
    `SELECT state, COUNT(*) AS n FROM candidate_discoveries WHERE discovered_at >= ? AND discovered_at < ? GROUP BY state`,
    [from, to],
  );
  const rules = await db.all<{ rule_id: string; outcome: string; n: number }>(
    `SELECT r.rule_id, r.outcome, COUNT(*) AS n FROM security_rule_results r JOIN token_security_assessments a ON a.id = r.assessment_id
     WHERE a.completed_at >= ? AND a.completed_at < ? AND r.outcome IN ('FAIL', 'UNVERIFIED', 'ERROR') GROUP BY r.rule_id, r.outcome ORDER BY n DESC`,
    [from, to],
  );
  const discovery = await db.all<{ rejection_codes: string }>(
    `SELECT rejection_codes FROM candidate_discoveries WHERE state = 'DISCOVERY_REJECTED' AND discovered_at >= ? AND discovered_at < ?`,
    [from, to],
  );
  const codes = new Map<string, number>();
  for (const d of discovery)
    for (const c of JSON.parse(d.rejection_codes || '[]') as string[]) codes.set(c, (codes.get(c) ?? 0) + 1);
  return {
    byState: Object.fromEntries(states.map((s) => [s.state, Number(s.n)])),
    filterRuleOutcomes: rules.map((r) => ({ rule: r.rule_id, outcome: r.outcome, count: Number(r.n) })),
    discoveryRejections: Object.fromEntries([...codes.entries()].sort((a, b) => b[1] - a[1])),
  };
}

/** Builds, stores and returns one report. Reports carry their exact period, timezone and the paper disclaimer. */
export async function generateReport(
  ctx: Ctx,
  kind: ReportKind,
  periodStart: number,
  periodEnd: number,
): Promise<{ id: string; body: Record<string, unknown> }> {
  const rt = await ctx.db.first<{ active_portfolio_id: string | null; timezone: string }>(
    'SELECT active_portfolio_id, timezone FROM runtime_state WHERE id = 1',
  );
  const pid = rt?.active_portfolio_id ?? null;
  const tz = rt?.timezone ?? 'UTC';
  const trades = await closedTrades(ctx.db, pid, periodStart, periodEnd);
  const equity = (
    await ctx.db.all<{ observed_at: number; equity_micro: string }>(
      `SELECT observed_at, equity_micro FROM portfolio_equity_snapshots WHERE portfolio_id = ? AND observed_at >= ? AND observed_at < ? ORDER BY observed_at`,
      [pid, periodStart, periodEnd],
    )
  ).map((e) => ({ at: e.observed_at, equityMicro: big(e.equity_micro) }));
  const body: Record<string, unknown> = {
    kind,
    period: {
      start: new Date(periodStart).toISOString(),
      end: new Date(periodEnd).toISOString(),
      timezone: tz,
    },
    generatedAt: new Date(ctx.clock.now()).toISOString(),
    portfolioId: pid,
    disclaimer: PAPER_DISCLAIMER,
  };
  const alerts = await ctx.db.all(
    `SELECT severity, source, title, detail, created_at FROM system_alerts WHERE created_at >= ? AND created_at < ? ORDER BY created_at`,
    [periodStart, periodEnd],
  );
  const breakers = await ctx.db.all(
    `SELECT breaker, action, detail, actor, created_at FROM circuit_breaker_events WHERE created_at >= ? AND created_at < ? ORDER BY created_at`,
    [periodStart, periodEnd],
  );
  switch (kind) {
    case 'MORNING':
    case 'DAILY_PNL':
    case 'WEEKLY': {
      body.metrics = computeMetrics(trades, equity);
      body.equity = equity.length
        ? { start: equity[0]!.equityMicro.toString(), end: equity[equity.length - 1]!.equityMicro.toString() }
        : null;
      body.trades = trades.map((t) => ({
        ...t,
        entryCostMicro: t.entryCostMicro.toString(),
        realizedPnlMicro: t.realizedPnlMicro.toString(),
        feesMicro: t.feesMicro.toString(),
      }));
      body.openPositions = pid
        ? await ctx.db.all(
            `SELECT id, symbol, mint, entry_at, entry_cost_micro, last_mark_usd, effective_stop_usd, trailing_active FROM positions WHERE portfolio_id = ? AND status <> 'CLOSED'`,
            [pid],
          )
        : [];
      body.funnel = await funnel(ctx.db, periodStart, periodEnd);
      body.breakers = breakers;
      body.alerts = alerts;
      if (kind === 'WEEKLY')
        body.segments = Object.fromEntries(
          ['tokenAge', 'marketCap', 'liquidity', 'scoreBand', 'hourUtc', 'exitReason'].map((k) => [
            k,
            segment(trades, k as 'tokenAge'),
          ]),
        );
      break;
    }
    case 'REJECTION_FUNNEL':
      body.funnel = await funnel(ctx.db, periodStart, periodEnd);
      break;
    case 'AGENT_RELIABILITY':
      body.agents = await ctx.db.all('SELECT * FROM background_jobs ORDER BY id');
      body.providers = await ctx.db.all(
        `SELECT provider_id, SUM(calls) AS calls, SUM(errors) AS errors, SUM(rate_limited) AS rate_limited, SUM(total_latency_ms) * 1.0 / MAX(SUM(calls), 1) AS avg_latency_ms, MAX(max_latency_ms) AS max_latency_ms FROM provider_health WHERE window_start >= ? AND window_start < ? GROUP BY provider_id`,
        [periodStart, periodEnd],
      );
      body.deadLetters = await ctx.db.all(
        `SELECT id, queue, last_error, updated_at FROM work_items WHERE status = 'DEAD' AND updated_at >= ? AND updated_at < ?`,
        [periodStart, periodEnd],
      );
      body.fillReliability = await ctx.db.all(
        `SELECT side, status, COUNT(*) AS n FROM paper_orders WHERE created_at >= ? AND created_at < ? GROUP BY side, status`,
        [periodStart, periodEnd],
      );
      break;
    case 'STRATEGY_COMPARISON':
      body.byStrategy = segment(trades, 'strategy');
      body.configs = await ctx.db.all(
        'SELECT config_version, strategy_version, created_at, created_by FROM strategy_configs ORDER BY created_at',
      );
      break;
    case 'INCIDENT':
      body.alerts = alerts;
      body.breakers = breakers;
      body.apiErrors = await ctx.db.all(
        `SELECT action, detail, created_at FROM audit_events WHERE category = 'API_ERROR' AND created_at >= ? AND created_at < ? ORDER BY created_at LIMIT 500`,
        [periodStart, periodEnd],
      );
      break;
  }
  const json = JSON.stringify(body, (_k, v) => (typeof v === 'bigint' ? v.toString() : v));
  const sha = await hashObject(JSON.parse(json));
  const id = newId('rp', ctx.clock.now());
  const key = `reports/${kind.toLowerCase()}/${new Date(periodEnd).toISOString().slice(0, 10)}/${id}.json`;
  await ctx.evidenceStore.put(key, json);
  await ctx.db.batch([
    {
      sql: `INSERT INTO report_runs (id, kind, period_start, period_end, timezone, portfolio_id, status, body, storage_key, sha256, created_at) VALUES (?, ?, ?, ?, ?, ?, 'COMPLETED', ?, ?, ?, ?)
            ON CONFLICT(kind, period_start, period_end, portfolio_id) DO NOTHING`,
      params: [id, kind, periodStart, periodEnd, tz, pid, json, key, sha, ctx.clock.now()],
    },
    await auditStmt({
      category: 'REPORT',
      action: kind,
      actor: 'LOGGER',
      subjectType: 'report',
      subjectId: id,
      detail: { periodStart, periodEnd, sha256: sha },
      at: ctx.clock.now(),
    }),
  ]);
  return { id, body: JSON.parse(json) as Record<string, unknown> };
}
