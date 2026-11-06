import "server-only";
import type { TenantContext } from "@/server/db/client";
import { buildDashboard } from "@/server/analytics/portfolio";
import { STRESS_SCENARIOS, d, runStress, type StressExposure } from "@/engine";

const MANUAL_CLASS: Record<string, string> = { real_estate: "real_estate", business: "business", pension: "pension" };

/** Apply every documented stress scenario to the organisation's current exposures. */
export async function stressTests(ctx: TenantContext, baseCurrency: string) {
  const dash = await buildDashboard(ctx, { baseCurrency, period: "1M" });
  const exposures: StressExposure[] = [
    ...dash.holdings.filter((h) => h.marketValueBase).map((h) => ({ key: `${h.accountId}|${h.instrumentId}`, label: h.symbol ?? h.name, kind: "asset" as const, value: d(h.marketValueBase!).times(h.ownershipShare), assetClass: h.assetClassKey, currency: h.currency, country: h.country })),
    ...dash.cash.filter((c) => c.amountBase).map((c) => ({ key: `${c.accountId}|cash|${c.currency}`, label: `${c.accountName} cash (${c.currency})`, kind: "asset" as const, value: d(c.amountBase!).times(c.ownershipShare), assetClass: "cash", currency: c.currency, country: c.currency === "NGN" ? "NG" : "OTHER" })),
    ...dash.manual.filter((m) => m.amountBase).map((m) => ({ key: m.accountId, label: m.name, kind: m.kind, value: d(m.amountBase!), assetClass: MANUAL_CLASS[m.type] ?? "other", currency: m.currency, country: "NG" })),
  ];
  return {
    asOf: dash.asOf,
    baseCurrency,
    complete: dash.totals.complete,
    isDemo: dash.isDemo,
    results: STRESS_SCENARIOS.map((s) => {
      const r = runStress(exposures, s, baseCurrency);
      return {
        id: s.id,
        name: s.name,
        description: s.description,
        netWorthBefore: r.netWorthBefore.toFixed(2),
        netWorthAfter: r.netWorthAfter.toFixed(2),
        change: r.change.toFixed(2),
        changePct: r.changePct?.toFixed(6) ?? null,
        rows: r.rows.filter((x) => !x.change.isZero()).sort((a, b) => a.change.comparedTo(b.change)).map((x) => ({ label: x.label, kind: x.kind, before: x.before.toFixed(2), after: x.after.toFixed(2), change: x.change.toFixed(2), notes: x.notes })),
      };
    }),
  };
}
