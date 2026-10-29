import { describe, expect, it } from 'vitest';
import { DEFAULT_STRATEGY, StrategyConfigSchema, versionConfig } from '../src/index.ts';

describe('strategy configuration', () => {
  it('encodes the specification thresholds', () => {
    const c = DEFAULT_STRATEGY;
    expect([
      c.discovery.minPairAgeMinutes,
      c.discovery.maxPairAgeHours,
      c.discovery.minMarketCapUsd,
      c.discovery.maxMarketCapUsd,
    ]).toEqual([30, 72, 300_000, 20_000_000]);
    expect([
      c.filter.minLiquidityUsd,
      c.filter.minVolume1hUsd,
      c.filter.maxTop10HolderPct,
      c.filter.maxDeveloperOwnershipPct,
      c.filter.maxBundledLaunchPct,
      c.filter.maxPriceChange1hPct,
    ]).toEqual([40_000, 50_000, 25, 3, 10, 80]);
    expect(c.analyst.passThreshold).toBe(70);
    const w = c.analyst.factors;
    expect([
      w.momentum.weight,
      w.uniqueBuyers.weight,
      w.buySellValueRatio.weight,
      w.holderGrowth.weight,
      w.liquidityToMcap.weight,
      w.smartWallets.weight,
    ]).toEqual([20, 20, 15, 15, 15, 15]);
    expect([
      c.risk.maxAllocationPct,
      c.risk.riskBudgetPct,
      c.risk.maxCombinedExposurePct,
      c.risk.maxConcurrentPositions,
      c.risk.initialStopPct,
      c.risk.trailingActivationPct,
      c.risk.trailingDistancePct,
      c.risk.dailyLossLimitPct,
      c.risk.maxDrawdownPct,
    ]).toEqual([8, 0.5, 24, 3, 6, 12, 6, 3, 8]);
  });
  it('rejects weights that do not sum to 100', () => {
    const bad = structuredClone(DEFAULT_STRATEGY);
    bad.analyst.factors.momentum.weight = 25;
    expect(() => StrategyConfigSchema.parse(bad)).toThrow(/sum/);
  });
  it('versions by content', async () => {
    const a = await versionConfig(DEFAULT_STRATEGY);
    const b = await versionConfig(structuredClone(DEFAULT_STRATEGY));
    const changed = structuredClone(DEFAULT_STRATEGY);
    changed.risk.initialStopPct = 7;
    const c = await versionConfig(changed);
    expect(a.configVersion).toBe(b.configVersion);
    expect(c.configVersion).not.toBe(a.configVersion);
  });
});
