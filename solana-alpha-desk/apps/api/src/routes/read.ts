import type { Hono } from 'hono';
import { computeMetrics, segment, SEGMENTERS } from '@alpha-desk/analytics';
import { big } from '@alpha-desk/db';
import { markValueMicro } from '@alpha-desk/execution';
import { closedTrades, equityOf, getRuntime, loadConfig, queueDepths } from '@alpha-desk/orchestrator';
import { BREAKERS, resetPhrase } from '@alpha-desk/risk';
import { RULE_TITLES } from '@alpha-desk/security';
import { DAY, Decimal, HOUR } from '@alpha-desk/shared';
import { fail, ok, type HonoEnv } from '../app.ts';

const AGENTS = [
  { id: 'scout', name: 'Scout', role: 'Discovers new Solana pairs from DexScreener and GeckoTerminal' },
  { id: 'filter', name: 'Filter', role: 'Enforces hard security and eligibility rules F001–F018' },
  { id: 'analyst', name: 'Analyst', role: 'Scores approved candidates on six versioned factors' },
  { id: 'risk', name: 'Risk', role: 'Sizes and authorizes paper orders; supervises open positions' },
  { id: 'executor', name: 'Executor', role: 'Simulates fills from executable Jupiter quotes' },
  { id: 'position-monitor', name: 'Logger', role: 'Audit log, ledger, reconciliation and reports' },
];

export function readRoutes(api: Hono<HonoEnv>): void {
  api.get('/overview', async (c) => {
    const { db, now } = c.get('deps');
    const t = now();
    const rt = await getRuntime(db);
    const pid = rt.active_portfolio_id;
    const pf = pid
      ? await db.first<{
          starting_equity_micro: string;
          peak_equity_micro: string;
          day_open_equity_micro: string;
          created_at: number;
          name: string;
        }>(
          'SELECT starting_equity_micro, peak_equity_micro, day_open_equity_micro, created_at, name FROM portfolios WHERE id = ?',
          [pid],
        )
      : null;
    const eq = pid ? await equityOf(db, pid) : null;
    const realized = pid
      ? await db.first<{ s: number | null; n: number }>(
          `SELECT SUM(CAST(realized_pnl_micro AS INTEGER)) AS s, COUNT(*) AS n FROM positions WHERE portfolio_id = ? AND status = 'CLOSED'`,
          [pid],
        )
      : null;
    const unrealized = eq
      ? eq.positions.reduce(
          (s, p) =>
            s +
            (p.last_mark_usd
              ? markValueMicro(
                  { quantity: big(p.quantity), tokenDecimals: p.token_decimals },
                  new Decimal(p.last_mark_usd),
                ) - big(p.entry_cost_micro)
              : 0n),
          0n,
        )
      : 0n;
    const maxDd = pid
      ? await db.first<{ dd: string | null }>(
          'SELECT MAX(CAST(drawdown_pct AS REAL)) AS dd FROM portfolio_equity_snapshots WHERE portfolio_id = ?',
          [pid],
        )
      : null;
    const funnel = await db.all<{ state: string; n: number }>(
      'SELECT state, COUNT(*) AS n FROM candidate_discoveries WHERE discovered_at > ? GROUP BY state',
      [t - DAY],
    );
    const top = await db.all(
      `SELECT o.candidate_id, o.mint, o.score, o.rank, o.data_quality, o.signal_at, t.symbol, c.state FROM opportunities o JOIN tokens t ON t.mint = o.mint JOIN candidate_discoveries c ON c.id = o.candidate_id WHERE o.status = 'ACTIVE' ORDER BY o.rank LIMIT 5`,
    );
    const rejected = await db.all(
      `SELECT c.id, c.mint, t.symbol, c.state, c.rejection_codes, c.updated_at FROM candidate_discoveries c JOIN tokens t ON t.mint = c.mint WHERE c.state IN ('FILTER_REJECTED','FILTER_UNVERIFIED','FILTER_ERROR','ANALYST_REJECTED','ANALYST_UNVERIFIED','RISK_REJECTED','RISK_PAUSED') ORDER BY c.updated_at DESC LIMIT 8`,
    );
    const jobs = await db.all<{
      id: string;
      status: string;
      heartbeat_at: number | null;
      last_success_at: number | null;
      last_error: string | null;
    }>('SELECT id, status, heartbeat_at, last_success_at, last_error FROM background_jobs');
    const feeds = await db.all<{
      provider_id: string;
      last_ok: number | null;
      errors: number;
      calls: number;
    }>(
      'SELECT provider_id, MAX(last_success_at) AS last_ok, SUM(errors) AS errors, SUM(calls) AS calls FROM provider_health WHERE window_start > ? GROUP BY provider_id',
      [t - HOUR],
    );
    const breakers = await db.all(
      'SELECT breaker, portfolio_id, tripped_at, detail FROM circuit_breakers WHERE tripped = 1',
    );
    const alerts = await db.all(
      `SELECT id, severity, source, title, created_at FROM system_alerts WHERE acknowledged_at IS NULL ORDER BY created_at DESC LIMIT 5`,
    );
    const monitor = jobs.find((j) => j.id === 'monitor');
    const monitorAlive = monitor?.heartbeat_at ? t - monitor.heartbeat_at < 60_000 : false;
    const start = pf ? big(pf.starting_equity_micro) : 0n;
    return ok(c, {
      kind: 'PAPER',
      asOf: t,
      mode: rt.mode,
      entriesPausedReason: rt.entries_paused_reason,
      portfolio:
        pf && eq
          ? {
              id: pid,
              name: pf.name,
              since: pf.created_at,
              equityMicro: eq.equity.toString(),
              cashMicro: eq.cash.toString(),
              positionsValueMicro: eq.positionsValue.toString(),
              marksComplete: eq.complete,
              unrealizedMicro: unrealized.toString(),
              realizedMicro: String(realized?.s ?? 0),
              closedTrades: Number(realized?.n ?? 0),
              dailyChangeMicro: (eq.equity - big(pf.day_open_equity_micro)).toString(),
              cumulativeChangeMicro: (eq.equity - start).toString(),
              startingEquityMicro: start.toString(),
              exposurePct:
                eq.equity > 0n
                  ? new Decimal(eq.positionsValue.toString()).div(eq.equity.toString()).mul(100).toFixed(2)
                  : '0',
              maxDrawdownPct:
                maxDd?.dd === null || maxDd?.dd === undefined ? null : Number(maxDd.dd).toFixed(2),
              activePositions: eq.positions.length,
            }
          : null,
      funnel: Object.fromEntries(funnel.map((f) => [f.state, Number(f.n)])),
      topOpportunities: top,
      recentRejections: rejected,
      agents: jobs,
      monitorAlive,
      feeds,
      breakers,
      alerts,
      systemStatus: breakers.length
        ? 'PAUSED'
        : !monitorAlive
          ? 'UNAVAILABLE'
          : feeds.some((f) => Number(f.calls) > 0 && Number(f.errors) / Number(f.calls) > 0.3)
            ? 'DEGRADED'
            : 'HEALTHY',
    });
  });

  api.get('/candidates', async (c) => {
    const { db } = c.get('deps');
    const q = c.req.query();
    const page = Math.max(0, Number(q.page ?? 0));
    const size = Math.min(200, Math.max(10, Number(q.size ?? 50)));
    const where: string[] = [];
    const params: Array<string | number> = [];
    if (q.state) {
      const states = q.state.split(',').filter((s) => /^[A-Z_]+$/.test(s));
      if (states.length) {
        where.push(`c.state IN (${states.map(() => '?').join(',')})`);
        params.push(...states);
      }
    }
    if (q.q) {
      where.push('(t.symbol LIKE ? OR t.name LIKE ? OR c.mint = ?)');
      params.push(`%${q.q}%`, `%${q.q}%`, q.q);
    }
    if (q.minMcap) (where.push('CAST(c.market_cap_usd AS REAL) >= ?'), params.push(Number(q.minMcap)));
    if (q.maxMcap) (where.push('CAST(c.market_cap_usd AS REAL) <= ?'), params.push(Number(q.maxMcap)));
    if (q.minLiq) (where.push('CAST(c.liquidity_usd AS REAL) >= ?'), params.push(Number(q.minLiq)));
    if (q.since) (where.push('c.discovered_at >= ?'), params.push(Number(q.since)));
    const sortCols: Record<string, string> = {
      discovered: 'c.discovered_at',
      age: 'c.pair_created_at',
      mcap: 'CAST(c.market_cap_usd AS REAL)',
      liquidity: 'CAST(c.liquidity_usd AS REAL)',
      volume: 'CAST(c.volume_1h_usd AS REAL)',
      change: 'CAST(c.price_change_1h_pct AS REAL)',
      score: 'CAST(c.analyst_score AS REAL)',
      symbol: 't.symbol',
    };
    const sort = sortCols[q.sort ?? 'discovered'] ?? 'c.discovered_at';
    const dir = q.dir === 'asc' ? 'ASC' : 'DESC';
    const w = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const rows = await db.all(
      `SELECT c.id, c.mint, t.symbol, t.name, c.pair_address, p.dex_id, p.pool_type, c.state, c.rejection_codes, c.pair_created_at, c.earliest_pool_at,
              c.market_cap_usd, c.fdv_usd, c.liquidity_usd, c.volume_1h_usd, c.price_change_1h_pct, c.filter_status, c.analyst_score, c.source, c.discovered_at, c.updated_at
       FROM candidate_discoveries c JOIN tokens t ON t.mint = c.mint LEFT JOIN token_pools p ON p.pair_address = c.pair_address
       ${w} ORDER BY ${sort} ${dir} NULLS LAST LIMIT ? OFFSET ?`,
      [...params, size, page * size],
    );
    const total = await db.first<{ n: number }>(
      `SELECT COUNT(*) AS n FROM candidate_discoveries c JOIN tokens t ON t.mint = c.mint ${w}`,
      params,
    );
    return ok(c, { rows, page, size, total: Number(total?.n ?? 0) });
  });

  api.get('/tokens/:mint', async (c) => {
    const { db } = c.get('deps');
    const mint = c.req.param('mint');
    const token = await db.first('SELECT * FROM tokens WHERE mint = ?', [mint]);
    if (!token) return fail(c, 404, 'token not found');
    const pools = await db.all('SELECT * FROM token_pools WHERE mint = ? ORDER BY first_seen_at', [mint]);
    const runs = await db.all(
      'SELECT * FROM candidate_discoveries WHERE mint = ? ORDER BY discovered_at DESC LIMIT 20',
      [mint],
    );
    const snapshots = await db.all(
      'SELECT observed_at, price_usd, market_cap_usd, liquidity_usd, volume_h1, change_h1, buys_h1, sells_h1 FROM market_snapshots WHERE mint = ? ORDER BY observed_at DESC LIMIT 500',
      [mint],
    );
    const assessment = await db.first<{ id: string }>(
      'SELECT * FROM token_security_assessments WHERE mint = ? ORDER BY completed_at DESC LIMIT 1',
      [mint],
    );
    const rules = assessment
      ? await db.all(
          'SELECT rule_id, outcome, observed, threshold, reason, evidence_ids FROM security_rule_results WHERE assessment_id = ? ORDER BY rule_id',
          [assessment.id],
        )
      : [];
    const holders = await db.first(
      "SELECT * FROM holder_snapshots WHERE mint = ? AND classification <> '[]' ORDER BY observed_at DESC LIMIT 1",
      [mint],
    );
    const holderCounts = await db.all(
      'SELECT observed_at, holder_count FROM holder_snapshots WHERE mint = ? AND holder_count IS NOT NULL ORDER BY observed_at',
      [mint],
    );
    const developer = await db.first(
      'SELECT * FROM developer_histories WHERE mint = ? ORDER BY observed_at DESC LIMIT 1',
      [mint],
    );
    const bundle = await db.first(
      'SELECT * FROM launch_bundle_assessments WHERE mint = ? ORDER BY observed_at DESC LIMIT 1',
      [mint],
    );
    const score = await db.first<{ id: string }>(
      'SELECT * FROM analyst_scores WHERE mint = ? ORDER BY scored_at DESC LIMIT 1',
      [mint],
    );
    const factors = score
      ? await db.all('SELECT * FROM score_factors WHERE score_id = ? ORDER BY CAST(weight AS REAL) DESC', [
          score.id,
        ])
      : [];
    const positions = await db.all('SELECT * FROM positions WHERE mint = ? ORDER BY entry_at DESC', [mint]);
    return ok(c, {
      token,
      pools,
      runs,
      snapshots: snapshots.reverse(),
      assessment,
      rules: rules.map((r) => ({
        ...(r as object),
        title: RULE_TITLES[(r as { rule_id: keyof typeof RULE_TITLES }).rule_id],
      })),
      holders,
      holderCounts,
      developer,
      bundle,
      score,
      factors,
      positions,
    });
  });

  api.get('/opportunities', async (c) => {
    const { db } = c.get('deps');
    const rows = await db.all(
      `SELECT o.*, t.symbol, t.name, c.state, c.eligible_until, c.market_cap_usd, c.liquidity_usd, c.pair_address
       FROM opportunities o JOIN tokens t ON t.mint = o.mint JOIN candidate_discoveries c ON c.id = o.candidate_id
       ORDER BY CASE o.status WHEN 'ACTIVE' THEN 0 ELSE 1 END, o.rank, o.signal_at DESC LIMIT 100`,
    );
    const changes = await db.all('SELECT * FROM ranking_changes ORDER BY created_at DESC LIMIT 50');
    return ok(c, { rows, changes });
  });

  api.get('/positions', async (c) => {
    const { db } = c.get('deps');
    const rt = await getRuntime(db);
    const status = c.req.query('status');
    const rows = await db.all(
      `SELECT * FROM positions WHERE portfolio_id = ? ${status === 'open' ? "AND status <> 'CLOSED'" : status === 'closed' ? "AND status = 'CLOSED'" : ''} ORDER BY entry_at DESC LIMIT 200`,
      [rt.active_portfolio_id],
    );
    return ok(c, { rows });
  });

  api.get('/positions/:id', async (c) => {
    const { db } = c.get('deps');
    const id = c.req.param('id');
    const position = await db.first('SELECT * FROM positions WHERE id = ?', [id]);
    if (!position) return fail(c, 404, 'position not found');
    const marks = await db.all(
      'SELECT observed_at, reference_price_usd, value_micro, route_ok FROM position_marks WHERE position_id = ? ORDER BY observed_at',
      [id],
    );
    const stops = await db.all('SELECT * FROM stop_events WHERE position_id = ? ORDER BY created_at', [id]);
    const orders = await db.all(
      'SELECT * FROM paper_orders WHERE position_id = ? OR id = (SELECT entry_order_id FROM positions WHERE id = ?) ORDER BY created_at',
      [id, id],
    );
    const fills = await db.all(
      'SELECT f.* FROM fills f JOIN paper_orders o ON o.id = f.order_id WHERE o.position_id = ? OR o.id = (SELECT entry_order_id FROM positions WHERE id = ?) ORDER BY simulated_at',
      [id, id],
    );
    return ok(c, { position, marks, stops, orders, fills });
  });

  api.get('/orders', async (c) => {
    const { db } = c.get('deps');
    const rows = await db.all(
      `SELECT o.*, t.symbol, f.price_usd, f.slippage_bps, f.network_fee_micro, f.usd_amount_micro, f.token_quantity FROM paper_orders o LEFT JOIN tokens t ON t.mint = o.mint LEFT JOIN fills f ON f.order_id = o.id ORDER BY o.created_at DESC LIMIT 200`,
    );
    const proposals = await db.all(
      `SELECT p.*, r.decision, r.reasons, r.expires_at, r.consumed_at, r.invalidated_reason, t.symbol FROM proposed_orders p JOIN risk_authorizations r ON r.proposed_order_id = p.id LEFT JOIN tokens t ON t.mint = p.mint ORDER BY p.created_at DESC LIMIT 100`,
    );
    return ok(c, { rows, proposals });
  });

  api.get('/risk', async (c) => {
    const { db, now } = c.get('deps');
    const t = now();
    const rt = await getRuntime(db);
    const { config } = await loadConfig(db);
    const pid = rt.active_portfolio_id!;
    const eq = await equityOf(db, pid);
    const pf = await db.first<{ peak_equity_micro: string; day_open_equity_micro: string }>(
      'SELECT peak_equity_micro, day_open_equity_micro FROM portfolios WHERE id = ?',
      [pid],
    );
    const positions = eq.positions.map((p) => {
      const qty = new Decimal(p.quantity).div(new Decimal(10).pow(p.token_decimals));
      const mark = p.last_mark_usd ? new Decimal(p.last_mark_usd) : null;
      const value = mark ? mark.mul(qty) : null;
      const atStop = new Decimal(p.effective_stop_usd).mul(qty);
      return {
        id: p.id,
        symbol: p.symbol,
        mint: p.mint,
        status: p.status,
        valueUsd: value?.toFixed(2) ?? null,
        downsideToStopUsd: value ? Decimal.max(0, value.sub(atStop)).toFixed(2) : null,
        stopUsd: p.effective_stop_usd,
        markUsd: p.last_mark_usd,
        markAgeS: p.last_mark_at ? Math.round((t - p.last_mark_at) / 1000) : null,
        trailingActive: Boolean(p.trailing_active),
      };
    });
    const equity = new Decimal(eq.equity.toString()).div(1e6);
    const exposure = new Decimal(eq.positionsValue.toString()).div(1e6);
    const largest = positions.reduce<(typeof positions)[number] | null>(
      (m, p) => (!m || Number(p.valueUsd ?? 0) > Number(m.valueUsd ?? 0) ? p : m),
      null,
    );
    const routeFailures = await db.all(
      `SELECT o.id, o.side, o.mint, o.failure_reason, o.resolved_at, t.symbol FROM paper_orders o LEFT JOIN tokens t ON t.mint = o.mint WHERE o.status = 'FAILED' AND o.resolved_at > ? ORDER BY o.resolved_at DESC`,
      [t - DAY],
    );
    const breakers = await db.all('SELECT * FROM circuit_breakers ORDER BY tripped DESC, breaker');
    const outages = await db.all(
      `SELECT provider_id, SUM(errors) AS errors, SUM(calls) AS calls, MAX(last_success_at) AS last_ok, MAX(last_error) AS last_error FROM provider_health WHERE window_start > ? GROUP BY provider_id`,
      [t - 15 * 60_000],
    );
    const liquidity = await db.all(
      `SELECT title, detail, created_at FROM system_alerts WHERE (title LIKE '%liquidity%' OR detail LIKE '%liquidity%') AND created_at > ? ORDER BY created_at DESC LIMIT 20`,
      [t - DAY],
    );
    return ok(c, {
      equityUsd: equity.toFixed(2),
      exposureUsd: exposure.toFixed(2),
      exposurePct: equity.gt(0) ? exposure.div(equity).mul(100).toFixed(2) : '0',
      remainingCapacityUsd: Decimal.max(
        0,
        equity.mul(config.risk.maxCombinedExposurePct).div(100).sub(exposure),
      ).toFixed(2),
      maxAllocationUsd: equity.mul(config.risk.maxAllocationPct).div(100).toFixed(2),
      riskBudgetUsd: equity.mul(config.risk.riskBudgetPct).div(100).toFixed(2),
      openPositions: positions.length,
      maxConcurrent: config.risk.maxConcurrentPositions,
      largest,
      estimatedDownsideUsd: positions
        .reduce((s, p) => s.add(p.downsideToStopUsd ?? 0), new Decimal(0))
        .toFixed(2),
      drawdownPct:
        pf && big(pf.peak_equity_micro) > 0n
          ? new Decimal((big(pf.peak_equity_micro) - eq.equity).toString())
              .div(pf.peak_equity_micro)
              .mul(100)
              .toFixed(2)
          : '0',
      dailyPnlPct:
        pf && big(pf.day_open_equity_micro) > 0n
          ? new Decimal((eq.equity - big(pf.day_open_equity_micro)).toString())
              .div(pf.day_open_equity_micro)
              .mul(100)
              .toFixed(2)
          : '0',
      limits: config.risk,
      positions,
      breakers,
      breakerCatalogue: BREAKERS.map((b) => ({ breaker: b, resetPhrase: resetPhrase(b) })),
      outages,
      routeFailures,
      liquidityWarnings: liquidity,
      entriesPausedReason: rt.entries_paused_reason,
      mode: rt.mode,
    });
  });

  api.get('/agents', async (c) => {
    const { db, now } = c.get('deps');
    const t = now();
    const jobs = await db.all<Record<string, unknown> & { id: string }>(
      'SELECT * FROM background_jobs ORDER BY id',
    );
    const depths = await queueDepths(db);
    const decisions = await db.all<{ source_agent: string; next_state: string; n: number }>(
      'SELECT source_agent, next_state, COUNT(*) AS n FROM handoff_events WHERE generated_at > ? GROUP BY source_agent, next_state',
      [t - DAY],
    );
    const dead = await db.all<{ queue: string; n: number }>(
      `SELECT queue, COUNT(*) AS n FROM work_items WHERE status = 'DEAD' GROUP BY queue`,
    );
    const queueOf: Record<string, string> = {
      filter: 'filter',
      analyst: 'analyst',
      risk: 'risk',
      executor: 'execute',
    };
    return ok(c, {
      agents: AGENTS.map((a) => ({
        ...a,
        job: jobs.find((j) => j.id === a.id) ?? null,
        queueDepth: depths[queueOf[a.id] ?? ''] ?? 0,
        deadLetters: Number(dead.find((d) => d.queue === queueOf[a.id])?.n ?? 0),
        decisions24h: decisions
          .filter((d) => d.source_agent === a.name.toUpperCase())
          .reduce<Record<string, number>>((m, d) => ({ ...m, [d.next_state]: Number(d.n) }), {}),
      })),
      services: jobs.filter((j) => !AGENTS.some((a) => a.id === j.id)),
      queues: depths,
    });
  });

  api.get('/journal', async (c) => {
    const { db } = c.get('deps');
    const rt = await getRuntime(db);
    const rows = await db.all(
      `SELECT p.*, c.analyst_score, c.market_cap_usd AS mcap_at_discovery, c.liquidity_usd AS liquidity_at_discovery, c.pair_created_at, c.correlation_id,
              (SELECT reasons FROM analyst_scores s WHERE s.candidate_id = c.id ORDER BY scored_at DESC LIMIT 1) AS analyst_reasons,
              (SELECT summary FROM token_security_assessments a WHERE a.candidate_id = c.id ORDER BY completed_at DESC LIMIT 1) AS security_summary,
              (SELECT sizing FROM proposed_orders po WHERE po.candidate_id = c.id LIMIT 1) AS sizing,
              (SELECT slippage_bps FROM fills f WHERE f.order_id = p.entry_order_id) AS entry_slippage_bps,
              (SELECT slippage_bps FROM fills f WHERE f.order_id = p.exit_order_id) AS exit_slippage_bps
       FROM positions p JOIN candidate_discoveries c ON c.id = p.candidate_id WHERE p.portfolio_id = ? ORDER BY p.entry_at DESC LIMIT 500`,
      [rt.active_portfolio_id],
    );
    return ok(c, { rows });
  });

  api.get('/analytics', async (c) => {
    const { db, now } = c.get('deps');
    const rt = await getRuntime(db);
    const to = Number(c.req.query('to') ?? now() + 1);
    const from = Number(c.req.query('from') ?? 0);
    const trades = await closedTrades(db, rt.active_portfolio_id, from, to);
    const equity = (
      await db.all<{ observed_at: number; equity_micro: string }>(
        'SELECT observed_at, equity_micro FROM portfolio_equity_snapshots WHERE portfolio_id = ? AND observed_at BETWEEN ? AND ? ORDER BY observed_at',
        [rt.active_portfolio_id, from, to],
      )
    ).map((e) => ({ at: e.observed_at, equityMicro: big(e.equity_micro) }));
    const step = Math.max(1, Math.floor(equity.length / 600));
    return ok(c, {
      metrics: computeMetrics(trades, equity),
      segments: Object.fromEntries(
        Object.keys(SEGMENTERS).map((k) => [k, segment(trades, k as keyof typeof SEGMENTERS)]),
      ),
      equityCurve: equity
        .filter((_, i) => i % step === 0 || i === equity.length - 1)
        .map((e) => ({ at: e.at, equity: Number(e.equityMicro) / 1e6 })),
      trades: trades.map((t) => ({
        ...t,
        entryCostMicro: t.entryCostMicro.toString(),
        realizedPnlMicro: t.realizedPnlMicro.toString(),
        feesMicro: t.feesMicro.toString(),
      })),
      validation: { target: 100, completed: trades.length },
    });
  });

  api.get('/reports', async (c) => {
    const { db } = c.get('deps');
    return ok(c, {
      rows: await db.all(
        'SELECT id, kind, period_start, period_end, timezone, status, sha256, created_at FROM report_runs ORDER BY created_at DESC LIMIT 200',
      ),
    });
  });
  api.get('/reports/:id', async (c) => {
    const { db } = c.get('deps');
    const r = await db.first<{ body: string }>('SELECT * FROM report_runs WHERE id = ?', [c.req.param('id')]);
    return r ? ok(c, { ...r, body: JSON.parse(r.body) }) : fail(c, 404, 'report not found');
  });

  api.get('/health', async (c) => {
    const { db, now } = c.get('deps');
    const t = now();
    const providers = await db.all('SELECT * FROM data_providers ORDER BY id');
    const health = await db.all(
      `SELECT provider_id, SUM(calls) AS calls, SUM(errors) AS errors, SUM(rate_limited) AS rate_limited, SUM(total_latency_ms) * 1.0 / MAX(SUM(calls), 1) AS avg_latency_ms, MAX(max_latency_ms) AS max_latency_ms, MAX(last_success_at) AS last_success_at, MAX(last_error) AS last_error FROM provider_health WHERE window_start > ? GROUP BY provider_id`,
      [t - HOUR],
    );
    const series = await db.all(
      `SELECT provider_id, window_start, calls, errors, total_latency_ms FROM provider_health WHERE window_start > ? ORDER BY window_start`,
      [t - 6 * HOUR],
    );
    const jobs = await db.all('SELECT * FROM background_jobs ORDER BY id');
    const alerts = await db.all(
      'SELECT * FROM system_alerts ORDER BY acknowledged_at IS NOT NULL, created_at DESC LIMIT 100',
    );
    const dead = await db.all(
      `SELECT id, queue, last_error, attempts, updated_at FROM work_items WHERE status = 'DEAD' ORDER BY updated_at DESC LIMIT 50`,
    );
    const recon = await db.first(
      `SELECT action, detail, created_at FROM audit_events WHERE category = 'RECONCILIATION' ORDER BY seq DESC LIMIT 1`,
    );
    const lastSnapshot = await db.first<{ observed_at: number }>(
      'SELECT MAX(observed_at) AS observed_at FROM market_snapshots',
    );
    return ok(c, {
      providers,
      health,
      series,
      jobs,
      alerts,
      deadLetters: dead,
      reconciliation: recon,
      freshness: { lastMarketSnapshotAt: lastSnapshot?.observed_at ?? null },
      queues: await queueDepths(db),
    });
  });

  api.get('/audit', async (c) => {
    const { db } = c.get('deps');
    const cat = c.req.query('category');
    const before = Number(c.req.query('before') ?? Number.MAX_SAFE_INTEGER);
    const rows = await db.all(
      `SELECT * FROM audit_events WHERE seq < ? ${cat ? 'AND category = ?' : ''} ORDER BY seq DESC LIMIT 200`,
      cat ? [before, cat] : [before],
    );
    return ok(c, { rows });
  });

  api.get('/evidence/:id', async (c) => {
    const { db, evidence } = c.get('deps');
    const e = await db.first<{ storage_key: string }>('SELECT * FROM evidence WHERE id = ?', [
      c.req.param('id'),
    ]);
    if (!e) return fail(c, 404, 'evidence not found');
    const raw = await evidence.get(e.storage_key);
    return ok(c, { ...e, raw: raw ? raw.slice(0, 200_000) : null, truncated: (raw?.length ?? 0) > 200_000 });
  });

  api.get('/settings', async (c) => {
    const { db } = c.get('deps');
    const rt = await getRuntime(db);
    const { config, configVersion } = await loadConfig(db);
    const versions = await db.all(
      'SELECT config_version, strategy_version, created_at, created_by FROM strategy_configs ORDER BY created_at DESC',
    );
    const changes = await db.all('SELECT * FROM configuration_changes ORDER BY created_at DESC LIMIT 100');
    const providers = await db.all(
      'SELECT id, integration_status, requires_credentials, licence_note FROM data_providers ORDER BY id',
    );
    return ok(c, { runtime: rt, config, configVersion, versions, changes, providers });
  });
}
