import "server-only";
import { z } from "zod";
import { instruments } from "@/server/db/schema";
import { withTenant, type TenantContext } from "@/server/db/client";
import { parseOrThrow } from "@/server/identity/service";
import { recordAudit } from "@/server/audit/audit";
import { ASSET_CLASSES, isISODate } from "@/engine";

export const privateInstrumentSchema = z
  .object({
    name: z.string().trim().min(2).max(120),
    symbol: z.string().trim().toUpperCase().max(20).optional().transform((v) => v || undefined),
    assetClass: z.enum(ASSET_CLASSES),
    currency: z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/),
    country: z.string().trim().toUpperCase().regex(/^([A-Z]{2}|GLOBAL)$/, "Two-letter country code or GLOBAL").default("NG"),
    pricingModel: z.enum(["market", "nav", "discount_accrual", "manual"]),
    maturityDate: z.string().optional().transform((v) => v || undefined).refine((v) => v === undefined || isISODate(v), "Use a valid date"),
  })
  .refine((v) => v.pricingModel !== "discount_accrual" || v.maturityDate, { path: ["maturityDate"], message: "Discount instruments need a maturity date" });

/** A user-defined instrument visible only inside the organisation (e.g. a specific T-bill or fixed deposit). */
export async function createPrivateInstrument(ctx: TenantContext, input: unknown) {
  const data = parseOrThrow(privateInstrumentSchema, input);
  return withTenant(ctx, async (tx) => {
    const [row] = await tx
      .insert(instruments)
      .values({
        orgId: ctx.orgId,
        name: data.name,
        symbol: data.symbol ?? null,
        assetClass: data.assetClass,
        currency: data.currency,
        country: data.country,
        region: data.country === "NG" ? "Africa" : data.country === "GLOBAL" ? "Global" : "Other",
        pricingModel: data.pricingModel,
        staleAfterDays: data.pricingModel === "manual" ? 365 : 7,
        faceValuePerUnit: data.pricingModel === "discount_accrual" ? "1" : null,
        maturityDate: data.maturityDate ?? null,
        verificationState: "user_provided",
      })
      .returning();
    await recordAudit(tx, { orgId: ctx.orgId, actorUserId: ctx.userId, action: "instrument.private_created", targetType: "instrument", targetId: row!.id });
    return row!;
  });
}
