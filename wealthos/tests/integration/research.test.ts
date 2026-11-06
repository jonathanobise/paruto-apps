import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { sql } from "drizzle-orm";
import { closeDb, withTenant, withUser } from "@/server/db/client";
import { commitMarketImport, createSource, getMarketImport, previewMarketImport, saveCatalogueInstrument } from "@/server/admin/catalogue";
import { compareInstruments, getInstrument, searchCatalogue } from "@/server/research/catalogue";
import { isWatched, listWatchlists, saveComparison, listComparisons, unwatchInstrument, watchInstrument } from "@/server/research/watchlists";
import { addMonths, d } from "@/engine";
import { expectDbRejection, makeUser, ownerPool } from "./helpers";

const enc = (s: string) => new TextEncoder().encode(s);
const today = new Date().toISOString().slice(0, 10);
let admin: Awaited<ReturnType<typeof makeUser>>;
let user: Awaited<ReturnType<typeof makeUser>>;
let sourceId: string;
let fundId: string;
let billId: string;
let ownerSourceId: string;

const baseInstrument = { region: "Africa", country: "NG", currency: "NGN", staleAfterDays: 7, facts: { riskFactors: [] } };

beforeAll(async () => {
  admin = await makeUser("Admin");
  user = await makeUser("Researcher");
  const pool = ownerPool();
  await pool.query("update users set platform_role = 'admin', mfa_enabled_at = now() where id = $1", [admin.userId]);
  ownerSourceId = (await pool.query("insert into market_data_sources (key, name, kind, license_note) values ('owner-src', 'Owner source', 'official', 'Test only source') returning id")).rows[0].id;
  await pool.end();
});
afterAll(async () => closeDb());

describe("catalogue write protection", () => {
  it("rejects catalogue writes from ordinary users at the database", async () => {
    await expectDbRejection(withUser(user.userId, (tx) => tx.execute(sql`insert into instruments (name, asset_class, country, region, currency, pricing_model) values ('Fake', 'equity', 'NG', 'Africa', 'NGN', 'market')`)), /row-level security/);
    await expectDbRejection(withUser(user.userId, (tx) => tx.execute(sql`insert into market_data_sources (key, name, kind, license_note) values ('x', 'x', 'official', 'xxxxxxxxxxxx')`)), /row-level security/);
    await expectDbRejection(withUser(user.userId, (tx) => tx.execute(sql`insert into fx_rates (base, quote, rate, observed_on, source_id, methodology, verification_state) values ('USD','NGN',1,'2026-01-01', ${ownerSourceId}, 'x', 'verified')`)), /row-level security/);
    await expect(createSource({ userId: user.userId }, { key: "nope", name: "Nope", kind: "official", licenseNote: "Not allowed here" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("requires the admin to have two-step verification on", async () => {
    const noMfa = await makeUser("AdminNoMfa");
    const pool = ownerPool();
    await pool.query("update users set platform_role = 'admin' where id = $1", [noMfa.userId]);
    await pool.end();
    await expect(createSource({ userId: noMfa.userId }, { key: "nomfa", name: "No MFA", kind: "official", licenseNote: "Should be refused" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});

describe("admin catalogue and verified import", () => {
  it("creates a source and instruments; verification requires a cited source", async () => {
    sourceId = await createSource({ userId: admin.userId }, { key: "test-official", name: "Test official publisher", kind: "official", url: "https://example.test/publications", licenseNote: "Public statistics; reuse permitted with attribution (test)." });
    await expect(saveCatalogueInstrument({ userId: admin.userId }, null, { ...baseInstrument, name: "Test MMF", symbol: "TMMF", assetClass: "money_market", pricingModel: "nav", verify: true, facts: { riskFactors: [] } })).rejects.toMatchObject({ code: "VALIDATION" });
    fundId = await saveCatalogueInstrument({ userId: admin.userId }, null, { ...baseInstrument, name: "Test Money Market Fund", symbol: "TMMF", issuer: "Test Asset Management", assetClass: "money_market", pricingModel: "nav", isin: "NGTEST000001", facts: { summary: "A test fund.", ongoingChargePct: "1.5", minimumInvestment: "10000", minimumInvestmentCurrency: "NGN", riskFactors: ["Interest-rate risk"] }, factsSourceUrl: "https://example.test/factsheet.pdf", factsAsOf: today, verify: false });
    billId = await saveCatalogueInstrument({ userId: admin.userId }, null, { ...baseInstrument, name: "Test 364-day bill", symbol: "TNTB364", assetClass: "treasury_bill", pricingModel: "discount_accrual", maturityDate: "2027-10-31", facts: { riskFactors: [] }, verify: false });
  });

  it("previews prices with row errors, commits only ready rows", async () => {
    const start = addMonths(today, -13);
    const csv = ["symbol,date,price,currency,methodology", `TMMF,${start},100,NGN,nav`, `TMMF,${addMonths(today, -1)},110,NGN,nav`, `TMMF,${today},112,NGN,nav`, "NOPE,2026-01-01,1,NGN,nav", `TMMF,${today},-5,NGN,nav`, "TMMF,2999-01-01,5,NGN,nav"].join("\n");
    const id = await previewMarketImport({ userId: admin.userId }, { kind: "prices", sourceId, fileName: "navs.csv", bytes: enc(csv), dateFormat: "auto" });
    const imp = await getMarketImport({ userId: admin.userId }, id);
    expect(imp.rows.map((r) => r.status)).toEqual(["ready", "ready", "ready", "error", "error", "error"]);
    expect(await commitMarketImport({ userId: admin.userId }, id)).toEqual({ inserted: 3 });
    await expect(commitMarketImport({ userId: admin.userId }, id)).rejects.toMatchObject({ code: "CONFLICT" });
  });

  it("imports published rates with methodology and rejects assumptions or missing tenors", async () => {
    const csv = ["symbol,as_of,methodology,rate_percent,tenor_days,basis,source_url", `TNTB364,${today},discount_rate,18,364,ACT/365,https://example.test/auction`, `TNTB364,${today},discount_rate,18,,ACT/365,`, `TMMF,${today},money_market_yield,17.25,,7-day annualised,`, `TMMF,${today},expected_return,30,,,`, `TMMF,${today},true_yield,5,,,http://insecure.test`].join("\n");
    const id = await previewMarketImport({ userId: admin.userId }, { kind: "rates", sourceId, fileName: "rates.csv", bytes: enc(csv), dateFormat: "auto" });
    const imp = await getMarketImport({ userId: admin.userId }, id);
    expect(imp.rows.map((r) => r.status)).toEqual(["ready", "error", "ready", "error", "error"]);
    await commitMarketImport({ userId: admin.userId }, id);
    // Re-importing a corrected value updates it instead of duplicating (NULL tenor included).
    const fix = await previewMarketImport({ userId: admin.userId }, { kind: "rates", sourceId, fileName: "rates-fix.csv", bytes: enc(`symbol,as_of,methodology,rate_percent,tenor_days,basis,source_url\nTMMF,${today},money_market_yield,17.5,,7-day annualised,`), dateFormat: "auto" });
    await commitMarketImport({ userId: admin.userId }, fix);
    const detail = await getInstrument(user.ctx, fundId);
    expect(detail.rates.filter((r) => r.methodology === "money_market_yield")).toHaveLength(1);
    expect(d(detail.rates[0]!.value).toFixed()).toBe("0.175");
  });
});

describe("explorer", () => {
  it("searches with latest price, as-of and freshness", async () => {
    const rows = await searchCatalogue(user.ctx, { q: "test money" });
    expect(rows).toHaveLength(1);
    expect(rows[0]!.latestPrice).toMatchObject({ price: "112.000000000000", observedOn: today });
    expect(rows[0]!.priceStatus).toBe("current");
    expect((await searchCatalogue(user.ctx, { assetClass: "treasury_bill" })).map((r) => r.symbol)).toContain("TNTB364");
    expect(await searchCatalogue(user.ctx, { q: "%" })).toHaveLength(0); // LIKE wildcards are escaped
  });

  it("hides unverified facts, shows them once verified with source and date", async () => {
    expect((await getInstrument(user.ctx, fundId)).facts).toBeNull();
    await saveCatalogueInstrument({ userId: admin.userId }, fundId, { ...baseInstrument, name: "Test Money Market Fund", symbol: "TMMF", issuer: "Test Asset Management", assetClass: "money_market", pricingModel: "nav", facts: { summary: "A test fund.", ongoingChargePct: "1.5", riskFactors: ["Interest-rate risk"] }, factsSourceUrl: "https://example.test/factsheet.pdf", factsAsOf: today, verify: true });
    const detail = await getInstrument(user.ctx, fundId);
    expect(detail.facts).toMatchObject({ ongoingChargePct: "1.5", riskFactors: ["Interest-rate risk"] });
    expect(detail.factsSourceUrl).toBe("https://example.test/factsheet.pdf");
    expect(detail.identifiers).toEqual([{ scheme: "ISIN", value: "NGTEST000001", verification: "unverified" }]);
  });

  it("computes trailing price returns over common windows", async () => {
    const detail = await getInstrument(user.ctx, fundId);
    const t = Object.fromEntries(detail.trailing.map((x) => [x.key, x]));
    expect(d(t["1M"]!.cumulative!).toFixed(6)).toBe("0.018182"); // 110 → 112
    // The only observation before the 1-year start is ~30 days earlier: beyond tolerance, so no 1Y figure.
    expect(t["1Y"]!.cumulative).toBeNull();
  });

  it("hides SAMPLE instruments outside demo portfolios", async () => {
    const pool = ownerPool();
    await pool.query("insert into instruments (name, symbol, asset_class, country, region, currency, pricing_model, verification_state, is_demo) values ('Sample Thing', 'SMPLX', 'equity', 'NG', 'Africa', 'NGN', 'market', 'synthetic', true)");
    const sid = (await pool.query("select id from instruments where symbol = 'SMPLX'")).rows[0].id;
    await pool.end();
    expect((await searchCatalogue(user.ctx, { q: "Sample Thing" }))).toHaveLength(0);
    await expect(getInstrument(user.ctx, sid)).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("compares only like-for-like rates and labels derived equivalents", async () => {
    const c = await compareInstruments(user.ctx, [fundId, billId]);
    const bill = c.instruments.find((x) => x.id === billId)!;
    const discount = bill.rates.find((r) => r.methodology === "discount_rate")!;
    expect(discount.derived.map((x) => x.methodology)).toEqual(["true_yield", "effective_annual_yield"]);
    expect(d(discount.derived[0]!.value).toDecimalPlaces(10).toFixed()).toBe("0.2193802591"); // same as the engine fixture
    expect(c.methodologies).toEqual(expect.arrayContaining(["discount_rate", "true_yield", "money_market_yield"]));
    await expect(compareInstruments(user.ctx, [fundId])).rejects.toMatchObject({ code: "VALIDATION" });
  });
});

describe("watchlists and saved research", () => {
  it("watches idempotently and isolates tenants", async () => {
    await watchInstrument(user.ctx, fundId);
    await watchInstrument(user.ctx, fundId);
    const lists = await listWatchlists(user.ctx);
    expect(lists).toHaveLength(1);
    expect(lists[0]!.items).toHaveLength(1);
    expect(await isWatched(user.ctx, fundId)).toBe(true);
    const other = await makeUser("Other");
    expect(await listWatchlists(other.ctx)).toHaveLength(0);
    expect(await isWatched(other.ctx, fundId)).toBe(false);
    await expectDbRejection(withTenant(other.ctx, (tx) => tx.execute(sql`insert into watchlist_items (org_id, watchlist_id, instrument_id) values (${other.orgId}, ${lists[0]!.id}, ${fundId})`)), /row-level security/);
    await unwatchInstrument(user.ctx, lists[0]!.id, fundId);
    expect(await isWatched(user.ctx, fundId)).toBe(false);
  });

  it("saves comparisons", async () => {
    await saveComparison(user.ctx, "Cash options", [fundId, billId], "MMF vs T-bill");
    expect((await listComparisons(user.ctx)).map((c) => c.name)).toEqual(["Cash options"]);
  });
});
