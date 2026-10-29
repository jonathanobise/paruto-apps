import { describe, expect, it } from 'vitest';
import {
  drainQueue,
  ExecutionTicker,
  refreshCandidateSnapshots,
  runDiscoveryCycle,
} from '@alpha-desk/orchestrator';
import { GOOD_TOKEN, makeHarness } from '../fixtures/world.ts';

describe('ExecutionTicker (Durable Object execution plane)', () => {
  it('recovers, authorizes, fills and protects positions from timed ticks alone', async () => {
    const h = await makeHarness();
    const { world, ctx, db } = h;
    const tok = world.addToken(GOOD_TOKEN);
    await db.run(
      `INSERT INTO holder_snapshots (id, mint, observed_at, provider_id, total_supply, holder_count, classification) VALUES ('hs_prev', ?, ?, 'helius', '0', 1900, '[]')`,
      [tok.mint, world.clock.now() - 3_600_000],
    );
    await runDiscoveryCycle(ctx);
    await drainQueue(ctx, 'filter');
    for (let i = 0; i < 3; i++) {
      world.clock.advance(15_000);
      world.setPrice(tok, world.price(tok) * 1.002);
      await refreshCandidateSnapshots(ctx);
    }
    await drainQueue(ctx, 'analyst');
    const ticker = new ExecutionTicker(ctx, null);
    expect(await ticker.tick()).toBe(2000);
    expect((await db.first<{ status: string }>('SELECT status FROM positions'))?.status).toBe('OPEN');
    expect(
      (await db.first<{ restarts: number }>(`SELECT restarts FROM background_jobs WHERE id = 'monitor'`))
        ?.restarts,
    ).toBe(0);
    world.setPrice(tok, world.price(tok) * 0.85);
    world.clock.advance(2000);
    await ticker.tick();
    expect(
      await db.first<{ status: string; exit_reason: string }>('SELECT status, exit_reason FROM positions'),
    ).toEqual({ status: 'CLOSED', exit_reason: 'STOP' });
  });
});
