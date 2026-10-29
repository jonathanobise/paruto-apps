// SYNTHETIC TEST FIXTURE — reusable flows over the synthetic market.
import { expect } from 'vitest';
import { drainQueue, refreshCandidateSnapshots, runDiscoveryCycle } from '@alpha-desk/orchestrator';
import { GOOD_TOKEN, type makeHarness } from './world.ts';

/** Runs discovery through to an open paper position on the synthetic market. */
export async function openPositionFlow(h: Awaited<ReturnType<typeof makeHarness>>) {
  const { world, ctx, db } = h;
  const tok = world.addToken(GOOD_TOKEN);
  // A real earlier holder observation (one hour before), as the monitor would have recorded.
  await db.run(
    `INSERT INTO holder_snapshots (id, mint, observed_at, provider_id, total_supply, holder_count, classification) VALUES ('hs_prev', ?, ?, 'helius', '0', 1900, '[]')`,
    [tok.mint, world.clock.now() - 3_600_000],
  );
  const d = await runDiscoveryCycle(ctx);
  expect(d.discovered).toBe(1);
  await drainQueue(ctx, 'filter');
  for (let i = 0; i < 3; i++) {
    world.clock.advance(15_000);
    world.setPrice(tok, world.price(tok) * 1.002);
    await refreshCandidateSnapshots(ctx);
  }
  await drainQueue(ctx, 'analyst');
  await drainQueue(ctx, 'risk');
  await drainQueue(ctx, 'execute');
  return tok;
}
