import { describe, expect, it } from 'vitest';
import { creditUsageToday } from '@alpha-desk/orchestrator';
import { exerciseCreditLedger } from '../fixtures/credits.ts';
import { makeHarness } from '../fixtures/world.ts';

describe('daily credit budget', () => {
  it('reserves credits atomically per UTC day and refuses calls beyond the cap (node:sqlite)', async () => {
    const { db } = await makeHarness();
    await exerciseCreditLedger(db);
  });
  it('defaults to 33,000 Helius credits a day', async () => {
    const { db, world } = await makeHarness();
    expect((await creditUsageToday(db, world.clock.now())).cap).toBe(33_000);
  });
});
