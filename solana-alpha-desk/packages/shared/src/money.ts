import Decimal from 'decimal.js';

/** Precision high enough for memecoin prices (1e-12 USD) times large supplies. */
Decimal.set({ precision: 60, rounding: Decimal.ROUND_HALF_EVEN, toExpNeg: -40, toExpPos: 60 });

export { Decimal };
export type DecimalValue = Decimal;

export const USD_DECIMALS = 6;
const MICRO = 10n ** 6n;

export function dec(value: Decimal.Value): Decimal {
  return new Decimal(value);
}

/** Micro-USD (integer) → Decimal USD. */
export function microToUsd(micro: bigint): Decimal {
  return new Decimal(micro.toString()).div(MICRO.toString());
}

/** Decimal USD → micro-USD, rounding toward negative infinity unless told otherwise (conservative for cash). */
export function usdToMicro(usd: Decimal.Value, rounding: Decimal.Rounding = Decimal.ROUND_FLOOR): bigint {
  return BigInt(new Decimal(usd).mul(MICRO.toString()).toDecimalPlaces(0, rounding).toFixed(0));
}

/** Base units → UI amount. */
export function fromBaseUnits(amount: bigint, decimals: number): Decimal {
  return new Decimal(amount.toString()).div(new Decimal(10).pow(decimals));
}

export function toBaseUnits(amount: Decimal.Value, decimals: number, rounding: Decimal.Rounding = Decimal.ROUND_FLOOR): bigint {
  return BigInt(new Decimal(amount).mul(new Decimal(10).pow(decimals)).toDecimalPlaces(0, rounding).toFixed(0));
}

export function minBig(...values: bigint[]): bigint {
  if (values.length === 0) throw new Error('minBig requires at least one value');
  return values.reduce((a, b) => (b < a ? b : a));
}

export function maxBig(...values: bigint[]): bigint {
  if (values.length === 0) throw new Error('maxBig requires at least one value');
  return values.reduce((a, b) => (b > a ? b : a));
}

export function formatUsd(micro: bigint): string {
  return microToUsd(micro).toFixed(2);
}
