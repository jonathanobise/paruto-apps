import { describe, expect, it } from "vitest";
import { STRESS_SCENARIOS, d, project, requiredContribution, runStress, type StressExposure } from "@/engine";

const exposures: StressExposure[] = [
  { key: "ngx", label: "NGX shares", kind: "asset", value: d(1_000_000), assetClass: "equity", currency: "NGN", country: "NG" },
  { key: "vt", label: "Global ETF", kind: "asset", value: d(2_000_000), assetClass: "etf", currency: "USD", country: "GLOBAL" },
  { key: "tb", label: "T-bills", kind: "asset", value: d(1_000_000), assetClass: "treasury_bill", currency: "NGN", country: "NG" },
  { key: "loan", label: "USD loan", kind: "liability", value: d(700_000), assetClass: "other", currency: "USD", country: "US" },
];
const byId = (id: string) => STRESS_SCENARIOS.find((s) => s.id === id)!;

describe("stress scenarios", () => {
  it("revalues foreign assets and liabilities exactly for a currency shock (NGN base)", () => {
    const r = runStress(exposures, byId("ngn-30"), "NGN");
    // USD items × 1/0.7: ETF 2,857,142.857…; loan 1,000,000 → net worth 3,300,000 → 1,000,000+2,857,142.857+1,000,000−1,000,000
    expect(r.netWorthBefore.toFixed()).toBe("3300000");
    expect(r.netWorthAfter.toDecimalPlaces(2).toFixed(2)).toBe("3857142.86");
    expect(r.rows.find((x) => x.key === "loan")!.after.toFixed()).toBe("1000000");
  });

  it("is consistent when viewed from a USD base", () => {
    const usd = exposures.map((e) => ({ ...e, value: e.value.div(1500) }));
    const r = runStress(usd, byId("ngn-30"), "USD");
    expect(r.rows.find((x) => x.key === "ngx")!.after.toDecimalPlaces(6).toFixed()).toBe(d(1_000_000).div(1500).times("0.7").toDecimalPlaces(6).toFixed());
    expect(r.rows.find((x) => x.key === "vt")!.change.toFixed()).toBe("0");
  });

  it("applies the first matching asset rule, then the currency shock", () => {
    const r = runStress(exposures, byId("combined"), "NGN");
    expect(r.rows.find((x) => x.key === "ngx")!.after.toFixed()).toBe("700000");
    // ETF −20% then × 1/0.7
    expect(r.rows.find((x) => x.key === "vt")!.after.toDecimalPlaces(2).toFixed(2)).toBe("2285714.29");
    expect(r.rows.find((x) => x.key === "tb")!.change.toFixed()).toBe("0");
  });

  it("documents every scenario", () => {
    for (const s of STRESS_SCENARIOS) {
      expect(s.description.length).toBeGreaterThan(20);
      expect(s.rules.length > 0 || s.currencyShock).toBeTruthy();
    }
  });
});

describe("projections to a target date", () => {
  const base = { startingBalance: d(0), contributionPerPeriod: d(100), contributionGrowthAnnual: d(0), annualReturn: d(0), annualFee: d(0), annualInflation: d(0), periodsPerYear: 12 as const, years: 0, timing: "end" as const, taxesModelled: false as const };

  it("runs a partial-year horizon and records the final fractional point", () => {
    const r = project({ ...base, horizonPeriods: 18 });
    expect(r.finalNominal.toFixed()).toBe("1800");
    expect(r.path.map((p) => p.year)).toEqual([0, 1, 1.5]);
  });

  it("applies contribution growth at year boundaries only", () => {
    const r = project({ ...base, horizonPeriods: 24, contributionGrowthAnnual: d("0.1") });
    expect(r.finalNominal.toFixed()).toBe("2520"); // 12 × 100 + 12 × 110
  });

  it("solves the contribution for a month horizon", () => {
    const a = { startingBalance: d(500_000), annualReturn: d("0.15"), annualFee: d("0.01"), annualInflation: d("0.2"), periodsPerYear: 12 as const, years: 0, horizonPeriods: 30, timing: "end" as const, taxesModelled: false as const };
    const c = requiredContribution(d(5_000_000), a);
    expect(project({ ...a, contributionPerPeriod: c, contributionGrowthAnnual: d(0) }).finalNominal.minus(5_000_000).abs().lt("0.000001")).toBe(true);
  });
});
