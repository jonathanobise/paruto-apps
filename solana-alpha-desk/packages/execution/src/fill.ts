import type { StrategyConfig } from '@alpha-desk/config';
import {
  buyQuote,
  isNoRouteError,
  quotePriceUsd,
  sellQuote,
  type EvidenceCollector,
  type Observed,
  type Quote,
  type QuoteProvider,
} from '@alpha-desk/providers';
import { Decimal, fromBaseUnits, usdToMicro, type Clock } from '@alpha-desk/shared';

export const FILL_MODEL_VERSION = 'paper-fill-v1';

export interface FeeEstimate {
  lamports: bigint;
  usdMicro: bigint;
  priorityMicroLamportsPerCu: number;
}

/** Base fee + priority fee (percentile of recent fees, floored) × compute units, converted at SOL/USD. */
export function estimateNetworkFee(
  recentPriorityFees: number[],
  solUsd: Decimal,
  cfg: StrategyConfig['execution'],
): FeeEstimate {
  const sorted = [...recentPriorityFees].sort((a, b) => a - b);
  const idx = sorted.length
    ? Math.min(sorted.length - 1, Math.floor((cfg.priorityFeePercentile / 100) * sorted.length))
    : -1;
  const pct = idx >= 0 ? sorted[idx]! : 0;
  const perCu = Math.max(pct, cfg.minPriorityFeeMicroLamportsPerCu);
  const priorityLamports = (BigInt(perCu) * BigInt(cfg.computeUnits)) / 1_000_000n;
  const lamports = BigInt(cfg.baseFeeLamports) + priorityLamports;
  const usd = fromBaseUnits(lamports, 9).mul(solUsd);
  return { lamports, usdMicro: usdToMicro(usd, Decimal.ROUND_CEIL), priorityMicroLamportsPerCu: perCu };
}

export type FillOutcome =
  | {
      status: 'FILLED';
      side: 'BUY' | 'SELL';
      tokenQuantity: bigint;
      usdAmountMicro: bigint; // paid (BUY) or received (SELL), before network fee
      networkFeeMicro: bigint;
      priceUsd: Decimal; // executed, per whole token
      quotePriceUsd: Decimal; // indicative, from the first quote
      slippageBps: Decimal; // executed vs indicative, adverse positive
      priceImpactPct: string;
      route: string[];
      quoteEvidenceId: string;
      requoteEvidenceId: string;
      latencyMs: number;
      simulatedAt: number;
    }
  | {
      status: 'FAILED' | 'REJECTED';
      side: 'BUY' | 'SELL';
      reason: string;
      quoteEvidenceId: string | null;
      requoteEvidenceId: string | null;
      simulatedAt: number;
    };

export interface FillDeps {
  jupiter: QuoteProvider;
  clock: Clock;
  sleep: (ms: number) => Promise<void>;
  evidence: EvidenceCollector;
  /** Modelled submission-to-landing latency (config execution.simulatedLatencyMs). */
  latencyMs: number;
}

export interface FillRequest {
  side: 'BUY' | 'SELL';
  mint: string;
  tokenDecimals: number;
  /** micro-USD for BUY, token base units for SELL */
  amountIn: bigint;
  slippageBps: number;
  fee: FeeEstimate;
}

/**
 * Paper fill simulator (paper-fill-v1). An indicative quote is never treated as a fill:
 *  1. quote at decision time (sets the slippage-protected minimum out, as a real swap would);
 *  2. wait the modelled submission-to-landing latency;
 *  3. re-quote — the market the transaction would actually meet;
 *  4. fail if the route vanished or the re-quote is below the minimum out (slippage exceeded);
 *  5. otherwise fill at the *worse* of the two quotes, and charge base + priority fees.
 * Jupiter swaps are atomic, so partial fills are not modelled: an order fills completely or fails.
 */
export async function simulateFill(deps: FillDeps, req: FillRequest): Promise<FillOutcome> {
  const startedAt = deps.clock.now();
  const quote = (): Promise<Observed<Quote>> =>
    req.side === 'BUY'
      ? buyQuote(deps.jupiter, req.mint, req.amountIn, req.slippageBps)
      : sellQuote(deps.jupiter, req.mint, req.amountIn, req.slippageBps);

  let q0: Observed<Quote>;
  try {
    q0 = await quote();
  } catch (e) {
    return {
      status: isNoRouteError(e) ? 'REJECTED' : 'FAILED',
      side: req.side,
      reason: `initial quote failed: ${(e as Error).message.slice(0, 200)}`,
      quoteEvidenceId: null,
      requoteEvidenceId: null,
      simulatedAt: deps.clock.now(),
    };
  }
  const q0Id = deps.evidence.add(q0, req.side === 'BUY' ? 'JUP_BUY_QUOTE' : 'JUP_SELL_QUOTE', 'DERIVED');
  await deps.sleep(deps.latencyMs);

  let q1: Observed<Quote>;
  try {
    q1 = await quote();
  } catch (e) {
    return {
      status: 'FAILED',
      side: req.side,
      reason: `route unavailable at landing: ${(e as Error).message.slice(0, 200)}`,
      quoteEvidenceId: q0Id,
      requoteEvidenceId: null,
      simulatedAt: deps.clock.now(),
    };
  }
  const q1Id = deps.evidence.add(q1, req.side === 'BUY' ? 'JUP_BUY_REQUOTE' : 'JUP_SELL_REQUOTE', 'DERIVED');
  const landedMs = Math.max(deps.latencyMs, deps.clock.now() - startedAt);

  if (q1.data.outAmount < q0.data.minOutAmount) {
    return {
      status: 'FAILED',
      side: req.side,
      reason: `slippage exceeded: landing quote ${q1.data.outAmount} < minimum ${q0.data.minOutAmount}`,
      quoteEvidenceId: q0Id,
      requoteEvidenceId: q1Id,
      simulatedAt: deps.clock.now(),
    };
  }
  const out = q1.data.outAmount < q0.data.outAmount ? q1.data.outAmount : q0.data.outAmount;
  if (out <= 0n) {
    return {
      status: 'FAILED',
      side: req.side,
      reason: 'zero output',
      quoteEvidenceId: q0Id,
      requoteEvidenceId: q1Id,
      simulatedAt: deps.clock.now(),
    };
  }
  const tokenQuantity = req.side === 'BUY' ? out : req.amountIn;
  const usdAmountMicro = req.side === 'BUY' ? req.amountIn : out;
  const executed = fromBaseUnits(usdAmountMicro, 6).div(fromBaseUnits(tokenQuantity, req.tokenDecimals));
  const indicative = quotePriceUsd(q0.data, req.tokenDecimals, req.side);
  // Adverse slippage: paying more on a buy, receiving less on a sell.
  const slip = indicative.gt(0)
    ? (req.side === 'BUY' ? executed.sub(indicative) : indicative.sub(executed)).div(indicative).mul(10_000)
    : new Decimal(0);
  return {
    status: 'FILLED',
    side: req.side,
    tokenQuantity,
    usdAmountMicro,
    networkFeeMicro: req.fee.usdMicro,
    priceUsd: executed,
    quotePriceUsd: indicative,
    slippageBps: slip,
    priceImpactPct: q1.data.priceImpactPct,
    route: q1.data.routeLabels,
    quoteEvidenceId: q0Id,
    requoteEvidenceId: q1Id,
    latencyMs: landedMs,
    simulatedAt: deps.clock.now(),
  };
}
