import { describe, expect, it } from 'vitest';
import { DEFAULT_STRATEGY } from '@alpha-desk/config';
import { drainQueue, runDiscoveryCycle, updateStrategy } from '@alpha-desk/orchestrator';
import { GOOD_TOKEN, makeHarness } from '../fixtures/world.ts';

const runs = async (h: Awaited<ReturnType<typeof makeHarness>>, mint: string) =>
  h.db.all<{ state: string }>(
    'SELECT state FROM candidate_discoveries WHERE mint = ? ORDER BY discovered_at',
    [mint],
  );

describe('re-checking rejected tokens', () => {
  it('does not re-check a permanent rejection (coordinated launch) under the same strategy', async () => {
    const h = await makeHarness();
    const bundled = h.world.addToken({ ...GOOD_TOKEN, seed: 'bundled', bundledLaunch: true });
    const thin = h.world.addToken({
      ...GOOD_TOKEN,
      seed: 'thin',
      volume: { m5: 50, h1: 1_000, h6: 4_000, h24: 9_000 },
    });
    await runDiscoveryCycle(h.ctx);
    await drainQueue(h.ctx, 'filter');
    const f009 = await h.db.first<{ outcome: string; reason: string }>(
      `SELECT r.outcome, r.reason FROM security_rule_results r JOIN token_security_assessments a ON a.id = r.assessment_id
       WHERE a.mint = ? AND r.rule_id = 'F009'`,
      [bundled.mint],
    );
    expect(f009?.outcome, f009?.reason).toBe('FAIL');
    expect(await runs(h, thin.mint)).toEqual([{ state: 'FILTER_REJECTED' }]);

    // Past the re-evaluation interval, thin volume can change, a coordinated launch cannot.
    h.world.clock.advance((DEFAULT_STRATEGY.discovery.reevaluateAfterMinutes + 5) * 60_000);
    await runDiscoveryCycle(h.ctx);
    expect(await runs(h, bundled.mint)).toHaveLength(1);
    expect(await runs(h, thin.mint)).toHaveLength(2);

    // A new strategy version may judge the launch differently, so the token is checked again.
    await updateStrategy(
      h.ctx,
      { ...DEFAULT_STRATEGY, filter: { ...DEFAULT_STRATEGY.filter, maxBundledLaunchPct: 25 } },
      'owner:test',
      'raise the bundling limit',
    );
    h.world.clock.advance((DEFAULT_STRATEGY.discovery.reevaluateAfterMinutes + 5) * 60_000);
    await runDiscoveryCycle(h.ctx);
    expect(await runs(h, bundled.mint)).toHaveLength(2);
  });
});
