import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq, sql } from "drizzle-orm";
import { closeDb, withTenant } from "@/server/db/client";
import { importBatches, ledgerEvents } from "@/server/db/schema";
import { createAccount } from "@/server/accounts/service";
import { postEvent } from "@/server/ledger/service";
import { buildDashboard, listTransactions } from "@/server/analytics/portfolio";
import { commitImport, discardImport, getImport, listImports, listMappings, previewImport, remapImport, rollbackImport, saveMapping } from "@/server/imports/service";
import { expectDbRejection, grantPlan, makeUser, meta, ownerPool } from "./helpers";
import { eraseAccount, exportUserData } from "@/server/privacy/service";

const enc = (s: string) => new TextEncoder().encode(s);
let user: Awaited<ReturnType<typeof makeUser>>;
let broker: string;
let bank: string;

const BROKER_CSV = [
  "Trade Date,Action,Ticker,Qty,Unit Price,Commission,Amount,WHT,Narration,Reference",
  "02/01/2026,Lodgement,,,,,\"1,000,000.00\",,Funding,BRK-1",
  "05/01/2026,Purchase,IMPX,10000,40.00,3000,,,Contract note,BRK-2",
  "20/04/2026,Cash Dividend,IMPX,,,,30000,3000,Final dividend,BRK-3",
  "02/06/2026,Sale,IMPX,2000,50,750,,,Contract note,BRK-4",
].join("\n");

beforeAll(async () => {
  const pool = ownerPool();
  await pool.query("insert into instruments (name, symbol, asset_class, country, region, currency, pricing_model, stale_after_days, verification_state) values ('Import Test Plc', 'IMPX', 'equity', 'NG', 'Africa', 'NGN', 'market', 5, 'synthetic') on conflict do nothing");
  await pool.end();
  user = await makeUser("Importer");
  await grantPlan(user.orgId, "pro");
  broker = (await createAccount(user.ctx, { name: "Broker", type: "brokerage", currency: "NGN" })).id;
  bank = (await createAccount(user.ctx, { name: "Bank", type: "bank", currency: "NGN" })).id;
});
afterAll(async () => closeDb());

describe("preview → commit → rollback", () => {
  let batchId: string;

  it("previews without touching the ledger", async () => {
    batchId = await previewImport(user.ctx, { accountId: broker, fileName: "broker.csv", bytes: enc(BROKER_CSV) });
    const b = await getImport(user.ctx, batchId);
    expect(b.status).toBe("previewed");
    expect(b.summary).toMatchObject({ total: 4, ready: 4, errors: 0, duplicates: 0 });
    expect(b.mapping.columns).toMatchObject({ date: "Trade Date", type: "Action", symbol: "Ticker", fees: "Commission", externalRef: "Reference" });
    expect(await listTransactions(user.ctx)).toHaveLength(0);
  });

  it("commits atomically and the dashboard reflects the import", async () => {
    expect(await commitImport(user.ctx, batchId, { includeDuplicates: false })).toEqual({ imported: 4 });
    const txs = await listTransactions(user.ctx);
    expect(txs).toHaveLength(4);
    expect(txs.every((t) => t.source === "import")).toBe(true);
    const dash = await buildDashboard(user.ctx, { baseCurrency: "NGN", period: "ALL", asOf: "2026-06-30" });
    // Cash: 1,000,000 − 403,000 + 27,000 + (100,000 − 750) = 723,250
    expect(dash.cash.find((c) => c.accountId === broker)!.amount).toBe("723250.00");
    expect(dash.holdings[0]!.quantity).toBe("8000");
    const b = await getImport(user.ctx, batchId);
    expect(b.status).toBe("committed");
    const [raw] = await withTenant(user.ctx, (tx) => tx.select({ raw: importBatches.rawText }).from(importBatches).where(eq(importBatches.id, batchId)));
    expect(raw!.raw).toBeNull(); // raw file text is not retained after commit
  });

  it("cannot be committed twice, and the same file is flagged on re-upload", async () => {
    await expect(commitImport(user.ctx, batchId, { includeDuplicates: false })).rejects.toMatchObject({ code: "CONFLICT" });
    const again = await previewImport(user.ctx, { accountId: broker, fileName: "broker-copy.csv", bytes: enc(BROKER_CSV) });
    const b = await getImport(user.ctx, again);
    expect(b.summary.alreadyImportedBatchId).toBe(batchId);
    expect(b.summary).toMatchObject({ duplicates: 4, ready: 0 });
    await expect(commitImport(user.ctx, again, { includeDuplicates: true })).rejects.toMatchObject({ code: "CONFLICT" });
    await discardImport(user.ctx, again);
  });

  it("rolls back by reversal, keeping history", async () => {
    expect(await rollbackImport(user.ctx, batchId, "Wrong account")).toEqual({ reversed: 4 });
    const txs = await listTransactions(user.ctx);
    expect(txs).toHaveLength(8);
    expect(txs.filter((t) => t.reversedBy)).toHaveLength(4);
    const dash = await buildDashboard(user.ctx, { baseCurrency: "NGN", period: "ALL", asOf: "2026-06-30" });
    expect(dash.totals.netWorth).toBe("0.00");
    await expect(rollbackImport(user.ctx, batchId, "again")).rejects.toMatchObject({ code: "CONFLICT" });
  });

  it("after rollback the same file can be imported again", async () => {
    const id = await previewImport(user.ctx, { accountId: broker, fileName: "broker.csv", bytes: enc(BROKER_CSV) });
    expect((await getImport(user.ctx, id)).summary).toMatchObject({ ready: 4, duplicates: 0 });
    await commitImport(user.ctx, id, { includeDuplicates: false });
  });
});

describe("validation and duplicates", () => {
  it("flags rows the ledger would reject, with the row number, and imports only valid rows", async () => {
    const u = await makeUser("Oversell");
    const acc = (await createAccount(u.ctx, { name: "Broker", type: "brokerage", currency: "NGN" })).id;
    const csv = ["date,type,symbol,quantity,price,amount", "2026-01-02,deposit,,,,50000", "2026-01-03,buy,IMPX,100,40,", "2026-01-04,sell,IMPX,500,45,", "2026-01-05,buy,NOPE,1,1,"].join("\n");
    const id = await previewImport(u.ctx, { accountId: acc, fileName: "x.csv", bytes: enc(csv) });
    const b = await getImport(u.ctx, id);
    expect(b.rows.map((r) => r.status)).toEqual(["ready", "ready", "error", "error"]);
    expect(b.rows[2]!.errors.join()).toMatch(/negative holding/);
    expect(b.rows[3]!.errors.join()).toMatch(/catalogue/);
    expect(await commitImport(u.ctx, id, { includeDuplicates: false })).toEqual({ imported: 2 });
  });

  it("skips rows already entered by hand, unless asked to include them", async () => {
    const u = await makeUser("Dupes");
    const acc = (await createAccount(u.ctx, { name: "Bank", type: "bank", currency: "NGN" })).id;
    await postEvent(u.ctx, { type: "deposit", accountId: acc, currency: "NGN", amount: "750000", occurredOn: "2026-01-02" });
    const csv = ["Value Date,Narration,Debit,Credit", "02/01/2026,SALARY,,\"750,000.00\"", "03/01/2026,POS,\"12,500.00\","].join("\n");
    const id = await previewImport(u.ctx, { accountId: acc, fileName: "statement.csv", bytes: enc(csv) });
    const b = await getImport(u.ctx, id);
    expect(b.rows.map((r) => r.status)).toEqual(["duplicate", "ready"]);
    expect(await commitImport(u.ctx, id, { includeDuplicates: false })).toEqual({ imported: 1 });
    expect(await listTransactions(u.ctx)).toHaveLength(2);
  });

  it("refuses to commit if the ledger changed since the preview", async () => {
    const u = await makeUser("Stale");
    const acc = (await createAccount(u.ctx, { name: "Bank", type: "bank", currency: "NGN" })).id;
    const id = await previewImport(u.ctx, { accountId: acc, fileName: "s.csv", bytes: enc("date,amount\n2026-02-01,5000") });
    await postEvent(u.ctx, { type: "deposit", accountId: acc, currency: "NGN", amount: "5000", occurredOn: "2026-02-01" });
    await expect(commitImport(u.ctx, id, { includeDuplicates: false })).rejects.toMatchObject({ code: "CONFLICT" });
    expect(await listTransactions(u.ctx)).toHaveLength(1);
  });

  it("is all-or-nothing when the ledger rejects a row at commit time", async () => {
    const u = await makeUser("Atomic");
    const acc = (await createAccount(u.ctx, { name: "Broker", type: "brokerage", currency: "NGN" })).id;
    await postEvent(u.ctx, { type: "buy", accountId: acc, instrumentId: await impxId(u.ctx), quantity: "100", price: "40", fees: "0", currency: "NGN", occurredOn: "2026-01-02" });
    const id = await previewImport(u.ctx, { accountId: acc, fileName: "a.csv", bytes: enc("date,type,symbol,quantity,price\n2026-03-01,deposit-ish,,,\n2026-03-02,sell,IMPX,100,45") });
    expect((await getImport(u.ctx, id)).rows.map((r) => r.status)).toEqual(["error", "ready"]);
    // Meanwhile the user sells the units by hand, so the previewed sale is no longer valid.
    await postEvent(u.ctx, { type: "sell", accountId: acc, instrumentId: await impxId(u.ctx), quantity: "100", price: "41", fees: "0", currency: "NGN", occurredOn: "2026-02-15" });
    await expect(commitImport(u.ctx, id, { includeDuplicates: false })).rejects.toMatchObject({ code: "LEDGER_REJECTED", message: expect.stringMatching(/^Row 3:/) });
    expect(await listTransactions(u.ctx)).toHaveLength(2);
    expect((await getImport(u.ctx, id)).status).toBe("previewed");
  });

  it("blocks rollback when later manual entries depend on imported units", async () => {
    const u = await makeUser("Dependent");
    const acc = (await createAccount(u.ctx, { name: "Broker", type: "brokerage", currency: "NGN" })).id;
    const id = await previewImport(u.ctx, { accountId: acc, fileName: "b.csv", bytes: enc("date,type,symbol,quantity,price\n2026-01-02,buy,IMPX,100,40") });
    await commitImport(u.ctx, id, { includeDuplicates: false });
    await postEvent(u.ctx, { type: "sell", accountId: acc, instrumentId: await impxId(u.ctx), quantity: "100", price: "41", fees: "0", currency: "NGN", occurredOn: "2026-02-15" });
    await expect(rollbackImport(u.ctx, id, "oops")).rejects.toMatchObject({ code: "LEDGER_REJECTED" });
    expect((await getImport(u.ctx, id)).status).toBe("committed");
  });
});

describe("mapping", () => {
  it("re-maps a file with institution-specific type words and saves the mapping", async () => {
    const u = await makeUser("Mapper");
    const acc = (await createAccount(u.ctx, { name: "Broker", type: "brokerage", currency: "NGN" })).id;
    const csv = "Txn Dt,Code,Stock,Units,Px\n05-Jan-2026,PURCH-EQ,IMPX,10,40\n06-Jan-2026,CR,,,";
    const id = await previewImport(u.ctx, { accountId: acc, fileName: "odd.csv", bytes: enc(csv) });
    expect((await getImport(u.ctx, id)).summary).toMatchObject({ needsMapping: 1, total: 0 });
    const mapping = { columns: { date: "Txn Dt", type: "Code", symbol: "Stock", quantity: "Units", price: "Px" }, dateFormat: "auto", typeAliases: { "PURCH-EQ": "buy" } };
    await remapImport(u.ctx, id, mapping);
    const b = await getImport(u.ctx, id);
    expect(b.rows[0]!.status).toBe("ready");
    expect(b.rows[1]!.errors.join()).toMatch(/Amount is missing/);
    const mid = await saveMapping(u.ctx, "Odd Securities Ltd", mapping);
    expect((await listMappings(u.ctx)).map((m) => m.name)).toEqual(["Odd Securities Ltd"]);
    const id2 = await previewImport(u.ctx, { accountId: acc, fileName: "odd2.csv", bytes: enc(csv), mappingId: mid });
    expect((await getImport(u.ctx, id2)).rows[0]!.status).toBe("ready");
  });

  it("rejects hostile files with a clear message", async () => {
    await expect(previewImport(user.ctx, { accountId: bank, fileName: "evil.xlsx", bytes: new Uint8Array([0x50, 0x4b, 3, 4, 0, 0, 0]) })).rejects.toMatchObject({ code: "VALIDATION", message: expect.stringMatching(/binary/) });
    await expect(previewImport(user.ctx, { accountId: bank, fileName: "big.csv", bytes: new Uint8Array(2 * 1024 * 1024 + 1).fill(65) })).rejects.toMatchObject({ code: "VALIDATION" });
  });

  it("neutralises formulas from imported descriptions in CSV exports", async () => {
    const u = await makeUser("Formula");
    const acc = (await createAccount(u.ctx, { name: "Bank", type: "bank", currency: "NGN" })).id;
    const id = await previewImport(u.ctx, { accountId: acc, fileName: "f.csv", bytes: enc('date,amount,description\n2026-01-02,100,"=HYPERLINK(""http://evil.test"")"') });
    await commitImport(u.ctx, id, { includeDuplicates: false });
    const [ev] = await withTenant(u.ctx, (tx) => tx.select().from(ledgerEvents));
    expect(ev!.description).toBe('=HYPERLINK("http://evil.test")'); // stored verbatim as data
    const { csvCell } = await import("@/server/imports/export");
    expect(csvCell('=HYPERLINK("http://evil.test")')).toBe('"\'=HYPERLINK(""http://evil.test"")"');
  });
});

describe("tenant isolation", () => {
  it("another user cannot read, re-map, commit, discard or roll back an import", async () => {
    const mallory = await makeUser("Mallory");
    const id = await previewImport(user.ctx, { accountId: bank, fileName: "mine.csv", bytes: enc("date,amount\n2026-03-01,10") });
    await expect(getImport(mallory.ctx, id)).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(remapImport(mallory.ctx, id, { columns: { date: "date", amount: "amount" }, dateFormat: "auto" })).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(commitImport(mallory.ctx, id, { includeDuplicates: false })).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(discardImport(mallory.ctx, id)).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(rollbackImport({ userId: mallory.userId, orgId: user.orgId }, id, "evil")).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(previewImport(mallory.ctx, { accountId: bank, fileName: "x.csv", bytes: enc("date,amount\n2026-03-01,10") })).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect((await listImports(mallory.ctx)).length).toBe(0);
  });

  it("the database refuses illegal batch transitions and edits to committed rows", async () => {
    const id = await previewImport(user.ctx, { accountId: bank, fileName: "t.csv", bytes: enc("date,amount\n2026-03-05,10") });
    await commitImport(user.ctx, id, { includeDuplicates: false });
    await expectDbRejection(withTenant(user.ctx, (tx) => tx.update(importBatches).set({ status: "previewed" }).where(eq(importBatches.id, id))), /WOS_INVALID_TRANSITION/);
    await expectDbRejection(withTenant(user.ctx, (tx) => tx.update(importBatches).set({ rows: [] }).where(eq(importBatches.id, id))), /WOS_IMMUTABLE/);
    await expectDbRejection(withTenant(user.ctx, (tx) => tx.execute(sql`delete from import_batches where id = ${id}`)), /permission denied/);
  });
});

describe("data rights", () => {
  it("exports imports and mappings, and erasure still removes everything", async () => {
    const u = await makeUser("Rights");
    const acc = (await createAccount(u.ctx, { name: "Bank", type: "bank", currency: "NGN" })).id;
    const id = await previewImport(u.ctx, { accountId: acc, fileName: "r.csv", bytes: enc("date,amount\n2026-03-01,10") });
    await commitImport(u.ctx, id, { includeDuplicates: false });
    await saveMapping(u.ctx, "Rights Bank", { columns: { date: "date", amount: "amount" }, dateFormat: "auto" });
    const exp = await exportUserData(u.userId, meta);
    const org = exp.organizations[0]!;
    expect(org.imports).toHaveLength(1);
    expect(org.imports[0]).not.toHaveProperty("rawText");
    expect(org.importMappings).toHaveLength(1);
    await eraseAccount(u.userId, "correct horse battery staple", "DELETE MY ACCOUNT", meta);
    expect((await exportUserData(u.userId, meta)).organizations).toHaveLength(0);
  });
});

async function impxId(ctx: { userId: string; orgId: string }): Promise<string> {
  const r = await withTenant(ctx, (tx) => tx.execute<{ id: string }>(sql`select id from instruments where symbol = 'IMPX'`));
  return r.rows[0]!.id;
}

describe("transfers and conversions from statements", () => {
  it("a transfer appears in both accounts' statements but is recorded once; conversions keep both legs", async () => {
    const u = await makeUser("Transfer Importer");
    await grantPlan(u.orgId, "pro");
    const naira = (await createAccount(u.ctx, { name: "Naira current", type: "bank", currency: "NGN" })).id;
    const savings = (await createAccount(u.ctx, { name: "Naira savings", type: "bank", currency: "NGN" })).id;
    await postEvent(u.ctx, { type: "deposit", accountId: naira, currency: "NGN", amount: "1000000", occurredOn: "2026-09-01" });

    const fromCurrent = "date,type,amount,currency,other account,reference\n01/10/2026,Transfer out,250000,NGN,Naira savings,CUR-001\n";
    const b1 = await previewImport(u.ctx, { accountId: naira, fileName: "current.csv", bytes: enc(fromCurrent) });
    expect(await commitImport(u.ctx, b1, { includeDuplicates: false })).toEqual({ imported: 1 });

    const fromSavings = "date,type,amount,currency,other account,reference\n01/10/2026,Transfer in,250000,NGN,Naira current,SAV-777\n02/10/2026,Interest,1200,NGN,,SAV-778\n";
    const b2 = await previewImport(u.ctx, { accountId: savings, fileName: "savings.csv", bytes: enc(fromSavings) });
    const preview = await getImport(u.ctx, b2);
    expect(preview.rows.map((r) => r.status)).toEqual(["duplicate", "ready"]);
    expect(await commitImport(u.ctx, b2, { includeDuplicates: false })).toEqual({ imported: 1 });

    const dash = await buildDashboard(u.ctx, { baseCurrency: "NGN", period: "ALL", bypassCache: true });
    const cash = Object.fromEntries(dash.cash.map((c) => [c.accountName, c.amount]));
    expect(Number(cash["Naira current"])).toBe(750000);
    expect(Number(cash["Naira savings"])).toBe(251200);
    expect(Number(dash.totals.cash)).toBe(1001200); // moving money between own accounts changes nothing in total

    const fx = "date,type,amount,currency,amount received,to currency,fees,reference\n03/10/2026,FX purchase,150000,NGN,100,USD,500,FX-1\n";
    const b3 = await previewImport(u.ctx, { accountId: naira, fileName: "fx.csv", bytes: enc(fx) });
    expect(await commitImport(u.ctx, b3, { includeDuplicates: false })).toEqual({ imported: 1 });
    const tx = await listTransactions(u.ctx);
    expect(tx.find((t) => t.type === "fx_conversion")).toMatchObject({ currency: "NGN", amount: "150000" });
  });
});
