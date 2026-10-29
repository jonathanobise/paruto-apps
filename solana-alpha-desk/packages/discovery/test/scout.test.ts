import { describe, expect, it } from 'vitest';
import { DEFAULT_STRATEGY } from '@alpha-desk/config';
import type { DexPair } from '@alpha-desk/providers';
import { evaluateBatch, evaluateToken } from '../src/index.ts';

const NOW = 1_800_000_000_000;
const MINT = 'HMYd9tosnUXuNHmq7pXmoePRVBLBBjA3JBfydq6upump';
const SOL = 'So11111111111111111111111111111111111111112';
const cfg = DEFAULT_STRATEGY.discovery;

function pair(o: Partial<DexPair> & { ageMin?: number } = {}): DexPair {
  const { ageMin = 120, ...rest } = o;
  return {
    chainId: 'solana',
    dexId: 'pumpswap',
    pairAddress: '12jc1DzJpzbCDaKuM4brAKh9jcFry2TLG1FfGsL4ftCG',
    baseToken: { address: MINT, symbol: 'TST', name: 'Test' },
    quoteToken: { address: SOL, symbol: 'SOL' },
    priceUsd: '0.001',
    priceNative: '0.00001',
    txns: { h1: { buys: 100, sells: 80 }, h24: { buys: 1000, sells: 900 } },
    volume: { m5: 5000, h1: 60_000, h6: 200_000, h24: 500_000 },
    priceChange: { m5: 1, h1: 5, h6: 10, h24: 20 },
    liquidity: { usd: 80_000 },
    marketCap: 1_000_000,
    fdv: 1_000_000,
    pairCreatedAt: NOW - ageMin * 60_000,
    ...rest,
  } as DexPair;
}

describe('Scout', () => {
  it('accepts a token inside every bound', () => {
    expect(evaluateToken(MINT, [pair()], NOW, cfg).outcome).toBe('DISCOVERED');
  });
  it('treats age and market-cap bounds as inclusive', () => {
    expect(evaluateToken(MINT, [pair({ ageMin: 30 })], NOW, cfg).outcome).toBe('DISCOVERED');
    expect(evaluateToken(MINT, [pair({ ageMin: 72 * 60 })], NOW, cfg).outcome).toBe('DISCOVERED');
    expect(evaluateToken(MINT, [pair({ marketCap: 300_000 })], NOW, cfg).outcome).toBe('DISCOVERED');
    expect(evaluateToken(MINT, [pair({ marketCap: 20_000_000 })], NOW, cfg).outcome).toBe('DISCOVERED');
  });
  it('rejects outside the bounds', () => {
    expect(evaluateToken(MINT, [pair({ ageMin: 29.9 })], NOW, cfg).reasons).toContain('PAIR_TOO_YOUNG');
    expect(evaluateToken(MINT, [pair({ ageMin: 72 * 60 + 1 })], NOW, cfg).reasons).toContain('PAIR_TOO_OLD');
    expect(evaluateToken(MINT, [pair({ marketCap: 299_999 })], NOW, cfg).reasons).toContain(
      'MARKET_CAP_BELOW_MIN',
    );
    expect(evaluateToken(MINT, [pair({ marketCap: 20_000_001 })], NOW, cfg).reasons).toContain(
      'MARKET_CAP_ABOVE_MAX',
    );
  });
  it('never substitutes FDV for a missing market cap', () => {
    const d = evaluateToken(MINT, [pair({ marketCap: undefined, fdv: 1_000_000 })], NOW, cfg);
    expect(d.outcome).toBe('DISCOVERY_REJECTED');
    expect(d.reasons).toContain('MARKET_CAP_UNVERIFIED');
  });
  it('measures age on the deepest supported pool and keeps the earliest pool separately', () => {
    const old = pair({
      pairAddress: 'Old1111111111111111111111111111111111111111',
      dexId: 'pumpfun',
      quoteToken: { address: 'Unknown1111111111111111111111111111111111111', symbol: 'X' },
      liquidity: { usd: 500_000 },
      ageMin: 6000,
    });
    const d = evaluateToken(MINT, [old, pair({ ageMin: 90 })], NOW, cfg);
    expect(d.outcome).toBe('DISCOVERED');
    expect(d.snapshot?.pairAddress).toBe('12jc1DzJpzbCDaKuM4brAKh9jcFry2TLG1FfGsL4ftCG');
    expect(d.snapshot?.earliestPoolAt).toBe(NOW - 6000 * 60_000);
  });
  it('rejects inactive pairs, unverifiable prices and invalid mints', () => {
    expect(
      evaluateToken(MINT, [pair({ txns: { h1: { buys: 0, sells: 0 } }, volume: { h1: 0 } })], NOW, cfg)
        .reasons,
    ).toContain('INACTIVE_PAIR');
    expect(evaluateToken(MINT, [pair({ priceUsd: undefined })], NOW, cfg).reasons).toContain(
      'DATA_UNVERIFIABLE',
    );
    const bad = 'x'.repeat(40);
    expect(evaluateToken(bad, [pair({ baseToken: { address: bad } })], NOW, cfg).reasons).toEqual([
      'INVALID_MINT',
    ]);
  });
  it('produces one decision per token even with many pools', () => {
    const ds = evaluateBatch(
      [MINT, MINT],
      [
        pair(),
        pair({ pairAddress: 'Other111111111111111111111111111111111111111', liquidity: { usd: 10_000 } }),
      ],
      NOW,
      cfg,
    );
    expect(ds).toHaveLength(1);
  });
});
