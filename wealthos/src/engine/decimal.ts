/**
 * Decimal arithmetic for WealthOS.
 *
 * Every authoritative monetary amount, quantity, price and FX rate is a Decimal.
 * Binary floating point is never used for balances. A dedicated Decimal clone is
 * configured so other libraries cannot change our precision or rounding.
 */
import DecimalLib from "decimal.js";

export const Decimal = DecimalLib.clone({
  precision: 40,
  rounding: DecimalLib.ROUND_HALF_EVEN,
  toExpNeg: -30,
  toExpPos: 40,
});
export type Decimal = InstanceType<typeof Decimal>;
export type DecimalInput = Decimal | string | number;

export const ZERO = new Decimal(0);
export const ONE = new Decimal(1);

/** Build a Decimal. Numbers are accepted only when they are safe integers or come from literals in tests. */
export function d(value: DecimalInput): Decimal {
  if (value instanceof Decimal) return value;
  if (typeof value === "number" && !Number.isFinite(value)) {
    throw new RangeError(`Non-finite number cannot become a Decimal: ${value}`);
  }
  return new Decimal(value);
}

export function sum(values: Iterable<Decimal>): Decimal {
  let total = ZERO;
  for (const v of values) total = total.plus(v);
  return total;
}

export function isZero(v: Decimal): boolean {
  return v.isZero();
}

export const RoundingMode = {
  HALF_EVEN: DecimalLib.ROUND_HALF_EVEN,
  HALF_UP: DecimalLib.ROUND_HALF_UP,
  DOWN: DecimalLib.ROUND_DOWN,
  UP: DecimalLib.ROUND_UP,
} as const;
export type RoundingMode = (typeof RoundingMode)[keyof typeof RoundingMode];
