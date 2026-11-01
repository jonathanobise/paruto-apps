/**
 * Return measures.
 *
 * Rates (returns, IRRs, volatilities) are analytical ratios, not balances. The XIRR root
 * search runs in IEEE-754 binary64 with a 1e-10 tolerance on the rate; the cash flows feeding
 * it come from Decimal money and the result is rounded to 10 decimal places.
 */
import { Decimal, d } from "./decimal";
import { daysBetween, type ISODate } from "./dates";

export interface DatedAmount {
  date: ISODate;
  /** Investor perspective: money paid in is negative, money received (or terminal value) positive. */
  amount: Decimal;
}

function npv(rate: number, flows: Array<{ t: number; a: number }>): number {
  let v = 0;
  for (const f of flows) v += f.a / Math.pow(1 + rate, f.t);
  return v;
}

function dnpv(rate: number, flows: Array<{ t: number; a: number }>): number {
  let v = 0;
  for (const f of flows) v -= (f.t * f.a) / Math.pow(1 + rate, f.t + 1);
  return v;
}

/**
 * Money-weighted return (XIRR, ACT/365 exponent as in spreadsheet XIRR).
 * Returns null when the flows have no sign change (no IRR exists) or no root is found.
 */
export function xirr(cashflows: DatedAmount[], guess = 0.1): number | null {
  const nonZero = cashflows.filter((c) => !c.amount.isZero());
  if (nonZero.length < 2) return null;
  if (!nonZero.some((c) => c.amount.isNegative()) || !nonZero.some((c) => c.amount.isPositive())) return null;
  const t0 = nonZero.reduce((m, c) => (c.date < m ? c.date : m), nonZero[0]!.date);
  const flows = nonZero.map((c) => ({ t: daysBetween(t0, c.date) / 365, a: c.amount.toNumber() }));

  // Newton–Raphson first.
  let rate = guess;
  for (let i = 0; i < 100; i++) {
    const f = npv(rate, flows);
    const df = dnpv(rate, flows);
    if (!Number.isFinite(f) || !Number.isFinite(df) || df === 0) break;
    const next = rate - f / df;
    if (!Number.isFinite(next) || next <= -1) break;
    if (Math.abs(next - rate) < 1e-12) return round10(next);
    rate = next;
  }
  // Bisection fallback on a wide bracket.
  let lo = -0.999999;
  let hi = 1;
  let flo = npv(lo, flows);
  let fhi = npv(hi, flows);
  while (Math.sign(flo) === Math.sign(fhi) && hi < 1e6) {
    hi *= 10;
    fhi = npv(hi, flows);
  }
  if (Math.sign(flo) === Math.sign(fhi)) return null;
  for (let i = 0; i < 300; i++) {
    const mid = (lo + hi) / 2;
    const fm = npv(mid, flows);
    if (Math.abs(hi - lo) < 1e-12 || fm === 0) return round10(mid);
    if (Math.sign(fm) === Math.sign(flo)) {
      lo = mid;
      flo = fm;
    } else hi = mid;
  }
  return round10((lo + hi) / 2);
}

function round10(x: number): number {
  return Math.round(x * 1e10) / 1e10;
}

export interface ValuationPoint {
  date: ISODate;
  /** End-of-day value including any flow on this date. */
  value: Decimal;
  /** Net external flow on this date (positive = contribution). */
  flow: Decimal;
}

export interface SubPeriodReturn {
  start: ISODate;
  end: ISODate;
  return: Decimal;
}

/**
 * Time-weighted return by chain-linking sub-periods between valuation points.
 * Convention: flows occur at the END of their day, so a sub-period (a, b] has return
 * (V_b − F_b) / V_a − 1. Sub-periods that start with zero value carry no capital and are skipped.
 * The first point is the starting value; its own flow is part of that starting value.
 */
export function timeWeightedReturn(points: ValuationPoint[]): { twr: Decimal; subPeriods: SubPeriodReturn[] } {
  let growth = d(1);
  const subPeriods: SubPeriodReturn[] = [];
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1]!;
    const b = points[i]!;
    if (a.value.lte(0)) continue;
    const r = b.value.minus(b.flow).div(a.value).minus(1);
    subPeriods.push({ start: a.date, end: b.date, return: r });
    growth = growth.times(r.plus(1));
  }
  return { twr: growth.minus(1), subPeriods };
}

/**
 * Annualise a cumulative return. Following GIPS practice, periods shorter than a year are not
 * annualised (returns null) because doing so extrapolates short-term results.
 */
export function annualize(cumulative: Decimal, days: number): Decimal | null {
  if (days < 365) return null;
  const base = cumulative.plus(1);
  if (base.lte(0)) return d(-1);
  return base.pow(d(365).div(days)).minus(1);
}

/** Real (inflation-adjusted) return: (1 + nominal) / (1 + inflation) − 1. */
export function realReturn(nominal: Decimal, inflation: Decimal): Decimal {
  return nominal.plus(1).div(inflation.plus(1)).minus(1);
}

/** Returns between consecutive index levels. */
export function periodicReturns(index: Decimal[]): Decimal[] {
  const out: Decimal[] = [];
  for (let i = 1; i < index.length; i++) {
    const prev = index[i - 1]!;
    if (prev.isZero()) continue;
    out.push(index[i]!.div(prev).minus(1));
  }
  return out;
}
