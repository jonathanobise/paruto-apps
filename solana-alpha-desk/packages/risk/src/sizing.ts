import type { StrategyConfig } from '@alpha-desk/config';
import { Decimal, microToUsd, minBig, usdToMicro } from '@alpha-desk/shared';

export interface SizingInput {
  equityMicro: bigint;
  cashMicro: bigint;
  /** Current value (mark, or cost when unmarked) of open positions. */
  openExposureMicro: bigint;
  /** Estimated one-way costs as fractions of notional: price impact + slippage allowance + network fees. */
  estEntryCostPct: Decimal;
  estExitCostPct: Decimal;
  /** Verified on-chain liquidity of the pool used for the entry. */
  liquidityUsd: Decimal;
  /** Network fees to reserve in cash for entry and exit. */
  feeReserveMicro: bigint;
}

export interface SizingResult {
  notionalMicro: bigint;
  lossFraction: string;
  plannedRiskMicro: bigint;
  caps: {
    allocationMicro: string;
    riskSizedMicro: string;
    liquidityMicro: string;
    cashMicro: string;
    remainingCapacityMicro: string;
  };
  binding: keyof SizingResult['caps'];
}

export const MIN_ORDER_MICRO = 10_000_000n; // $10

/**
 * Position sizing (spec §4.4): final notional is the minimum of the allocation cap (8% of equity),
 * the risk-sized notional (0.5% of equity ÷ estimated loss fraction), liquidity capacity, available cash
 * and remaining portfolio capacity (24% of equity minus open exposure). The loss fraction is the planned
 * 6% stop plus estimated entry and exit costs plus a conservative execution buffer — the stop is a
 * trigger, not a guaranteed loss boundary.
 */
export function sizePosition(i: SizingInput, cfg: StrategyConfig['risk']): SizingResult {
  const equity = microToUsd(i.equityMicro);
  const lossFraction = new Decimal(cfg.initialStopPct)
    .add(i.estEntryCostPct)
    .add(i.estExitCostPct)
    .add(cfg.executionBufferPct)
    .div(100);
  const allocation = usdToMicro(equity.mul(cfg.maxAllocationPct).div(100));
  const riskBudget = equity.mul(cfg.riskBudgetPct).div(100);
  const riskSized = usdToMicro(riskBudget.div(lossFraction));
  const liquidity = usdToMicro(i.liquidityUsd.mul(cfg.maxLiquidityParticipationPct).div(100));
  const cash = i.cashMicro - i.feeReserveMicro > 0n ? i.cashMicro - i.feeReserveMicro : 0n;
  const capacity = usdToMicro(equity.mul(cfg.maxCombinedExposurePct).div(100)) - i.openExposureMicro;
  const remaining = capacity > 0n ? capacity : 0n;
  const caps = {
    allocationMicro: allocation,
    riskSizedMicro: riskSized,
    liquidityMicro: liquidity,
    cashMicro: cash,
    remainingCapacityMicro: remaining,
  };
  const notional = minBig(allocation, riskSized, liquidity, cash, remaining);
  const binding = (Object.keys(caps) as Array<keyof typeof caps>).find((k) => caps[k] === notional)!;
  return {
    notionalMicro: notional > 0n ? notional : 0n,
    lossFraction: lossFraction.toFixed(6),
    plannedRiskMicro: usdToMicro(microToUsd(notional > 0n ? notional : 0n).mul(lossFraction)),
    caps: Object.fromEntries(Object.entries(caps).map(([k, v]) => [k, v.toString()])) as SizingResult['caps'],
    binding,
  };
}
