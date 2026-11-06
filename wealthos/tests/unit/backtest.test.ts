import { describe, expect, it } from "vitest";
import { d, runBacktest, type Decimal } from "@/engine";

const L = (xs: number[]): Decimal[] => xs.map((x) => d(x));
function months(start: string, n: number): string[] {
  const [y, m] = start.split("-").map(Number) as [number, number];
  return Array.from({ length: n }, (_, i) => {
    const t = y * 12 + (m - 1) + i;
    return `${Math.floor(t / 12)}-${String((t % 12) + 1).padStart(2, "0")}`;
  });
}

describe("runBacktest", () => {
  it("lets a buy-and-hold mix drift (hand-checked)", () => {
    // A doubles over the year, B is flat; 50/50 of 1,000 → 500×2 + 500 = 1,500.
    const r = runBacktest({ months: months("2020-12", 13), levels: [L([1, ...Array(11).fill(1.5), 2]), L(Array(13).fill(1))], weights: [d("0.5"), d("0.5")], initial: d(1000), contribution: d(0), rebalance: "none" });
    expect(r.finalValue.toString()).toBe("1500");
    expect(r.twrCumulative.toString()).toBe("0.5");
    expect(r.twrAnnualized.toString()).toBe("0.5");
    expect(r.endWeights.map((w) => w.toFixed(4))).toEqual(["0.6667", "0.3333"]);
    expect(r.rebalances).toBe(0);
    expect(r.calendar).toEqual([{ year: 2021, value: d("0.5"), partial: false }]);
  });

  it("rebalancing captures the swings of a volatile asset (hand-checked)", () => {
    // A alternates +100% / −50%; B is flat. Without rebalancing the mix ends where it started;
    // rebalanced monthly each up/down pair multiplies by 1.5 × 0.75 = 1.125 → 1,000 × 1.125² = 1,265.625.
    const base = { months: months("2021-01", 5), levels: [L([1, 2, 1, 2, 1]), L([1, 1, 1, 1, 1])], weights: [d("0.5"), d("0.5")], initial: d(1000), contribution: d(0) };
    expect(runBacktest({ ...base, rebalance: "none" }).finalValue.toString()).toBe("1000");
    const monthly = runBacktest({ ...base, rebalance: "monthly" });
    expect(monthly.finalValue.toString()).toBe("1265.625");
    expect(monthly.rebalances).toBe(3); // never on the final month
    expect(monthly.maxDrawdown.toString()).toBe("-0.25");
  });

  it("separates the mix's return from the investor's cash flows", () => {
    // Flat asset with 100 a month: no growth, value = money in, both returns ≈ 0.
    const flat = runBacktest({ months: months("2020-01", 13), levels: [L(Array(13).fill(7))], weights: [d(1)], initial: d(1000), contribution: d(100), rebalance: "none" });
    expect(flat.finalValue.toString()).toBe("2200");
    expect(flat.totalInvested.toString()).toBe("2200");
    expect(flat.twrCumulative.toString()).toBe("0");
    expect(flat.moneyWeighted!).toBeCloseTo(0, 6);
    // 1% a month: the time-weighted return ignores contributions; every pound earns the same, so XIRR agrees.
    const grow = runBacktest({ months: months("2020-01", 25), levels: [L(Array.from({ length: 25 }, (_, i) => 1.01 ** i))], weights: [d(1)], initial: d(1000), contribution: d(250), rebalance: "none" });
    expect(grow.twrAnnualized.toNumber()).toBeCloseTo(1.01 ** 12 - 1, 8);
    expect(grow.moneyWeighted!).toBeCloseTo(1.01 ** 12 - 1, 2);
    expect(grow.totalInvested.toString()).toBe(String(1000 + 24 * 250));
  });

  it("rebalances on the schedule counted from the start month", () => {
    const base = { months: months("2020-03", 25), levels: [L(Array.from({ length: 25 }, (_, i) => 1 + i / 10)), L(Array(25).fill(1))], weights: [d("0.6"), d("0.4")], initial: d(100), contribution: d(0) };
    expect(runBacktest({ ...base, rebalance: "annually" }).rebalances).toBe(1); // month 12 only (24 is the last)
    expect(runBacktest({ ...base, rebalance: "quarterly" }).rebalances).toBe(7);
  });

  it("reports skipped months and partial years instead of filling them", () => {
    const ms = ["2020-10", "2020-11", "2020-12", "2021-02", "2021-03"];
    const r = runBacktest({ months: ms, levels: [L([1, 1, 1, 1, 1.1])], weights: [d(1)], initial: d(100), contribution: d(0), rebalance: "none" });
    expect(r.skippedMonths).toBe(1);
    expect(r.calendar.map((c) => [c.year, c.partial])).toEqual([[2020, true], [2021, true]]);
  });

  it("rejects inconsistent inputs", () => {
    const ms = months("2020-01", 3);
    expect(() => runBacktest({ months: ms, levels: [L([1, 1, 1])], weights: [d("0.9")], initial: d(1), contribution: d(0), rebalance: "none" })).toThrow(/sum to 1/);
    expect(() => runBacktest({ months: ms, levels: [L([1, 0, 1])], weights: [d(1)], initial: d(1), contribution: d(0), rebalance: "none" })).toThrow(/positive/);
    expect(() => runBacktest({ months: ms, levels: [L([1, 1, 1])], weights: [d(1)], initial: d(0), contribution: d(0), rebalance: "none" })).toThrow(/invest/);
  });
});
