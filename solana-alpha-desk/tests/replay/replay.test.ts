// SYNTHETIC TEST FIXTURE data only.
import { describe, expect, it } from 'vitest';
import { DEFAULT_STRATEGY } from '@alpha-desk/config';
import {
  replay,
  splitPeriods,
  walkForward,
  type ReplayAssessment,
  type ReplaySnapshot,
} from '@alpha-desk/replay';

const T0 = Date.UTC(2026, 9, 1);
const MIN = 60_000;

function path(mint: string, prices: number[], o: Partial<ReplaySnapshot> = {}): ReplaySnapshot[] {
  return prices.map((p, i) => ({
    mint,
    pair: `pair-${mint}`,
    symbol: mint.toUpperCase(),
    at: T0 + i * MIN,
    priceUsd: p,
    marketCapUsd: 2_000_000,
    liquidityUsd: 400_000,
    volumeM5: 10_000,
    volumeH1: 120_000,
    changeM5: 1,
    changeH1: 20,
    changeH6: 30,
    pairCreatedAt: T0 - 180 * MIN,
    ...o,
  }));
}
const rising = (n: number, start = 1, step = 0.004) =>
  Array.from({ length: n }, (_, i) => start * (1 + step) ** i);

const params = {
  config: DEFAULT_STRATEGY,
  filterMode: 'MARKET_RULES_ONLY' as const,
  startingEquityUsd: 10_000,
  defaultOneWayCostPct: 1,
};

describe('historical replay', () => {
  it('enters on market-rule eligibility (research mode), trails, and exits on the stop', () => {
    const prices = [...rising(40), ...Array.from({ length: 20 }, (_, i) => 1.17 * (1 - 0.01 * i))];
    const r = replay(path('a', prices), [], params, { start: T0, end: T0 + 60 * MIN });
    expect(r.label).toBe('REPLAY_ESTIMATE');
    expect(r.retrospective).toBe(true);
    expect(r.decisions.entered).toBe(1);
    expect(r.trades).toHaveLength(1);
    expect(r.trades[0]!.exitReason).toBe('TRAILING_STOP');
    expect(r.notes.join(' ')).toMatch(/RESEARCH MODE/);
  });
  it('uses no information from after the decision time (no look-ahead)', () => {
    const before = rising(30);
    const after = [...before, ...Array.from({ length: 30 }, (_, i) => (i < 5 ? 3 : 0.1))]; // a huge future spike then crash
    const cut = T0 + 30 * MIN;
    const full = replay(path('a', after), [], params, { start: T0, end: T0 + 60 * MIN });
    const truncated = replay(path('a', before), [], params, { start: T0, end: cut });
    const entriesBy = (r: typeof full) => r.decisions.entered;
    expect(entriesBy(truncated)).toBe(1);
    // The entry happened at the same time with the same price in both runs.
    const fullEntry = full.trades[0]?.entryAt;
    expect(fullEntry).toBeLessThan(cut);
  });
  it('honours Filter assessments only after they were completed (timestamp consistency)', () => {
    const snaps = path('a', rising(40));
    const late: ReplayAssessment = {
      mint: 'a',
      completedAt: T0 + 50 * MIN,
      outcome: 'FILTER_APPROVED',
      validUntil: T0 + 60 * MIN,
      onChainLiquidityUsd: 400_000,
      sellImpactPct: 0.5,
    };
    const r = replay(snaps, [late], { ...params, filterMode: 'RECORDED' }, { start: T0, end: T0 + 40 * MIN });
    expect(r.decisions.eligible).toBe(0);
  });
  it('in RECORDED mode, missing indexer factors keep candidates unverified (no invented scores)', () => {
    const snaps = path('a', rising(40));
    const ok: ReplayAssessment = {
      mint: 'a',
      completedAt: T0,
      outcome: 'FILTER_APPROVED',
      validUntil: T0 + 60 * MIN,
      onChainLiquidityUsd: 400_000,
      sellImpactPct: 0.5,
    };
    const r = replay(snaps, [ok], { ...params, filterMode: 'RECORDED' }, { start: T0, end: T0 + 40 * MIN });
    expect(r.decisions.eligible).toBeGreaterThan(0);
    expect(r.decisions.approved).toBe(0);
  });
  it('splits periods into development, validation and out-of-sample test, and walks forward', () => {
    const f = splitPeriods(0, 100);
    expect(f.map((x) => [x.start, x.end])).toEqual([
      [0, 60],
      [60, 80],
      [80, 100],
    ]);
    const w = walkForward(0, 100, 3);
    expect(w[0]!.start).toBe(40);
    expect(w.at(-1)!.end).toBe(100);
    for (let i = 1; i < w.length; i++) expect(w[i]!.start).toBe(w[i - 1]!.end);
  });
});
