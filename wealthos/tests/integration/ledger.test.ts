import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { closeDb, withTenant } from "@/server/db/client";
import { ledgerEntries } from "@/server/db/schema";
import { addValuation, createAccount } from "@/server/accounts/service";
import { postEvent, reverseEvent } from "@/server/ledger/service";
import { buildDashboard, listTransactions } from "@/server/analytics/portfolio";
import { exportUserData, eraseAccount } from "@/server/privacy/service";
import { d } from "@/engine";
import { makeUser, meta, ownerPool } from "./helpers";

let eqId: string;
let usdEtfId: string;
let user: Awaited<ReturnType<typeof makeUser>>;
let bankId: string;
let brokerId: string;

beforeAll(async () => {
  const pool = ownerPool();
  // Test catalogue: clearly fictional instruments and a test-only price/FX source.
  const src = await pool.query("insert into market_data_sources (key, name, kind, license_note) values ('test', 'Test fixtures', 'synthetic', 'Test data only') returning id");
  const s = src.rows[0].id;
  eqId = (await pool.query("insert into instruments (name, symbol, asset_class, country, region, currency, pricing_model, stale_after_days, verification_state) values ('Test Bank Plc', 'TSTBNK', 'equity', 'NG', 'Africa', 'NGN', 'market', 5, 'synthetic') returning id")).rows[0].id;
  usdEtfId = (await pool.query("insert into instruments (name, symbol, asset_class, country, region, currency, pricing_model, stale_after_days, verification_state) values ('Test World ETF', 'TWLD', 'etf', 'GLOBAL', 'Global', 'USD', 'market', 5, 'synthetic') returning id")).rows[0].id;
  for (const [date, price] of [["2025-01-02", "40"], ["2025-03-31", "44"], ["2025-06-30", "50"]]) {
    await pool.query("insert into market_prices (instrument_id, source_id, observed_on, price, currency, methodology, verification_state) values ($1,$2,$3,$4,'NGN','close','synthetic')", [eqId, s, date, price]);
  }
  for (const [date, price] of [["2025-01-02", "100"], ["2025-06-30", "110"]]) {
    await pool.query("insert into market_prices (instrument_id, source_id, observed_on, price, currency, methodology, verification_state) values ($1,$2,$3,$4,'USD','close','synthetic')", [usdEtfId, s, date, price]);
  }
  for (const [date, rate] of [["2025-01-02", "1500"], ["2025-03-31", "1530"], ["2025-06-30", "1600"]]) {
    await pool.query("insert into fx_rates (base, quote, rate, observed_on, source_id, methodology, verification_state) values ('USD','NGN',$1,$2,$3,'sample','synthetic')", [rate, date, s]);
  }
  await pool.end();

  user = await makeUser("Ledger");
  bankId = (await createAccount(user.ctx, { name: "Salary account", type: "bank", currency: "NGN" })).id;
  brokerId = (await createAccount(user.ctx, { name: "Broker", type: "brokerage", currency: "NGN", institutionName: "Test Securities" })).id;
});
afterAll(async () => closeDb());

describe("posting and reconstruction", () => {
  it("records deposit → transfer → purchase → dividend and values the dashboard correctly", async () => {
    await postEvent(user.ctx, { type: "deposit", accountId: bankId, currency: "NGN", amount: "1,000,000", occurredOn: "2025-01-02", description: "Salary" });
    await postEvent(user.ctx, { type: "transfer", fromAccountId: bankId, toAccountId: brokerId, currency: "NGN", amount: "500000", occurredOn: "2025-01-02" });
    await postEvent(user.ctx, { type: "buy", accountId: brokerId, instrumentId: eqId, quantity: "10000", price: "40", fees: "2000", currency: "NGN", occurredOn: "2025-01-02" });
    await postEvent(user.ctx, { type: "dividend", accountId: brokerId, instrumentId: eqId, currency: "NGN", grossAmount: "30000", withholdingTax: "3000", occurredOn: "2025-04-15" });

    const dash = await buildDashboard(user.ctx, { baseCurrency: "NGN", period: "ALL", asOf: "2025-06-30" });
    // Holdings: 10,000 × 50 = 500,000. Cash: bank 500,000; broker 500,000 − 402,000 + 27,000 = 125,000.
    expect(dash.totals.invested).toBe("500000.00");
    expect(dash.totals.cash).toBe("625000.00");
    expect(dash.totals.netWorth).toBe("1125000.00");
    expect(dash.totals.unrealized).toBe("98000.00"); // 500,000 − 402,000 cost (fees capitalised)
    expect(dash.totals.income).toBe("30000.00");
    // Performance on the investment scope (broker): the 500,000 transfer is a contribution, not profit.
    expect(dash.performance!.netContributions).toBe("0.00"); // transfer on the start date is part of the start value
    // Start = end of 2025-01-02 (after the purchase and its fee): 98,000 cash + 10,000 × 40.
    expect(dash.performance!.startValue).toBe("498000.00");
    expect(dash.performance!.endValue).toBe("625000.00");
    expect(dash.performance!.investmentGain).toBe("127000.00");
    // 625,000 / 498,000 − 1 (no flows inside the period).
    expect(d(dash.performance!.twr!).toFixed(6)).toBe("0.255020");
    expect(dash.isDemo).toBe(false);
  });

  it("writes ledger entries that reconcile with the replayed balances", async () => {
    const entries = await withTenant(user.ctx, (tx) => tx.select().from(ledgerEntries));
    const cashByAccount = new Map<string, ReturnType<typeof d>>();
    for (const e of entries) cashByAccount.set(e.accountId, (cashByAccount.get(e.accountId) ?? d(0)).plus(d(e.cashDelta)));
    expect(cashByAccount.get(bankId)!.toFixed()).toBe("500000");
    expect(cashByAccount.get(brokerId)!.toFixed()).toBe("125000");
  });

  it("rejects a backdated sale of units not yet held, and future-dated entries", async () => {
    await expect(postEvent(user.ctx, { type: "sell", accountId: brokerId, instrumentId: eqId, quantity: "100", price: "45", currency: "NGN", occurredOn: "2025-01-01" })).rejects.toMatchObject({ code: "LEDGER_REJECTED" });
    await expect(postEvent(user.ctx, { type: "deposit", accountId: bankId, currency: "NGN", amount: "1", occurredOn: "2999-01-01" })).rejects.toMatchObject({ code: "VALIDATION" });
  });

  it("refuses trades in a currency other than the instrument's", async () => {
    await expect(postEvent(user.ctx, { type: "buy", accountId: brokerId, instrumentId: usdEtfId, quantity: "1", price: "100", currency: "NGN", occurredOn: "2025-02-01" })).rejects.toMatchObject({ code: "VALIDATION" });
  });

  it("is idempotent for repeated submissions with the same key", async () => {
    const a = await postEvent(user.ctx, { type: "deposit", accountId: bankId, currency: "NGN", amount: "1000", occurredOn: "2025-05-01", idempotencyKey: "form-submit-0001" });
    const b = await postEvent(user.ctx, { type: "deposit", accountId: bankId, currency: "NGN", amount: "1000", occurredOn: "2025-05-01", idempotencyKey: "form-submit-0001" });
    expect(b.id).toBe(a.id);
    expect(b.duplicate).toBe(true);
  });
});

describe("reversals", () => {
  it("reverses an event without deleting it, once only", async () => {
    const ev = await postEvent(user.ctx, { type: "fee", accountId: brokerId, currency: "NGN", amount: "500", occurredOn: "2025-05-02", description: "Wrong fee" });
    const before = await buildDashboard(user.ctx, { baseCurrency: "NGN", period: "ALL", asOf: "2025-06-30" });
    await reverseEvent(user.ctx, ev.id, "Duplicate fee");
    const after = await buildDashboard(user.ctx, { baseCurrency: "NGN", period: "ALL", asOf: "2025-06-30" });
    expect(d(after.totals.cash).minus(d(before.totals.cash)).toFixed()).toBe("500");
    const txs = await listTransactions(user.ctx);
    expect(txs.find((t) => t.id === ev.id)!.reversedBy).not.toBeNull();
    await expect(reverseEvent(user.ctx, ev.id, "again")).rejects.toMatchObject({ code: "CONFLICT" });
  });

  it("blocks reversing a purchase that a later sale depends on", async () => {
    const buy = await postEvent(user.ctx, { type: "buy", accountId: brokerId, instrumentId: eqId, quantity: "100", price: "44", currency: "NGN", occurredOn: "2025-04-01" });
    await postEvent(user.ctx, { type: "sell", accountId: brokerId, instrumentId: eqId, quantity: "10050", price: "48", currency: "NGN", occurredOn: "2025-05-10" });
    await expect(reverseEvent(user.ctx, buy.id, "mistake")).rejects.toMatchObject({ code: "LEDGER_REJECTED" });
  });
});

describe("multi-currency and manual assets", () => {
  it("values USD holdings at historical FX and includes manual assets and liabilities in net worth", async () => {
    const u = await makeUser("Global");
    const usdBroker = (await createAccount(u.ctx, { name: "USD broker", type: "brokerage", currency: "USD" })).id;
    await postEvent(u.ctx, { type: "deposit", accountId: usdBroker, currency: "USD", amount: "1000", occurredOn: "2025-01-02" });
    await postEvent(u.ctx, { type: "buy", accountId: usdBroker, instrumentId: usdEtfId, quantity: "10", price: "100", currency: "USD", occurredOn: "2025-01-02" });
    const home = await createAccount(u.ctx, { name: "Flat in Yaba", type: "real_estate", currency: "NGN", openingValue: "60000000", openingValueDate: "2025-01-02", ownershipPercent: "50" });
    await createAccount(u.ctx, { name: "Car loan", type: "loan", currency: "NGN", openingValue: "4000000", openingValueDate: "2025-01-02" });
    const dash = await buildDashboard(u.ctx, { baseCurrency: "NGN", period: "ALL", asOf: "2025-06-30" });
    // ETF: 10 × 110 × 1600 = 1,760,000. Flat: 50% × 60m = 30m. Loan: 4m.
    expect(dash.totals.invested).toBe("1760000.00");
    expect(dash.totals.netWorth).toBe("27760000.00");
    expect(d(dash.performance!.fxEffect!).gt(0)).toBe(true);
    const usd = await buildDashboard(u.ctx, { baseCurrency: "USD", period: "ALL", asOf: "2025-06-30" });
    expect(usd.totals.invested).toBe("1100.00");
    await expect(addValuation(u.ctx, { accountId: usdBroker, valuedOn: "2025-06-01", amount: "1" })).rejects.toMatchObject({ code: "VALIDATION" });
    await addValuation(u.ctx, { accountId: home.id, valuedOn: "2025-06-01", amount: "70000000", valuationType: "appraisal" });
    const later = await buildDashboard(u.ctx, { baseCurrency: "NGN", period: "ALL", asOf: "2025-06-30" });
    expect(later.totals.netWorth).toBe("32760000.00");
  });

  it("flags missing FX rather than substituting another date's rate", async () => {
    const u = await makeUser("Gap");
    const usdBroker = (await createAccount(u.ctx, { name: "USD broker", type: "brokerage", currency: "USD" })).id;
    await postEvent(u.ctx, { type: "deposit", accountId: usdBroker, currency: "USD", amount: "1000", occurredOn: "2025-02-15" });
    const dash = await buildDashboard(u.ctx, { baseCurrency: "NGN", period: "ALL", asOf: "2025-02-20" });
    expect(dash.totals.complete).toBe(false);
    expect(dash.issues.some((i) => i.code === "MISSING_FX")).toBe(true);
  });
});

describe("privacy", () => {
  it("exports the user's data and then erases it", async () => {
    const u = await makeUser("Leaver");
    const acc = await createAccount(u.ctx, { name: "Bank", type: "bank", currency: "NGN" });
    await postEvent(u.ctx, { type: "deposit", accountId: acc.id, currency: "NGN", amount: "5000", occurredOn: "2025-03-01" });
    const exp = await exportUserData(u.userId, meta);
    expect(exp.format).toBe("wealthos-export/1");
    expect(exp.organizations[0]!.ledgerEvents).toHaveLength(1);
    expect(exp.organizations[0]!.ledgerEvents[0]!.payload).toMatchObject({ amount: "5000" });
    await expect(eraseAccount(u.userId, "correct horse battery staple", "delete", meta)).rejects.toMatchObject({ code: "VALIDATION" });
    await eraseAccount(u.userId, "correct horse battery staple", "DELETE MY ACCOUNT", meta);
    const again = await exportUserData(u.userId, meta);
    expect(again.organizations).toHaveLength(0);
    expect(again.user.email).toMatch(/^erased-/);
  });
});
