import type { StrategyConfig } from '@alpha-desk/config';
import type { DexPair } from '@alpha-desk/providers';
import { isSolanaAddress, MINUTE, HOUR } from '@alpha-desk/shared';

export type DiscoveryRejection =
  | 'NOT_SOLANA'
  | 'INVALID_MINT'
  | 'NO_TRADABLE_POOL'
  | 'INACTIVE_PAIR'
  | 'PAIR_AGE_UNKNOWN'
  | 'PAIR_TOO_YOUNG'
  | 'PAIR_TOO_OLD'
  | 'MARKET_CAP_UNVERIFIED'
  | 'MARKET_CAP_BELOW_MIN'
  | 'MARKET_CAP_ABOVE_MAX'
  | 'DATA_UNVERIFIABLE';

export interface PoolObservation {
  pairAddress: string;
  dexId: string;
  labels: string[];
  quoteMint: string;
  quoteSymbol: string | null;
  pairCreatedAt: number | null;
  liquidityUsd: number | null;
  supportedQuote: boolean;
}

/** The normalised market observation the Scout records for a token's relevant pool. */
export interface ScoutSnapshot {
  mint: string;
  symbol: string | null;
  name: string | null;
  pairAddress: string;
  dexId: string;
  poolLabels: string[];
  quoteMint: string;
  quoteSymbol: string | null;
  pairCreatedAt: number | null;
  earliestPoolAt: number | null;
  priceUsd: string | null;
  priceNative: string | null;
  marketCapUsd: number | null;
  fdvUsd: number | null;
  liquidityUsd: number | null;
  totalAccessibleLiquidityUsd: number;
  priceChange: { m5: number | null; h1: number | null; h6: number | null; h24: number | null };
  volume: { m5: number | null; h1: number | null; h6: number | null; h24: number | null };
  txns: {
    h1: { buys: number; sells: number } | null;
    h24: { buys: number; sells: number } | null;
  };
}

export interface ScoutDecision {
  mint: string;
  outcome: 'DISCOVERED' | 'DISCOVERY_REJECTED';
  reasons: DiscoveryRejection[];
  ageMinutes: number | null;
  snapshot: ScoutSnapshot | null;
  pools: PoolObservation[];
}

const n = (v: number | undefined | null): number | null => (v === undefined || v === null || !Number.isFinite(v) ? null : v);

/**
 * Scout Agent. Pure: given every DexScreener pair seen for one token, decide whether the token is a
 * discovery candidate. Age is measured on the relevant tradable pool (deepest pool quoted in a supported
 * quote mint); the earliest pool of any kind is kept separately for relaunch detection.
 */
export function evaluateToken(mint: string, pairs: DexPair[], now: number, cfg: StrategyConfig['discovery']): ScoutDecision {
  const reasons: DiscoveryRejection[] = [];
  const own = pairs.filter((p) => p.baseToken.address === mint);
  const pools: PoolObservation[] = own.map((p) => ({
    pairAddress: p.pairAddress,
    dexId: p.dexId,
    labels: p.labels ?? [],
    quoteMint: p.quoteToken.address,
    quoteSymbol: p.quoteToken.symbol ?? null,
    pairCreatedAt: p.pairCreatedAt ?? null,
    liquidityUsd: n(p.liquidity?.usd),
    supportedQuote: cfg.supportedQuoteMints.includes(p.quoteToken.address),
  }));

  if (own.length === 0 || own.some((p) => p.chainId !== 'solana')) {
    return { mint, outcome: 'DISCOVERY_REJECTED', reasons: ['NOT_SOLANA'], ageMinutes: null, snapshot: null, pools };
  }
  if (!isSolanaAddress(mint)) {
    return { mint, outcome: 'DISCOVERY_REJECTED', reasons: ['INVALID_MINT'], ageMinutes: null, snapshot: null, pools };
  }

  const tradable = own
    .filter((p) => cfg.supportedQuoteMints.includes(p.quoteToken.address) && (n(p.liquidity?.usd) ?? 0) > 0)
    .sort((a, b) => (n(b.liquidity?.usd) ?? 0) - (n(a.liquidity?.usd) ?? 0));
  const relevant = tradable[0];
  if (!relevant) {
    return { mint, outcome: 'DISCOVERY_REJECTED', reasons: ['NO_TRADABLE_POOL'], ageMinutes: null, snapshot: null, pools };
  }

  const created = own.map((p) => p.pairCreatedAt).filter((t): t is number => typeof t === 'number' && t > 0);
  const earliestPoolAt = created.length ? Math.min(...created) : null;
  const totalAccessibleLiquidityUsd = tradable.reduce((s, p) => s + (n(p.liquidity?.usd) ?? 0), 0);

  const snapshot: ScoutSnapshot = {
    mint,
    symbol: relevant.baseToken.symbol ?? null,
    name: relevant.baseToken.name ?? null,
    pairAddress: relevant.pairAddress,
    dexId: relevant.dexId,
    poolLabels: relevant.labels ?? [],
    quoteMint: relevant.quoteToken.address,
    quoteSymbol: relevant.quoteToken.symbol ?? null,
    pairCreatedAt: relevant.pairCreatedAt ?? null,
    earliestPoolAt,
    priceUsd: relevant.priceUsd ?? null,
    priceNative: relevant.priceNative ?? null,
    marketCapUsd: n(relevant.marketCap),
    fdvUsd: n(relevant.fdv),
    liquidityUsd: n(relevant.liquidity?.usd),
    totalAccessibleLiquidityUsd,
    priceChange: {
      m5: n(relevant.priceChange?.m5),
      h1: n(relevant.priceChange?.h1),
      h6: n(relevant.priceChange?.h6),
      h24: n(relevant.priceChange?.h24),
    },
    volume: {
      m5: n(relevant.volume?.m5),
      h1: n(relevant.volume?.h1),
      h6: n(relevant.volume?.h6),
      h24: n(relevant.volume?.h24),
    },
    txns: { h1: relevant.txns?.h1 ?? null, h24: relevant.txns?.h24 ?? null },
  };

  const price = Number(relevant.priceUsd);
  if (!relevant.priceUsd || !Number.isFinite(price) || price <= 0) reasons.push('DATA_UNVERIFIABLE');

  const h1 = relevant.txns?.h1;
  if (!h1 || h1.buys + h1.sells === 0 || (n(relevant.volume?.h1) ?? 0) <= 0) reasons.push('INACTIVE_PAIR');

  let ageMinutes: number | null = null;
  if (!relevant.pairCreatedAt) {
    reasons.push('PAIR_AGE_UNKNOWN');
  } else {
    const ageMs = now - relevant.pairCreatedAt;
    ageMinutes = ageMs / MINUTE;
    if (ageMs < cfg.minPairAgeMinutes * MINUTE) reasons.push('PAIR_TOO_YOUNG');
    if (ageMs > cfg.maxPairAgeHours * HOUR) reasons.push('PAIR_TOO_OLD');
  }

  // Market cap is never substituted with FDV.
  const mcap = n(relevant.marketCap);
  if (mcap === null || mcap <= 0) reasons.push('MARKET_CAP_UNVERIFIED');
  else {
    if (mcap < cfg.minMarketCapUsd) reasons.push('MARKET_CAP_BELOW_MIN');
    if (mcap > cfg.maxMarketCapUsd) reasons.push('MARKET_CAP_ABOVE_MAX');
  }

  return {
    mint,
    outcome: reasons.length === 0 ? 'DISCOVERED' : 'DISCOVERY_REJECTED',
    reasons,
    ageMinutes,
    snapshot,
    pools,
  };
}

/** Group a batch of pairs by base mint and evaluate each mint once (one token → one decision). */
export function evaluateBatch(mints: string[], pairs: DexPair[], now: number, cfg: StrategyConfig['discovery']): ScoutDecision[] {
  const unique = [...new Set(mints)];
  return unique.map((mint) => evaluateToken(mint, pairs.filter((p) => p.baseToken.address === mint), now, cfg));
}
