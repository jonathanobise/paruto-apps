import { describe, expect, it } from 'vitest';
import { computeMetrics, maxDrawdownPct, segment, type ClosedTrade } from '../src/index.ts';

const t = (pnl: number, o: Partial<ClosedTrade> = {}): ClosedTrade => ({
  id: String(Math.random()),
  mint: 'm',
  symbol: null,
  entryAt: 0,
  exitAt: 3_600_000,
  entryCostMicro: 500_000_000n,
  realizedPnlMicro: BigInt(pnl * 1e6),
  feesMicro: 2_000n,
  rMultiple: pnl / 50,
  mfePct: null,
  maePct: null,
  exitReason: 'STOP',
  strategyVersion: 'v1',
  tokenAgeMinutesAtEntry: 100,
  marketCapAtEntry: 2e6,
  liquidityAtEntry: 1e5,
  scoreAtEntry: 76,
  ...o,
});

describe('performance metrics', () => {
  it('computes win rate, expectancy and profit factor', () => {
    const m = computeMetrics([t(100), t(-50), t(-50), t(60)], []);
    expect(m.winRatePct).toBe('50.00');
    expect(m.expectancyUsd).toBe('15.00');
    expect(m.profitFactor).toBe('1.600');
    expect(m.netPnlUsd).toBe('60.00');
    expect(m.sharpe).toBeNull();
    expect(m.statisticalNote).toMatch(/not statistically meaningful/);
  });
  it('handles no trades', () => {
    const m = computeMetrics([], []);
    expect(m.trades).toBe(0);
    expect(m.winRatePct).toBeNull();
  });
  it('measures peak-to-trough drawdown', () => {
    expect(
      maxDrawdownPct([
        { at: 0, equityMicro: 100n },
        { at: 1, equityMicro: 120n },
        { at: 2, equityMicro: 90n },
        { at: 3, equityMicro: 130n },
      ]),
    ).toBe('25.000');
  });
  it('segments by score band', () => {
    const s = segment([t(10, { scoreAtEntry: 72 }), t(10, { scoreAtEntry: 95 })], 'scoreBand');
    expect(s.map((x) => x.key)).toEqual(['70–75', '90–100']);
  });
});
