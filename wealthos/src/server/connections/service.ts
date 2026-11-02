import "server-only";
import { and, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { consentRecords, financialAccounts, institutionConnections, notifications } from "@/server/db/schema";
import { db, withTenant, type TenantContext } from "@/server/db/client";
import { AppError } from "@/server/platform/errors";
import { rateLimit } from "@/server/platform/rate-limit";
import { parseOrThrow } from "@/server/identity/service";
import { decryptSecret, encryptSecret } from "@/server/identity/crypto";
import { recordAudit, type RequestMeta } from "@/server/audit/audit";
import { discardImport, getImport, previewImport } from "@/server/imports/service";
import { csvCell } from "@/server/imports/export";
import { availableProviders, getConnectionProvider } from "./providers";

export const CONNECTION_CONSENT_KEY = "institution_data_access";
export const CONNECTION_CONSENT_VERSION = "2026-11-02";
export const CONNECTABLE_TYPES = new Set(["bank", "cash_wallet"]);
export const SCOPE_LABELS = { balances: "Account balance", transactions: "Transactions (date, amount, description)" } as const;
const MAX_CONSENT_DAYS = 90;
const FIRST_SYNC_DAYS = 90;

export function listAvailableProviders() {
  return availableProviders().map((p) => ({ key: p.key, name: p.name, sandbox: p.sandbox }));
}

export async function listConnections(ctx: TenantContext, accountId?: string) {
  return withTenant(ctx, (tx) =>
    tx.select({ id: institutionConnections.id, accountId: institutionConnections.accountId, provider: institutionConnections.provider, institutionName: institutionConnections.institutionName, status: institutionConnections.status, scopes: institutionConnections.scopes, consentGrantedAt: institutionConnections.consentGrantedAt, consentExpiresAt: institutionConnections.consentExpiresAt, lastSyncAt: institutionConnections.lastSyncAt, lastSyncResult: institutionConnections.lastSyncResult, lastError: institutionConnections.lastError })
      .from(institutionConnections).where(accountId ? eq(institutionConnections.accountId, accountId) : undefined).orderBy(desc(institutionConnections.createdAt)),
  );
}

const connectSchema = z.object({
  provider: z.string().min(1).max(40),
  linkCode: z.string().min(4).max(200),
  scopes: z.array(z.enum(["balances", "transactions"])).min(1),
  days: z.coerce.number().int().min(1).max(MAX_CONSENT_DAYS),
  consent: z.literal(true, { message: "Tick the box to give consent" }),
});

/** Link an account after the user consents (scopes and duration). */
export async function connectAccount(ctx: TenantContext, accountId: string, input: unknown, meta: RequestMeta): Promise<string> {
  const c = parseOrThrow(connectSchema, input);
  await rateLimit(`connect:${ctx.userId}`, 10, 3600);
  const provider = getConnectionProvider(c.provider);
  if (!provider) throw new AppError("FEATURE_UNAVAILABLE", "That data provider isn't available.");
  const id = await withTenant(ctx, async (tx) => {
    const [acc] = await tx.select().from(financialAccounts).where(eq(financialAccounts.id, accountId));
    if (!acc) throw new AppError("NOT_FOUND", "Account not found.");
    if (!CONNECTABLE_TYPES.has(acc.type) || acc.status !== "open") throw new AppError("VALIDATION", "Only open bank and cash accounts can be connected for now.");
    const [existing] = await tx.select({ id: institutionConnections.id }).from(institutionConnections).where(and(eq(institutionConnections.accountId, accountId), sql`${institutionConnections.status} in ('active','error')`));
    if (existing) throw new AppError("CONFLICT", "This account is already connected.");
    const link = await provider.completeLink(c.linkCode);
    const pa = link.accounts[0];
    if (!pa) throw new AppError("VALIDATION", "The provider returned no account to link.");
    if (pa.currency !== acc.currency) throw new AppError("VALIDATION", `The linked account is in ${pa.currency} but this WealthOS account is in ${acc.currency}.`);
    const [row] = await tx.insert(institutionConnections).values({ orgId: ctx.orgId, accountId, provider: provider.key, providerAccountRef: pa.ref, institutionName: link.institutionName, scopes: c.scopes, consentGrantedBy: ctx.userId, consentExpiresAt: new Date(Date.now() + c.days * 86_400_000), credentialsEnc: encryptSecret(link.credentials) }).returning({ id: institutionConnections.id });
    await tx.update(financialAccounts).set({ dataSource: provider.sandbox ? "connection-sandbox" : "connection", updatedAt: new Date() }).where(eq(financialAccounts.id, accountId));
    await recordAudit(tx, { orgId: ctx.orgId, actorUserId: ctx.userId, action: "connection.created", targetType: "institution_connection", targetId: row!.id, metadata: { provider: provider.key, scopes: c.scopes, days: c.days } });
    return row!.id;
  });
  await db().insert(consentRecords).values({ userId: ctx.userId, consentKey: CONNECTION_CONSENT_KEY, version: CONNECTION_CONSENT_VERSION, granted: true, ip: meta.ip ?? null, userAgent: meta.userAgent?.slice(0, 500) ?? null });
  return id;
}

/**
 * Fetch new transactions and turn them into an import preview for the user to review. Returns the
 * preview's id, or null when there's nothing new (all rows already in the ledger).
 */
export async function syncConnection(ctx: TenantContext, connectionId: string, now = new Date()): Promise<{ batchId: string | null; fetched: number; fresh: number }> {
  const conn = await withTenant(ctx, async (tx) => (await tx.select().from(institutionConnections).where(eq(institutionConnections.id, connectionId)))[0]);
  if (!conn) throw new AppError("NOT_FOUND", "Connection not found.");
  if (conn.status === "revoked") throw new AppError("CONFLICT", "This connection was disconnected.");
  if (conn.consentExpiresAt <= now) {
    await withTenant(ctx, (tx) => tx.update(institutionConnections).set({ status: "expired", updatedAt: now }).where(eq(institutionConnections.id, connectionId)));
    throw new AppError("CONFLICT", "Your consent for this connection has expired. Connect again to keep syncing.");
  }
  if (!conn.scopes.includes("transactions")) throw new AppError("VALIDATION", "This connection wasn't given access to transactions.");
  const provider = getConnectionProvider(conn.provider);
  if (!provider || !conn.credentialsEnc) throw new AppError("FEATURE_UNAVAILABLE", "This data provider isn't available any more.");
  const until = now.toISOString().slice(0, 10);
  const since = (conn.lastSyncAt ? new Date(conn.lastSyncAt.getTime() - 7 * 86_400_000) : new Date(now.getTime() - FIRST_SYNC_DAYS * 86_400_000)).toISOString().slice(0, 10);
  let txns;
  try {
    txns = (await provider.fetchTransactions(decryptSecret(conn.credentialsEnc), conn.providerAccountRef, since, until)).filter((t) => t.date <= until);
  } catch (err) {
    await withTenant(ctx, (tx) => tx.update(institutionConnections).set({ status: "error", lastError: (err as Error).message.slice(0, 200), lastSyncAt: now, lastSyncResult: "failed", updatedAt: now }).where(eq(institutionConnections.id, connectionId)));
    throw new AppError("FEATURE_UNAVAILABLE", "The provider didn't respond. We'll try again later.");
  }
  let batchId: string | null = null;
  let fresh = 0;
  if (txns.length) {
    const lines = [["date", "type", "amount", "currency", "description", "reference"].join(","), ...txns.map((t) => [t.date, t.amount.startsWith("-") ? "withdrawal" : "deposit", t.amount.replace(/^-/, ""), t.currency, t.description, `${conn.provider}:${t.id}`].map(csvCell).join(","))];
    batchId = await previewImport(ctx, { accountId: conn.accountId, fileName: `connection-${conn.provider}-${until}.csv`, bytes: new TextEncoder().encode(lines.join("\r\n")), dateFormat: "YYYY-MM-DD", source: "connection" });
    const preview = await getImport(ctx, batchId);
    fresh = preview.rows.filter((r) => r.status !== "duplicate").length;
    if (!fresh) {
      await discardImport(ctx, batchId);
      batchId = null;
    }
  }
  await withTenant(ctx, async (tx) => {
    await tx.update(institutionConnections).set({ status: "active", lastError: null, lastSyncAt: now, lastSyncResult: batchId ? `${fresh} new to review` : "up to date", updatedAt: now }).where(eq(institutionConnections.id, connectionId));
    await recordAudit(tx, { orgId: ctx.orgId, actorUserId: ctx.userId, action: "connection.synced", targetType: "institution_connection", targetId: connectionId, metadata: { fetched: txns.length, fresh, batchId } });
    if (batchId) await tx.insert(notifications).values({ orgId: ctx.orgId, userId: ctx.userId, kind: "connection.review", title: `${fresh} new transaction${fresh === 1 ? "" : "s"} from ${conn.institutionName}`, body: "Review and import them; nothing reaches your records until you do.", link: `/transactions/import/${batchId}`, dedupeKey: `connection:${batchId}` }).onConflictDoNothing();
  });
  return { batchId, fetched: txns.length, fresh };
}

export async function revokeConnection(ctx: TenantContext, connectionId: string, meta: RequestMeta): Promise<void> {
  const conn = await withTenant(ctx, async (tx) => (await tx.select().from(institutionConnections).where(eq(institutionConnections.id, connectionId)))[0]);
  if (!conn) throw new AppError("NOT_FOUND", "Connection not found.");
  if (conn.status === "revoked") return;
  const provider = getConnectionProvider(conn.provider);
  if (provider && conn.credentialsEnc) await provider.revoke(decryptSecret(conn.credentialsEnc)).catch(() => undefined); // best effort; credentials are deleted regardless
  await withTenant(ctx, async (tx) => {
    await tx.update(institutionConnections).set({ status: "revoked", revokedAt: new Date(), revokedBy: ctx.userId, credentialsEnc: null, updatedAt: new Date() }).where(eq(institutionConnections.id, connectionId));
    await recordAudit(tx, { orgId: ctx.orgId, actorUserId: ctx.userId, action: "connection.revoked", targetType: "institution_connection", targetId: connectionId });
  });
  await db().insert(consentRecords).values({ userId: ctx.userId, consentKey: CONNECTION_CONSENT_KEY, version: CONNECTION_CONSENT_VERSION, granted: false, ip: meta.ip ?? null, userAgent: meta.userAgent?.slice(0, 500) ?? null });
}

/** Worker: queue a sync for each connection that hasn't synced in the last ~day. */
export async function scheduleConnectionSyncs(now = new Date()): Promise<number> {
  const { enqueue } = await import("@/server/jobs/queue");
  const r = await db().execute<{ connection_id: string; org_id: string; user_id: string }>(sql`select * from app_connections_due()`);
  let n = 0;
  for (const c of r.rows) if (await enqueue("connections.sync", { connectionId: c.connection_id, orgId: c.org_id, userId: c.user_id }, { dedupeKey: `conn:${c.connection_id}:${now.toISOString().slice(0, 10)}` })) n++;
  return n;
}

export const connectionJobHandlers = {
  "connections.sync": async (payload: Record<string, unknown>) => {
    try {
      await syncConnection({ orgId: String(payload.orgId), userId: String(payload.userId) }, String(payload.connectionId));
    } catch (err) {
      // Expired/revoked/unavailable are terminal for this run, not worth retrying.
      if (err instanceof AppError && ["CONFLICT", "VALIDATION", "NOT_FOUND"].includes(err.code)) return;
      throw err;
    }
  },
};

