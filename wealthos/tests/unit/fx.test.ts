import { describe, expect, it } from "vitest";
import { FxTable, MissingFxRateError, d } from "@/engine";

const table = new FxTable(
  [
    { base: "USD", quote: "NGN", rate: d("1500"), observedOn: "2025-01-01" },
    { base: "USD", quote: "NGN", rate: d("1520"), observedOn: "2025-01-03" },
    { base: "USD", quote: "NGN", rate: d("1650"), observedOn: "2025-06-30" },
    { base: "GBP", quote: "USD", rate: d("1.25"), observedOn: "2025-01-03" },
  ],
  { maxAgeDays: 5 },
);

describe("FX policy", () => {
  it("uses the latest rate on or before the date", () => {
    expect(table.quote("USD", "NGN", "2025-01-02").rate.toFixed()).toBe("1500");
    expect(table.quote("USD", "NGN", "2025-01-04").rate.toFixed()).toBe("1520");
  });

  it("never uses a later (e.g. today's) rate for an earlier date", () => {
    expect(() => table.quote("USD", "NGN", "2024-12-31")).toThrow(MissingFxRateError);
  });

  it("refuses rates older than the allowed window instead of substituting", () => {
    // 2025-03-01 is far from any observation; the June rate must not be used.
    expect(() => table.quote("USD", "NGN", "2025-03-01")).toThrow(MissingFxRateError);
  });

  it("inverts pairs exactly", () => {
    const q = table.quote("NGN", "USD", "2025-01-03");
    expect(q.method).toBe("inverse");
    expect(q.rate.times(1520).toDecimalPlaces(20).toFixed()).toBe("1");
  });

  it("triangulates through USD and says so", () => {
    const q = table.quote("GBP", "NGN", "2025-01-03");
    expect(q.method).toBe("triangulated");
    expect(q.rate.toFixed()).toBe("1900");
  });

  it("returns identity for the same currency", () => {
    expect(table.quote("NGN", "NGN", "1999-01-01").rate.toFixed()).toBe("1");
  });

  it("rejects non-positive rates", () => {
    expect(() => new FxTable([{ base: "USD", quote: "NGN", rate: d(0), observedOn: "2025-01-01" }])).toThrow(RangeError);
  });
});
