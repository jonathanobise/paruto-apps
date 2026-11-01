import { describe, expect, it } from "vitest";
import { FxTable, PriceTable, analyzePerformance, xirr, timeWeightedReturn, annualize, d, valueBook, PortfolioBook, realReturn, type LedgerEvent } from "@/engine";
import { EQUITY, TBILL, USD_ETF, instruments } from "./fixtures";

const INSTR = instruments(EQUITY, TBILL, USD_ETF);
const noFx = new FxTable([]);

describe("XIRR", () => {
  it("matches the published spreadsheet XIRR example (0.373362535)", () => {
    const r = xirr([
      { date: "2008-01-01", amount: d(-10000) },
      { date: "2008-03-01", amount: d(2750) },
      { date: "2008-10-30", amount: d(4250) },
      { date: "2009-02-15", amount: d(3250) },
      { date: "2009-04-01", amount: d(2750) },
    ]);
    expect(r).not.toBeNull();
    expect(r!).toBeCloseTo(0.3733625335, 8);
  });

  it("returns null when no IRR exists", () => {
    expect(xirr([{ date: "2025-01-01", amount: d(100) }, { date: "2025-02-01", amount: d(100) }])).toBeNull();
  });
});

describe("TWR", () => {
  it("chain-links sub-periods with end-of-day flows", () => {
    const { twr } = timeWeightedReturn([
      { date: "2025-01-01", value: d(100), flow: d(100) },
      { date: "2025-07-01", value: d(165), flow: d(55) },
      { date: "2026-01-01", value: d("181.5"), flow: d(0) },
    ]);
    expect(twr.toFixed()).toBe("0.21");
  });

  it("annualises only periods of a year or more", () => {
    expect(annualize(d("0.21"), 730)!.toDecimalPlaces(12).toFixed()).toBe("0.1");
    expect(annualize(d("0.05"), 180)).toBeNull();
  });

  it("computes real returns", () => {
    expect(realReturn(d("0.2"), d("0.2")).toFixed()).toBe("0");
    expect(realReturn(d("0.32"), d("0.2")).toFixed()).toBe("0.1");
  });
});

// Reference scenario (hand-calculated):
// 2025-01-01 deposit 100, buy 100 units @ 1.00.  2025-07-01 price 1.10; deposit 55, buy 50 @ 1.10.
// 2026-01-01 price 1.21 → value 150 × 1.21 = 181.5.
// TWR = 1.1 × 1.1 − 1 = 21%. Investment gain = 181.5 − 100 − 55 = 26.5. XIRR = 20.962139% (Python bisection).
describe("analyzePerformance", () => {
  const events: LedgerEvent[] = [
    { id: "d1", date: "2025-01-01", type: "deposit", accountId: "A", currency: "NGN", amount: d(100) },
    { id: "b1", date: "2025-01-01", type: "buy", accountId: "A", instrumentId: "EQ", quantity: d(100), price: d(1), fees: d(0), currency: "NGN" },
    { id: "d2", date: "2025-07-01", type: "deposit", accountId: "A", currency: "NGN", amount: d(55) },
    { id: "b2", date: "2025-07-01", type: "buy", accountId: "A", instrumentId: "EQ", quantity: d(50), price: d("1.1"), fees: d(0), currency: "NGN" },
  ];
  const prices = new PriceTable(
    [
      ["2025-01-01", "1"],
      ["2025-01-31", "1.02"],
      ["2025-06-30", "1.1"],
      ["2025-07-01", "1.1"],
      ["2025-12-31", "1.21"],
      ["2026-01-01", "1.21"],
    ].map(([date, p]) => ({ instrumentId: "EQ", price: d(p!), currency: "NGN", observedOn: date! })),
  );
  // Month-end points (e.g. 2025-03-31 with the 2025-01-31 price) are stale: increase staleness for this test.
  const instrs = instruments({ ...EQUITY, staleAfterDays: 400 }, TBILL, USD_ETF);

  const result = analyzePerformance({ events, instruments: instrs, prices, fx: noFx, baseCurrency: "NGN", scope: new Set(["A"]), start: "2025-01-01", end: "2026-01-01" });

  it("separates contributions from investment gain", () => {
    expect(result.startValue.toFixed()).toBe("100");
    expect(result.endValue.toFixed()).toBe("181.5");
    expect(result.netContributions.toFixed()).toBe("55");
    expect(result.investmentGain.toFixed()).toBe("26.5");
  });

  it("computes TWR and XIRR", () => {
    expect(result.twr!.toDecimalPlaces(12).toFixed()).toBe("0.21");
    expect(result.xirr!).toBeCloseTo(0.2096213879, 7);
    expect(result.complete).toBe(true);
  });

  it("never treats a deposit as profit", () => {
    const onlyDeposits = analyzePerformance({
      events: [
        { id: "d1", date: "2025-01-01", type: "deposit", accountId: "A", currency: "NGN", amount: d(1000) },
        { id: "d2", date: "2025-03-01", type: "deposit", accountId: "A", currency: "NGN", amount: d(5000) },
      ],
      instruments: INSTR,
      prices: new PriceTable([]),
      fx: noFx,
      baseCurrency: "NGN",
      scope: new Set(["A"]),
      start: "2025-01-01",
      end: "2025-06-01",
    });
    expect(onlyDeposits.endValue.toFixed()).toBe("6000");
    expect(onlyDeposits.investmentGain.toFixed()).toBe("0");
    expect(onlyDeposits.twr!.toFixed()).toBe("0");
  });
});

describe("currency attribution", () => {
  // A USD ETF with a constant USD price while USD/NGN moves 1500 → 1650: the whole NGN gain is FX.
  const fx = new FxTable(
    [
      ["2025-01-01", "1500"],
      ["2025-01-31", "1520"],
      ["2025-02-28", "1650"],
    ].map(([date, r]) => ({ base: "USD", quote: "NGN", rate: d(r!), observedOn: date! })),
    { maxAgeDays: 5 },
  );
  const prices = new PriceTable(["2025-01-01", "2025-01-31", "2025-02-28"].map((date) => ({ instrumentId: "ETF", price: d(100), currency: "USD", observedOn: date })));
  const events: LedgerEvent[] = [
    { id: "d", date: "2025-01-01", type: "deposit", accountId: "A", currency: "USD", amount: d(1000) },
    { id: "b", date: "2025-01-01", type: "buy", accountId: "A", instrumentId: "ETF", quantity: d(10), price: d(100), fees: d(0), currency: "USD" },
  ];
  const r = analyzePerformance({ events, instruments: INSTR, prices, fx, baseCurrency: "NGN", scope: new Set(["A"]), start: "2025-01-01", end: "2025-02-28" });

  it("attributes the gain to FX", () => {
    expect(r.investmentGain.toFixed()).toBe("150000");
    expect(r.investmentGainConstantFx!.toFixed()).toBe("0");
    expect(r.fxEffect!.toFixed()).toBe("150000");
  });

  it("marks results incomplete instead of substituting a missing FX rate", () => {
    const gappy = new FxTable([{ base: "USD", quote: "NGN", rate: d(1500), observedOn: "2025-01-01" }, { base: "USD", quote: "NGN", rate: d(1650), observedOn: "2025-02-28" }], { maxAgeDays: 5 });
    const res = analyzePerformance({ events, instruments: INSTR, prices, fx: gappy, baseCurrency: "NGN", scope: new Set(["A"]), start: "2025-01-01", end: "2025-02-28" });
    expect(res.complete).toBe(false);
    expect(res.twr).toBeNull();
    expect(res.issues.some((i) => i.code === "MISSING_FX")).toBe(true);
  });
});

describe("valuation policies", () => {
  const events: LedgerEvent[] = [
    { id: "d", date: "2025-01-01", type: "deposit", accountId: "A", currency: "NGN", amount: d(2_000_000) },
    { id: "b", date: "2025-01-01", type: "buy", accountId: "A", instrumentId: "EQ", quantity: d(100), price: d(10), fees: d(0), currency: "NGN" },
    { id: "t", date: "2025-01-01", type: "buy", accountId: "A", instrumentId: "TB", quantity: d(1_000_000), price: d("0.8"), fees: d(0), currency: "NGN" },
  ];
  const book = PortfolioBook.replay(events, { baseCurrency: "NGN", instruments: INSTR });

  it("flags stale prices and values T-bills by accretion", () => {
    const prices = new PriceTable([{ instrumentId: "EQ", price: d(12), currency: "NGN", observedOn: "2025-06-01" }]);
    const v = valueBook(book, { date: "2025-07-02", baseCurrency: "NGN", instruments: INSTR, prices, fx: noFx });
    const eq = v.holdings.find((h) => h.instrumentId === "EQ")!;
    expect(eq.marketValue!.toFixed()).toBe("1200");
    expect(v.issues.some((i) => i.code === "STALE_PRICE")).toBe(true);
    // T-bill: 800,000 cost, 1,000,000 face, 365 days to 2026-01-01; 182 days elapsed → 800,000 + 200,000 × 182/365.
    const tb = v.holdings.find((h) => h.instrumentId === "TB")!;
    expect(tb.method).toBe("accrual");
    expect(tb.marketValue!.toDecimalPlaces(6).toFixed()).toBe("899726.027397");
  });

  it("values unpriced positions at cost (flagged) or excludes them by policy", () => {
    const empty = new PriceTable([]);
    const atCost = valueBook(book, { date: "2025-02-01", baseCurrency: "NGN", instruments: INSTR, prices: empty, fx: noFx, missingPricePolicy: "cost" });
    expect(atCost.holdings.find((h) => h.instrumentId === "EQ")!.marketValue!.toFixed()).toBe("1000");
    expect(atCost.issues.some((i) => i.code === "VALUED_AT_COST")).toBe(true);
    const excluded = valueBook(book, { date: "2025-02-01", baseCurrency: "NGN", instruments: INSTR, prices: empty, fx: noFx, missingPricePolicy: "exclude" });
    expect(excluded.holdings.find((h) => h.instrumentId === "EQ")!.marketValue).toBeNull();
    expect(excluded.complete).toBe(false);
  });

  it("never uses a price observed after the valuation date", () => {
    const prices = new PriceTable([{ instrumentId: "EQ", price: d(50), currency: "NGN", observedOn: "2025-03-01" }]);
    const v = valueBook(book, { date: "2025-02-01", baseCurrency: "NGN", instruments: INSTR, prices, fx: noFx, missingPricePolicy: "exclude" });
    expect(v.holdings.find((h) => h.instrumentId === "EQ")!.marketValue).toBeNull();
  });
});
