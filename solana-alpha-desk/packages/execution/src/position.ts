import { Decimal, fromBaseUnits, microToUsd, usdToMicro } from '@alpha-desk/shared';

export interface OpenPositionView {
  quantity: bigint;
  tokenDecimals: number;
  entryCostMicro: bigint; // incl. entry fees
  plannedRiskMicro: bigint;
}

/** Mark-to-market at an executable reference price (USDC per whole token from a sell quote). */
export function markValueMicro(p: Pick<OpenPositionView, 'quantity' | 'tokenDecimals'>, referencePriceUsd: Decimal): bigint {
  return usdToMicro(fromBaseUnits(p.quantity, p.tokenDecimals).mul(referencePriceUsd));
}

export function unrealizedPnlMicro(p: OpenPositionView, referencePriceUsd: Decimal, estExitFeeMicro: bigint): bigint {
  return markValueMicro(p, referencePriceUsd) - estExitFeeMicro - p.entryCostMicro;
}

export interface ClosedTradeMath {
  realizedPnlMicro: bigint;
  rMultiple: string | null;
  returnPct: string;
}

/** Realized P&L = proceeds − exit fees − total entry cost (which already includes entry fees). */
export function closeMath(p: OpenPositionView, proceedsMicro: bigint, exitFeeMicro: bigint): ClosedTradeMath {
  const pnl = proceedsMicro - exitFeeMicro - p.entryCostMicro;
  return {
    realizedPnlMicro: pnl,
    rMultiple: p.plannedRiskMicro > 0n ? microToUsd(pnl).div(microToUsd(p.plannedRiskMicro)).toFixed(4) : null,
    returnPct: p.entryCostMicro > 0n ? microToUsd(pnl).div(microToUsd(p.entryCostMicro)).mul(100).toFixed(4) : '0',
  };
}
