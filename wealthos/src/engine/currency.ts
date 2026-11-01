import { Decimal, RoundingMode, type DecimalInput, d } from "./decimal";

export const SUPPORTED_CURRENCIES = ["NGN", "USD", "GBP", "EUR"] as const;
export type DisplayCurrency = (typeof SUPPORTED_CURRENCIES)[number];

/** ISO 4217 currency code. Any 3-letter upper-case code may be stored; display currencies are a subset. */
export type CurrencyCode = string;

export interface CurrencyPolicy {
  code: CurrencyCode;
  /** ISO 4217 minor units used when presenting or settling amounts. */
  minorUnits: number;
  rounding: RoundingMode;
  symbol: string;
}

const POLICIES: Record<string, CurrencyPolicy> = {
  NGN: { code: "NGN", minorUnits: 2, rounding: RoundingMode.HALF_EVEN, symbol: "₦" },
  USD: { code: "USD", minorUnits: 2, rounding: RoundingMode.HALF_EVEN, symbol: "$" },
  GBP: { code: "GBP", minorUnits: 2, rounding: RoundingMode.HALF_EVEN, symbol: "£" },
  EUR: { code: "EUR", minorUnits: 2, rounding: RoundingMode.HALF_EVEN, symbol: "€" },
  JPY: { code: "JPY", minorUnits: 0, rounding: RoundingMode.HALF_EVEN, symbol: "¥" },
};

export function isCurrencyCode(code: string): boolean {
  return /^[A-Z]{3}$/.test(code);
}

export function currencyPolicy(code: CurrencyCode): CurrencyPolicy {
  if (!isCurrencyCode(code)) throw new RangeError(`Invalid currency code: ${code}`);
  return POLICIES[code] ?? { code, minorUnits: 2, rounding: RoundingMode.HALF_EVEN, symbol: code };
}

/** Round an amount to the currency's minor units (presentation / settlement only). */
export function roundToCurrency(amount: DecimalInput, code: CurrencyCode, mode?: RoundingMode): Decimal {
  const policy = currencyPolicy(code);
  return d(amount).toDecimalPlaces(policy.minorUnits, mode ?? policy.rounding);
}

export function isDisplayCurrency(code: string): code is DisplayCurrency {
  return (SUPPORTED_CURRENCIES as readonly string[]).includes(code);
}
