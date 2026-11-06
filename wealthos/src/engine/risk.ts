import { Decimal, ZERO, d, sum } from "./decimal";

export interface RiskAssumptions {
  /** Number of return observations per year (12 for monthly). */
  periodsPerYear: number;
  /** Annual risk-free rate used for Sharpe, as a decimal (e.g. 0.18 for 18%). */
  riskFreeRate: Decimal;
  /** Description of the risk-free proxy, shown with every Sharpe ratio. */
  riskFreeLabel: string;
}

/** Sample standard deviation (n − 1). Null with fewer than two observations. */
export function stdev(values: Decimal[]): Decimal | null {
  if (values.length < 2) return null;
  const mean = sum(values).div(values.length);
  const variance = sum(values.map((v) => v.minus(mean).pow(2))).div(values.length - 1);
  return variance.sqrt();
}

export function annualizedVolatility(periodic: Decimal[], periodsPerYear: number): Decimal | null {
  const s = stdev(periodic);
  return s === null ? null : s.times(d(periodsPerYear).sqrt());
}

export interface Drawdown {
  maxDrawdown: Decimal;
  peakIndex: number;
  troughIndex: number;
  /** Index at which the previous peak was regained, or null if not yet recovered. */
  recoveryIndex: number | null;
}

/** Maximum peak-to-trough decline of a value or growth index series (as a negative fraction). */
export function maxDrawdown(series: Decimal[]): Drawdown {
  let peak = series[0] ?? ZERO;
  let peakIdx = 0;
  let best: Drawdown = { maxDrawdown: ZERO, peakIndex: 0, troughIndex: 0, recoveryIndex: null };
  for (let i = 1; i < series.length; i++) {
    const v = series[i]!;
    if (v.gt(peak)) {
      peak = v;
      peakIdx = i;
      continue;
    }
    if (peak.isZero()) continue;
    const dd = v.div(peak).minus(1);
    if (dd.lt(best.maxDrawdown)) best = { maxDrawdown: dd, peakIndex: peakIdx, troughIndex: i, recoveryIndex: null };
  }
  if (best.maxDrawdown.isNegative()) {
    const peakValue = series[best.peakIndex]!;
    for (let i = best.troughIndex + 1; i < series.length; i++) {
      if (series[i]!.gte(peakValue)) {
        best.recoveryIndex = i;
        break;
      }
    }
  }
  return best;
}

export interface SharpeResult {
  sharpe: Decimal | null;
  annualizedReturn: Decimal;
  annualizedVolatility: Decimal | null;
  assumptions: RiskAssumptions;
}

/**
 * Sharpe ratio from periodic returns: (annualised mean excess return) / annualised volatility.
 * Uses the geometric annualised return of the periodic series. Always reported with its assumptions.
 */
export function sharpeRatio(periodic: Decimal[], assumptions: RiskAssumptions): SharpeResult {
  const growth = periodic.reduce((g, r) => g.times(r.plus(1)), d(1));
  const years = d(periodic.length).div(assumptions.periodsPerYear);
  const annualizedReturn = periodic.length === 0 ? ZERO : growth.pow(d(1).div(years)).minus(1);
  const vol = annualizedVolatility(periodic, assumptions.periodsPerYear);
  const sharpe = vol === null || vol.isZero() ? null : annualizedReturn.minus(assumptions.riskFreeRate).div(vol);
  return { sharpe, annualizedReturn, annualizedVolatility: vol, assumptions };
}

export type { Decimal };
