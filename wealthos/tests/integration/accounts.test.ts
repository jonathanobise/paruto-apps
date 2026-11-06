import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { closeDb } from "@/server/db/client";
import { closeAccount, createAccount, getAccount, reopenAccount, updateAccount } from "@/server/accounts/service";
import { postEvent } from "@/server/ledger/service";
import { buildDashboard } from "@/server/analytics/portfolio";
import { accountPerformance, holdingsPerformance } from "@/server/analytics/performance";
import { d } from "@/engine";
import { makeUser, ownerPool } from "./helpers";

let user: Awaited<ReturnType<typeof makeUser>>;
let instrumentId: string;

beforeAll(async () => {
  const pool = ownerPool();
  const src = await pool.query("insert into market_data_sources (key, name, kind, license_note) values ('acct-test', 'Account tests', 'synthetic', 'Test data only') on conflict (key) do update set name = excluded.name returning id");
  instrumentId = (await pool.query("insert into instruments (name, symbol, asset_class, country, region, currency, pricing_model, stale_after_days, verification_state) values ('Account Test Plc', 'ACCT', 'equity', 'NG', 'Africa', 'NGN', 'market', 400, 'synthetic') returning id")).rows[0].id;
  for (const [date, price] of [["2025-01-01", "10"], ["2025-03-31", "12"], ["2025-06-30", "13"], ["2025-12-31", "14"]]) {
    await pool.query("insert into market_prices (instrument_id, source_id, observed_on, price, currency, methodology, verification_state) values ($1,$2,$3,$4,'NGN','close','synthetic')", [instrumentId, src.rows[0].id, date, price]);
  }
  await pool.end();
  user = await makeUser("Accounts");
});
afterAll(async () => closeDb());

describe("editing accounts", () => {
  it("updates descriptive fields but never type or currency", async () => {
    const acc = await createAccount(user.ctx, { name: "Old name", type: "bank", currency: "NGN" });
    await updateAccount(user.ctx, acc.id, { name: "Salary account", institutionName: "Test Bank", isInvestment: false, ownershipPercent: "50", maskedNumber: "1234", notes: "Joint with spouse", type: "loan", currency: "USD" });
    const after = await getAccount(user.ctx, acc.id);
    expect(after).toMatchObject({ name: "Salary account", institutionName: "Test Bank", maskedNumber: "1234", notes: "Joint with spouse", type: "bank", currency: "NGN" });
    expect(d(after.ownershipPercent).toFixed()).toBe("50");
    await expect(updateAccount(user.ctx, acc.id, { name: "", isInvestment: false, ownershipPercent: "150" })).rejects.toMatchObject({ code: "VALIDATION" });
  });
});

describe("closing accounts", () => {
  it("refuses while cash or holdings remain, or with later transactions; then blocks new entries after closing", async () => {
    const acc = (await createAccount(user.ctx, { name: "To close", type: "brokerage", currency: "NGN" })).id;
    const other = (await createAccount(user.ctx, { name: "Destination", type: "bank", currency: "NGN" })).id;
    await postEvent(user.ctx, { type: "deposit", accountId: acc, currency: "NGN", amount: "1000", occurredOn: "2025-02-01" });
    await expect(closeAccount(user.ctx, acc, "2025-02-10")).rejects.toMatchObject({ code: "CONFLICT", message: expect.stringMatching(/1000\.00 NGN cash/) });
    await postEvent(user.ctx, { type: "transfer", fromAccountId: acc, toAccountId: other, currency: "NGN", amount: "1000", occurredOn: "2025-03-01" });
    await expect(closeAccount(user.ctx, acc, "2025-02-10")).rejects.toMatchObject({ code: "CONFLICT", message: expect.stringMatching(/after this date/) });
    await closeAccount(user.ctx, acc, "2025-03-01");
    await expect(postEvent(user.ctx, { type: "deposit", accountId: acc, currency: "NGN", amount: "5", occurredOn: "2025-03-02" })).rejects.toMatchObject({ code: "VALIDATION", message: expect.stringMatching(/closed/) });
    await expect(closeAccount(user.ctx, acc, "2025-03-01")).rejects.toMatchObject({ code: "CONFLICT" });
    await reopenAccount(user.ctx, acc);
    expect((await getAccount(user.ctx, acc)).status).toBe("open");
  });

  it("drops a closed manual asset from net worth from its closing date only", async () => {
    const u = await makeUser("Manual close");
    const car = (await createAccount(u.ctx, { name: "Car", type: "other_asset", currency: "NGN", openingValue: "8000000", openingValueDate: "2025-01-01" })).id;
    await closeAccount(u.ctx, car, "2025-06-30");
    expect((await buildDashboard(u.ctx, { baseCurrency: "NGN", period: "ALL", asOf: "2025-06-29" })).totals.netWorth).toBe("8000000.00");
    expect((await buildDashboard(u.ctx, { baseCurrency: "NGN", period: "ALL", asOf: "2025-07-01" })).totals.netWorth).toBe("0.00");
  });
});

describe("account and holding performance", () => {
  // Same reference scenario as the engine test (TWR 45.25%, gain 395), funded by a transfer.
  it("treats transfers in from another own account as contributions", async () => {
    const u = await makeUser("Perf");
    const bank = (await createAccount(u.ctx, { name: "Bank", type: "bank", currency: "NGN" })).id;
    const broker = (await createAccount(u.ctx, { name: "Broker", type: "brokerage", currency: "NGN" })).id;
    await postEvent(u.ctx, { type: "deposit", accountId: bank, currency: "NGN", amount: "5000", occurredOn: "2025-01-01" });
    await postEvent(u.ctx, { type: "transfer", fromAccountId: bank, toAccountId: broker, currency: "NGN", amount: "1000", occurredOn: "2025-01-02" });
    await postEvent(u.ctx, { type: "buy", accountId: broker, instrumentId, quantity: "100", price: "10", fees: "0", currency: "NGN", occurredOn: "2025-01-02" });
    await postEvent(u.ctx, { type: "dividend", accountId: broker, instrumentId, currency: "NGN", grossAmount: "50", withholdingTax: "5", occurredOn: "2025-04-01" });
    await postEvent(u.ctx, { type: "sell", accountId: broker, instrumentId, quantity: "50", price: "13", fees: "0", currency: "NGN", occurredOn: "2025-06-30" });

    const p = await accountPerformance(u.ctx, broker, { baseCurrency: "NGN", period: "ALL", asOf: "2025-12-31" });
    // Broker: start = end of 2 Jan (1,000 at price 10 after the transfer and purchase); end = 700 shares value + 695 cash.
    expect(p!.startValue).toBe("1000.00");
    expect(p!.endValue).toBe("1395.00");
    expect(p!.investmentGain).toBe("395.00");
    expect(p!.netContributions).toBe("0.00");

    // From the bank's point of view the transfer is money out, not a loss.
    const bankPerf = await accountPerformance(u.ctx, bank, { baseCurrency: "NGN", period: "ALL", asOf: "2025-12-31" });
    expect(bankPerf!.withdrawals).toBe("1000.00");
    expect(bankPerf!.investmentGain).toBe("0.00");

    const [h] = await holdingsPerformance(u.ctx, { baseCurrency: "NGN", period: "ALL", asOf: "2025-12-31" });
    expect(h!.symbol).toBe("ACCT");
    expect(h!.local.gain).toBe("395.00");
    expect(d(h!.base!.twr!).toFixed(4)).toBe("0.4525");
    expect(h!.incomeGross).toBe("50.00");
  });
});
