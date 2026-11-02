import "server-only";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { modelPortfolios, type ModelTarget } from "@/server/db/schema";
import { AppError } from "@/server/platform/errors";
import { parseOrThrow } from "@/server/identity/service";
import { recordAudit } from "@/server/audit/audit";
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

// ---------------------------------------------------------------------------------------------
// User-defined target mixes (feature MODEL_PORTFOLIO_USER_DEFINED). Buckets are presets so that
// holdings are assigned consistently; first matching bucket wins.

export const BUCKET_PRESETS: Record<string, ModelTarget["match"] & { label: string }> = {
  ng_money_market: { label: "Nigerian money-market funds", assetClasses: ["money_market"], currencies: ["NGN"] },
  ng_tbills: { label: "Nigerian Treasury bills", assetClasses: ["treasury_bill"], currencies: ["NGN"] },
  ng_fixed_deposits: { label: "Naira fixed deposits", assetClasses: ["fixed_deposit"], currencies: ["NGN"] },
  ng_bonds: { label: "Naira bonds and bond funds", assetClasses: ["government_bond", "corporate_bond", "fixed_income_fund"], currencies: ["NGN"] },
  ng_equity: { label: "Nigerian equities", assetClasses: ["equity", "equity_fund", "etf"], countries: ["NG"] },
  usd_fixed_income: { label: "USD fixed income", assetClasses: ["fixed_income_fund", "treasury_bill", "government_bond", "corporate_bond", "money_market", "fixed_deposit"], currencies: ["USD"] },
  global_equity: { label: "Global equities", assetClasses: ["etf", "equity_fund", "equity"], currencies: ["USD", "GBP", "EUR"] },
};

export const modelInputSchema = z
  .object({
    name: z.string().trim().min(2).max(80),
    description: z.string().trim().max(300).optional().transform((v) => v || null),
    weights: z.record(z.string(), z.string().trim().regex(/^\d{1,3}(\.\d{1,2})?$/, "Percent like 25")),
  })
  .transform((m) => ({ ...m, weights: Object.fromEntries(Object.entries(m.weights).filter(([k, v]) => k in BUCKET_PRESETS && Number(v) > 0)) }))
  .refine((m) => Object.keys(m.weights).length >= 1, { path: ["weights"], message: "Give at least one bucket a weight" })
  .refine((m) => Object.values(m.weights).reduce((s, v) => s.plus(v), d(0)).equals(100), { path: ["weights"], message: "Weights must add up to exactly 100%" });

export async function saveModel(ctx: TenantContext, id: string | null, input: unknown): Promise<string> {
  const m = parseOrThrow(modelInputSchema, input);
  const targets = Object.fromEntries(
    Object.entries(m.weights).map(([k, w]) => {
      const { label, ...match } = BUCKET_PRESETS[k]!;
      return [k, { label, weight: d(w).div(100).toFixed(), match }];
    }),
  );
  return withTenant(ctx, async (tx) => {
    if (id) {
      const [row] = await tx.update(modelPortfolios).set({ name: m.name, description: m.description, targets, updatedAt: new Date() }).where(eq(modelPortfolios.id, id)).returning({ id: modelPortfolios.id });
      if (!row) throw new AppError("NOT_FOUND", "Target mix not found.");
      return row.id;
    }
    const [row] = await tx.insert(modelPortfolios).values({ orgId: ctx.orgId, name: m.name, description: m.description, targets, isHypothetical: true, createdBy: ctx.userId }).returning({ id: modelPortfolios.id });
    await recordAudit(tx, { orgId: ctx.orgId, actorUserId: ctx.userId, action: "model.created", targetType: "model_portfolio", targetId: row!.id });
    return row!.id;
  });
}

export async function deleteModel(ctx: TenantContext, id: string): Promise<void> {
  await withTenant(ctx, (tx) => tx.delete(modelPortfolios).where(eq(modelPortfolios.id, id)));
}
