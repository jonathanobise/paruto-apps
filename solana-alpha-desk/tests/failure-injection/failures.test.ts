import { describe, expect, it } from 'vitest';
import type { SqlDb, Statement } from '@alpha-desk/db';
import {
  drainQueue,
  enqueue,
  equityAndBreakers,
  handle,
  lease,
  monitorPositions,
  MonitorMemory,
  processEntry,
  recoverAfterRestart,
  runDiscoveryCycle,
  runReconciliation,
  transition,
  type Ctx,
} from '@alpha-desk/orchestrator';
import { GOOD_TOKEN, makeHarness } from '../fixtures/world.ts';
import { openPositionFlow } from '../fixtures/flows.ts';

/** Advances the synthetic market through discovery, filter and analyst but stops before execution. */
async function toAuthorized(h: Awaited<ReturnType<typeof makeHarness>>) {
  const { world, ctx, db } = h;
  const tok = world.addToken(GOOD_TOKEN);
  await db.run(
    `INSERT INTO holder_snapshots (id, mint, observed_at, provider_id, total_supply, holder_count, classification) VALUES ('hs_prev', ?, ?, 'helius', '0', 1900, '[]')`,
    [tok.mint, world.clock.now() - 3_600_000],
  );
  await runDiscoveryCycle(ctx);
  await drainQueue(ctx, 'filter');
  const { refreshCandidateSnapshots } = await import('@alpha-desk/orchestrator');
  for (let i = 0; i < 3; i++) {
    world.clock.advance(15_000);
    world.setPrice(tok, world.price(tok) * 1.002);
    await refreshCandidateSnapshots(ctx);
  }
  await drainQueue(ctx, 'analyst');
  await drainQueue(ctx, 'risk');
  const c = await db.first<{ id: string; state: string }>(
    'SELECT id, state FROM candidate_discoveries WHERE mint = ?',
    [tok.mint],
  );
  const a = await db.first<{ id: string }>(
    `SELECT ra.id FROM risk_authorizations ra JOIN proposed_orders po ON po.id = ra.proposed_order_id WHERE po.candidate_id = ?`,
    [c!.id],
  );
  return { tok, candidateId: c!.id, state: c!.state, authId: a?.id ?? null };
}

const count = async (db: SqlDb, sql: string, p: Array<string | number> = []) =>
  Number((await db.first<{ n: number }>(sql, p))!.n);

describe('provider failures never become passes', () => {
  it('DexScreener outage: discovery records the error and creates nothing', async () => {
    const { world, ctx, db } = await makeHarness();
    world.addToken(GOOD_TOKEN);
    world.dexOutage = true;
    const r = await runDiscoveryCycle(ctx);
    expect(r.discovered).toBe(0);
    expect(r.errors.length).toBeGreaterThan(0);
    expect(await count(db, 'SELECT COUNT(*) AS n FROM candidate_discoveries')).toBe(0);
  });
  it('RPC outage: the Filter returns FILTER_ERROR and nothing reaches the Analyst', async () => {
    const { world, ctx, db } = await makeHarness();
    world.addToken(GOOD_TOKEN);
    await runDiscoveryCycle(ctx);
    world.rpcOutage = true;
    await drainQueue(ctx, 'filter');
    const c = await db.first<{ state: string }>('SELECT state FROM candidate_discoveries');
    expect(c?.state).toBe('FILTER_ERROR');
    expect(await count(db, `SELECT COUNT(*) AS n FROM work_items WHERE queue = 'analyst'`)).toBe(0);
    expect(
      await count(
        db,
        `SELECT COUNT(*) AS n FROM security_rule_results WHERE rule_id IN ('F001','F002','F003','F006') AND outcome = 'PASS'`,
      ),
    ).toBe(0);
  });
  it('missing indexer: holder, developer and bundle checks are UNVERIFIED, so the candidate is blocked', async () => {
    const { world, ctx, db } = await makeHarness();
    world.heliusConfigured = false;
    world.addToken(GOOD_TOKEN);
    await runDiscoveryCycle(ctx);
    await drainQueue(ctx, 'filter');
    expect((await db.first<{ state: string }>('SELECT state FROM candidate_discoveries'))?.state).toBe(
      'FILTER_UNVERIFIED',
    );
    const unv = await db.all<{ rule_id: string }>(
      `SELECT rule_id FROM security_rule_results WHERE outcome = 'UNVERIFIED' ORDER BY rule_id`,
    );
    expect(unv.map((r) => r.rule_id)).toEqual(['F006', 'F007', 'F008', 'F009']);
  });
  it('a candidate already rejected on RPC and market data spends no indexer credits', async () => {
    const { world, ctx, db } = await makeHarness();
    world.addToken({ ...GOOD_TOKEN, seed: 'thin', volume: { m5: 50, h1: 1_000, h6: 4_000, h24: 9_000 } });
    await runDiscoveryCycle(ctx);
    await drainQueue(ctx, 'filter');
    expect((await db.first<{ state: string }>('SELECT state FROM candidate_discoveries'))?.state).toBe(
      'FILTER_REJECTED',
    );
    expect(world.heliusCalls).toBe(0);
    const f009 = await db.first<{ outcome: string; reason: string }>(
      `SELECT outcome, reason FROM security_rule_results WHERE rule_id = 'F009'`,
    );
    expect(f009?.outcome).toBe('UNVERIFIED');
    expect(f009?.reason).toContain('already rejected by F005');
  });
  it("without an on-chain coin creator the deployer is the mint's first fee payer, so developer checks still run", async () => {
    const { world, ctx, db } = await makeHarness();
    const tok = world.addToken({
      ...GOOD_TOKEN,
      seed: 'legacy',
      legacyPool: true,
      deployerHoldingTokens: 80_000_000,
    });
    await runDiscoveryCycle(ctx);
    await drainQueue(ctx, 'filter');
    const f007 = await db.first<{ outcome: string; observed: string }>(
      `SELECT outcome, observed FROM security_rule_results WHERE rule_id = 'F007'`,
    );
    expect(f007?.outcome).toBe('FAIL');
    expect(JSON.parse(f007!.observed).deployer).toBe(tok.deployer);
  });
  it('holders traced to no shared funder count as independent, not as clustering unavailable', async () => {
    const { world, ctx, db } = await makeHarness();
    world.addToken({ ...GOOD_TOKEN, seed: 'unfunded', holdersUnfunded: true });
    await runDiscoveryCycle(ctx);
    await drainQueue(ctx, 'filter');
    const f006 = await db.first<{ outcome: string; reason: string }>(
      `SELECT outcome, reason FROM security_rule_results WHERE rule_id = 'F006'`,
    );
    expect(f006?.outcome, f006?.reason).toBe('PASS');
  });
  it('Jupiter outage at the Risk stage: rejected, no order', async () => {
    const h = await makeHarness();
    h.world.jup.beforeQuote = null;
    const { world, ctx, db } = h;
    const tok = world.addToken(GOOD_TOKEN);
    await db.run(
      `INSERT INTO holder_snapshots (id, mint, observed_at, provider_id, total_supply, holder_count, classification) VALUES ('hs_prev', ?, ?, 'helius', '0', 1900, '[]')`,
      [tok.mint, world.clock.now() - 3_600_000],
    );
    await runDiscoveryCycle(ctx);
    await drainQueue(ctx, 'filter');
    const { refreshCandidateSnapshots } = await import('@alpha-desk/orchestrator');
    for (let i = 0; i < 3; i++) {
      world.clock.advance(15_000);
      world.setPrice(tok, world.price(tok) * 1.002);
      await refreshCandidateSnapshots(ctx);
    }
    await drainQueue(ctx, 'analyst');
    world.jup.mode = 'outage';
    await drainQueue(ctx, 'risk');
    expect((await db.first<{ state: string }>('SELECT state FROM candidate_discoveries'))?.state).toBe(
      'RISK_REJECTED',
    );
    expect(await count(db, 'SELECT COUNT(*) AS n FROM paper_orders')).toBe(0);
  });
});

describe('execution safety', () => {
  it('duplicate queue delivery does not double fill', async () => {
    const h = await makeHarness();
    const { candidateId, authId } = await toAuthorized(h);
    const payload = { candidateId, authorizationId: authId! };
    await handle(h.ctx, 'execute', payload);
    const second = await handle(h.ctx, 'execute', payload);
    expect(second.kind).toBe('SKIPPED');
    expect(await count(h.db, 'SELECT COUNT(*) AS n FROM fills')).toBe(1);
    expect(await count(h.db, 'SELECT COUNT(*) AS n FROM positions')).toBe(1);
  });
  it('a redelivered transition returns the committed outcome instead of acting twice', async () => {
    const h = await makeHarness();
    h.world.addToken(GOOD_TOKEN);
    await runDiscoveryCycle(h.ctx);
    const c = await h.db.first<Parameters<typeof transition>[1]['candidate']>(
      `SELECT * FROM candidate_discoveries`,
    );
    const stale = { ...c!, state: 'DISCOVERED' as const, state_version: 1 };
    const r = await transition(h.db, {
      candidate: stale,
      next: 'FILTER_PENDING',
      by: 'SCOUT',
      to: 'FILTER',
      eventType: 'FILTER_REQUESTED',
      observedAt: h.world.clock.now(),
      now: h.world.clock.now(),
    });
    expect(r.status).toBe('DUPLICATE');
  });
  it('concurrent entries for the same authorization fill exactly once', async () => {
    const h = await makeHarness();
    const { candidateId, authId } = await toAuthorized(h);
    const results = await Promise.all([
      processEntry(h.ctx, candidateId, authId!),
      processEntry(h.ctx, candidateId, authId!),
      processEntry(h.ctx, candidateId, authId!),
    ]);
    expect(results.filter((r) => r.kind === 'DONE')).toHaveLength(1);
    expect(await count(h.db, 'SELECT COUNT(*) AS n FROM fills')).toBe(1);
  });
  it('a delayed message after the authorization expired never fills', async () => {
    const h = await makeHarness();
    const { candidateId, authId } = await toAuthorized(h);
    h.world.clock.advance(60_000); // past the 45 s TTL
    const r = await processEntry(h.ctx, candidateId, authId!);
    expect(r).toEqual({ kind: 'DONE', state: 'EXPIRED' });
    expect(await count(h.db, 'SELECT COUNT(*) AS n FROM fills')).toBe(0);
    expect(
      await count(h.db, 'SELECT COUNT(*) AS n FROM risk_authorizations WHERE invalidated_at IS NOT NULL'),
    ).toBe(1);
  });
  it('an order with a forged or mismatched authorization is refused', async () => {
    const h = await makeHarness();
    const { candidateId } = await toAuthorized(h);
    const r = await processEntry(h.ctx, candidateId, 'ra_forged_000000000');
    expect(r.kind).toBe('DONE');
    expect(await count(h.db, 'SELECT COUNT(*) AS n FROM fills')).toBe(0);
    // The database also refuses to reuse a consumed authorization.
    await expect(
      h.db.run(`UPDATE risk_authorizations SET consumed_at = 1 WHERE consumed_at IS NULL`),
    ).resolves.toBeTruthy();
    await expect(h.db.run(`UPDATE risk_authorizations SET consumed_at = 2`)).rejects.toThrow(
      /already consumed/,
    );
  });
  it('a price move after authorization invalidates it', async () => {
    const h = await makeHarness();
    const { tok, candidateId, authId } = await toAuthorized(h);
    h.world.setPrice(tok, h.world.price(tok) * 1.05);
    expect((await processEntry(h.ctx, candidateId, authId!)).kind).toBe('DONE');
    expect(await count(h.db, 'SELECT COUNT(*) AS n FROM fills')).toBe(0);
    expect((await h.db.first<{ state: string }>('SELECT state FROM candidate_discoveries'))?.state).toBe(
      'EXPIRED',
    );
  });
  it('a database write failure during the fill commit leaves no partial state, and recovery resolves the order', async () => {
    const h = await makeHarness();
    const { candidateId, authId } = await toAuthorized(h);
    const realBatch = h.db.batch.bind(h.db);
    const failing: SqlDb = Object.assign(Object.create(Object.getPrototypeOf(h.db)), h.db, {
      batch: async (s: Statement[]) => {
        if (s.some((x) => x.sql.includes('INSERT INTO fills'))) throw new Error('simulated D1 write failure');
        return realBatch(s);
      },
    });
    const ctx: Ctx = { ...h.ctx, db: failing };
    await expect(processEntry(ctx, candidateId, authId!)).rejects.toThrow(/simulated/);
    expect(await count(h.db, 'SELECT COUNT(*) AS n FROM fills')).toBe(0);
    expect(await count(h.db, 'SELECT COUNT(*) AS n FROM positions')).toBe(0);
    expect(await count(h.db, `SELECT COUNT(*) AS n FROM ledger_journals WHERE kind = 'BUY'`)).toBe(0);
    expect(await count(h.db, `SELECT COUNT(*) AS n FROM paper_orders WHERE status = 'PENDING'`)).toBe(1);
    const rec = await recoverAfterRestart(h.ctx);
    expect(rec.orders).toBe(1);
    expect(rec.reconciliation.ok).toBe(true);
    expect(await count(h.db, `SELECT COUNT(*) AS n FROM paper_orders WHERE status = 'FAILED'`)).toBe(1);
    // The consumed authorization is never re-executed.
    expect((await processEntry(h.ctx, candidateId, authId!)).kind).toBe('SKIPPED');
  });
});

describe('position protection', () => {
  it('liquidity collapse trips the breaker and exits the position', async () => {
    const h = await makeHarness();
    const tok = await openPositionFlow(h);
    const pool = h.world.jup.pools.get(tok.mint)!;
    pool.tokenReserve = (pool.tokenReserve * 4n) / 10n;
    pool.usdReserve = (pool.usdReserve * 4n) / 10n;
    const mem = new MonitorMemory();
    h.world.clock.advance(2_000);
    await monitorPositions(h.ctx, mem);
    const p = await h.db.first<{ status: string; exit_reason: string }>(
      'SELECT status, exit_reason FROM positions',
    );
    expect(p?.exit_reason).toBe('LIQUIDITY');
    expect(p?.status).toBe('CLOSED');
    expect(
      await count(
        h.db,
        `SELECT COUNT(*) AS n FROM circuit_breakers WHERE breaker = 'LIQUIDITY_WITHDRAWAL' AND tripped = 1`,
      ),
    ).toBe(1);
  });
  it('a rugged pool (route gone) leads to a recorded failed exit, retries, and closes when a route returns', async () => {
    const h = await makeHarness();
    const tok = await openPositionFlow(h);
    const mem = new MonitorMemory();
    h.world.jup.modeByMint.set(tok.mint, 'noroute');
    await monitorPositions(h.ctx, mem);
    h.world.clock.advance(25_000); // past the stale-mark window
    await monitorPositions(h.ctx, mem);
    let p = await h.db.first<{ status: string; exit_reason: string; exit_attempts: number }>(
      'SELECT status, exit_reason, exit_attempts FROM positions',
    );
    expect(p?.status).toBe('EXIT_FAILED');
    expect(p?.exit_reason).toBe('STOP_NO_ROUTE');
    expect(await count(h.db, `SELECT COUNT(*) AS n FROM fills WHERE side = 'SELL'`)).toBe(0);
    expect(
      await count(h.db, `SELECT COUNT(*) AS n FROM system_alerts WHERE severity = 'CRITICAL'`),
    ).toBeGreaterThan(0);
    h.world.jup.modeByMint.delete(tok.mint);
    h.world.clock.advance(6_000);
    await monitorPositions(h.ctx, mem);
    p = await h.db.first('SELECT status, exit_reason, exit_attempts FROM positions');
    expect(p?.status).toBe('CLOSED');
    expect(p?.exit_attempts).toBe(2);
    expect((await runReconciliation(h.ctx)).ok).toBe(true);
  });
  it('a crash during an exit is recovered: the interrupted order fails, stops survive, and the exit is retried', async () => {
    const h = await makeHarness();
    const tok = await openPositionFlow(h);
    const pos = await h.db.first<{
      id: string;
      effective_stop_usd: string;
      candidate_id: string;
      quantity: string;
    }>('SELECT id, effective_stop_usd, candidate_id, quantity FROM positions');
    // Simulate a crash after the exit order was written but before settlement.
    const { requestExit } = await import('@alpha-desk/orchestrator');
    await requestExit(h.ctx, (await h.db.first('SELECT * FROM positions'))!, 'STOP', 'RISK');
    await h.db.run(
      `INSERT INTO paper_orders (id, portfolio_id, position_id, candidate_id, mint, side, kind, reason, requested_in_amount, status, idempotency_key, attempt, config_version, strategy_version, created_at)
      SELECT 'ord_crash', portfolio_id, id, candidate_id, mint, 'SELL', 'MARKET', 'STOP', quantity, 'PENDING', 'exit:crash', 1, config_version, strategy_version, ? FROM positions`,
      [h.world.clock.now()],
    );
    // New process: fresh in-memory state.
    const rec = await recoverAfterRestart(h.ctx);
    expect(rec.exits).toBe(1);
    const after = await h.db.first<{ status: string; effective_stop_usd: string }>(
      'SELECT status, effective_stop_usd FROM positions',
    );
    expect(after?.status).toBe('EXIT_FAILED');
    expect(after?.effective_stop_usd).toBe(pos!.effective_stop_usd);
    h.world.clock.advance(6_000);
    await monitorPositions(h.ctx, new MonitorMemory());
    expect((await h.db.first<{ status: string }>('SELECT status FROM positions'))?.status).toBe('CLOSED');
    expect(tok).toBeTruthy();
  });
  it('fills are all-or-nothing (Jupiter swaps are atomic, partial fills are not modelled)', async () => {
    const h = await makeHarness();
    await openPositionFlow(h);
    const f = await h.db.first<{ token_quantity: string }>(
      `SELECT token_quantity FROM fills WHERE side = 'BUY'`,
    );
    const p = await h.db.first<{ quantity: string }>('SELECT quantity FROM positions');
    expect(f?.token_quantity).toBe(p?.quantity);
  });
});

describe('portfolio controls', () => {
  it('the daily loss breaker pauses new entries and survives a restart until reset', async () => {
    const h = await makeHarness();
    const tok = await openPositionFlow(h);
    // Mark the open position down hard without triggering its stop logic.
    await h.db.run(`UPDATE positions SET last_mark_usd = '0.0000001'`);
    await equityAndBreakers(h.ctx);
    expect(
      await count(
        h.db,
        `SELECT COUNT(*) AS n FROM circuit_breakers WHERE breaker = 'DAILY_LOSS' AND tripped = 1`,
      ),
    ).toBe(1);
    await recoverAfterRestart(h.ctx);
    expect(await count(h.db, `SELECT COUNT(*) AS n FROM circuit_breakers WHERE tripped = 1`)).toBeGreaterThan(
      0,
    );
    // A second token now gets RISK_PAUSED.
    const second = h.world.addToken({ ...GOOD_TOKEN, seed: 'second' });
    await h.db.run(
      `INSERT INTO holder_snapshots (id, mint, observed_at, provider_id, total_supply, holder_count, classification) VALUES ('hs_prev2', ?, ?, 'helius', '0', 1900, '[]')`,
      [second.mint, h.world.clock.now() - 3_600_000],
    );
    await runDiscoveryCycle(h.ctx);
    await drainQueue(h.ctx, 'filter');
    const { refreshCandidateSnapshots } = await import('@alpha-desk/orchestrator');
    for (let i = 0; i < 3; i++) {
      h.world.clock.advance(15_000);
      h.world.setPrice(second, h.world.price(second) * 1.002);
      await refreshCandidateSnapshots(h.ctx);
    }
    await drainQueue(h.ctx, 'analyst');
    await drainQueue(h.ctx, 'risk');
    expect(
      (
        await h.db.first<{ state: string }>('SELECT state FROM candidate_discoveries WHERE mint = ?', [
          second.mint,
        ])
      )?.state,
    ).toBe('RISK_PAUSED');
    expect(tok).toBeTruthy();
  });
  it('restart with outstanding work: expired leases are redelivered and processed once', async () => {
    const { ctx, db, world } = await makeHarness();
    await enqueue(db, 'filter', 'filter:none', { candidateId: 'cd_missing' }, world.clock.now());
    const first = await lease(db, 'filter', world.clock.now(), 120_000, 5);
    expect(first).toHaveLength(1);
    // crash: no completion; nothing is redelivered while the lease is live
    expect(await lease(db, 'filter', world.clock.now() + 1000, 120_000, 5)).toHaveLength(0);
    world.clock.advance(121_000);
    expect(await drainQueue(ctx, 'filter')).toBe(1);
    expect(await count(db, `SELECT COUNT(*) AS n FROM work_items WHERE status = 'DONE'`)).toBe(1);
  });
  it('unrecoverable messages are dead-lettered with an alert, never silently dropped', async () => {
    const { ctx, db, world } = await makeHarness();
    await enqueue(db, 'filter', 'filter:bad', { candidateId: 'x' }, world.clock.now());
    const brokenCtx: Ctx = {
      ...ctx,
      config: async () => {
        throw new Error('config store unreachable');
      },
    };
    await db.run(`INSERT INTO tokens (mint, first_seen_at, last_seen_at, updated_at) VALUES ('m', 0, 0, 0)`);
    await db.run(
      `INSERT INTO candidate_discoveries (id, correlation_id, mint, pair_address, state, source, config_version, strategy_version, discovered_at, updated_at) VALUES ('x', 'cor_x', 'm', 'p', 'FILTER_PENDING', 't', 'c', 's', 0, 0)`,
    );
    for (let i = 0; i < 6; i++) {
      await drainQueue(brokenCtx, 'filter');
      world.clock.advance(400_000);
    }
    expect(await count(db, `SELECT COUNT(*) AS n FROM work_items WHERE status = 'DEAD'`)).toBe(1);
    expect(await count(db, `SELECT COUNT(*) AS n FROM system_alerts WHERE source = 'queue:filter'`)).toBe(1);
  });
});

describe('database invariants', () => {
  it('rejects rewriting history and lowering stops', async () => {
    const h = await makeHarness();
    await openPositionFlow(h);
    await expect(h.db.run('DELETE FROM audit_events')).rejects.toThrow(/append-only/);
    await expect(h.db.run(`UPDATE fills SET usd_amount_micro = '1'`)).rejects.toThrow(/immutable/);
    await expect(h.db.run('DELETE FROM ledger_entries')).rejects.toThrow(/append-only/);
    await expect(h.db.run(`UPDATE positions SET effective_stop_usd = '0.0000001'`)).rejects.toThrow(
      /may not be lowered/,
    );
    await expect(h.db.run('DELETE FROM positions')).rejects.toThrow(/never deleted/);
  });
  it('allows only one open position per token', async () => {
    const h = await makeHarness();
    await openPositionFlow(h);
    await expect(
      h.db.run(
        `INSERT INTO positions SELECT 'dup', portfolio_id, candidate_id, mint, symbol, 'OPEN', entry_order_id, entry_at, quantity, token_decimals, entry_price_usd, entry_reference_price_usd, entry_cost_micro, entry_fees_micro, planned_risk_micro, initial_stop_usd, effective_stop_usd, trailing_active, highest_reference_usd, lowest_reference_usd, last_mark_usd, last_mark_at, exit_reason, exit_order_id, exit_at, exit_price_usd, exit_proceeds_micro, exit_fees_micro, realized_pnl_micro, exit_attempts, config_version, strategy_version, updated_at FROM positions`,
      ),
    ).rejects.toThrow(/UNIQUE/);
  });
});

describe('retention', () => {
  it('archives old snapshots to object storage before pruning, and never touches the audit trail or ledger', async () => {
    const h = await makeHarness();
    await openPositionFlow(h);
    const { runRetention } = await import('@alpha-desk/orchestrator');
    const auditBefore = await count(h.db, 'SELECT COUNT(*) AS n FROM audit_events');
    const ledgerBefore = await count(h.db, 'SELECT COUNT(*) AS n FROM ledger_entries');
    h.world.clock.advance(20 * 86_400_000);
    const r = await runRetention(h.ctx);
    expect(r.market_snapshots).toBeGreaterThan(0);
    expect([...h.store.objects.keys()].some((k) => k.startsWith('archive/market_snapshots/'))).toBe(true);
    expect(await count(h.db, 'SELECT COUNT(*) AS n FROM audit_events')).toBe(auditBefore + 1);
    expect(await count(h.db, 'SELECT COUNT(*) AS n FROM ledger_entries')).toBe(ledgerBefore);
    // the discovery snapshot referenced by the candidate run is kept
    expect(await count(h.db, 'SELECT COUNT(*) AS n FROM market_snapshots')).toBe(1);
  });
});
