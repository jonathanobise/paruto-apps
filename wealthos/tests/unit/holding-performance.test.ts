import { describe, expect, it } from "vitest";
import { FxTable, PriceTable, d, holdingPerformance, type LedgerEvent } from "@/engine";
import { EQUITY, TBILL, USD_ETF, instruments } from "./fixtures";

const INSTR = instruments({ ...EQUITY, staleAfterDays: 400 }, TBILL, { ...USD_ETF, staleAfterDays: 400 });
const noFx = new FxTable([]);

// Reference (hand-calculated; XIRR by Python bisection):
// buy 100 @ 10 on 1 Jan (start value 1,000); price 12 by 1 Apr, dividend 50 gross − 5 WHT paid out;
// sell 50 @ 13 on 30 Jun; 50 left at 14 on 31 Dec.
// TWR = (1245/1000)(1300/1200)(700/650) − 1 = 45.25%. Gain = 700 − 1000 + 45 + 650 = 395. XIRR = 58.56605%.
describe("holding performance", () => {
  const events: LedgerEvent[] = [
    { id: "d", date: "2025-01-01", type: "deposit", accountId: "A", currency: "NGN", amount: d(5000) },
    { id: "b", date: "2025-01-01", type: "buy", accountId: "A", instrumentId: "EQ", quantity: d(100), price: d(10), fees: d(0), currency: "NGN" },
    { id: "v", date: "2025-04-01", type: "dividend", accountId: "A", instrumentId: "EQ", currency: "NGN", grossAmount: d(50), withholdingTax: d(5) },
    { id: "s", date: "2025-06-30", type: "sell", accountId: "A", instrumentId: "EQ", quantity: d(50), price: d(13), fees: d(0), currency: "NGN" },
    // Unrelated activity in the same account must not affect the holding.
    { id: "f", date: "2025-05-01", type: "fee", accountId: "A", currency: "NGN", amount: d(99) },
  ];
  const prices = new PriceTable([
    ["2025-01-01", "10"],
    ["2025-03-31", "12"],
    ["2025-06-30", "13"],
    ["2025-12-31", "14"],
  ].map(([date, p]) => ({ instrumentId: "EQ", price: d(p!), currency: "NGN", observedOn: date! })));
  const r = holdingPerformance({ events, instruments: INSTR, prices, fx: noFx, baseCurrency: "NGN", accountId: "A", instrumentId: "EQ", start: "2025-01-01", end: "2025-12-31" });

  it("separates money in and out from the gain", () => {
    expect(r.local.startValue.toFixed()).toBe("1000");
    expect(r.local.endValue.toFixed()).toBe("700");
    expect(r.local.invested.toFixed()).toBe("0");
    expect(r.local.returned.toFixed()).toBe("695");
    expect(r.local.gain.toFixed()).toBe("395");
    expect(r.incomeGross.toFixed()).toBe("50");
  });

  it("computes TWR and XIRR", () => {
    expect(r.local.twr!.toDecimalPlaces(10).toFixed()).toBe("0.4525");
    expect(r.local.xirr!).toBeCloseTo(0.5856605251, 7);
    expect(r.complete).toBe(true);
  });

  it("treats a holding bought inside the period as money in, not as return", () => {
    const later = holdingPerformance({ events, instruments: INSTR, prices, fx: noFx, baseCurrency: "NGN", accountId: "A", instrumentId: "EQ", start: "2024-12-31", end: "2025-12-31" });
    expect(later.local.startValue.toFixed()).toBe("0");
    expect(later.local.invested.toFixed()).toBe("1000");
    expect(later.local.gain.toFixed()).toBe("395");
    expect(later.local.twr!.toDecimalPlaces(10).toFixed()).toBe("0.4525");
  });

  it("is scoped to the account", () => {
    const other = holdingPerformance({ events, instruments: INSTR, prices, fx: noFx, baseCurrency: "NGN", accountId: "B", instrumentId: "EQ", start: "2025-01-01", end: "2025-12-31" });
    expect(other.local.endValue.toFixed()).toBe("0");
    expect(other.local.twr).toBeNull();
  });
});

describe("holding performance across currencies", () => {
  // 10 units @ $100 with USD/NGN 1500 → $110 with USD/NGN 1650: local +10%, NGN +21%.
  const fx = new FxTable([
    { base: "USD", quote: "NGN", rate: d(1500), observedOn: "2025-01-01" },
    { base: "USD", quote: "NGN", rate: d(1650), observedOn: "2025-12-31" },
  ]);
  const prices = new PriceTable([
    { instrumentId: "ETF", price: d(100), currency: "USD", observedOn: "2025-01-01" },
    { instrumentId: "ETF", price: d(110), currency: "USD", observedOn: "2025-12-31" },
  ]);
  const events: LedgerEvent[] = [
    { id: "d", date: "2025-01-01", type: "deposit", accountId: "U", currency: "USD", amount: d(1000) },
    { id: "b", date: "2025-01-01", type: "buy", accountId: "U", instrumentId: "ETF", quantity: d(10), price: d(100), fees: d(0), currency: "USD" },
  ];

  it("reports local (ex-FX) and base (incl. FX) returns separately, refusing to guess missing FX", () => {
    const r = holdingPerformance({ events, instruments: INSTR, prices, fx, baseCurrency: "NGN", accountId: "U", instrumentId: "ETF", start: "2025-01-01", end: "2025-12-31" });
    // Month-end points between the two observations have no FX within the 5-day window.
    expect(r.base).toBeNull();
    expect(r.complete).toBe(false);
    expect(r.local.twr!.toDecimalPlaces(10).toFixed()).toBe("0.1");
    const dense = new FxTable(
      ["2025-01-01", "2025-01-31", "2025-02-28", "2025-03-31", "2025-04-30", "2025-05-31", "2025-06-30", "2025-07-31", "2025-08-31", "2025-09-30", "2025-10-31", "2025-11-30", "2025-12-31"].map((date, i) => ({ base: "USD", quote: "NGN", rate: d(i === 12 ? 1650 : 1500), observedOn: date })),
    );
    const r2 = holdingPerformance({ events, instruments: INSTR, prices, fx: dense, baseCurrency: "NGN", accountId: "U", instrumentId: "ETF", start: "2025-01-01", end: "2025-12-31" });
    expect(r2.base!.twr!.toDecimalPlaces(10).toFixed()).toBe("0.21");
    expect(r2.base!.gain.toFixed()).toBe("315000");
    expect(r2.local.gain.toFixed()).toBe("100");
  });
});

describe("batch holdings performance", () => {
  it("equals the single-holding calculation for every holding (multi-account, transfers, FX, income, gaps)", async () => {
    const { holdingsPerformanceBatch } = await import("@/engine");
    const events: LedgerEvent[] = [
      { id: "1", date: "2024-11-01", type: "deposit", accountId: "A", currency: "NGN", amount: d(10_000_000) },
      { id: "2", date: "2024-11-02", type: "buy", accountId: "A", instrumentId: "EQ", quantity: d(1000), price: d(10), fees: d(15), currency: "NGN" },
      { id: "3", date: "2025-02-10", type: "dividend", accountId: "A", instrumentId: "EQ", currency: "NGN", grossAmount: d(400), withholdingTax: d(40) },
      { id: "4", date: "2025-03-15", type: "security_transfer", fromAccountId: "A", toAccountId: "B", instrumentId: "EQ", quantity: d(300) },
      { id: "5", date: "2025-05-20", type: "sell", accountId: "B", instrumentId: "EQ", quantity: d(100), price: d(13), fees: d(5), currency: "NGN" },
      { id: "6", date: "2025-01-05", type: "deposit", accountId: "U", currency: "USD", amount: d(5000) },
      { id: "7", date: "2025-01-06", type: "buy", accountId: "U", instrumentId: "ETF", quantity: d(20), price: d(100), fees: d(1), currency: "USD" },
      { id: "8", date: "2025-07-01", type: "sell", accountId: "U", instrumentId: "ETF", quantity: d(20), price: d(110), fees: d(1), currency: "USD" },
      { id: "9", date: "2025-09-01", type: "buy", accountId: "U", instrumentId: "ETF", quantity: d(5), price: d(115), fees: d(1), currency: "USD" },
      { id: "10", date: "2025-04-01", type: "fee", accountId: "A", instrumentId: "EQ", currency: "NGN", amount: d(25) },
    ];
    const prices = new PriceTable([
      ...[["2024-11-01", "10"], ["2025-01-31", "11"], ["2025-03-31", "12.5"], ["2025-06-30", "12"], ["2025-12-31", "14"]].map(([date, p]) => ({ instrumentId: "EQ", price: d(p!), currency: "NGN", observedOn: date! })),
      ...[["2025-01-06", "100"], ["2025-06-30", "108"], ["2025-09-01", "115"], ["2025-12-31", "120"]].map(([date, p]) => ({ instrumentId: "ETF", price: d(p!), currency: "USD", observedOn: date! })),
    ]);
    const fx = new FxTable(Array.from({ length: 430 }, (_, i) => {
      const date = new Date(Date.UTC(2024, 9, 28) + i * 86_400_000).toISOString().slice(0, 10);
      return { base: "USD", quote: "NGN", rate: d(1500).plus(i), observedOn: date, source: "test" };
    }), { maxAgeDays: 5 });
    const pairs = [{ accountId: "A", instrumentId: "EQ" }, { accountId: "B", instrumentId: "EQ" }, { accountId: "U", instrumentId: "ETF" }];
    for (const [start, end] of [["2025-01-01", "2025-12-31"], ["2024-10-31", "2025-12-31"], ["2025-06-30", "2025-09-30"]] as const) {
      const batch = holdingsPerformanceBatch({ events, instruments: INSTR, prices, fx, baseCurrency: "NGN", start, end, pairs });
      for (const [i, p] of pairs.entries()) {
        const single = holdingPerformance({ events, instruments: INSTR, prices, fx, baseCurrency: "NGN", ...p, start, end });
        const norm = (x: typeof single) => JSON.parse(JSON.stringify(x, (_k, v) => (v && typeof v === "object" && "toFixed" in v && "isZero" in v ? (v as { toFixed(): string }).toFixed() : v)));
        expect(norm(batch[i]!), `${p.accountId}/${p.instrumentId} ${start}..${end}`).toEqual(norm(single));
      }
    }
  });
});
