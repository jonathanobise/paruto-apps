import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { closeDb, db, withTenant } from "@/server/db/client";
import { consentRecords, institutionConnections } from "@/server/db/schema";
import { connectAccount, listAvailableProviders, listConnections, revokeConnection, syncConnection } from "@/server/connections/service";
import { commitImport, getImport } from "@/server/imports/service";
import { createAccount } from "@/server/accounts/service";
import { buildDashboard } from "@/server/analytics/portfolio";
import { planSummary } from "@/server/billing/entitlements";
import { expectDbRejection, makeUser, meta } from "./helpers";

let user: Awaited<ReturnType<typeof makeUser>>;
let other: Awaited<ReturnType<typeof makeUser>>;
let acc: string;
let connId: string;
const consent = (o: Record<string, unknown> = {}) => ({ provider: "sandbox", linkCode: `t-${Date.now()}`, scopes: ["balances", "transactions"], days: 90, consent: true, ...o });

beforeAll(async () => {
  user = await makeUser("Conn User");
  other = await makeUser("Conn Other");
  acc = (await createAccount(user.ctx, { name: "Current", type: "bank", currency: "NGN" })).id;
});
afterAll(async () => {
  delete process.env.CONNECTIONS_SANDBOX;
  await closeDb();
});

describe("institution connections", () => {
  it("offers no provider unless the sandbox is explicitly enabled (and never a real one)", () => {
    delete process.env.CONNECTIONS_SANDBOX;
    expect(listAvailableProviders()).toEqual([]);
    process.env.CONNECTIONS_SANDBOX = "1";
    expect(listAvailableProviders()).toEqual([{ key: "sandbox", name: "Sandbox Bank (TEST DATA)", sandbox: true }]);
  });

  it("needs explicit consent, a connectable account and a matching currency", async () => {
    await expect(connectAccount(user.ctx, acc, consent({ consent: false }), meta)).rejects.toMatchObject({ code: "VALIDATION" });
    await expect(connectAccount(user.ctx, acc, consent({ days: 365 }), meta)).rejects.toMatchObject({ code: "VALIDATION" });
    const broker = (await createAccount(user.ctx, { name: "Broker", type: "brokerage", currency: "NGN" })).id;
    await expect(connectAccount(user.ctx, broker, consent(), meta)).rejects.toMatchObject({ code: "VALIDATION" });
    const usd = (await createAccount(user.ctx, { name: "Dom", type: "bank", currency: "USD" })).id;
    await expect(connectAccount(user.ctx, usd, consent(), meta)).rejects.toMatchObject({ message: /in NGN/ });
    connId = await connectAccount(user.ctx, acc, consent(), meta);
    await expect(connectAccount(user.ctx, acc, consent(), meta)).rejects.toMatchObject({ code: "CONFLICT" });
    const [row] = await db().select().from(consentRecords).where(eq(consentRecords.userId, user.userId)).orderBy(consentRecords.recordedAt);
    expect(row).toBeDefined();
    const [c] = await withTenant(user.ctx, (tx) => tx.select().from(institutionConnections).where(eq(institutionConnections.id, connId)));
    expect(c!.credentialsEnc).not.toContain("sandbox-token"); // encrypted at rest
  });

  it("syncs into a preview the user reviews; re-syncs never duplicate; uploads quota untouched", async () => {
    const r = await syncConnection(user.ctx, connId);
    expect(r.batchId).not.toBeNull();
    expect(r.fresh).toBeGreaterThan(5);
    const preview = await getImport(user.ctx, r.batchId!);
    expect(preview.rows.every((x) => String(x.cells.description ?? "").startsWith("SANDBOX TEST DATA"))).toBe(true);
    // Nothing in the ledger until the user commits.
    expect((await buildDashboard(user.ctx, { baseCurrency: "NGN", period: "1M", bypassCache: true })).totals.cash).toBe("0.00");
    const { imported } = await commitImport(user.ctx, r.batchId!, { includeDuplicates: false });
    expect(imported).toBe(r.fresh);
    const again = await syncConnection(user.ctx, connId, new Date(Date.now() + 60_000));
    expect(again).toMatchObject({ batchId: null, fresh: 0 });
    expect((await planSummary(user.ctx)).used.csvImportsPerMonth).toBe(0);
    expect((await listConnections(user.ctx, acc))[0]).toMatchObject({ status: "active", lastSyncResult: "up to date" });
  });

  it("is invisible to other tenants and can't be re-pointed or extended", async () => {
    expect(await listConnections(other.ctx)).toHaveLength(0);
    await expect(syncConnection(other.ctx, connId)).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expectDbRejection(withTenant(user.ctx, (tx) => tx.update(institutionConnections).set({ consentExpiresAt: new Date(Date.now() + 400 * 86_400_000) }).where(eq(institutionConnections.id, connId))), /WOS_CONNECTION/);
  });

  it("stops at consent expiry, and revocation deletes credentials for good", async () => {
    await expect(syncConnection(user.ctx, connId, new Date(Date.now() + 91 * 86_400_000))).rejects.toMatchObject({ message: /expired/ });
    expect((await listConnections(user.ctx, acc))[0]!.status).toBe("expired");
    await revokeConnection(user.ctx, connId, meta);
    const [c] = await withTenant(user.ctx, (tx) => tx.select().from(institutionConnections).where(eq(institutionConnections.id, connId)));
    expect(c).toMatchObject({ status: "revoked", credentialsEnc: null });
    await expectDbRejection(withTenant(user.ctx, (tx) => tx.update(institutionConnections).set({ status: "active" }).where(eq(institutionConnections.id, connId))), /WOS_CONNECTION/);
    await expect(syncConnection(user.ctx, connId)).rejects.toMatchObject({ code: "CONFLICT" });
    const consents = await db().select().from(consentRecords).where(eq(consentRecords.userId, user.userId));
    expect(consents.some((x) => x.consentKey === "institution_data_access" && !x.granted)).toBe(true);
  });
});
