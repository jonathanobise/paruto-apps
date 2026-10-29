import { expect } from 'vitest';
import type { SqlDb } from '@alpha-desk/db';
import { CreditLedger, creditUsageToday } from '@alpha-desk/orchestrator';
import { ManualClock } from '@alpha-desk/shared';

/** Shared by the node:sqlite run here and the D1 run in d1.test.ts. */
export async function exerciseCreditLedger(db: SqlDb): Promise<void> {
  const clock = new ManualClock(Date.UTC(2026, 9, 29, 23, 0, 0));
  await db.run('UPDATE runtime_state SET helius_daily_credit_cap = 250 WHERE id = 1');
  const ledger = new CreditLedger(db, clock);
  expect(await ledger.reserve('helius', 100)).toBe(true);
  expect(await ledger.reserve('helius', 100)).toBe(true);
  expect(await ledger.reserve('helius', 100)).toBe(false); // 300 would exceed 250
  expect(await ledger.reserve('helius', 10)).toBe(true); // a smaller call still fits
  expect(await creditUsageToday(db, clock.now())).toEqual({
    day: '2026-10-29',
    credits: 210,
    calls: 3,
    refused: 1,
    cap: 250,
  });
  // A new UTC day starts from zero; raising the cap applies at once.
  clock.advance(2 * 3_600_000);
  expect(await ledger.reserve('helius', 100)).toBe(true);
  await db.run('UPDATE runtime_state SET helius_daily_credit_cap = 0 WHERE id = 1');
  expect(await ledger.reserve('helius', 10)).toBe(false);
  expect((await creditUsageToday(db, clock.now())).credits).toBe(100);
  await db.run('UPDATE runtime_state SET helius_daily_credit_cap = 33000 WHERE id = 1');
}
