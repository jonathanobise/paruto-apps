import { describe, expect, it } from "vitest";
import {
  d,
  project,
  projectScenarios,
  requiredContribution,
  purchasingPower,
  feeDrag,
  applyShock,
  discountPrice,
  discountToTrueYield,
  simpleToEffectiveAnnual,
  nominalToEffective,
  bondCashFlows,
  fixedDepositCashFlows,
  assertComparable,
  IncomparableRatesError,
  allocate,
  concentration,
  allocationDrift,
  maxDrawdown,
  stdev,
  sharpeRatio,
  type ProjectionAssumptions,
} from "@/engine";

const plan: ProjectionAssumptions = {
  startingBalance: d(0),
  contributionPerPeriod: d(100),
  contributionGrowthAnnual: d(0),
  annualReturn: d("0.1"),
  annualFee: d(0),
  annualInflation: d(0),
  periodsPerYear: 1,
  years: 3,
  timing: "end",
  taxesModelled: false,
};

describe("projections", () => {
  it("matches the ordinary annuity future value (331) and annuity due (364.1)", () => {
    expect(project(plan).finalNominal.toFixed()).toBe("331");
    expect(project({ ...plan, timing: "beginning" }).finalNominal.toFixed()).toBe("364.1");
  });

  it("deflates to today's money", () => {
    const r = project({ ...plan, startingBalance: d(1000), contributionPerPeriod: d(0), years: 2, annualInflation: d("0.1") });
    expect(r.finalNominal.toFixed()).toBe("1210");
    expect(r.finalReal.toFixed()).toBe("1000");
  });

  it("always states assumptions and that outcomes are not guaranteed", () => {
    const r = project(plan);
    expect(r.disclosures.join(" ")).toMatch(/not guaranteed/);
    expect(r.disclosures.join(" ")).toMatch(/end of each/);
    expect(r.disclosures.join(" ")).toMatch(/Taxes are not modelled/);
  });

  it("refuses to present a single scenario on its own", () => {
    expect(() => projectScenarios(plan, [{ label: "Base", annualReturn: d("0.1") }])).toThrow(RangeError);
    expect(projectScenarios(plan, [{ label: "Low", annualReturn: d("0.05") }, { label: "High", annualReturn: d("0.15") }])).toHaveLength(2);
  });

  it("solves the required contribution consistently with the projection (with fees, monthly, both timings)", () => {
    for (const timing of ["end", "beginning"] as const) {
      const a = { startingBalance: d(1_000_000), annualReturn: d("0.12"), annualFee: d("0.01"), annualInflation: d("0.2"), periodsPerYear: 12 as const, years: 5, timing, taxesModelled: false as const };
      const c = requiredContribution(d(10_000_000), a);
      const check = project({ ...a, contributionPerPeriod: c, contributionGrowthAnnual: d(0) });
      expect(check.finalNominal.minus(10_000_000).abs().lt("0.000001")).toBe(true);
    }
  });

  it("computes purchasing power and fee drag", () => {
    expect(purchasingPower(d(1000), d("0.25"), 2).toFixed()).toBe("640");
    const drag = feeDrag({ ...plan, startingBalance: d(1000), contributionPerPeriod: d(0), annualFee: d("0.02"), years: 10 });
    expect(drag.drag.gt(0)).toBe(true);
    expect(drag.withoutFee.toFixed(6)).toBe("2593.742460");
  });

  it("applies documented stress shocks", () => {
    const r = applyShock({ equity: d(600), bills: d(400) }, { equity: d("-0.3") });
    expect(r.after.toFixed()).toBe("820");
    expect(r.change.toFixed()).toBe("-180");
  });
});

describe("fixed income", () => {
  // Reference values computed with Python decimal (prec 40).
  it("prices a 364-day bill at an 18% discount rate and converts to true yield", () => {
    expect(discountPrice(d(100), d("0.18"), 364).toDecimalPlaces(10).toFixed()).toBe("82.0493150685");
    expect(discountToTrueYield(d("0.18"), 364).toDecimalPlaces(10).toFixed()).toBe("0.2193802591");
    expect(simpleToEffectiveAnnual(discountToTrueYield(d("0.18"), 364), 364).toDecimalPlaces(10).toFixed()).toBe("0.2194418565");
  });

  it("converts nominal to effective rates", () => {
    expect(nominalToEffective(d("0.12"), 12).toDecimalPlaces(10).toFixed()).toBe("0.1268250301");
  });

  it("refuses to compare different yield methodologies", () => {
    expect(() => assertComparable({ value: d("0.18"), methodology: "discount_rate", asOf: "2025-01-01" }, { value: d("0.2"), methodology: "money_market_yield", asOf: "2025-01-01" })).toThrow(IncomparableRatesError);
  });

  it("builds semi-annual bond cash flows", () => {
    const flows = bondCashFlows(d(1_000_000), d("0.15"), "2027-03-15", 2, "2026-01-01");
    expect(flows.map((f) => f.date)).toEqual(["2026-03-15", "2026-09-15", "2027-03-15", "2027-03-15"]);
    expect(flows[0]!.amount.toFixed()).toBe("75000");
    expect(flows[3]!.kind).toBe("principal");
  });

  it("builds fixed-deposit maturity cash flows net of withholding tax", () => {
    const [interest, principal] = fixedDepositCashFlows(d(1_000_000), d("0.2"), "2025-01-01", "2025-04-01", "ACT/365", d("0.1"));
    // 1,000,000 × 0.2 × 90/365 = 49,315.068493…; net of 10% WHT = 44,383.561643…
    expect(interest!.amount.toDecimalPlaces(6).toFixed()).toBe("44383.561644");
    expect(principal!.amount.toFixed()).toBe("1000000");
  });
});

describe("allocation and risk", () => {
  const items = [
    { key: "a", label: "A", value: d(500) },
    { key: "b", label: "B", value: d(300) },
    { key: "c", label: "C", value: d(200) },
  ];

  it("computes weights and concentration", () => {
    const { slices } = allocate(items);
    expect(slices.map((s) => s.weight.toFixed())).toEqual(["0.5", "0.3", "0.2"]);
    const c = concentration(items, d("0.4"));
    expect(c.hhi.toFixed()).toBe("0.38");
    expect(c.effectiveHoldings!.toDecimalPlaces(4).toFixed()).toBe("2.6316");
    expect(c.breaches.map((b) => b.key)).toEqual(["a"]);
  });

  it("reports drift against a user target without trade instructions", () => {
    const r = allocationDrift(items, { a: { label: "A", weight: d("0.4") }, b: { label: "B", weight: d("0.4") }, c: { label: "C", weight: d("0.2") } });
    const a = r.rows.find((x) => x.key === "a")!;
    expect(a.drift.toFixed()).toBe("0.1");
    expect(a.valueGap.toFixed()).toBe("100");
    expect(Object.keys(a)).not.toContain("action");
  });

  it("finds the maximum drawdown and recovery", () => {
    const dd = maxDrawdown([100, 120, 90, 130].map((x) => d(x)));
    expect(dd.maxDrawdown.toFixed()).toBe("-0.25");
    expect([dd.peakIndex, dd.troughIndex, dd.recoveryIndex]).toEqual([1, 2, 3]);
  });

  it("computes volatility and Sharpe with explicit assumptions (Python statistics reference)", () => {
    const r = [0.02, -0.01, 0.03, 0.015, -0.005, 0.01].map((x) => d(x));
    expect(stdev(r)!.toNumber()).toBeCloseTo(0.0151657508881031, 12);
    const s = sharpeRatio(r, { periodsPerYear: 12, riskFreeRate: d("0.05"), riskFreeLabel: "Test 5%" });
    expect(s.annualizedVolatility!.toNumber()).toBeCloseTo(0.05253570214625478, 12);
    expect(s.annualizedReturn.toNumber()).toBeCloseTo(0.12555358526194937, 12);
    expect(s.sharpe!.toNumber()).toBeCloseTo(1.4381379171751587, 10);
    expect(s.assumptions.riskFreeLabel).toBe("Test 5%");
  });
});
