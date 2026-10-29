import { describe, expect, it } from 'vitest';
import { big } from '@alpha-desk/db';
import {
  equityAndBreakers,
  generateReport,
  ledgerBalances,
  monitorPositions,
  MonitorMemory,
  runReconciliation,
} from '@alpha-desk/orchestrator';
import { bal } from '@alpha-desk/ledger';
import { makeHarness } from '../fixtures/world.ts';
import { openPositionFlow } from '../fixtures/flows.ts';

describe('full paper-trading lifecycle (synthetic market)', () => {
  it('discovers, verifies, scores, authorizes, fills, trails, stops out and reconciles', async () => {
    const h = await makeHarness();
    const { world, ctx, db } = h;
    const tok = await openPositionFlow(h);

    const cand = await db.first<{ state: string; filter_status: string; analyst_score: string }>(
      'SELECT state, filter_status, analyst_score FROM candidate_discoveries WHERE mint = ?',
      [tok.mint],
    );
    expect(cand?.filter_status).toBe('FILTER_APPROVED');
    expect(Number(cand?.analyst_score)).toBeGreaterThanOrEqual(70);
    expect(cand?.state).toBe('POSITION_OPEN');

    const rules = await db.all<{ outcome: string }>('SELECT outcome FROM security_rule_results');
    expect(rules).toHaveLength(18);
    expect(rules.every((r) => r.outcome === 'PASS' || r.outcome === 'NOT_REQUIRED')).toBe(true);

    const pos = await db.first<Record<string, string>>(`SELECT * FROM positions WHERE mint = ?`, [tok.mint]);
    expect(pos?.status).toBe('OPEN');
    const auth = await db.first<{ max_notional_micro: string; consumed_at: number }>(
      `SELECT max_notional_micro, consumed_at FROM risk_authorizations`,
    );
    expect(big(auth!.max_notional_micro) <= 800_000_000n).toBe(true); // ≤ 8% of $10k
    expect(auth!.consumed_at).not.toBeNull();
    expect(Number(pos!.initial_stop_usd)).toBeCloseTo(Number(pos!.entry_reference_price_usd) * 0.94, 12);
    expect((await runReconciliation(ctx)).ok).toBe(true);

    // Price rises 15%: trailing activates.
    const mem = new MonitorMemory();
    world.setPrice(tok, world.price(tok) * 1.15);
    world.clock.advance(2_000);
    await monitorPositions(ctx, mem);
    const trailing = await db.first<{
      trailing_active: number;
      effective_stop_usd: string;
      highest_reference_usd: string;
    }>('SELECT trailing_active, effective_stop_usd, highest_reference_usd FROM positions WHERE id = ?', [
      pos!.id!,
    ]);
    expect(trailing?.trailing_active).toBe(1);
    expect(Number(trailing!.effective_stop_usd)).toBeCloseTo(
      Number(trailing!.highest_reference_usd) * 0.94,
      12,
    );

    // A pullback that stays above the trail does not lower the stop.
    world.setPrice(tok, world.price(tok) * 0.97);
    world.clock.advance(2_000);
    await monitorPositions(ctx, mem);
    const after = await db.first<{ effective_stop_usd: string; status: string }>(
      'SELECT effective_stop_usd, status FROM positions WHERE id = ?',
      [pos!.id!],
    );
    expect(after?.status).toBe('OPEN');
    expect(after?.effective_stop_usd).toBe(trailing?.effective_stop_usd);

    // Drop through the trailing stop: exit is simulated and the position closes.
    world.setPrice(tok, world.price(tok) * 0.9);
    world.clock.advance(2_000);
    await monitorPositions(ctx, mem);
    const closed = await db.first<Record<string, string>>('SELECT * FROM positions WHERE id = ?', [pos!.id!]);
    expect(closed?.status).toBe('CLOSED');
    expect(closed?.exit_reason).toBe('TRAILING_STOP');
    const pnl = big(closed!.realized_pnl_micro);
    expect(pnl).toBe(
      big(closed!.exit_proceeds_micro) - big(closed!.exit_fees_micro) - big(closed!.entry_cost_micro),
    );

    const b = await ledgerBalances(db, closed!.portfolio_id!);
    expect(bal(b, 'CASH')).toBe(10_000_000_000n + pnl);
    expect(bal(b, 'HOLDINGS', tok.mint)).toBe(0n);
    expect((await runReconciliation(ctx)).ok).toBe(true);

    const states = (
      await db.all<{ previous_state: string | null; next_state: string }>(
        'SELECT previous_state, next_state FROM handoff_events ORDER BY generated_at, rowid',
      )
    ).map((e) => e.next_state);
    expect(states).toEqual([
      'DISCOVERED',
      'FILTER_PENDING',
      'FILTER_APPROVED',
      'ANALYST_PENDING',
      'ANALYST_APPROVED',
      'RISK_PENDING',
      'RISK_AUTHORIZED',
      'PAPER_ORDER_PENDING',
      'PAPER_FILLED',
      'POSITION_OPEN',
      'EXIT_PENDING',
      'POSITION_CLOSED',
    ]);

    await equityAndBreakers(ctx);
    const report = await generateReport(
      ctx,
      'DAILY_PNL',
      world.clock.now() - 86_400_000,
      world.clock.now() + 1,
    );
    expect((report.body.metrics as { trades: number }).trades).toBe(1);
    expect(String(report.body.disclaimer)).toMatch(/Paper trading only/);
    expect((report.body.period as { timezone: string }).timezone).toBe('UTC');

    // Every audit row is intact.
    const { verifyAudit } = await import('@alpha-desk/ledger');
    const audits = await db.all<Parameters<typeof verifyAudit>[0]>(
      'SELECT id, category, action, actor, subject_type, subject_id, correlation_id, detail, evidence_ids, checksum, created_at FROM audit_events',
    );
    for (const a of audits) expect(await verifyAudit(a)).toBe(true);
  });
});
