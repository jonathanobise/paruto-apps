import "server-only";
import { and, asc, eq, gte, inArray, lte } from "drizzle-orm";
import { fxRates, instruments, marketDataSources, marketPrices } from "@/server/db/schema";
import type { Tx } from "@/server/db/client";
import { FxTable, PriceTable, addDays, d, type ISODate } from "@/engine";

export async function loadPriceTable(tx: Tx, instrumentIds: string[], from: ISODate, to: ISODate): Promise<{ table: PriceTable; latest: Map<string, { observedOn: string; synthetic: boolean; source: string }> }> {
  if (instrumentIds.length === 0) return { table: new PriceTable([]), latest: new Map() };
  // Look back far enough to find the last observation before `from`.
  const rows = await tx
    .select({ instrumentId: marketPrices.instrumentId, price: marketPrices.price, currency: marketPrices.currency, observedOn: marketPrices.observedOn, verification: marketPrices.verificationState, sourceKey: marketDataSources.key })
    .from(marketPrices)
    .innerJoin(marketDataSources, eq(marketDataSources.id, marketPrices.sourceId))
    .where(and(inArray(marketPrices.instrumentId, instrumentIds), gte(marketPrices.observedOn, addDays(from, -400)), lte(marketPrices.observedOn, to)))
    .orderBy(asc(marketPrices.observedOn));
  const latest = new Map<string, { observedOn: string; synthetic: boolean; source: string }>();
  for (const r of rows) latest.set(r.instrumentId, { observedOn: r.observedOn, synthetic: r.verification === "synthetic", source: r.sourceKey });
  return {
    table: new PriceTable(rows.map((r) => ({ instrumentId: r.instrumentId, price: d(r.price), currency: r.currency, observedOn: r.observedOn, sourceId: r.sourceKey, synthetic: r.verification === "synthetic" }))),
    latest,
  };
}

export async function loadFxTable(tx: Tx, from: ISODate, to: ISODate): Promise<FxTable> {
  const rows = await tx
    .select({ base: fxRates.base, quote: fxRates.quote, rate: fxRates.rate, observedOn: fxRates.observedOn, verification: fxRates.verificationState, sourceKey: marketDataSources.key })
    .from(fxRates)
    .innerJoin(marketDataSources, eq(marketDataSources.id, fxRates.sourceId))
    .where(and(gte(fxRates.observedOn, addDays(from, -30)), lte(fxRates.observedOn, to)))
    .orderBy(asc(fxRates.observedOn));
  return new FxTable(rows.map((r) => ({ base: r.base, quote: r.quote, rate: d(r.rate), observedOn: r.observedOn, sourceId: r.sourceKey, synthetic: r.verification === "synthetic" })), { maxAgeDays: 5 });
}

export async function listVisibleInstruments(tx: Tx) {
  // RLS limits rows to the global catalogue plus the organisation's private instruments.
  return tx.select().from(instruments).orderBy(asc(instruments.name));
}
