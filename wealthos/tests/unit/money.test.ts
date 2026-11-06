import { describe, expect, it } from "vitest";
import { Money, CurrencyMismatchError, d, roundToCurrency, addMonths, daysBetween, yearFraction, isISODate, monthEndsBetween } from "@/engine";

describe("decimal money", () => {
  it("adds without binary floating-point error", () => {
    expect(new Money("0.1", "NGN").plus(new Money("0.2", "NGN")).amount.toFixed()).toBe("0.3");
  });

  it("refuses to mix currencies", () => {
    expect(() => new Money(1, "NGN").plus(new Money(1, "USD"))).toThrow(CurrencyMismatchError);
  });

  it("rounds half-to-even at the currency's minor units", () => {
    expect(roundToCurrency(d("2.345"), "NGN").toFixed(2)).toBe("2.34");
    expect(roundToCurrency(d("2.355"), "NGN").toFixed(2)).toBe("2.36");
    expect(roundToCurrency(d("1234.5"), "JPY").toFixed(0)).toBe("1234");
  });

  it("rejects invalid currency codes", () => {
    expect(() => new Money(1, "naira")).toThrow(RangeError);
  });

  it("keeps full precision until presentation", () => {
    const third = new Money(d(1).div(3), "NGN");
    // 40 significant digits internally; rounding happens only at presentation.
    expect(third.times(3).amount.toFixed()).toBe("0.9999999999999999999999999999999999999999");
    expect(third.times(3).rounded().amount.toFixed(2)).toBe("1.00");
    expect(third.toString()).toBe("0.33 NGN");
  });
});

describe("dates", () => {
  it("validates ISO dates strictly", () => {
    expect(isISODate("2024-02-29")).toBe(true);
    expect(isISODate("2023-02-29")).toBe(false);
    expect(isISODate("2024-2-1")).toBe(false);
  });

  it("clamps month arithmetic to month end", () => {
    expect(addMonths("2024-01-31", 1)).toBe("2024-02-29");
    expect(addMonths("2025-01-31", 1)).toBe("2025-02-28");
    expect(addMonths("2025-03-31", -6)).toBe("2024-09-30");
  });

  it("counts actual days and year fractions", () => {
    expect(daysBetween("2024-01-01", "2025-01-01")).toBe(366);
    expect(yearFraction("2025-01-01", "2025-07-01", "ACT/365")).toBeCloseTo(181 / 365, 12);
    expect(yearFraction("2024-07-01", "2025-07-01", "ACT/ACT")).toBeCloseTo(184 / 366 + 181 / 365, 12);
  });

  it("lists month ends and the end date", () => {
    expect(monthEndsBetween("2025-01-15", "2025-03-10")).toEqual(["2025-01-31", "2025-02-28", "2025-03-10"]);
  });
});
