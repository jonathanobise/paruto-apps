import { Decimal, ZERO, sum } from "./decimal";

export interface AllocationItem {
  key: string;
  label: string;
  value: Decimal;
}

export interface AllocationSlice extends AllocationItem {
  weight: Decimal;
}

/** Group values by key and compute weights. Negative values (e.g. overdrawn cash) are kept and reduce the total. */
export function allocate(items: AllocationItem[]): { total: Decimal; slices: AllocationSlice[] } {
  const groups = new Map<string, AllocationItem>();
  for (const it of items) {
    const g = groups.get(it.key);
    groups.set(it.key, g ? { ...g, value: g.value.plus(it.value) } : { ...it });
  }
  const total = sum([...groups.values()].map((g) => g.value));
  const slices = [...groups.values()]
    .map((g) => ({ ...g, weight: total.isZero() ? ZERO : g.value.div(total) }))
    .sort((a, b) => b.value.comparedTo(a.value));
  return { total, slices };
}

export interface ConcentrationResult {
  /** Herfindahl–Hirschman index of weights (0–1). 1 = single holding. */
  hhi: Decimal;
  /** 1 / HHI: the equivalent number of equally weighted holdings. */
  effectiveHoldings: Decimal | null;
  largest: AllocationSlice | null;
  topNWeight: Decimal;
  breaches: AllocationSlice[];
}

/** Concentration of positive positions. `threshold` flags any slice above that weight (user-defined alert). */
export function concentration(items: AllocationItem[], threshold: Decimal, topN = 5): ConcentrationResult {
  const { slices } = allocate(items.filter((i) => i.value.gt(0)));
  const hhi = sum(slices.map((s) => s.weight.pow(2)));
  return {
    hhi,
    effectiveHoldings: hhi.isZero() ? null : new Decimal(1).div(hhi),
    largest: slices[0] ?? null,
    topNWeight: sum(slices.slice(0, topN).map((s) => s.weight)),
    breaches: slices.filter((s) => s.weight.gt(threshold)),
  };
}

export interface DriftRow {
  key: string;
  label: string;
  currentValue: Decimal;
  currentWeight: Decimal;
  targetWeight: Decimal;
  /** currentWeight − targetWeight. */
  drift: Decimal;
  /** Value difference between current and target weight at today's total. Informational only. */
  valueGap: Decimal;
}

/**
 * Compare current allocation with a user-defined target mix. This is analysis only: it describes
 * drift and never generates trade instructions (see docs/COMPLIANCE_MATRIX.md, REBALANCE_ANALYSIS).
 */
export function allocationDrift(items: AllocationItem[], targets: Record<string, { label: string; weight: Decimal }>): { total: Decimal; rows: DriftRow[]; targetSum: Decimal } {
  const { total, slices } = allocate(items);
  const keys = new Set([...slices.map((s) => s.key), ...Object.keys(targets)]);
  const rows: DriftRow[] = [...keys].map((key) => {
    const s = slices.find((x) => x.key === key);
    const t = targets[key];
    const currentWeight = s?.weight ?? ZERO;
    const targetWeight = t?.weight ?? ZERO;
    return {
      key,
      label: s?.label ?? t?.label ?? key,
      currentValue: s?.value ?? ZERO,
      currentWeight,
      targetWeight,
      drift: currentWeight.minus(targetWeight),
      valueGap: total.times(currentWeight.minus(targetWeight)),
    };
  });
  return { total, rows: rows.sort((a, b) => b.targetWeight.comparedTo(a.targetWeight)), targetSum: sum(Object.values(targets).map((t) => t.weight)) };
}
