import { describe, expect, it } from "vitest";
import { calendarYearReturns, convertSeries, d, deflate, growthOf, monthEndPoints, monthlyReturns, riskSummary, totalReturnIndex, trailingWindowReturns, yearOnYear, type ObservedValue } from "@/engine";

const pts = (rows: Array<[string, string]>): ObservedValue[] => rows.map(([date, v]) => ({ date, value: d(v) }));
const s = (x: { toFixed(n: number): string } | null | undefined, dp = 6) => (x == null ? null : x.toFixed(dp));

describe("total-return index", () => {
  it("reinvests a dividend at the ex-date close", () => {
    // 100 → 110 with a 5 dividend going ex on day 2: (110 + 5) / 100 = 1.15
    const r = totalReturnIndex(pts([["2024-01-01", "100"], ["2024-01-02", "110"]]), [{ kind: "cash_dividend", exDate: "2024-01-02", amount: d(5) }]);
    expect(s(r.points[1]!.value)).toBe("115.000000");
    expect(r.dividendsApplied).toBe(1);
  });
  it("applies a split so the price halving is not a loss", () => {
    const r = totalReturnIndex(pts([["2024-01-01", "100"], ["2024-01-03", "51"]]), [{ kind: "split", exDate: "2024-01-02", ratio: d(2) }]);
    expect(s(r.points[1]!.value)).toBe("102.000000");
    expect(r.splitsApplied).toBe(1);
  });
  it("ignores actions before the first price instead of guessing", () => {
    const r = totalReturnIndex(pts([["2024-02-01", "10"], ["2024-02-02", "10"]]), [{ kind: "cash_dividend", exDate: "2024-01-15", amount: d(1) }]);
    expect(r.ignored).toBe(1);
    expect(s(r.points[1]!.value)).toBe("100.000000");
  });
});

describe("currency conversion", () => {
  it("uses only same-date FX and drops dates without one", () => {
    const r = convertSeries(pts([["2024-01-01", "100"], ["2024-01-02", "100"], ["2024-01-03", "100"]]), pts([["2024-01-01", "1500"], ["2024-01-03", "1600"]]));
    expect(r.points.map((p) => [p.date, p.value.toString()])).toEqual([["2024-01-01", "150000"], ["2024-01-03", "160000"]]);
    expect(r.dropped).toBe(1);
  });
});

describe("month-end points and returns", () => {
  const series = pts([
    ["2021-12-31", "100"], ["2022-06-30", "90"], ["2022-12-30", "120"], ["2023-12-29", "150"], ["2024-03-15", "165"],
  ]);
  const months = monthEndPoints(series);

  it("keeps the last observation of a month only if it is near the month end, except the latest", () => {
    expect([...months.keys()]).toEqual(["2021-12", "2022-06", "2022-12", "2023-12", "2024-03"]);
    const stale = monthEndPoints(pts([["2024-01-10", "1"], ["2024-02-29", "1"]]));
    expect([...stale.keys()]).toEqual(["2024-02"]);
  });

  it("calendar-year returns, with the current year as year to date", () => {
    const y = calendarYearReturns(months, 2021, 2024);
    expect(y.map((r) => [r.year, s(r.value, 4), r.ytd])).toEqual([[2021, null, false], [2022, "0.2000", false], [2023, "0.2500", false], [2024, "0.1000", true]]);
  });

  it("trailing returns need a point exactly N months back", () => {
    const m = monthEndPoints(pts([["2021-03-31", "100"], ["2023-03-31", "121"], ["2024-03-29", "133.1"]]));
    const t = Object.fromEntries(trailingWindowReturns(m).map((w) => [w.key, w]));
    expect(s(t["1Y"]!.annualized, 4)).toBe("0.1000");
    expect(s(t["3Y"]!.cumulative, 4)).toBe("0.3310");
    expect(s(t["3Y"]!.annualized, 4)).toBe("0.1000");
    expect(t["5Y"]!.annualized).toBeNull();
  });

  it("monthly returns skip gaps rather than spanning them", () => {
    const m = monthEndPoints(pts([["2024-01-31", "100"], ["2024-02-29", "110"], ["2024-04-30", "121"]]));
    expect(monthlyReturns(m).map((r) => [r.month, s(r.value, 2)])).toEqual([["2024-02", "0.10"]]);
  });
});

describe("inflation, growth and risk", () => {
  it("deflates by CPI relative to the first month", () => {
    const m = monthEndPoints(pts([["2023-12-29", "100"], ["2024-12-31", "120"]]));
    const real = deflate(m, new Map([["2023-12", d(200)], ["2024-12", d(240)]]));
    expect(s(real.get("2024-12")!.value, 2)).toBe("100.00");
  });
  it("year-on-year inflation from a monthly index", () => {
    const cpi = new Map([["2023-06", d(100)], ["2024-06", d(133.95)], ["2024-07", d(140)]]);
    expect(yearOnYear(cpi).map((r) => [r.month, s(r.value, 4)])).toEqual([["2024-06", "0.3395"]]);
  });
  it("growth of an amount and drawdown dates", () => {
    const series = pts([["2024-01-31", "100"], ["2024-02-29", "80"], ["2024-03-29", "60"], ["2024-04-30", "120"]]);
    const m = monthEndPoints(series);
    expect(growthOf(m, "2024-01", d(1000000)).map((g) => s(g.value, 0))).toEqual(["1000000", "800000", "600000", "1200000"]);
    const r = riskSummary(series, m);
    expect(s(r.maxDrawdown, 2)).toBe("-0.40");
    expect([r.drawdownPeak, r.drawdownTrough, r.drawdownRecovered]).toEqual(["2024-01-31", "2024-03-29", "2024-04-30"]);
    expect(r.volatility3y).toBeNull(); // fewer than 24 months
  });
});

describe("rolled T-bill index from auctions", () => {
  it("buys at auction, holds to maturity at amortised cost, then rolls at the next auction", async () => {
    const { rolledBillIndex, inflationFromYoY } = await import("@/engine");
    // 91-day bill at 10% discount: price 1 − 0.10 × 91/365 = 0.975068…; value at maturity 100 / price.
    const idx = rolledBillIndex(
      [
        { date: "2024-01-04", discountRate: d("0.10"), tenorDays: 91, maturity: "2024-04-04" },
        { date: "2024-02-01", discountRate: d("0.20"), tenorDays: 91, maturity: "2024-05-02" }, // ignored: still holding
        { date: "2024-04-11", discountRate: d("0.12"), tenorDays: 91, maturity: "2024-07-11" },
      ],
      "2024-05-31",
    );
    const at = (dt: string) => idx.find((p) => p.date === dt)?.value.toFixed(4);
    const matured = d(100).div(d(1).minus(d("0.10").times(91).div(365)));
    expect(at("2024-04-04")).toBe(matured.toFixed(4));
    expect(at("2024-04-11")).toBe(matured.toFixed(4)); // cash waited a week at zero
    expect(at("2024-04-30")).toBe(matured.div(d(1).minus(d("0.12").times(91).div(365))).times(d(1).minus(d("0.12").times(72).div(365))).toFixed(4));
    expect(idx.some((p) => p.date === "2024-02-01")).toBe(false);
    // Inflation chained from year-on-year rates: 10% then 20% → 32% over two years.
    const yoy = new Map([["2024-12", d("0.20")], ["2023-12", d("0.10")]]);
    expect(inflationFromYoY(yoy, "2024-12", 2)?.toFixed(4)).toBe("0.3200");
    expect(inflationFromYoY(yoy, "2024-12", 3)).toBeNull();
  });
});
