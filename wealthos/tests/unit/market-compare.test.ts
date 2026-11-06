import { describe, expect, it } from "vitest";
import { commonWindow, d, parsePercentInput, type ObservedValue } from "@/engine";

/** Month-end series from a start month and a list of values. */
function series(start: string, values: number[]): Map<string, ObservedValue> {
  const [y, m] = start.split("-").map(Number) as [number, number];
  return new Map(values.map((v, i) => {
    const t = y * 12 + (m - 1) + i;
    const key = `${Math.floor(t / 12)}-${String((t % 12) + 1).padStart(2, "0")}`;
    const lastDay = new Date(Date.UTC(Math.floor(t / 12), (t % 12) + 1, 0)).toISOString().slice(0, 10);
    return [key, { date: lastDay, value: d(v) }];
  }));
}

describe("commonWindow", () => {
  it("rebases every series to 100 at the latest shared start and stops at the earliest shared end", () => {
    // A: 2019-12 … 2022-12 growing 1% a month; B: 2020-12 … 2023-06 flat then halving.
    const a = series("2019-12", Array.from({ length: 37 }, (_, i) => 100 * 1.01 ** i));
    const b = series("2020-12", [...Array.from({ length: 12 }, () => 50), ...Array.from({ length: 19 }, () => 25)]);
    const w = commonWindow([a, b])!;
    expect(w.startMonth).toBe("2020-12");
    expect(w.endMonth).toBe("2022-12");
    expect(w.months).toHaveLength(25);
    expect(w.rebased[0]![0]!.toNumber()).toBe(100);
    expect(w.rebased[1]![0]!.toNumber()).toBe(100);
    // A over 24 months: 1.01^24 − 1 = 26.97%; annualised ≈ 1.01^12 − 1 = 12.68%.
    expect(w.stats[0]!.cumulative.toFixed(4)).toBe("0.2697");
    expect(w.stats[0]!.annualized.toNumber()).toBeCloseTo(0.1268, 2);
    expect(w.stats[0]!.maxDrawdown.toNumber()).toBe(0);
    expect(w.stats[1]!.cumulative.toNumber()).toBe(-0.5);
    expect(w.stats[1]!.maxDrawdown.toNumber()).toBe(-0.5);
  });

  it("leaves out months missing from any series instead of filling them", () => {
    const a = series("2020-01", Array.from({ length: 30 }, (_, i) => 100 + i));
    const b = series("2020-01", Array.from({ length: 30 }, (_, i) => 200 + i));
    b.delete("2021-03");
    const w = commonWindow([a, b])!;
    expect(w.months).not.toContain("2021-03");
    expect(w.months).toHaveLength(29);
  });

  it("needs at least a year of shared history", () => {
    expect(commonWindow([series("2020-01", [1, 2, 3]), series("2020-01", [1, 2, 3])])).toBeNull();
    expect(commonWindow([series("2020-01", Array(24).fill(1)), series("2022-01", Array(24).fill(1))])).toBeNull();
    expect(commonWindow([series("2020-01", Array(24).fill(1))])).toBeNull();
  });
});

describe("parsePercentInput", () => {
  it("reads typed percentages and rejects anything else", () => {
    expect(parsePercentInput("12.5")!.toString()).toBe("0.125");
    expect(parsePercentInput("-3%")!.toString()).toBe("-0.03");
    expect(parsePercentInput("−4")!.toString()).toBe("-0.04");
    expect(parsePercentInput("")).toBeNull();
    expect(parsePercentInput("ten")).toBeNull();
    expect(parsePercentInput("1e9")).toBeNull();
  });
});
