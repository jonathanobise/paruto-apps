/**
 * Deterministic projections for goals and hypothetical scenarios. Every result carries its
 * assumptions; projections are illustrations, not forecasts (see docs/FINANCIAL_ENGINE.md).
 */
import { Decimal, ZERO, d } from "./decimal";

export type ContributionTiming = "beginning" | "end";

export interface ProjectionAssumptions {
  startingBalance: Decimal;
  /** Contribution made every period. */
  contributionPerPeriod: Decimal;
  /** Annual growth rate in contributions (e.g. salary growth), decimal. */
  contributionGrowthAnnual: Decimal;
  /** Nominal annual return assumption, decimal. Hypothetical. */
  annualReturn: Decimal;
  /** Annual fee charged on assets, decimal (e.g. 0.01). Deducted from the return. */
  annualFee: Decimal;
  /** Annual inflation assumption used for real (today's money) values. */
  annualInflation: Decimal;
  periodsPerYear: 1 | 4 | 12;
  years: number;
  /** Total number of periods; overrides years × periodsPerYear (e.g. 30 months to a target date). */
  horizonPeriods?: number;
  timing: ContributionTiming;
  /** Taxes are not modelled unless stated; recorded so it is always disclosed. */
  taxesModelled: false;
}

export interface ProjectionYear {
  /** Years from the start; the final point may be a fraction of a year. */
  year: number;
  nominal: Decimal;
  real: Decimal;
  contributed: Decimal;
  growth: Decimal;
  fees: Decimal;
}

export interface ProjectionResult {
  assumptions: ProjectionAssumptions;
  path: ProjectionYear[];
  finalNominal: Decimal;
  finalReal: Decimal;
  totalContributed: Decimal;
  totalFees: Decimal;
  disclosures: string[];
}

/** Effective per-period rate equivalent to an annual effective rate. */
export function periodRate(annual: Decimal, periodsPerYear: number): Decimal {
  return annual.plus(1).pow(d(1).div(periodsPerYear)).minus(1);
}

export function project(a: ProjectionAssumptions): ProjectionResult {
  if (a.years < 0 || !Number.isInteger(a.years)) throw new RangeError("years must be a non-negative integer");
  if (a.horizonPeriods !== undefined && (a.horizonPeriods < 0 || !Number.isInteger(a.horizonPeriods))) throw new RangeError("horizonPeriods must be a non-negative integer");
  const n = a.periodsPerYear;
  const total = a.horizonPeriods ?? a.years * n;
  const gross = periodRate(a.annualReturn, n);
  const feeRate = periodRate(a.annualFee, n);
  let balance = a.startingBalance;
  let contributed = a.startingBalance;
  let totalFees = ZERO;
  let contribution = a.contributionPerPeriod;
  let yearGrowth = ZERO;
  let yearFees = ZERO;
  const path: ProjectionYear[] = [{ year: 0, nominal: balance, real: balance, contributed, growth: ZERO, fees: ZERO }];
  for (let p = 1; p <= total; p++) {
    if (a.timing === "beginning") {
      balance = balance.plus(contribution);
      contributed = contributed.plus(contribution);
    }
    const growth = balance.times(gross);
    balance = balance.plus(growth);
    const fee = balance.times(feeRate);
    balance = balance.minus(fee);
    yearGrowth = yearGrowth.plus(growth);
    yearFees = yearFees.plus(fee);
    totalFees = totalFees.plus(fee);
    if (a.timing === "end") {
      balance = balance.plus(contribution);
      contributed = contributed.plus(contribution);
    }
    const yearEnd = p % n === 0;
    if (yearEnd || p === total) {
      const year = p / n;
      path.push({ year, nominal: balance, real: balance.div(a.annualInflation.plus(1).pow(year)), contributed, growth: yearGrowth, fees: yearFees });
      yearGrowth = ZERO;
      yearFees = ZERO;
    }
    if (yearEnd) contribution = contribution.times(a.contributionGrowthAnnual.plus(1));
  }
  const last = path[path.length - 1]!;
  return {
    assumptions: a,
    path,
    finalNominal: last.nominal,
    finalReal: last.real,
    totalContributed: last.contributed,
    totalFees,
    disclosures: [
      `Hypothetical constant return of ${a.annualReturn.times(100).toFixed(2)}% a year before fees; actual returns vary and can be negative.`,
      `Contributions at the ${a.timing} of each of ${n} period(s) per year; returns compound ${n === 1 ? "annually" : n === 4 ? "quarterly" : "monthly"}.`,
      `Fees of ${a.annualFee.times(100).toFixed(2)}% a year are deducted from assets.`,
      `Real values deflate by an assumed ${a.annualInflation.times(100).toFixed(2)}% annual inflation.`,
      "Taxes are not modelled.",
      "Outcomes are not guaranteed. This is an illustration, not a forecast or advice.",
    ],
  };
}

export interface ScenarioSet {
  label: string;
  annualReturn: Decimal;
}

/** Run the same plan under several return assumptions so no single point estimate is presented. */
export function projectScenarios(base: Omit<ProjectionAssumptions, "annualReturn">, scenarios: ScenarioSet[]): Array<{ label: string; result: ProjectionResult }> {
  if (scenarios.length < 2) throw new RangeError("provide at least two scenarios; a single projection is not shown on its own");
  return scenarios.map((s) => ({ label: s.label, result: project({ ...base, annualReturn: s.annualReturn }) }));
}

/** Level per-period contribution needed to reach `target` (nominal) under the assumptions. */
export function requiredContribution(target: Decimal, a: Omit<ProjectionAssumptions, "contributionPerPeriod" | "contributionGrowthAnnual">): Decimal {
  const n = a.horizonPeriods ?? a.periodsPerYear * a.years;
  const net = periodRate(a.annualReturn, a.periodsPerYear).plus(1).times(d(1).minus(periodRate(a.annualFee, a.periodsPerYear))).minus(1);
  const growthFactor = net.plus(1).pow(n);
  const fvStart = a.startingBalance.times(growthFactor);
  const remaining = target.minus(fvStart);
  if (remaining.lte(0)) return ZERO;
  if (n === 0) return remaining;
  let annuityFactor = net.isZero() ? d(n) : growthFactor.minus(1).div(net);
  // Fees are charged after growth each period, so a beginning-of-period contribution grows by
  // one extra net period factor.
  if (a.timing === "beginning") annuityFactor = annuityFactor.times(net.plus(1));
  return remaining.div(annuityFactor);
}

/** Purchasing power of `amount` after `years` of constant `inflation`. */
export function purchasingPower(amount: Decimal, inflation: Decimal, years: number): Decimal {
  return amount.div(inflation.plus(1).pow(years));
}

/** Deflate a nominal amount using CPI index levels: amount × CPI_base / CPI_now. */
export function deflateByCpi(amount: Decimal, cpiBase: Decimal, cpiNow: Decimal): Decimal {
  if (cpiNow.lte(0) || cpiBase.lte(0)) throw new RangeError("CPI levels must be positive");
  return amount.times(cpiBase).div(cpiNow);
}

/** Future-value cost of an annual fee versus the same plan without it. */
export function feeDrag(a: ProjectionAssumptions): { withFee: Decimal; withoutFee: Decimal; drag: Decimal } {
  const withFee = project(a).finalNominal;
  const withoutFee = project({ ...a, annualFee: ZERO }).finalNominal;
  return { withFee, withoutFee, drag: withoutFee.minus(withFee) };
}

/**
 * Stress test: apply an immediate shock to each asset-class value and report the new total.
 * Scenarios are hypothetical and documented in the UI with their definitions.
 */
export function applyShock(values: Record<string, Decimal>, shocks: Record<string, Decimal>): { before: Decimal; after: Decimal; change: Decimal; byKey: Record<string, Decimal> } {
  let before = ZERO;
  let after = ZERO;
  const byKey: Record<string, Decimal> = {};
  for (const [k, v] of Object.entries(values)) {
    const shocked = v.times(d(1).plus(shocks[k] ?? ZERO));
    byKey[k] = shocked;
    before = before.plus(v);
    after = after.plus(shocked);
  }
  return { before, after, change: after.minus(before), byKey };
}
