import { describe, expect, it } from "vitest";
import { PortfolioBook, InsufficientQuantityError, LedgerValidationError, FxTable, d, flowsForScope, sum, type LedgerEvent } from "@/engine";
import { EQUITY, TBILL, USD_ETF, instruments } from "./fixtures";

const INSTR = instruments(EQUITY, TBILL, USD_ETF);
const base = { baseCurrency: "NGN", instruments: INSTR };

const deposit = (id: string, date: string, amount: string, accountId = "A"): LedgerEvent => ({ id, date, type: "deposit", accountId, currency: "NGN", amount: d(amount) });
const buy = (id: string, date: string, q: string, p: string, fees = "0", accountId = "A"): LedgerEvent => ({ id, date, type: "buy", accountId, instrumentId: "EQ", quantity: d(q), price: d(p), fees: d(fees), currency: "NGN" });
const sell = (id: string, date: string, q: string, p: string, fees = "0", accountId = "A"): LedgerEvent => ({ id, date, type: "sell", accountId, instrumentId: "EQ", quantity: d(q), price: d(p), fees: d(fees), currency: "NGN" });

// Reference fixture (hand-calculated, see docs/FINANCIAL_ENGINE.md §Test fixtures):
// buy 100 @ 10 + fee 10 = cost 1010; buy 50 @ 12 = cost 600; sell 120 @ 15 − fee 18 = proceeds 1782.
// FIFO cost of 120 = 1010 + 20/50 × 600 = 1250 → gain 532; remaining 30 units, cost 360.
// Average cost = 1610/150; cost of 120 = 1288 → gain 494; remaining 30 units, cost 322.
const tradeFixture: LedgerEvent[] = [deposit("e1", "2025-01-01", "5000"), buy("e2", "2025-01-02", "100", "10", "10"), buy("e3", "2025-02-01", "50", "12"), sell("e4", "2025-03-01", "120", "15", "18")];

describe("PortfolioBook lots", () => {
  it("computes FIFO realised gains and remaining cost", () => {
    const book = PortfolioBook.replay(tradeFixture, base);
    expect(book.realized).toHaveLength(1);
    expect(book.realized[0]!.proceeds.toFixed()).toBe("1782");
    expect(book.realized[0]!.cost.toFixed()).toBe("1250");
    expect(book.realized[0]!.gain.toFixed()).toBe("532");
    const [pos] = book.positions();
    expect(pos!.quantity.toFixed()).toBe("30");
    expect(pos!.cost.toFixed()).toBe("360");
    expect(pos!.averageCost.toFixed()).toBe("12");
    expect(book.cashBalances()[0]!.amount.toFixed()).toBe("5172");
  });

  it("computes average-cost realised gains", () => {
    const book = PortfolioBook.replay(tradeFixture, { ...base, lotMethod: "AVERAGE" });
    expect(book.realized[0]!.cost.toDecimalPlaces(10).toFixed()).toBe("1288");
    expect(book.realized[0]!.gain.toDecimalPlaces(10).toFixed()).toBe("494");
    expect(book.positions()[0]!.cost.toDecimalPlaces(10).toFixed()).toBe("322");
  });

  it("keeps lot quantities equal to the position", () => {
    const book = PortfolioBook.replay(tradeFixture, base);
    for (const p of book.positions()) expect(sum(p.lots.map((l) => l.quantity)).equals(p.quantity)).toBe(true);
  });

  it("captures buy/sell fees as expenses", () => {
    const book = PortfolioBook.replay(tradeFixture, base);
    expect(sum(book.expenses.map((x) => x.amount)).toFixed()).toBe("28");
  });

  it("refuses to sell more than held", () => {
    expect(() => PortfolioBook.replay([deposit("e1", "2025-01-01", "1000"), buy("e2", "2025-01-02", "10", "10"), sell("e3", "2025-01-03", "11", "10")], base)).toThrow(InsufficientQuantityError);
  });

  it("rejects non-positive quantities and amounts", () => {
    expect(() => PortfolioBook.replay([deposit("e1", "2025-01-01", "0")], base)).toThrow(LedgerValidationError);
    expect(() => PortfolioBook.replay([buy("e1", "2025-01-01", "-1", "10")], base)).toThrow(LedgerValidationError);
  });

  it("warns (does not hide) negative cash", () => {
    const book = PortfolioBook.replay([buy("e1", "2025-01-01", "1", "10")], base);
    expect(book.warnings.map((w) => w.code)).toContain("NEGATIVE_CASH");
  });

  it("rejects trades in a currency other than the instrument's", () => {
    const e: LedgerEvent = { id: "x", date: "2025-01-01", type: "buy", accountId: "A", instrumentId: "ETF", quantity: d(1), price: d(1), fees: d(0), currency: "NGN" };
    expect(() => PortfolioBook.replay([e], base)).toThrow(/FX conversion/);
  });
});

describe("corporate actions", () => {
  it("splits change quantity but conserve cost basis", () => {
    const book = PortfolioBook.replay([...tradeFixture, { id: "s", date: "2025-04-01", type: "split", instrumentId: "EQ", numerator: d(2), denominator: d(1) }], base);
    const [p] = book.positions();
    expect(p!.quantity.toFixed()).toBe("60");
    expect(p!.cost.toFixed()).toBe("360");
    expect(p!.averageCost.toFixed()).toBe("6");
  });

  it("stock dividends (bonus issues) reallocate cost across more shares", () => {
    const book = PortfolioBook.replay([...tradeFixture, { id: "b", date: "2025-04-01", type: "stock_dividend", accountId: "A", instrumentId: "EQ", quantity: d(6) }], base);
    const [p] = book.positions();
    expect(p!.quantity.toFixed()).toBe("36");
    expect(p!.cost.toFixed()).toBe("360");
  });

  it("security transfers keep acquisition dates and cost basis", () => {
    const book = PortfolioBook.replay([...tradeFixture, { id: "t", date: "2025-04-01", type: "security_transfer", fromAccountId: "A", toAccountId: "B", instrumentId: "EQ", quantity: d(30) }], base);
    const positions = book.positions();
    expect(positions).toHaveLength(1);
    expect(positions[0]!.accountId).toBe("B");
    expect(positions[0]!.cost.toFixed()).toBe("360");
    expect(positions[0]!.lots[0]!.acquiredOn).toBe("2025-02-01");
  });
});

describe("income", () => {
  it("records gross dividends, withholding tax and net cash", () => {
    const book = PortfolioBook.replay([...tradeFixture, { id: "dv", date: "2025-04-01", type: "dividend", accountId: "A", instrumentId: "EQ", currency: "NGN", grossAmount: d(100), withholdingTax: d(10) }], base);
    expect(book.income[0]!.gross.toFixed()).toBe("100");
    expect(book.income[0]!.tax.toFixed()).toBe("10");
    expect(book.cashBalances()[0]!.amount.toFixed()).toBe("5262");
  });

  it("classifies T-bill maturity gains as interest (discount accretion)", () => {
    const events: LedgerEvent[] = [
      deposit("e1", "2025-01-01", "900000"),
      { id: "e2", date: "2025-01-02", type: "buy", accountId: "A", instrumentId: "TB", quantity: d(1_000_000), price: d("0.9"), fees: d(0), currency: "NGN" },
      { id: "e3", date: "2026-01-01", type: "maturity", accountId: "A", instrumentId: "TB", quantity: d(1_000_000), proceeds: d(1_000_000), currency: "NGN" },
    ];
    const book = PortfolioBook.replay(events, base);
    expect(book.realized[0]!.classification).toBe("interest");
    expect(book.income.find((i) => i.kind === "discount_accretion")!.gross.toFixed()).toBe("100000");
    expect(book.positions()).toHaveLength(0);
    expect(book.cashBalances()[0]!.amount.toFixed()).toBe("1000000");
  });

  it("reinvested income becomes both income and cost basis", () => {
    const book = PortfolioBook.replay([...tradeFixture, { id: "r", date: "2025-04-01", type: "reinvestment", accountId: "A", instrumentId: "EQ", currency: "NGN", amount: d(150), quantity: d(10) }], base);
    expect(book.income[0]!.kind).toBe("reinvested");
    const [p] = book.positions();
    expect(p!.quantity.toFixed()).toBe("40");
    expect(p!.cost.toFixed()).toBe("510");
  });
});

describe("transfers and flows", () => {
  const events: LedgerEvent[] = [deposit("e1", "2025-01-01", "1000", "BANK"), { id: "t1", date: "2025-01-02", type: "transfer", fromAccountId: "BANK", toAccountId: "BROKER", currency: "NGN", amount: d(400) }];

  it("never changes total cash across own accounts", () => {
    const book = PortfolioBook.replay(events, base);
    expect(sum(book.cashBalances().map((c) => c.amount)).toFixed()).toBe("1000");
  });

  it("treats transfers inside a scope as internal and across the boundary as external", () => {
    const book = PortfolioBook.replay(events, base);
    const all = flowsForScope(book.flows, new Set(["BANK", "BROKER"]));
    expect(all.map((f) => f.eventId)).toEqual(["e1"]);
    const brokerOnly = flowsForScope(book.flows, new Set(["BROKER"]));
    expect(brokerOnly).toHaveLength(1);
    expect(brokerOnly[0]!.eventId).toBe("t1");
    expect(brokerOnly[0]!.direction).toBe(1);
  });

  it("records FX conversions with fees in the source currency", () => {
    const book = PortfolioBook.replay([deposit("e1", "2025-01-01", "1600000"), { id: "fx", date: "2025-01-02", type: "fx_conversion", accountId: "A", fromCurrency: "NGN", fromAmount: d(1_500_000), toCurrency: "USD", toAmount: d(1000), fees: d(15_000) }], base);
    const cash = Object.fromEntries(book.cashBalances().map((c) => [c.currency, c.amount.toFixed()]));
    expect(cash).toEqual({ NGN: "85000", USD: "1000" });
  });
});

describe("reversals", () => {
  it("cancel the original event without deleting history", () => {
    const events = [...tradeFixture, { id: "rv", date: "2025-03-02", type: "reversal" as const, reversesEventId: "e4" }];
    const book = PortfolioBook.replay(events, base);
    expect(book.realized).toHaveLength(0);
    expect(book.positions()[0]!.quantity.toFixed()).toBe("150");
    expect(events).toHaveLength(5);
  });

  it("cannot reverse the same event twice or an unknown event", () => {
    expect(() => PortfolioBook.replay([...tradeFixture, { id: "r1", date: "2025-03-02", type: "reversal", reversesEventId: "e4" }, { id: "r2", date: "2025-03-03", type: "reversal", reversesEventId: "e4" }], base)).toThrow(/already reversed/);
    expect(() => PortfolioBook.replay([{ id: "r1", date: "2025-03-02", type: "reversal", reversesEventId: "nope" }], base)).toThrow(/unknown event/);
  });

  it("is deterministic", () => {
    const a = PortfolioBook.replay(tradeFixture, base);
    const b = PortfolioBook.replay(tradeFixture, base);
    expect(JSON.stringify(a.positions())).toBe(JSON.stringify(b.positions()));
  });
});

describe("base-currency cost basis", () => {
  const fx = new FxTable([
    { base: "USD", quote: "NGN", rate: d(1500), observedOn: "2025-01-02" },
    { base: "USD", quote: "NGN", rate: d(1600), observedOn: "2025-06-02" },
  ]);
  const usdEvents: LedgerEvent[] = [
    { id: "d", date: "2025-01-02", type: "deposit", accountId: "A", currency: "USD", amount: d(1000) },
    { id: "b", date: "2025-01-02", type: "buy", accountId: "A", instrumentId: "ETF", quantity: d(10), price: d(100), fees: d(0), currency: "USD" },
    { id: "s", date: "2025-06-02", type: "sell", accountId: "A", instrumentId: "ETF", quantity: d(10), price: d(110), fees: d(0), currency: "USD" },
  ];

  it("uses acquisition-date FX for cost and disposal-date FX for proceeds", () => {
    const book = PortfolioBook.replay(usdEvents, { ...base, fx });
    // Local gain 100 USD. Base: 1100 × 1600 − 1000 × 1500 = 260,000 NGN (incl. FX effect).
    expect(book.realized[0]!.gain.toFixed()).toBe("100");
    expect(book.realized[0]!.gainBase!.toFixed()).toBe("260000");
  });

  it("reports base gain as unknown when a historical rate is missing", () => {
    const sparse = new FxTable([{ base: "USD", quote: "NGN", rate: d(1600), observedOn: "2025-06-02" }]);
    const book = PortfolioBook.replay(usdEvents, { ...base, fx: sparse });
    expect(book.realized[0]!.gainBase).toBeNull();
    expect(book.warnings.map((w) => w.code)).toContain("MISSING_FX_FOR_COST_BASIS");
  });
});
