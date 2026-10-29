import { describe, expect, it } from 'vitest';
import { DEFAULT_STRATEGY } from '@alpha-desk/config';
import {
  applyCurve,
  buySellValueFactor,
  decideAnalyst,
  holderGrowthFactor,
  liquidityFactor,
  momentumFactor,
  rankOpportunities,
  smartWalletFactor,
  uniqueBuyersFactor,
  type FactorResult,
} from '../src/index.ts';

const F = DEFAULT_STRATEGY.analyst.factors;
const A = DEFAULT_STRATEGY.analyst;
const NOW = 1_800_000_000_000;

function verified(factor: FactorResult['factor'], normalized: number): FactorResult {
  const w = F[factor].weight;
  return {
    factor,
    version: 'v',
    rawMetric: '1',
    normalized: String(normalized),
    score: String(w * normalized),
    weight: w,
    quality: 'VERIFIED',
    windowStart: null,
    windowEnd: null,
    evidence: {},
  };
}
const all = (n: number) =>
  (
    [
      'momentum',
      'uniqueBuyers',
      'buySellValueRatio',
      'holderGrowth',
      'liquidityToMcap',
      'smartWallets',
    ] as const
  ).map((f) => verified(f, n));

describe('normalisation', () => {
  it('interpolates and clamps', () => {
    expect(
      applyCurve(
        [
          [0, 0],
          [10, 1],
        ],
        -5,
      ),
    ).toBe(0);
    expect(
      applyCurve(
        [
          [0, 0],
          [10, 1],
        ],
        5,
      ),
    ).toBe(0.5);
    expect(
      applyCurve(
        [
          [0, 0],
          [10, 1],
        ],
        50,
      ),
    ).toBe(1);
    expect(
      applyCurve(
        [
          [20, 0],
          [150, 0.6],
          [400, 1],
        ],
        275,
      ),
    ).toBeCloseTo(0.8);
  });
});

describe('factors', () => {
  it('score zero with UNAVAILABLE quality when data is missing — never a favourable default', () => {
    const flow = { trades: null, windowStart: 0, windowEnd: 1, countBuys: 500, countSells: 10 };
    for (const f of [
      uniqueBuyersFactor(flow, F.uniqueBuyers),
      buySellValueFactor(flow, F.buySellValueRatio),
      holderGrowthFactor(null, F.holderGrowth),
      liquidityFactor({ onChainLiquidityUsd: null, marketCapUsd: 1, sellImpactPct: 1 }, F.liquidityToMcap),
      smartWalletFactor(
        { buyers: null, registry: new Set(), registryBuiltAt: null, decisionAt: NOW },
        F.smartWallets,
      ),
    ]) {
      expect(f.score).toBe('0');
      expect(['UNAVAILABLE', 'INSUFFICIENT']).toContain(f.quality);
    }
  });
  it('buy/sell ratio uses traded value, not counts', () => {
    const trades = [
      ...Array.from({ length: 40 }, () => ({
        wallet: 'x',
        cluster: null,
        side: 'BUY' as const,
        usd: 10,
        at: NOW,
      })),
      { wallet: 'y', cluster: null, side: 'SELL' as const, usd: 1000, at: NOW },
    ];
    const f = buySellValueFactor(
      { trades, windowStart: 0, windowEnd: 1, countBuys: 40, countSells: 1 },
      F.buySellValueRatio,
    );
    expect(Number(f.rawMetric)).toBeCloseTo(0.4);
    expect(f.score).toBe('0.0000');
    expect((f.evidence as { countRatio: number }).countRatio).toBe(40);
  });
  it('unique buyers counts clusters, not wallets', () => {
    const trades = Array.from({ length: 30 }, (_, i) => ({
      wallet: `w${i}`,
      cluster: i < 25 ? 'c1' : `c${i}`,
      side: 'BUY' as const,
      usd: 1,
      at: NOW,
    }));
    expect(
      uniqueBuyersFactor(
        { trades, windowStart: 0, windowEnd: 1, countBuys: null, countSells: null },
        F.uniqueBuyers,
      ).rawMetric,
    ).toBe('6');
  });
  it('momentum penalises a single spike', () => {
    const series = [1, 1.01, 1.02, 1.03, 1.04].map((p, i) => ({ at: NOW - (5 - i) * 15_000, priceUsd: p }));
    const steady = momentumFactor(
      { change: { m5: 2, h1: 20, h6: 30 }, volume: { m5: 1000, h1: 12_000 }, series, observedAt: NOW },
      F.momentum,
    );
    const spike = momentumFactor(
      { change: { m5: 18, h1: 20, h6: 30 }, volume: { m5: 1000, h1: 12_000 }, series, observedAt: NOW },
      F.momentum,
    );
    expect(Number(spike.score)).toBeLessThan(Number(steady.score));
    expect(steady.quality).toBe('VERIFIED');
    expect(
      momentumFactor(
        { change: { m5: 2, h1: 20, h6: 30 }, volume: { m5: 1000, h1: 12_000 }, series: [], observedAt: NOW },
        F.momentum,
      ).quality,
    ).toBe('PARTIAL');
  });
  it('liquidity strength is reduced by execution depth', () => {
    const deep = liquidityFactor(
      { onChainLiquidityUsd: 200_000, marketCapUsd: 1_000_000, sellImpactPct: 0.5 },
      F.liquidityToMcap,
    );
    const shallow = liquidityFactor(
      { onChainLiquidityUsd: 200_000, marketCapUsd: 1_000_000, sellImpactPct: 5 },
      F.liquidityToMcap,
    );
    expect(Number(deep.score)).toBe(15);
    expect(Number(shallow.score)).toBe(7.5);
  });
  it('smart-wallet registry refuses look-ahead', () => {
    const f = smartWalletFactor(
      { buyers: ['a'], registry: new Set(['a']), registryBuiltAt: NOW + 1, decisionAt: NOW },
      F.smartWallets,
    );
    expect(f.quality).toBe('UNAVAILABLE');
    expect(f.score).toBe('0');
  });
});

describe('Analyst decision', () => {
  const ctx = { now: NOW, filterValidUntil: NOW + 60_000 };
  it('passes at exactly 70 and rejects below', () => {
    expect(decideAnalyst(all(0.7), A, ctx).outcome).toBe('ANALYST_APPROVED');
    expect(decideAnalyst(all(0.6999), A, ctx).outcome).toBe('ANALYST_REJECTED');
  });
  it('is bounded to 0–100', () => {
    expect(Number(decideAnalyst(all(1), A, ctx).totalScore)).toBe(100);
    expect(Number(decideAnalyst(all(0), A, ctx).totalScore)).toBe(0);
  });
  it('is UNVERIFIED when a required factor is not verified, even with a high total', () => {
    const fs = all(1);
    fs[1] = { ...fs[1]!, quality: 'UNAVAILABLE', score: '0' };
    expect(decideAnalyst(fs, A, ctx).outcome).toBe('ANALYST_UNVERIFIED');
  });
  it('requires a still-valid filter approval', () => {
    expect(decideAnalyst(all(1), A, { now: NOW, filterValidUntil: NOW - 1 }).outcome).toBe(
      'ANALYST_UNVERIFIED',
    );
  });
  it('is reproducible', () => {
    expect(decideAnalyst(all(0.83), A, ctx)).toEqual(decideAnalyst(all(0.83), A, ctx));
  });
  it('ranks by eligibility, score, quality, depth, buyers, recency', () => {
    const base = {
      eligible: true,
      score: 80,
      verifiedWeight: 100,
      executionDepthUsd: 1,
      buyerClusters: 1,
      signalAt: 1,
    };
    const r = rankOpportunities([
      { id: 'a', ...base, eligible: false, score: 99 },
      { id: 'b', ...base, score: 75 },
      { id: 'c', ...base, score: 80, verifiedWeight: 85 },
      { id: 'd', ...base },
      { id: 'e', ...base, executionDepthUsd: 5 },
    ]);
    expect(r.map((x) => x.id)).toEqual(['e', 'd', 'c', 'b', 'a']);
  });
});
