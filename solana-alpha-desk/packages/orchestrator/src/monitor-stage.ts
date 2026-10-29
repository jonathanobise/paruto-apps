import type { ScoutSnapshot } from '@alpha-desk/discovery';
import { evaluateToken } from '@alpha-desk/discovery';
import { big, type Statement } from '@alpha-desk/db';
import { markValueMicro } from '@alpha-desk/execution';
import { reconcile, type ReconPosition } from '@alpha-desk/ledger';
import { EvidenceCollector, quotePriceUsd, sellQuote } from '@alpha-desk/providers';
import { applyReference, evaluateLossBreakers, evaluateRouteFailures, type Breaker } from '@alpha-desk/risk';
import { Decimal, newId, sha256Hex, type CandidateState } from '@alpha-desk/shared';
import { alertStmt, auditStmt } from './audit-writer.ts';
import { localDate } from './bootstrap.ts';
import type { Ctx } from './context.ts';
import { persistEvidence } from './evidence-store.ts';
import { requestExit, processExit, type ExitReason } from './execution-stage.ts';
import { transition } from './handoffs.ts';
import { providerErrorRates, recordJob } from './health.ts';
import {
  candidatesInState,
  equityOf,
  getPortfolio,
  getRuntime,
  ledgerBalances,
  openPositions,
  type PositionRow,
} from './repo.ts';
import { snapshotStmt } from './scout-stage.ts';

/** In-memory monitor state that is cheap to rebuild after a restart. */
export class MonitorMemory {
  lastPersistedMark = new Map<string, number>();
  lastLiquidityCheck = new Map<string, number>();
  lastDeveloperCheck = new Map<string, number>();
  developerBaseline = new Map<string, bigint>();
  noRouteSince = new Map<string, number>();
}

/**
 * One pass of open-position protection. For every open position: obtain a fresh executable sell quote for
 * the full quantity, update MFE/MAE, the trailing stop (never lowered) and trigger exits. Runs even when
 * new entries are paused; only STOPPED skips it.
 */
export async function monitorPositions(
  ctx: Ctx,
  mem: MonitorMemory,
): Promise<{ checked: number; exits: number }> {
  const rt = await getRuntime(ctx.db);
  if (!rt.active_portfolio_id || rt.mode === 'STOPPED') return { checked: 0, exits: 0 };
  const { config: cfg } = await ctx.config();
  const positions = await openPositions(ctx.db, rt.active_portfolio_id);
  let exits = 0;
  for (const p of positions) {
    if (p.status === 'EXIT_PENDING') {
      await processExit(ctx, p.id);
      exits++;
      continue;
    }
    if (p.status === 'EXIT_FAILED') {
      const last = await ctx.db.first<{ resolved_at: number | null }>(
        `SELECT resolved_at FROM paper_orders WHERE position_id = ? AND side = 'SELL' ORDER BY created_at DESC LIMIT 1`,
        [p.id],
      );
      if (ctx.clock.now() - (last?.resolved_at ?? 0) >= cfg.execution.exitRetryDelaySeconds * 1000) {
        if (await requestExit(ctx, p, (p.exit_reason as ExitReason) ?? 'STOP', 'RISK', { retry: true })) {
          await processExit(ctx, p.id);
          exits++;
        }
      }
      continue;
    }
    exits += await markPosition(ctx, mem, p);
  }
  return { checked: positions.length, exits };
}

async function markPosition(ctx: Ctx, mem: MonitorMemory, p: PositionRow): Promise<number> {
  const { config: cfg } = await ctx.config();
  const ev = new EvidenceCollector();
  let reference: Decimal | null = null;
  let evidenceId: string | null = null;
  let impact: string | null = null;
  try {
    const q = await sellQuote(ctx.providers.jupiter, p.mint, big(p.quantity), cfg.execution.slippageBps);
    evidenceId = ev.add(q, 'JUP_MARK_QUOTE', 'DERIVED');
    reference = quotePriceUsd(q.data, p.token_decimals, 'SELL');
    impact = q.data.priceImpactPct;
    if (reference.lte(0)) reference = null;
  } catch (e) {
    ctx.log.warn('mark quote failed', { positionId: p.id, error: (e as Error).message });
  }
  const now = ctx.clock.now();

  if (!reference) {
    // No executable route. Watch the last-trade price as a non-executable alarm and try to exit when it
    // falls through the stop or the route has been gone for longer than the stale-mark window.
    if (!mem.noRouteSince.has(p.id)) mem.noRouteSince.set(p.id, now);
    const since = mem.noRouteSince.get(p.id)!;
    let lastTrade: Decimal | null;
    try {
      const pair = await ctx.providers.dex.pair(
        (await ctx.db.first<{ pair_address: string }>(
          'SELECT pair_address FROM candidate_discoveries WHERE id = ?',
          [p.candidate_id],
        ))!.pair_address,
      );
      lastTrade = pair.data?.priceUsd ? new Decimal(pair.data.priceUsd) : null;
    } catch {
      lastTrade = null;
    }
    await ctx.db.run(
      `INSERT INTO position_marks (id, position_id, observed_at, reference_price_usd, value_micro, price_impact_pct, route_ok, liquidity_usd, evidence_id) VALUES (?, ?, ?, NULL, NULL, NULL, 0, NULL, NULL)`,
      [newId('pm', now), p.id, now],
    );
    const stale = now - since > cfg.monitoring.staleMarkSeconds * 1000;
    if ((lastTrade && lastTrade.lte(p.effective_stop_usd)) || stale) {
      await ctx.db.batch([
        alertStmt(
          'CRITICAL',
          'monitor',
          'No executable route for an open paper position',
          `${p.symbol ?? p.mint}: attempting protective exit`,
          now,
          `noroute:${p.id}`,
        ),
      ]);
      if (
        await requestExit(ctx, p, 'STOP_NO_ROUTE', 'RISK', {
          lastTrade: lastTrade?.toString() ?? null,
          noRouteForMs: now - since,
        })
      ) {
        await processExit(ctx, p.id);
        return 1;
      }
    }
    return 0;
  }
  mem.noRouteSince.delete(p.id);

  const state = {
    entryReference: new Decimal(p.entry_reference_price_usd),
    effectiveStop: new Decimal(p.effective_stop_usd),
    trailingActive: p.trailing_active === 1,
    highestReference: new Decimal(p.highest_reference_usd),
  };
  const { state: next, events } = applyReference(state, reference, cfg.risk);
  const lowest = Decimal.min(new Decimal(p.lowest_reference_usd), reference);
  const persistMark = events.length > 0 || now - (mem.lastPersistedMark.get(p.id) ?? 0) >= 30_000;
  const stmts: Statement[] = [];
  if (persistMark) {
    if (ev.records.length) stmts.push(...(await persistEvidence(ctx.evidenceStore, ev.records)));
    stmts.push({
      sql: `INSERT INTO position_marks (id, position_id, observed_at, reference_price_usd, value_micro, price_impact_pct, route_ok, liquidity_usd, evidence_id) VALUES (?, ?, ?, ?, ?, ?, 1, NULL, ?)`,
      params: [
        newId('pm', now),
        p.id,
        now,
        reference.toString(),
        markValueMicro({ quantity: big(p.quantity), tokenDecimals: p.token_decimals }, reference).toString(),
        impact,
        evidenceId,
      ],
    });
    mem.lastPersistedMark.set(p.id, now);
  }
  stmts.push({
    sql: `UPDATE positions SET last_mark_usd = ?, last_mark_at = ?, highest_reference_usd = ?, lowest_reference_usd = ?, trailing_active = ?, effective_stop_usd = ?, updated_at = ?
          WHERE id = ? AND status = 'OPEN'`,
    params: [
      reference.toString(),
      now,
      next.highestReference.toString(),
      lowest.toString(),
      next.trailingActive ? 1 : 0,
      next.effectiveStop.toString(),
      now,
      p.id,
    ],
  });
  for (const e of events) {
    stmts.push({
      sql: `INSERT INTO stop_events (id, position_id, kind, previous_stop_usd, new_stop_usd, reference_price_usd, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      params: [
        newId('se', now),
        p.id,
        e.kind,
        e.previous.toString(),
        e.next.toString(),
        e.reference.toString(),
        now,
      ],
    });
    stmts.push(
      await auditStmt({
        category: 'STOP',
        action: e.kind,
        actor: 'RISK',
        subjectType: 'position',
        subjectId: p.id,
        detail: {
          previous: e.previous.toString(),
          next: e.next.toString(),
          reference: e.reference.toString(),
        },
        evidenceIds: evidenceId ? [evidenceId] : [],
        at: now,
      }),
    );
  }
  await ctx.db.batch(stmts);

  if (events.some((e) => e.kind === 'TRIGGERED')) {
    if (
      await requestExit(ctx, p, next.trailingActive ? 'TRAILING_STOP' : 'STOP', 'RISK', {
        reference: reference.toString(),
        stop: next.effectiveStop.toString(),
      })
    ) {
      await processExit(ctx, p.id);
      return 1;
    }
  }

  // Liquidity withdrawal and developer movement watch (slower cadence).
  if (now - (mem.lastLiquidityCheck.get(p.id) ?? 0) >= 30_000) {
    mem.lastLiquidityCheck.set(p.id, now);
    const c = await ctx.db.first<{ pair_address: string; liquidity_usd: string | null }>(
      'SELECT pair_address, liquidity_usd FROM candidate_discoveries WHERE id = ?',
      [p.candidate_id],
    );
    try {
      const pair = await ctx.providers.dex.pair(c!.pair_address);
      const liq = pair.data?.liquidity?.usd ?? null;
      const atEntry = c?.liquidity_usd ? Number(c.liquidity_usd) : null;
      if (liq !== null && atEntry && atEntry > 0) {
        const drop = ((atEntry - liq) / atEntry) * 100;
        if (drop >= cfg.risk.liquidityDropAlertPct) {
          await tripBreaker(
            ctx,
            'LIQUIDITY_WITHDRAWAL',
            p.portfolio_id,
            `${p.symbol ?? p.mint}: pool liquidity down ${drop.toFixed(1)}% since discovery`,
          );
          if (await requestExit(ctx, p, 'LIQUIDITY', 'RISK', { liquidityUsd: liq, atEntry })) {
            await processExit(ctx, p.id);
            return 1;
          }
        }
      }
    } catch (e) {
      ctx.log.warn('liquidity check failed', { positionId: p.id, error: (e as Error).message });
    }
  }
  if (now - (mem.lastDeveloperCheck.get(p.id) ?? 0) >= 60_000) {
    mem.lastDeveloperCheck.set(p.id, now);
    const dev = await ctx.db.first<{ deployer: string | null }>(
      'SELECT deployer FROM developer_histories WHERE mint = ? AND deployer IS NOT NULL ORDER BY observed_at DESC LIMIT 1',
      [p.mint],
    );
    if (dev?.deployer) {
      try {
        const h = await ctx.providers.rpc.getTokenAccountsByOwner(dev.deployer, p.mint);
        const bal = h.data.reduce((s, a) => s + a.amount, 0n);
        const base = mem.developerBaseline.get(p.id);
        if (base === undefined) mem.developerBaseline.set(p.id, bal);
        else if (bal < base) {
          const supply = await ctx.db.first<{ total_supply: string }>(
            "SELECT total_supply FROM holder_snapshots WHERE mint = ? AND total_supply <> '0' ORDER BY observed_at DESC LIMIT 1",
            [p.mint],
          );
          const pct = supply
            ? new Decimal((base - bal).toString()).div(supply.total_supply).mul(100)
            : new Decimal(100);
          if (pct.gte(0.5)) {
            await tripBreaker(
              ctx,
              'DEVELOPER_MOVEMENT',
              p.portfolio_id,
              `${p.symbol ?? p.mint}: deployer moved ${pct.toFixed(2)}% of supply`,
            );
            if (await requestExit(ctx, p, 'DEVELOPER', 'RISK', { movedPct: pct.toFixed(4) })) {
              await processExit(ctx, p.id);
              return 1;
            }
          }
          mem.developerBaseline.set(p.id, bal);
        }
      } catch (e) {
        ctx.log.warn('developer watch failed', { positionId: p.id, error: (e as Error).message });
      }
    }
  }
  return 0;
}

/** Durable breaker trip: event row + current state + alert + audit, idempotent while already tripped. */
export async function tripBreaker(
  ctx: Ctx,
  breaker: Breaker,
  portfolioId: string | null,
  detail: string,
  actor = 'RISK',
): Promise<boolean> {
  const scope = portfolioId ?? '*';
  const cur = await ctx.db.first<{ tripped: number }>(
    'SELECT tripped FROM circuit_breakers WHERE breaker = ? AND portfolio_id = ?',
    [breaker, scope],
  );
  if (cur?.tripped === 1) return false;
  const now = ctx.clock.now();
  const id = newId('cb', now);
  await ctx.db.batch([
    {
      sql: `INSERT INTO circuit_breaker_events (id, portfolio_id, breaker, action, detail, actor, created_at) VALUES (?, ?, ?, 'TRIPPED', ?, ?, ?)`,
      params: [id, portfolioId, breaker, detail, actor, now],
    },
    {
      sql: `INSERT INTO circuit_breakers (breaker, portfolio_id, tripped, tripped_at, detail, last_event_id) VALUES (?, ?, 1, ?, ?, ?)
            ON CONFLICT(breaker, portfolio_id) DO UPDATE SET tripped = 1, tripped_at = excluded.tripped_at, detail = excluded.detail, last_event_id = excluded.last_event_id`,
      params: [breaker, scope, now, detail, id],
    },
    alertStmt(
      'CRITICAL',
      'risk',
      `Circuit breaker tripped: ${breaker}`,
      detail,
      now,
      `breaker:${breaker}:${scope}`,
    ),
    await auditStmt({
      category: 'BREAKER',
      action: 'TRIPPED',
      actor,
      subjectType: 'breaker',
      subjectId: breaker,
      detail: { detail, portfolioId },
      at: now,
    }),
  ]);
  return true;
}

/**
 * Equity snapshot, peak / day-open bookkeeping and the portfolio-level breakers
 * (daily loss, drawdown, route failures, data outage, verification quality, API budget).
 */
export async function equityAndBreakers(
  ctx: Ctx,
  opts: { apiCallsToday: number } = { apiCallsToday: 0 },
): Promise<void> {
  const rt = await getRuntime(ctx.db);
  if (!rt.active_portfolio_id) return;
  const { config: cfg } = await ctx.config();
  const pid = rt.active_portfolio_id;
  const now = ctx.clock.now();
  const eq = await equityOf(ctx.db, pid);
  const pf = await getPortfolio(ctx.db, pid);
  const today = localDate(now, rt.timezone);
  let dayOpen = big(pf.day_open_equity_micro);
  let dayDate = pf.day_open_date;
  if (today !== pf.day_open_date) {
    dayOpen = eq.equity;
    dayDate = today;
  }
  const peak = eq.equity > big(pf.peak_equity_micro) ? eq.equity : big(pf.peak_equity_micro);
  const unrealized = eq.positions.reduce(
    (s, p) =>
      s +
      (p.last_mark_usd
        ? markValueMicro(
            { quantity: big(p.quantity), tokenDecimals: p.token_decimals },
            new Decimal(p.last_mark_usd),
          ) - big(p.entry_cost_micro)
        : 0n),
    0n,
  );
  const realized = await ctx.db.first<{ s: number | null }>(
    `SELECT SUM(CAST(realized_pnl_micro AS INTEGER)) AS s FROM positions WHERE portfolio_id = ? AND status = 'CLOSED'`,
    [pid],
  );
  const dd =
    peak > 0n ? new Decimal((peak - eq.equity).toString()).div(peak.toString()).mul(100) : new Decimal(0);
  const exposure =
    eq.equity > 0n
      ? new Decimal(eq.positionsValue.toString()).div(eq.equity.toString()).mul(100)
      : new Decimal(0);
  await ctx.db.batch([
    {
      sql: `INSERT INTO portfolio_equity_snapshots (id, portfolio_id, observed_at, cash_micro, positions_value_micro, equity_micro, exposure_pct, unrealized_pnl_micro, realized_pnl_micro, peak_equity_micro, drawdown_pct, marks_complete)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      params: [
        newId('eq', now),
        pid,
        now,
        eq.cash.toString(),
        eq.positionsValue.toString(),
        eq.equity.toString(),
        exposure.toFixed(4),
        unrealized.toString(),
        String(realized?.s ?? 0),
        peak.toString(),
        dd.toFixed(4),
        eq.complete ? 1 : 0,
      ],
    },
    {
      sql: 'UPDATE portfolios SET peak_equity_micro = ?, day_open_equity_micro = ?, day_open_date = ? WHERE id = ?',
      params: [peak.toString(), dayOpen.toString(), dayDate, pid],
    },
  ]);

  for (const trip of evaluateLossBreakers(
    { equityMicro: eq.equity, dayOpenEquityMicro: dayOpen, peakEquityMicro: peak },
    cfg.risk,
  )) {
    await tripBreaker(ctx, trip.breaker, pid, trip.detail);
  }
  const failures = await ctx.db.all<{ resolved_at: number }>(
    `SELECT resolved_at FROM paper_orders WHERE portfolio_id = ? AND status = 'FAILED' AND resolved_at > ?`,
    [pid, now - cfg.risk.routeFailureWindowMinutes * 60_000],
  );
  const rf = evaluateRouteFailures(
    failures.map((f) => f.resolved_at),
    now,
    cfg.risk,
  );
  if (rf) await tripBreaker(ctx, rf.breaker, pid, rf.detail);

  const rates = await providerErrorRates(ctx.db, now, 5 * 60_000);
  const critical = ['dexscreener', 'jupiter', 'solana-rpc'];
  const down = critical.filter(
    (p) =>
      rates[p] &&
      rates[p]!.calls >= 5 &&
      (rates[p]!.rate >= 0.5 || (rates[p]!.lastSuccessAt ?? 0) < now - 5 * 60_000),
  );
  if (down.length)
    await tripBreaker(
      ctx,
      'DATA_OUTAGE',
      null,
      `critical feeds failing: ${down.map((d) => `${d} ${(rates[d]!.rate * 100).toFixed(0)}% errors`).join(', ')}`,
    );
  const recent = await ctx.db.all<{ filter_status: string }>(
    `SELECT filter_status FROM candidate_discoveries WHERE filter_status IS NOT NULL AND updated_at > ?`,
    [now - 30 * 60_000],
  );
  const errs = recent.filter((r) => r.filter_status === 'FILTER_ERROR').length;
  if (recent.length >= 4 && errs / recent.length > 0.5)
    await tripBreaker(
      ctx,
      'VERIFICATION_QUALITY',
      null,
      `${errs}/${recent.length} security checks errored in 30 min`,
    );
  if (opts.apiCallsToday > rt.api_daily_call_cap)
    await tripBreaker(
      ctx,
      'API_BUDGET',
      null,
      `${opts.apiCallsToday} provider calls today exceed the cap of ${rt.api_daily_call_cap}`,
    );
  if (!eq.complete && eq.positions.some((p) => !p.last_mark_at || now - p.last_mark_at > 5 * 60_000)) {
    await ctx.db.batch([
      alertStmt(
        'WARNING',
        'monitor',
        'Open position without a recent executable mark',
        'equity uses cost basis for unmarked positions',
        now,
        'unmarked-positions',
      ),
    ]);
  }
}

/** Moves candidates whose approvals or authorizations lapsed to EXPIRED. */
export async function expireStale(ctx: Ctx): Promise<number> {
  const now = ctx.clock.now();
  let n = 0;
  const lapsed = await candidatesInState(
    ctx.db,
    ['FILTER_APPROVED', 'ANALYST_PENDING', 'ANALYST_APPROVED', 'RISK_PENDING'],
    200,
  );
  for (const c of lapsed) {
    const until = c.eligible_until as number | null;
    if (until !== null && until < now) {
      const r = await transition(ctx.db, {
        candidate: c,
        next: 'EXPIRED',
        by: 'SYSTEM',
        to: 'LOGGER',
        eventType: 'ELIGIBILITY_EXPIRED',
        observedAt: now,
        now,
        payload: { eligibleUntil: until },
      });
      if (r.status === 'COMMITTED') n++;
      await ctx.db.run(
        `UPDATE opportunities SET status = 'EXPIRED', updated_at = ? WHERE candidate_id = ? AND status = 'ACTIVE'`,
        [now, c.id],
      );
    }
  }
  const authorized = await candidatesInState(ctx.db, ['RISK_AUTHORIZED'], 200);
  for (const c of authorized) {
    const a = await ctx.db.first<{ id: string; expires_at: number; consumed_at: number | null }>(
      `SELECT id, expires_at, consumed_at FROM risk_authorizations ra JOIN proposed_orders po ON po.id = ra.proposed_order_id WHERE po.candidate_id = ? ORDER BY ra.issued_at DESC LIMIT 1`,
      [c.id],
    );
    if (a && a.consumed_at === null && a.expires_at < now) {
      const r = await transition(ctx.db, {
        candidate: c,
        next: 'EXPIRED',
        by: 'SYSTEM',
        to: 'LOGGER',
        eventType: 'AUTHORIZATION_EXPIRED',
        observedAt: now,
        now,
        extra: [
          {
            sql: 'UPDATE risk_authorizations SET invalidated_at = ?, invalidated_reason = ? WHERE id = ? AND invalidated_at IS NULL',
            params: [now, 'expired unused', a.id],
          },
        ],
      });
      if (r.status === 'COMMITTED') n++;
    }
  }
  const stuck = await candidatesInState(ctx.db, ['DISCOVERED', 'FILTER_PENDING'], 200);
  for (const c of stuck) {
    if (now - Number(c.updated_at) > 30 * 60_000) {
      const r = await transition(ctx.db, {
        candidate: c,
        next: 'EXPIRED',
        by: 'SYSTEM',
        to: 'LOGGER',
        eventType: 'PROCESSING_TIMEOUT',
        observedAt: now,
        now,
      });
      if (r.status === 'COMMITTED') n++;
    }
  }
  return n;
}

/** Ledger ↔ positions reconciliation; a failure pauses new entries until a verified reconciliation passes. */
export async function runReconciliation(ctx: Ctx): Promise<{ ok: boolean; issues: string[] }> {
  const rt = await getRuntime(ctx.db);
  if (!rt.active_portfolio_id) return { ok: true, issues: [] };
  const pid = rt.active_portfolio_id;
  const b = await ledgerBalances(ctx.db, pid);
  const rows = await ctx.db.all<{
    id: string;
    mint: string;
    status: string;
    quantity: string;
    entry_cost_micro: string;
    entry_fees_micro: string;
    realized_pnl_micro: string | null;
    exit_fees_micro: string | null;
  }>(
    'SELECT id, mint, status, quantity, entry_cost_micro, entry_fees_micro, realized_pnl_micro, exit_fees_micro FROM positions WHERE portfolio_id = ?',
    [pid],
  );
  const positions: ReconPosition[] = rows.map((r) => ({
    id: r.id,
    mint: r.mint,
    status: r.status,
    quantity: big(r.quantity),
    entryCostMicro: big(r.entry_cost_micro),
    entryFeesMicro: big(r.entry_fees_micro),
    realizedPnlMicro: r.realized_pnl_micro === null ? null : big(r.realized_pnl_micro),
    exitFeesMicro: r.exit_fees_micro === null ? null : big(r.exit_fees_micro),
  }));
  const r = reconcile(b, positions);
  const now = ctx.clock.now();
  const stmts: Statement[] = [
    await auditStmt({
      category: 'RECONCILIATION',
      action: r.ok ? 'PASSED' : 'FAILED',
      actor: 'LOGGER',
      subjectType: 'portfolio',
      subjectId: pid,
      detail: { issues: r.issues, cashMicro: r.cashMicro, expectedCashMicro: r.expectedCashMicro },
      at: now,
    }),
  ];
  await ctx.db.batch(stmts);
  await recordJob(ctx.db, 'logger', {
    now,
    ok: r.ok,
    error: r.ok ? null : r.issues.join('; ').slice(0, 500),
    processed: 1,
    instanceId: ctx.instanceId,
  });
  if (!r.ok) {
    await tripBreaker(ctx, 'DB_INTEGRITY', pid, r.issues.join('; ').slice(0, 1000), 'LOGGER');
    await ctx.db.run(
      `UPDATE runtime_state SET entries_paused_reason = ?, updated_at = ?, updated_by = 'LOGGER' WHERE id = 1 AND entries_paused_reason IS NULL`,
      ['ledger reconciliation failed', now],
    );
  }
  return { ok: r.ok, issues: r.issues };
}

/** Keeps a short, real-timestamped market series for candidates still in the decision pipeline. */
export async function refreshCandidateSnapshots(ctx: Ctx): Promise<number> {
  const { config: cfg } = await ctx.config();
  const active = await candidatesInState(
    ctx.db,
    [
      'FILTER_PENDING',
      'FILTER_APPROVED',
      'ANALYST_PENDING',
      'ANALYST_APPROVED',
      'RISK_PENDING',
    ] as CandidateState[],
    30,
  );
  if (!active.length) return 0;
  const mints = [...new Set(active.map((c) => c.mint))];
  const obs = await ctx.providers.dex.tokens(mints);
  const ev = new EvidenceCollector();
  const evidenceId = ev.add(obs, 'DEX_TOKENS', 'PROVIDER_CLAIM');
  const now = ctx.clock.now();
  const stmts: Statement[] = await persistEvidence(ctx.evidenceStore, ev.records);
  let n = 0;
  for (const c of active) {
    const d = evaluateToken(
      c.mint,
      obs.data.filter((p) => p.baseToken.address === c.mint),
      now,
      cfg.discovery,
    );
    const snap: ScoutSnapshot | null =
      d.snapshot && d.snapshot.pairAddress === c.pair_address ? d.snapshot : null;
    if (!snap) continue;
    stmts.push(
      snapshotStmt(
        newId('ms', now),
        snap,
        obs.provenance.observedAt,
        now,
        evidenceId,
        await sha256Hex(JSON.stringify(snap)),
      ),
    );
    n++;
  }
  await ctx.db.batch(stmts);
  return n;
}

/**
 * Restart recovery: orders left PENDING by a crash are resolved as FAILED (the authorization stays
 * consumed, so they are never re-executed), interrupted exits go back to EXIT_FAILED for a retry, and
 * the ledger is reconciled before any new entry is allowed.
 */
export async function recoverAfterRestart(
  ctx: Ctx,
): Promise<{ orders: number; exits: number; reconciliation: { ok: boolean; issues: string[] } }> {
  const now = ctx.clock.now();
  const pending = await ctx.db.all<{
    id: string;
    side: string;
    position_id: string | null;
    candidate_id: string | null;
  }>(`SELECT id, side, position_id, candidate_id FROM paper_orders WHERE status = 'PENDING'`);
  let orders = 0;
  let exits = 0;
  for (const o of pending) {
    const stmts: Statement[] = [
      {
        sql: `UPDATE paper_orders SET status = 'FAILED', failure_reason = 'interrupted by service restart before settlement', resolved_at = ? WHERE id = ? AND status = 'PENDING'`,
        params: [now, o.id],
      },
      await auditStmt({
        category: 'CORRECTION',
        action: 'ORDER_RESOLVED_AFTER_RESTART',
        actor: 'SYSTEM',
        subjectType: 'order',
        subjectId: o.id,
        detail: { side: o.side },
        at: now,
      }),
    ];
    if (o.side === 'SELL' && o.position_id) {
      stmts.push({
        sql: `UPDATE positions SET status = 'EXIT_FAILED', updated_at = ? WHERE id = ? AND status = 'EXIT_PENDING'`,
        params: [now, o.position_id],
      });
      exits++;
    }
    await ctx.db.batch(stmts);
    if (o.candidate_id) {
      const c = await ctx.db.first<{
        id: string;
        correlation_id: string;
        mint: string;
        pair_address: string;
        state: CandidateState;
        state_version: number;
        config_version: string;
        strategy_version: string;
      }>('SELECT * FROM candidate_discoveries WHERE id = ?', [o.candidate_id]);
      if (c?.state === 'PAPER_ORDER_PENDING')
        await transition(ctx.db, {
          candidate: c,
          next: 'PAPER_REJECTED',
          by: 'EXECUTOR',
          to: 'LOGGER',
          eventType: 'ORDER_INTERRUPTED',
          observedAt: now,
          now,
          payload: { orderId: o.id },
        });
      if (c?.state === 'EXIT_PENDING')
        await transition(ctx.db, {
          candidate: c,
          next: 'EXIT_FAILED',
          by: 'EXECUTOR',
          to: 'RISK',
          eventType: 'EXIT_INTERRUPTED',
          observedAt: now,
          now,
          payload: { orderId: o.id },
        });
    }
    orders++;
  }
  await expireStale(ctx);
  const reconciliation = await runReconciliation(ctx);
  await ctx.db.batch([
    await auditStmt({
      category: 'AUTOMATION',
      action: 'RECOVERY_COMPLETED',
      actor: 'SYSTEM',
      detail: { orders, exits, reconciliation },
      at: now,
    }),
  ]);
  return { orders, exits, reconciliation };
}
