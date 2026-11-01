import { d, type InstrumentInfo, type AssetClass, type PricingModel } from "@/engine";
import type { instruments } from "@/server/db/schema";

type InstrumentRow = typeof instruments.$inferSelect;

export function toInstrumentInfo(r: InstrumentRow): InstrumentInfo {
  return {
    id: r.id,
    name: r.name,
    ...(r.symbol ? { symbol: r.symbol } : {}),
    currency: r.currency,
    assetClass: r.assetClass as AssetClass,
    country: r.country,
    region: r.region,
    pricingModel: r.pricingModel as PricingModel,
    staleAfterDays: r.staleAfterDays,
    ...(r.faceValuePerUnit ? { faceValuePerUnit: d(r.faceValuePerUnit) } : {}),
    ...(r.maturityDate ? { maturityDate: r.maturityDate } : {}),
    ...(r.priceMultiplier ? { priceMultiplier: d(r.priceMultiplier) } : {}),
  };
}
