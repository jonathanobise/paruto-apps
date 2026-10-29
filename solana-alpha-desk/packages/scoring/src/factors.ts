import type { StrategyConfig } from '@alpha-desk/config';
import { Decimal, type DataQuality } from '@alpha-desk/shared';

export type FactorName = keyof StrategyConfig['analyst']['factors'];
type FactorCfg = StrategyConfig['analyst']['factors'][FactorName];

export interface FactorResult {
  factor: FactorName;
  version: string;
  rawMetric: string | null;
  normalized: string | null;
  score: string; // weight × normalized, 0 when data is missing
  weight: number;
  quality: DataQuality;
  windowStart: number | null;
  windowEnd: number | null;
  evidence: Record<string, unknown>;
}

/** Piecewise-linear interpolation, clamped to the curve's end points. */
export function applyCurve(curve: Array<[number, number]>, x: number): number {
  const first = curve[0]!;
  const last = curve[curve.length - 1]!;
  if (x <= first[0]) return first[1];
  if (x >= last[0]) return last[1];
  for (let i = 1; i < curve.length; i++) {
    const [x1, y1] = curve[i]!;
    const [x0, y0] = curve[i - 1]!;
    if (x <= x1) return y0 + ((x - x0) / (x1 - x0)) * (y1 - y0);
  }
  return last[1];
}

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

function result(factor: FactorName, cfg: FactorCfg, quality: DataQuality, raw: number | null, normalized: number | null, evidence: Record<string, unknown>, window: [number | null, number | null] = [null, null]): FactorResult {
  const usable = normalized !== null && (quality === 'VERIFIED' || quality === 'PARTIAL');
  const n = usable ? clamp01(normalized!) : null;
  return {
    factor,
    version: cfg.version,
    rawMetric: raw === null ? null : new Decimal(raw).toSignificantDigits(10).toString(),
    normalized: n === null ? null : n.toFixed(6),
    // Missing data scores zero — never a favourable default.
    score: n === null ? '0' : new Decimal(cfg.weight).mul(n).toFixed(4),
    weight: cfg.weight,
    quality,
    windowStart: window[0],
    windowEnd: window[1],
    evidence,
  };
}

export interface PricePoint {
  at: number;
  priceUsd: number;
}

export interface MomentumInput {
  change: { m5: number | null; h1: number | null; h6: number | null };
  volume: { m5: number | null; h1: number | null };
  /** Our own snapshots of this pair, oldest first, within the observation window. */
  series: PricePoint[];
  observedAt: number;
}

/**
 * Momentum (momentum-v1): rewards a sustained, broad-based rise rather than one spike.
 *  - trend      0.35: one-hour change mapped 0 → 0, +30% → 1 (falls score 0)
 *  - breadth    0.15: six-hour change positive (1), mildly negative (0.3), else 0
 *  - recency    0.20: last 5 min volume vs the hour's 5-min average, 1 inside 0.8–1.6×
 *  - persistence 0.30: share of rising intervals in our own snapshot series
 *  A spike penalty halves the composite when ≥ 60% of the hour's gain came in the last 5 minutes.
 */
export function momentumFactor(i: MomentumInput, cfg: FactorCfg): FactorResult {
  const { m5, h1, h6 } = i.change;
  if (h1 === null || h6 === null || m5 === null || i.volume.h1 === null || i.volume.m5 === null) {
    return result('momentum', cfg, 'UNAVAILABLE', null, null, { reason: 'price-change or volume windows missing' });
  }
  const trend = h1 <= 0 ? 0 : clamp01(h1 / 30);
  const breadth = h6 > 0 ? 1 : h6 > -10 ? 0.3 : 0;
  const avg5 = i.volume.h1 / 12;
  const ratio = avg5 > 0 ? i.volume.m5 / avg5 : 0;
  const recency = ratio >= 0.8 && ratio <= 1.6 ? 1 : ratio < 0.8 ? clamp01(ratio / 0.8) : clamp01(1 - (ratio - 1.6) / 2.4);
  const series = i.series;
  let persistence: number | null = null;
  if (series.length >= Math.max(cfg.minSamples, 2)) {
    let up = 0;
    for (let k = 1; k < series.length; k++) if (series[k]!.priceUsd > series[k - 1]!.priceUsd) up++;
    persistence = up / (series.length - 1);
  }
  const spike = h1 > 0 && m5 >= 0.6 * h1;
  let composite = 0.35 * trend + 0.15 * breadth + 0.2 * recency + 0.3 * (persistence ?? 0);
  if (spike) composite *= 0.5;
  const quality: DataQuality = persistence === null ? 'PARTIAL' : 'VERIFIED';
  const norm = applyCurve(cfg.curve, composite);
  return result('momentum', cfg, quality, composite, norm, { trend, breadth, recency, recencyRatio: ratio, persistence, samples: series.length, spike }, [series[0]?.at ?? null, i.observedAt]);
}

export interface TradeFlowInput {
  /** Swaps in the window from an indexer; null when no indexer is configured. */
  trades: Array<{ wallet: string; cluster: string | null; side: 'BUY' | 'SELL'; usd: number; at: number }> | null;
  windowStart: number;
  windowEnd: number;
  /** DexScreener counts, recorded as supporting evidence only. */
  countBuys: number | null;
  countSells: number | null;
}

/** Unique buyers (unique-buyers-v1): distinct beneficial clusters (wallet when unclustered) that bought. */
export function uniqueBuyersFactor(i: TradeFlowInput, cfg: FactorCfg): FactorResult {
  if (!i.trades) return result('uniqueBuyers', cfg, 'UNAVAILABLE', null, null, { reason: 'trade-level data requires an indexer', dexBuyCount: i.countBuys });
  const buys = i.trades.filter((t) => t.side === 'BUY');
  const clusters = new Set(buys.map((t) => t.cluster ?? t.wallet));
  if (buys.length < cfg.minSamples) return result('uniqueBuyers', cfg, 'INSUFFICIENT', clusters.size, null, { buys: buys.length, minSamples: cfg.minSamples }, [i.windowStart, i.windowEnd]);
  return result('uniqueBuyers', cfg, 'VERIFIED', clusters.size, applyCurve(cfg.curve, clusters.size), { buys: buys.length, uniqueClusters: clusters.size, clustered: buys.some((b) => b.cluster) }, [i.windowStart, i.windowEnd]);
}

/** Buy/sell value ratio (buy-sell-value-v1): traded USD value, not transaction counts. Counts are recorded too. */
export function buySellValueFactor(i: TradeFlowInput, cfg: FactorCfg): FactorResult {
  const countRatio = i.countBuys !== null && i.countSells ? i.countBuys / i.countSells : null;
  if (!i.trades) return result('buySellValueRatio', cfg, 'UNAVAILABLE', null, null, { reason: 'traded value requires an indexer', countRatio });
  const buyUsd = i.trades.filter((t) => t.side === 'BUY').reduce((s, t) => s + t.usd, 0);
  const sellUsd = i.trades.filter((t) => t.side === 'SELL').reduce((s, t) => s + t.usd, 0);
  if (i.trades.length < cfg.minSamples || sellUsd <= 0) {
    return result('buySellValueRatio', cfg, 'INSUFFICIENT', null, null, { trades: i.trades.length, buyUsd, sellUsd, countRatio }, [i.windowStart, i.windowEnd]);
  }
  const ratio = buyUsd / sellUsd;
  return result('buySellValueRatio', cfg, 'VERIFIED', ratio, applyCurve(cfg.curve, ratio), { buyUsd, sellUsd, countRatio, trades: i.trades.length }, [i.windowStart, i.windowEnd]);
}

export interface HolderPoint {
  at: number;
  holders: number;
  /** Holders whose accounts were created by wallets already linked to existing holders (excluded as non-organic). */
  relatedNew?: number;
}

/** Holder growth (holder-growth-v1): % growth per hour between real, timestamped holder counts. */
export function holderGrowthFactor(points: HolderPoint[] | null, cfg: FactorCfg): FactorResult {
  if (!points || points.length === 0) return result('holderGrowth', cfg, 'UNAVAILABLE', null, null, { reason: 'holder counts require an indexer' });
  const sorted = [...points].sort((a, b) => a.at - b.at);
  if (sorted.length < Math.max(cfg.minSamples, 2)) return result('holderGrowth', cfg, 'INSUFFICIENT', null, null, { samples: sorted.length });
  const first = sorted[0]!;
  const last = sorted[sorted.length - 1]!;
  const hours = (last.at - first.at) / 3_600_000;
  if (hours < 0.25 || first.holders <= 0) return result('holderGrowth', cfg, 'INSUFFICIENT', null, null, { samples: sorted.length, hours });
  const related = sorted.reduce((s, p) => s + (p.relatedNew ?? 0), 0);
  const organic = last.holders - first.holders - related;
  const perHour = (organic / first.holders) * 100 / hours;
  return result('holderGrowth', cfg, 'VERIFIED', perHour, applyCurve(cfg.curve, perHour), { from: first.holders, to: last.holders, relatedExcluded: related, hours }, [first.at, last.at]);
}

/**
 * Liquidity strength (liquidity-mcap-v1): on-chain liquidity ÷ market cap (%), multiplied by an execution
 * depth factor from the sized sell quote (1 at ≤ 1% impact, falling linearly to 0.5 at 5%).
 */
export function liquidityFactor(i: { onChainLiquidityUsd: number | null; marketCapUsd: number | null; sellImpactPct: number | null }, cfg: FactorCfg): FactorResult {
  if (i.onChainLiquidityUsd === null || !i.marketCapUsd || i.sellImpactPct === null) {
    return result('liquidityToMcap', cfg, 'UNAVAILABLE', null, null, { ...i });
  }
  const pct = (i.onChainLiquidityUsd / i.marketCapUsd) * 100;
  const depth = i.sellImpactPct <= 1 ? 1 : Math.max(0.5, 1 - ((i.sellImpactPct - 1) / 4) * 0.5);
  return result('liquidityToMcap', cfg, 'VERIFIED', pct, applyCurve(cfg.curve, pct) * depth, { liquidityPct: pct, depthFactor: depth, ...i });
}

/**
 * Smart-wallet activity (smart-wallets-v1): buyers in the window that belong to the smart-wallet registry.
 * The registry is built only from outcomes known *before* the decision time (no look-ahead); with an empty
 * registry the factor is INSUFFICIENT and scores 0.
 */
export function smartWalletFactor(i: { buyers: string[] | null; registry: Set<string>; registryBuiltAt: number | null; decisionAt: number }, cfg: FactorCfg): FactorResult {
  if (!i.buyers) return result('smartWallets', cfg, 'UNAVAILABLE', null, null, { reason: 'buyer list requires an indexer' });
  if (i.registry.size === 0 || i.registryBuiltAt === null) return result('smartWallets', cfg, 'INSUFFICIENT', null, null, { reason: 'smart-wallet registry is empty' });
  if (i.registryBuiltAt > i.decisionAt) return result('smartWallets', cfg, 'UNAVAILABLE', null, null, { reason: 'registry postdates decision (look-ahead refused)' });
  const hits = [...new Set(i.buyers.filter((b) => i.registry.has(b)))];
  return result('smartWallets', cfg, 'VERIFIED', hits.length, applyCurve(cfg.curve, hits.length), { hits, registrySize: i.registry.size });
}
