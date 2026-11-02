import "server-only";
import { and, eq, lt, sql } from "drizzle-orm";
import { valuationSnapshots } from "@/server/db/schema";
import type { TenantContext, Tx } from "@/server/db/client";
import { sha256 } from "@/server/identity/crypto";

/** Bump whenever a calculation in src/engine or src/server/analytics changes its results. */
export const ANALYTICS_VERSION = "2026-11-02.1";

/**
 * Fingerprint of every input the analytics read for the organisation in context: ledger and
 * valuations (append-only: count + latest insert is exact), accounts (count + latest update, kept
 * current by a trigger), the organisation row, and market data (version counter bumped by triggers
 * on prices, FX and instruments). Any change produces a new fingerprint.
 */
export async function inputsFingerprint(tx: Tx, ctx: TenantContext): Promise<string> {
  const r = await tx.execute<Record<string, string | null>>(sql`
    select
      (select count(*)::text || '/' || coalesce(max(created_at)::text, '') from ledger_events) as ledger,
      (select count(*)::text || '/' || coalesce(max(created_at)::text, '') from account_valuations) as valuations,
      (select count(*)::text || '/' || coalesce(max(updated_at)::text, '') from financial_accounts) as accounts,
      (select name || '/' || is_demo::text from organizations where id = ${ctx.orgId}) as org,
      (select version::text from data_versions where key = 'market') as market`);
  return sha256(JSON.stringify({ v: ANALYTICS_VERSION, org: ctx.orgId, ...r.rows[0] }));
}

/**
 * Return the cached result for (kind, params) if it was computed from identical inputs, otherwise
 * compute, store and return it. Stale rows are simply overwritten. Old rows are pruned.
 */
export async function withSnapshot<T>(tx: Tx, ctx: TenantContext, kind: string, params: string, compute: () => Promise<T>, opts: { bypass?: boolean } = {}): Promise<T> {
  if (opts.bypass) return compute();
  const fingerprint = await inputsFingerprint(tx, ctx);
  const [hit] = await tx
    .select({ fp: valuationSnapshots.inputFingerprint, payload: valuationSnapshots.payload })
    .from(valuationSnapshots)
    .where(and(eq(valuationSnapshots.kind, kind), eq(valuationSnapshots.paramsKey, params)))
    .limit(1);
  if (hit && hit.fp === fingerprint) return (hit.payload as { v: T }).v;
  const result = await compute();
  await tx
    .insert(valuationSnapshots)
    .values({ orgId: ctx.orgId, kind, paramsKey: params, inputFingerprint: fingerprint, payload: { v: result } })
    .onConflictDoUpdate({ target: [valuationSnapshots.orgId, valuationSnapshots.kind, valuationSnapshots.paramsKey], set: { inputFingerprint: fingerprint, payload: { v: result }, computedAt: new Date() } });
  await tx.delete(valuationSnapshots).where(lt(valuationSnapshots.computedAt, new Date(Date.now() - 7 * 86400_000)));
  return result;
}
