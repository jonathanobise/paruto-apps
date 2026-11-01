/**
 * Fixed-income helpers and yield-methodology types.
 *
 * Different yield measures are NOT interchangeable. Each published rate in WealthOS carries a
 * RateMethodology, and comparisons across methodologies are refused unless an explicit,
 * mathematically valid conversion is applied first.
 */
import { Decimal, ZERO, d } from "./decimal";
import { addMonths, daysBetween, type DayCountConvention, type ISODate, yearFraction } from "./dates";

export const RATE_METHODOLOGIES = {
  discount_rate: "Discount rate (bank discount basis)",
  true_yield: "True (simple) yield / bond-equivalent yield",
  effective_annual_yield: "Effective annual yield (compounded)",
  yield_to_maturity: "Yield to maturity",
  trailing_return: "Trailing total return",
  distribution_yield: "Distribution yield",
  advertised_deposit_rate: "Advertised deposit interest rate (nominal p.a.)",
  money_market_yield: "Fund yield as published by manager",
  expected_return: "Expected / assumed return (hypothetical)",
  coupon_rate: "Coupon rate",
} as const;
export type RateMethodology = keyof typeof RATE_METHODOLOGIES;

export interface PublishedRate {
  value: Decimal;
  methodology: RateMethodology;
  /** Day-count or compounding detail needed to interpret the rate. */
  basis?: string;
  tenorDays?: number;
  asOf: ISODate;
}

export class IncomparableRatesError extends Error {
  constructor(a: RateMethodology, b: RateMethodology) {
    super(`Cannot compare ${RATE_METHODOLOGIES[a]} with ${RATE_METHODOLOGIES[b]} without converting them to a common basis`);
    this.name = "IncomparableRatesError";
  }
}

export function assertComparable(a: PublishedRate, b: PublishedRate): void {
  if (a.methodology !== b.methodology) throw new IncomparableRatesError(a.methodology, b.methodology);
}

/** Price per unit of face for a discount instrument: P = F × (1 − d × t / basis). */
export function discountPrice(face: Decimal, discountRate: Decimal, days: number, basisDays = 365): Decimal {
  return face.times(d(1).minus(discountRate.times(days).div(basisDays)));
}

/** True (simple) yield from a discount rate: y = d / (1 − d × t / basis). */
export function discountToTrueYield(discountRate: Decimal, days: number, basisDays = 365): Decimal {
  const denom = d(1).minus(discountRate.times(days).div(basisDays));
  if (denom.lte(0)) throw new RangeError("discount rate too high for tenor");
  return discountRate.div(denom);
}

/** Effective annual yield from a simple yield over `days`, assuming reinvestment at the same rate. */
export function simpleToEffectiveAnnual(simpleYield: Decimal, days: number, basisDays = 365): Decimal {
  const periodReturn = simpleYield.times(days).div(basisDays);
  return periodReturn.plus(1).pow(d(basisDays).div(days)).minus(1);
}

/** Effective annual rate from a nominal rate compounded m times a year. */
export function nominalToEffective(nominal: Decimal, m: number): Decimal {
  return nominal.div(m).plus(1).pow(m).minus(1);
}

/** Simple interest accrued on a fixed deposit: P × r × t / basis. */
export function simpleInterest(principal: Decimal, rate: Decimal, start: ISODate, end: ISODate, convention: DayCountConvention = "ACT/365"): Decimal {
  return principal.times(rate).times(yearFraction(start, end, convention));
}

export interface CashFlow {
  date: ISODate;
  amount: Decimal;
  kind: "coupon" | "principal" | "interest";
}

/**
 * Coupon bond cash flows from `settlement` to maturity for `face` held. Coupons are
 * face × couponRate / frequency on each scheduled date counted back from maturity.
 * (Accrued interest at purchase is out of scope for this schedule.)
 */
export function bondCashFlows(face: Decimal, couponRate: Decimal, maturity: ISODate, frequency: 1 | 2 | 4 | 12, settlement: ISODate): CashFlow[] {
  const step = 12 / frequency;
  const dates: ISODate[] = [];
  let k = 0;
  let cursor = maturity;
  while (cursor > settlement) {
    dates.push(cursor);
    k++;
    cursor = addMonths(maturity, -step * k);
  }
  dates.reverse();
  const coupon = face.times(couponRate).div(frequency);
  const flows: CashFlow[] = dates.map((date) => ({ date, amount: coupon, kind: "coupon" as const }));
  if (dates.length > 0) flows.push({ date: maturity, amount: face, kind: "principal" });
  return flows;
}

/** Discount instrument maturity: a single redemption of face value. */
export function discountInstrumentCashFlow(face: Decimal, maturity: ISODate): CashFlow[] {
  return [{ date: maturity, amount: face, kind: "principal" }];
}

/** Fixed deposit maturity cash flows (simple interest paid at maturity). */
export function fixedDepositCashFlows(principal: Decimal, rate: Decimal, start: ISODate, maturity: ISODate, convention: DayCountConvention = "ACT/365", withholdingTaxRate: Decimal = ZERO): CashFlow[] {
  const interest = simpleInterest(principal, rate, start, maturity, convention);
  return [
    { date: maturity, amount: interest.times(d(1).minus(withholdingTaxRate)), kind: "interest" },
    { date: maturity, amount: principal, kind: "principal" },
  ];
}

export function daysToMaturity(from: ISODate, maturity: ISODate): number {
  return Math.max(0, daysBetween(from, maturity));
}
