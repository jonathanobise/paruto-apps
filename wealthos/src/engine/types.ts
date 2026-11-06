import type { Decimal } from "./decimal";
import type { ISODate } from "./dates";
import type { CurrencyCode } from "./currency";

export const ASSET_CLASSES = [
  "cash",
  "money_market",
  "treasury_bill",
  "government_bond",
  "corporate_bond",
  "fixed_deposit",
  "equity",
  "equity_fund",
  "etf",
  "fixed_income_fund",
  "real_estate",
  "business",
  "pension",
  "other",
] as const;
export type AssetClass = (typeof ASSET_CLASSES)[number];

export const ASSET_CLASS_LABELS: Record<AssetClass, string> = {
  cash: "Cash",
  money_market: "Money-market funds",
  treasury_bill: "Treasury bills",
  government_bond: "Government bonds",
  corporate_bond: "Corporate bonds",
  fixed_deposit: "Fixed deposits",
  equity: "Listed equities",
  equity_fund: "Equity funds",
  etf: "ETFs",
  fixed_income_fund: "Fixed-income funds",
  real_estate: "Real estate",
  business: "Business interests",
  pension: "Pension",
  other: "Other",
};

/**
 * How an instrument is valued.
 * - market: last traded/closing price from a price source.
 * - nav: published net asset value per unit (funds).
 * - discount_accrual: discount instruments (e.g. T-bills) valued by straight-line accretion
 *   from purchase cost to face value at maturity, unless a market price is supplied.
 * - manual: user-declared estimate.
 */
export type PricingModel = "market" | "nav" | "discount_accrual" | "manual";

export interface InstrumentInfo {
  id: string;
  name: string;
  symbol?: string;
  currency: CurrencyCode;
  assetClass: AssetClass;
  /** ISO 3166 alpha-2 country of economic exposure, or "GLOBAL" for diversified products. */
  country: string;
  region: string;
  pricingModel: PricingModel;
  /** A price older than this is reported as stale. */
  staleAfterDays: number;
  /** Redemption amount per unit at maturity (discount instruments). */
  faceValuePerUnit?: Decimal;
  maturityDate?: ISODate;
  /** Price per unit is quoted per this many units (e.g. 100 for bonds quoted per 100 face). */
  priceMultiplier?: Decimal;
}

interface Base {
  id: string;
  date: ISODate;
  /** Set on reversal events: the id of the event this one cancels. */
  reversesEventId?: string;
}

export type LedgerEvent =
  | (Base & { type: "deposit" | "withdrawal"; accountId: string; currency: CurrencyCode; amount: Decimal })
  | (Base & {
      type: "buy" | "sell";
      accountId: string;
      instrumentId: string;
      quantity: Decimal;
      /** Price per unit in the instrument's currency. */
      price: Decimal;
      fees: Decimal;
      currency: CurrencyCode;
    })
  | (Base & {
      type: "dividend" | "interest" | "coupon";
      accountId: string;
      instrumentId?: string;
      currency: CurrencyCode;
      grossAmount: Decimal;
      withholdingTax: Decimal;
    })
  | (Base & { type: "fee" | "tax"; accountId: string; instrumentId?: string; currency: CurrencyCode; amount: Decimal })
  | (Base & {
      type: "fx_conversion";
      accountId: string;
      fromCurrency: CurrencyCode;
      fromAmount: Decimal;
      toCurrency: CurrencyCode;
      toAmount: Decimal;
      /** Charged in fromCurrency, in addition to fromAmount. */
      fees: Decimal;
    })
  | (Base & { type: "transfer"; fromAccountId: string; toAccountId: string; currency: CurrencyCode; amount: Decimal })
  | (Base & { type: "security_transfer"; fromAccountId: string; toAccountId: string; instrumentId: string; quantity: Decimal })
  | (Base & {
      type: "reinvestment";
      accountId: string;
      instrumentId: string;
      currency: CurrencyCode;
      /** Income amount reinvested (becomes both income and cost basis). */
      amount: Decimal;
      quantity: Decimal;
    })
  | (Base & { type: "split"; instrumentId: string; numerator: Decimal; denominator: Decimal })
  | (Base & { type: "stock_dividend"; accountId: string; instrumentId: string; quantity: Decimal })
  | (Base & {
      type: "maturity" | "redemption";
      accountId: string;
      instrumentId: string;
      quantity: Decimal;
      proceeds: Decimal;
      currency: CurrencyCode;
    })
  | (Base & {
      type: "opening_position";
      accountId: string;
      instrumentId: string;
      quantity: Decimal;
      costBasis: Decimal;
      currency: CurrencyCode;
      acquiredOn: ISODate;
    })
  | (Base & { type: "reversal"; reversesEventId: string });

export type LedgerEventType = LedgerEvent["type"];

export const LEDGER_EVENT_TYPES: LedgerEventType[] = [
  "deposit",
  "withdrawal",
  "buy",
  "sell",
  "dividend",
  "interest",
  "coupon",
  "fee",
  "tax",
  "fx_conversion",
  "transfer",
  "security_transfer",
  "reinvestment",
  "split",
  "stock_dividend",
  "maturity",
  "redemption",
  "opening_position",
  "reversal",
];

/** Accounts referenced by an event (for authorisation and scope checks). */
export function eventAccountIds(e: LedgerEvent): string[] {
  switch (e.type) {
    case "transfer":
    case "security_transfer":
      return [e.fromAccountId, e.toAccountId];
    case "split":
    case "reversal":
      return [];
    default:
      return [e.accountId];
  }
}
