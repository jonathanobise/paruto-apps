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
