import "server-only";
import { modelPortfolios, type ModelTarget } from "@/server/db/schema";
import { withTenant, type TenantContext } from "@/server/db/client";
import { allocationDrift, d, type DriftRow } from "@/engine";
import type { DashboardData } from "@/server/analytics/portfolio";

export async function listModels(ctx: TenantContext) {
  return withTenant(ctx, (tx) => tx.select().from(modelPortfolios).orderBy(modelPortfolios.createdAt));
}

function bucketFor(targets: Record<string, ModelTarget>, h: { assetClassKey: string; currency: string; country: string }): string | null {
  for (const [key, t] of Object.entries(targets)) {
    const m = t.match;
    if (!m.assetClasses.includes(h.assetClassKey)) continue;
    if (m.currencies && !m.currencies.includes(h.currency)) continue;
    if (m.countries && !m.countries.includes(h.country)) continue;
    return key;
  }
  return null;
}

/**
 * Compare current investments with a user-defined target mix. Descriptive only: it reports
 * drift and never proposes trades (feature MODEL_PORTFOLIO_USER_DEFINED).
 */
export function driftAgainstModel(targets: Record<string, ModelTarget>, dash: DashboardData, includeCash: boolean): { rows: DriftRow[]; total: string; unassigned: Array<{ name: string; value: string }> } {
  const items: Array<{ key: string; label: string; value: ReturnType<typeof d> }> = [];
  const unassigned: Array<{ name: string; value: string }> = [];
  for (const h of dash.holdings) {
    if (!h.marketValueBase) continue;
    const key = bucketFor(targets, h);
    if (key) items.push({ key, label: targets[key]!.label, value: d(h.marketValueBase) });
    else {
      items.push({ key: "unassigned", label: "Not in target mix", value: d(h.marketValueBase) });
      unassigned.push({ name: h.symbol ?? h.name, value: h.marketValueBase });
    }
  }
  if (includeCash) for (const c of dash.cash) if (c.amountBase) items.push({ key: "cash", label: "Uninvested cash", value: d(c.amountBase) });
  const r = allocationDrift(items, Object.fromEntries(Object.entries(targets).map(([k, t]) => [k, { label: t.label, weight: d(t.weight) }])));
  return { rows: r.rows, total: r.total.toFixed(2), unassigned };
}
