import { describe, expect, it } from 'vitest';
import { DEFAULT_STRATEGY } from '@alpha-desk/config';
import { EvidenceCollector } from '@alpha-desk/providers';
import { ManualClock, Decimal } from '@alpha-desk/shared';
import { closeMath, estimateNetworkFee, simulateFill } from '../src/index.ts';
import { FakeJupiter } from '../../../tests/fixtures/fake-market.ts';

const MINT = 'HMYd9tosnUXuNHmq7pXmoePRVBLBBjA3JBfydq6upump';
const fee = { lamports: 5000n, usdMicro: 1_000n, priorityMicroLamportsPerCu: 0 };

function setup() {
  const clock = new ManualClock(1_800_000_000_000);
  const jup = new FakeJupiter(() => clock.now());
  jup.pools.set(MINT, {
    tokenReserve: 100_000_000n * 10n ** 6n,
    usdReserve: 100_000n * 10n ** 6n,
    decimals: 6,
  }); // $0.001, $100k a side
  const deps = {
    jupiter: jup,
    clock,
    sleep: async (ms: number) => clock.advance(ms),
    evidence: new EvidenceCollector(),
    latencyMs: 1500,
  };
  return { clock, jup, deps };
}

describe('paper fill simulator', () => {
  it('fills a market buy at the worse of quote and landing re-quote, with fees, never at the indicative price', async () => {
    const { jup, deps } = setup();
    jup.beforeQuote = (n) => n === 2 && jup.setPrice(MINT, 0.00101); // market moves 1% against us during latency
    const f = await simulateFill(deps, {
      side: 'BUY',
      mint: MINT,
      tokenDecimals: 6,
      amountIn: 500_000_000n,
      slippageBps: 300,
      fee,
    });
    expect(f.status).toBe('FILLED');
    if (f.status !== 'FILLED') return;
    expect(f.priceUsd.gt(f.quotePriceUsd)).toBe(true);
    expect(f.slippageBps.gt(0)).toBe(true);
    expect(f.networkFeeMicro).toBe(1_000n);
    expect(f.latencyMs).toBeGreaterThanOrEqual(1500);
    expect(f.quoteEvidenceId).not.toBe(f.requoteEvidenceId);
  });
  it('fails when the landing quote breaches the slippage tolerance', async () => {
    const { jup, deps } = setup();
    jup.beforeQuote = (n) => n === 2 && jup.setPrice(MINT, 0.0011); // +10% against a 3% tolerance
    const f = await simulateFill(deps, {
      side: 'BUY',
      mint: MINT,
      tokenDecimals: 6,
      amountIn: 500_000_000n,
      slippageBps: 300,
      fee,
    });
    expect(f.status).toBe('FAILED');
    expect(f.status === 'FAILED' && f.reason).toMatch(/slippage exceeded/);
  });
  it('rejects when no route exists and fails when the route vanishes before landing', async () => {
    const { jup, deps } = setup();
    jup.mode = 'noroute';
    expect(
      (
        await simulateFill(deps, {
          side: 'SELL',
          mint: MINT,
          tokenDecimals: 6,
          amountIn: 10n ** 9n,
          slippageBps: 300,
          fee,
        })
      ).status,
    ).toBe('REJECTED');
    const s = setup();
    s.jup.beforeQuote = (n) => {
      if (n === 2) s.jup.mode = 'noroute';
    };
    const f = await simulateFill(s.deps, {
      side: 'SELL',
      mint: MINT,
      tokenDecimals: 6,
      amountIn: 10n ** 9n,
      slippageBps: 300,
      fee,
    });
    expect(f.status).toBe('FAILED');
    const o = setup();
    o.jup.mode = 'outage';
    expect(
      (
        await simulateFill(o.deps, {
          side: 'BUY',
          mint: MINT,
          tokenDecimals: 6,
          amountIn: 1_000_000n,
          slippageBps: 300,
          fee,
        })
      ).status,
    ).toBe('FAILED');
  });
  it('models price impact: bigger orders get worse prices', async () => {
    const a = setup();
    const small = await simulateFill(a.deps, {
      side: 'BUY',
      mint: MINT,
      tokenDecimals: 6,
      amountIn: 10_000_000n,
      slippageBps: 300,
      fee,
    });
    const b = setup();
    const large = await simulateFill(b.deps, {
      side: 'BUY',
      mint: MINT,
      tokenDecimals: 6,
      amountIn: 5_000_000_000n,
      slippageBps: 300,
      fee,
    });
    expect(small.status === 'FILLED' && large.status === 'FILLED' && large.priceUsd.gt(small.priceUsd)).toBe(
      true,
    );
  });
});

describe('fees and P&L', () => {
  it('estimates priority fees from a percentile with a floor', () => {
    const e = estimateNetworkFee([0, 0, 0, 0], new Decimal(150), DEFAULT_STRATEGY.execution);
    expect(e.priorityMicroLamportsPerCu).toBe(10_000);
    expect(e.lamports).toBe(5000n + 3000n);
    expect(e.usdMicro).toBe(1200n); // 8000 lamports × $150/SOL = $0.0012
  });
  it('computes realised P&L net of all fees and an R-multiple', () => {
    const m = closeMath(
      { quantity: 1n, tokenDecimals: 0, entryCostMicro: 500_000_000n, plannedRiskMicro: 50_000_000n },
      550_000_000n,
      1_000_000n,
    );
    expect(m.realizedPnlMicro).toBe(49_000_000n);
    expect(m.rMultiple).toBe('0.9800');
  });
});
