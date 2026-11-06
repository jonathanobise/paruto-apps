import "server-only";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { platformSettings } from "@/server/db/schema";
import type { Tx } from "@/server/db/client";
import { BRAND } from "@/lib/brand";

/**
 * Billing configuration (platform_settings key "billing"). Tax treatment and bank details are
 * business decisions for the owner and an accountant; the defaults charge no tax and offer no
 * payment method, so nothing can be paid until an administrator sets them.
 */
export const billingSettingsSchema = z.object({
  taxLabel: z.string().trim().max(40).nullable().default(null),
  taxRatePercent: z.string().regex(/^\d{1,2}(\.\d{1,4})?$/).default("0"),
  /** "exclusive": tax is added to plan prices; "inclusive": plan prices already include it. */
  taxMode: z.enum(["exclusive", "inclusive"]).default("exclusive"),
  invoicePrefix: z.string().regex(/^[A-Z]{2,6}$/).default("WOS"),
  paymentDueDays: z.coerce.number().int().min(1).max(30).default(7),
  graceDays: z.coerce.number().int().min(0).max(30).default(7),
  renewalNoticeDays: z.coerce.number().int().min(1).max(30).default(7),
  sellerName: z.string().trim().max(120).default(BRAND),
  sellerDetails: z.string().trim().max(500).default(""),
  bankTransfer: z
    .object({ accountName: z.string().trim().min(2).max(120), bankName: z.string().trim().min(2).max(80), accountNumber: z.string().regex(/^\d{10}$/, "10-digit NUBAN"), instructions: z.string().trim().max(500).default("") })
    .nullable()
    .default(null),
});
export type BillingSettings = z.infer<typeof billingSettingsSchema>;

export async function getBillingSettings(tx: Tx): Promise<BillingSettings> {
  const [row] = await tx.select().from(platformSettings).where(eq(platformSettings.key, "billing"));
  return billingSettingsSchema.parse(row?.value ?? {});
}
