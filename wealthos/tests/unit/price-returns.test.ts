import { describe, expect, it } from "vitest";
import { d, trailingReturns, weeklySeries } from "@/engine";

const series = [
  ["2023-10-31", "80"],
  ["2025-10-31", "100"],
  ["2026-07-31", "110"],
  ["2026-09-30", "120"],
  ["2026-10-30", "125"],
].map(([date, p]) => ({ date: date!, price: d(p!) }));

describe("trailing price returns", () => {
  const r = Object.fromEntries(trailingReturns(series, "2026-10-31").map((x) => [x.key, x]));

  it("uses the last observation on or before each window end", () => {
    // 1M: 2026-09-30 (120) → 2026-10-30 (125)
    expect(r["1M"]!.cumulative!.toDecimalPlaces(10).toFixed()).toBe("0.0416666667");
    // 1Y: 2025-10-31 (100) → 125
    expect(r["1Y"]!.cumulative!.toFixed()).toBe("0.25");
    expect(r["1Y"]!.annualized!.toDecimalPlaces(10).toFixed()).toBe("0.25");
    // 3Y: 2023-10-31 (80) → 125: (1.5625)^(1/3) − 1 (1,096 days)
    expect(r["3Y"]!.cumulative!.toFixed()).toBe("0.5625");
    expect(r["3Y"]!.annualized!.toNumber()).toBeCloseTo(Math.pow(1.5625, 365 / 1096) - 1, 12);
  });

  it("returns null instead of reaching for a distant price", () => {
    // 3M window starts 2026-07-31 → observation exists; 6M starts 2026-04-30 → nearest earlier is 2025-10-31 (too old).
    expect(r["3M"]!.cumulative!.toDecimalPlaces(10).toFixed()).toBe("0.1363636364");
    expect(r["6M"]!.cumulative).toBeNull();
    expect(r["5Y"]!.cumulative).toBeNull();
  });

  it("down-samples to one point per week", () => {
    const daily = Array.from({ length: 14 }, (_, i) => ({ date: `2026-10-${String(i + 12).padStart(2, "0")}`, price: d(i) }));
    const w = weeklySeries(daily);
    expect(w.map((p) => p.date)).toEqual(["2026-10-18", "2026-10-25"]);
  });
});
