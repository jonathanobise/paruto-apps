import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { sql } from "drizzle-orm";
import { closeDb, withTenant } from "@/server/db/client";
import { valuationSnapshots } from "@/server/db/schema";
import { addValuation, createAccount, updateAccount } from "@/server/accounts/service";
import { postEvent, reverseEvent } from "@/server/ledger/service";
import { buildDashboard } from "@/server/analytics/portfolio";
import { accountPerformance } from "@/server/analytics/performance";
import { makeUser, ownerPool } from "./helpers";

let user: Awaited<ReturnType<typeof makeUser>>;
let bank: string;
let instrumentId: string;
let sourceId: string;
const opts = { baseCurrency: "NGN", period: "ALL" as const, asOf: "2025-06-30" };
const snapshotCount = async (ctx = user.ctx) => (await withTenant(ctx, (tx) => tx.select().from(valuationSnapshots))).length;

beforeAll(async () => {
  const pool = ownerPool();
  sourceId = (await pool.query("insert into market_data_sources (key, name, kind, license_note) values ('cache-test', 'Cache tests', 'synthetic', 'Test only') on conflict (key) do update set name = excluded.name returning id")).rows[0].id;
  instrumentId = (await pool.query("insert into instruments (name, symbol, asset_class, country, region, currency, pricing_model, stale_after_days, verification_state) values ('Cache Test Plc', 'CACHE', 'equity', 'NG', 'Africa', 'NGN', 'market', 400, 'synthetic') returning id")).rows[0].id;
  await pool.query("insert into market_prices (instrument_id, source_id, observed_on, price, currency, methodology, verification_state) values ($1,$2,'2025-01-02',10,'NGN','close','synthetic')", [instrumentId, sourceId]);
  await pool.end();
  user = await makeUser("Cache");
  bank = (await createAccount(user.ctx, { name: "Broker", type: "brokerage", currency: "NGN" })).id;
  await postEvent(user.ctx, { type: "deposit", accountId: bank, currency: "NGN", amount: "1000", occurredOn: "2025-01-02" });
  await postEvent(user.ctx, { type: "buy", accountId: bank, instrumentId, quantity: "10", price: "10", fees: "0", currency: "NGN", occurredOn: "2025-01-02" });
});
afterAll(async () => closeDb());

describe("analytics snapshot cache", () => {
  it("returns identical results from the cache and from a fresh computation", async () => {
    const fresh = await buildDashboard(user.ctx, { ...opts, bypassCache: true });
    const first = await buildDashboard(user.ctx, opts);
    const cached = await buildDashboard(user.ctx, opts);
    expect(first).toEqual(fresh);
    expect(cached).toEqual(fresh);
    expect(await snapshotCount()).toBe(1);
  });

  it("serves the stored payload when inputs are unchanged", async () => {
    // Tamper with the cached payload: if it is served, the cache was used.
    await withTenant(user.ctx, (tx) => tx.execute(sql`update valuation_snapshots set payload = jsonb_set(payload, '{v,orgName}', '"from-cache"') where kind = 'dashboard'`));
    expect((await buildDashboard(user.ctx, opts)).orgName).toBe("from-cache");
  });

  const invalidators: Array<[string, () => Promise<unknown>]> = [
    ["a new transaction", () => postEvent(user.ctx, { type: "deposit", accountId: bank, currency: "NGN", amount: "5", occurredOn: "2025-03-01" })],
    ["a reversal", async () => {
      const ev = await postEvent(user.ctx, { type: "fee", accountId: bank, currency: "NGN", amount: "1", occurredOn: "2025-03-02" });
      await buildDashboard(user.ctx, opts);
      await withTenant(user.ctx, (tx) => tx.execute(sql`update valuation_snapshots set payload = jsonb_set(payload, '{v,orgName}', '"from-cache"') where kind = 'dashboard'`));
      await reverseEvent(user.ctx, ev.id, "test");
    }],
    ["an account edit (ownership share)", () => updateAccount(user.ctx, bank, { name: "Broker", isInvestment: true, ownershipPercent: "50" })],
    ["a new manual valuation", async () => {
      const house = await createAccount(user.ctx, { name: "House", type: "real_estate", currency: "NGN", openingValue: "100", openingValueDate: "2025-01-02" });
      await buildDashboard(user.ctx, opts);
      await withTenant(user.ctx, (tx) => tx.execute(sql`update valuation_snapshots set payload = jsonb_set(payload, '{v,orgName}', '"from-cache"') where kind = 'dashboard'`));
      await addValuation(user.ctx, { accountId: house.id, valuedOn: "2025-02-01", amount: "200" });
    }],
    ["a corrected market price (in-place update)", async () => {
      const pool = ownerPool();
      await pool.query("update market_prices set price = 11 where instrument_id = $1", [instrumentId]);
      await pool.end();
    }],
    ["a new FX rate", async () => {
      const pool = ownerPool();
      await pool.query("insert into fx_rates (base, quote, rate, observed_on, source_id, methodology, verification_state) values ('USD','NGN',1500,'2025-06-30',$1,'sample','synthetic')", [sourceId]);
      await pool.end();
    }],
  ];

  for (const [label, change] of invalidators) {
    it(`is invalidated by ${label}`, async () => {
      await buildDashboard(user.ctx, opts);
      await withTenant(user.ctx, (tx) => tx.execute(sql`update valuation_snapshots set payload = jsonb_set(payload, '{v,orgName}', '"from-cache"') where kind = 'dashboard'`));
      await change();
      const after = await buildDashboard(user.ctx, opts);
      expect(after.orgName).not.toBe("from-cache");
      expect(after).toEqual(await buildDashboard(user.ctx, { ...opts, bypassCache: true }));
    });
  }

  it("caches null results and per-account views separately", async () => {
    expect(await accountPerformance(user.ctx, "00000000-0000-4000-8000-000000000000", opts)).toBeNull();
    expect(await accountPerformance(user.ctx, "00000000-0000-4000-8000-000000000000", opts)).toBeNull();
    expect(await accountPerformance(user.ctx, bank, opts)).not.toBeNull();
  });

  it("is isolated per tenant", async () => {
    const other = await makeUser("Cache2");
    expect(await snapshotCount(other.ctx)).toBe(0);
    await expect(withTenant(other.ctx, (tx) => tx.insert(valuationSnapshots).values({ orgId: user.orgId, kind: "dashboard", paramsKey: "x", inputFingerprint: "x", payload: {} }))).rejects.toThrow();
  });
});
