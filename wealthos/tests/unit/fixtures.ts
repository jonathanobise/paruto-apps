import { d, type InstrumentInfo } from "@/engine";

export const EQUITY: InstrumentInfo = { id: "EQ", name: "Sample Equity", currency: "NGN", assetClass: "equity", country: "NG", region: "Africa", pricingModel: "market", staleAfterDays: 5 };
export const USD_ETF: InstrumentInfo = { id: "ETF", name: "Sample USD ETF", currency: "USD", assetClass: "etf", country: "GLOBAL", region: "Global", pricingModel: "market", staleAfterDays: 5 };
export const TBILL: InstrumentInfo = {
  id: "TB",
  name: "Sample 364-day T-bill",
  currency: "NGN",
  assetClass: "treasury_bill",
  country: "NG",
  region: "Africa",
  pricingModel: "discount_accrual",
  staleAfterDays: 7,
  faceValuePerUnit: d(1),
  maturityDate: "2026-01-01",
};

export function instruments(...list: InstrumentInfo[]): Map<string, InstrumentInfo> {
  return new Map(list.map((i) => [i.id, i]));
}
