import "server-only";
import { enforceLimit } from "@/server/billing/entitlements";
import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";
import { instruments, savedComparisons, watchlistItems, watchlists } from "@/server/db/schema";
import { withTenant, type TenantContext } from "@/server/db/client";
import { AppError } from "@/server/platform/errors";
import { parseOrThrow } from "@/server/identity/service";

const DEFAULT = "My watchlist";

export async function listWatchlists(ctx: TenantContext) {
  return withTenant(ctx, async (tx) => {
    const lists = await tx.select().from(watchlists).orderBy(asc(watchlists.createdAt));
    const items = await tx
      .select({ watchlistId: watchlistItems.watchlistId, instrumentId: watchlistItems.instrumentId, note: watchlistItems.note, createdAt: watchlistItems.createdAt, name: instruments.name, symbol: instruments.symbol, currency: instruments.currency })
      .from(watchlistItems)
      .innerJoin(instruments, eq(instruments.id, watchlistItems.instrumentId))
      .orderBy(asc(instruments.name));
    return lists.map((l) => ({ ...l, items: items.filter((i) => i.watchlistId === l.id) }));
  });
}

/** Add an instrument to a watchlist (the default list is created on first use). Idempotent. */
export async function watchInstrument(ctx: TenantContext, instrumentId: string, watchlistName = DEFAULT, note?: string) {
  const name = parseOrThrow(z.string().trim().min(1).max(60), watchlistName);
  return withTenant(ctx, async (tx) => {
    const [inst] = await tx.select({ id: instruments.id }).from(instruments).where(eq(instruments.id, instrumentId)).limit(1);
    if (!inst) throw new AppError("NOT_FOUND", "Instrument not found.");
    let [list] = await tx.select().from(watchlists).where(eq(watchlists.name, name)).limit(1);
    if (!list) await enforceLimit(tx, ctx, "watchlists");
    if (!list) [list] = await tx.insert(watchlists).values({ orgId: ctx.orgId, name, createdBy: ctx.userId }).returning();
    await tx.insert(watchlistItems).values({ orgId: ctx.orgId, watchlistId: list!.id, instrumentId, note: note?.slice(0, 300) ?? null }).onConflictDoNothing();
    return list!.id;
  });
}

export async function unwatchInstrument(ctx: TenantContext, watchlistId: string, instrumentId: string) {
  await withTenant(ctx, (tx) => tx.delete(watchlistItems).where(and(eq(watchlistItems.watchlistId, watchlistId), eq(watchlistItems.instrumentId, instrumentId))));
}

export async function isWatched(ctx: TenantContext, instrumentId: string): Promise<boolean> {
  const rows = await withTenant(ctx, (tx) => tx.select({ id: watchlistItems.instrumentId }).from(watchlistItems).where(eq(watchlistItems.instrumentId, instrumentId)).limit(1));
  return rows.length > 0;
}

export async function saveComparison(ctx: TenantContext, name: string, instrumentIds: string[], note?: string) {
  const data = parseOrThrow(z.object({ name: z.string().trim().min(2).max(80), ids: z.array(z.string().uuid()).min(2).max(4), note: z.string().trim().max(500).optional() }), { name, ids: instrumentIds, note });
  return withTenant(ctx, async (tx) => {
    const found = await tx.select({ id: instruments.id }).from(instruments);
    if (data.ids.some((i) => !found.some((f) => f.id === i))) throw new AppError("NOT_FOUND", "Instrument not found.");
    const [row] = await tx.insert(savedComparisons).values({ orgId: ctx.orgId, name: data.name, instrumentIds: data.ids, note: data.note ?? null, createdBy: ctx.userId }).returning({ id: savedComparisons.id });
    return row!.id;
  });
}

export async function listComparisons(ctx: TenantContext) {
  return withTenant(ctx, (tx) => tx.select().from(savedComparisons).orderBy(asc(savedComparisons.createdAt)));
}

export async function deleteComparison(ctx: TenantContext, id: string) {
  await withTenant(ctx, (tx) => tx.delete(savedComparisons).where(eq(savedComparisons.id, id)));
}
