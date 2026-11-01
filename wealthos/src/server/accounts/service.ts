import "server-only";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { accountValuations, financialAccounts, institutions } from "@/server/db/schema";
import { withTenant, type TenantContext } from "@/server/db/client";
import { AppError } from "@/server/platform/errors";
import { parseOrThrow } from "@/server/identity/service";
import { recordAudit } from "@/server/audit/audit";
import { isISODate } from "@/engine";

export const ACCOUNT_TYPES = {
  bank: { label: "Bank account", class: "ledger", investment: false },
  brokerage: { label: "Brokerage / stockbroker account", class: "ledger", investment: true },
  mutual_fund: { label: "Mutual / money-market fund account", class: "ledger", investment: true },
  treasury_bills: { label: "Treasury bill holdings", class: "ledger", investment: true },
  bonds: { label: "Bond investments", class: "ledger", investment: true },
  cash_wallet: { label: "Cash / wallet", class: "ledger", investment: false },
  pension: { label: "Retirement / pension (RSA)", class: "manual_asset", investment: false },
  real_estate: { label: "Real estate", class: "manual_asset", investment: false },
  business: { label: "Business ownership interest", class: "manual_asset", investment: false },
  other_asset: { label: "Other asset", class: "manual_asset", investment: false },
  loan: { label: "Loan", class: "liability", investment: false },
  credit_card: { label: "Credit card", class: "liability", investment: false },
  other_liability: { label: "Other liability", class: "liability", investment: false },
} as const;
export type AccountTypeKey = keyof typeof ACCOUNT_TYPES;

const currencySchema = z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/, "Use a 3-letter currency code");
const isoDate = z.string().refine(isISODate, "Use a valid date (YYYY-MM-DD)");
const decimalString = z.string().trim().regex(/^\d+(\.\d{1,10})?$/, "Enter a number, e.g. 2500000.00");

export const createAccountSchema = z.object({
  name: z.string().trim().min(1, "Give the account a name").max(80),
  type: z.enum(Object.keys(ACCOUNT_TYPES) as [AccountTypeKey, ...AccountTypeKey[]]),
  institutionName: z.string().trim().max(120).optional().transform((v) => v || undefined),
  currency: currencySchema,
  isInvestment: z.boolean().optional(),
  ownershipPercent: decimalString.refine((v) => Number(v) > 0 && Number(v) <= 100, "Between 0 and 100").default("100"),
  maskedNumber: z.string().trim().max(4, "Only the last 4 characters").optional().transform((v) => v || undefined),
  notes: z.string().trim().max(500).optional().transform((v) => v || undefined),
  /** Manual assets/liabilities: initial declared value. */
  openingValue: decimalString.optional(),
  openingValueDate: isoDate.optional(),
});

export async function createAccount(ctx: TenantContext, input: unknown) {
  const data = parseOrThrow(createAccountSchema, input);
  const typeInfo = ACCOUNT_TYPES[data.type];
  if (typeInfo.class !== "ledger" && !data.openingValue) throw new AppError("VALIDATION", "Enter the current value.", { fieldErrors: { openingValue: ["Enter the current value (an estimate is fine)"] } });
  return withTenant(ctx, async (tx) => {
    const [inst] = data.institutionName ? await tx.select({ id: institutions.id }).from(institutions).where(eq(institutions.name, data.institutionName)).limit(1) : [];
    const [row] = await tx
      .insert(financialAccounts)
      .values({
        orgId: ctx.orgId,
        name: data.name,
        type: data.type,
        accountClass: typeInfo.class,
        institutionId: inst?.id ?? null,
        institutionName: data.institutionName ?? null,
        currency: data.currency,
        isInvestment: data.isInvestment ?? typeInfo.investment,
        ownershipPercent: data.ownershipPercent,
        maskedNumber: data.maskedNumber ?? null,
        notes: data.notes ?? null,
        createdBy: ctx.userId,
      })
      .returning();
    if (typeInfo.class !== "ledger" && data.openingValue) {
      await tx.insert(accountValuations).values({ orgId: ctx.orgId, accountId: row!.id, valuedOn: data.openingValueDate ?? new Date().toISOString().slice(0, 10), amount: data.openingValue, currency: data.currency, valuationType: "estimate", createdBy: ctx.userId });
    }
    await recordAudit(tx, { orgId: ctx.orgId, actorUserId: ctx.userId, action: "account.created", targetType: "financial_account", targetId: row!.id, metadata: { type: data.type } });
    return row!;
  });
}

export async function listAccounts(ctx: TenantContext) {
  return withTenant(ctx, (tx) => tx.select().from(financialAccounts).orderBy(financialAccounts.createdAt));
}

export async function getAccount(ctx: TenantContext, accountId: string) {
  if (!z.string().uuid().safeParse(accountId).success) throw new AppError("NOT_FOUND", "Account not found.");
  const [row] = await withTenant(ctx, (tx) => tx.select().from(financialAccounts).where(eq(financialAccounts.id, accountId)).limit(1));
  if (!row) throw new AppError("NOT_FOUND", "Account not found.");
  return row;
}

export const valuationSchema = z.object({
  accountId: z.string().uuid(),
  valuedOn: isoDate,
  amount: decimalString,
  valuationType: z.enum(["estimate", "statement", "appraisal"]).default("estimate"),
  note: z.string().trim().max(300).optional().transform((v) => v || undefined),
});

/** Append a declared valuation for a manual asset or a liability balance. */
export async function addValuation(ctx: TenantContext, input: unknown) {
  const data = parseOrThrow(valuationSchema, input);
  if (data.valuedOn > new Date().toISOString().slice(0, 10)) throw new AppError("VALIDATION", "A valuation cannot be dated in the future.");
  return withTenant(ctx, async (tx) => {
    const [account] = await tx.select().from(financialAccounts).where(eq(financialAccounts.id, data.accountId)).limit(1);
    if (!account) throw new AppError("NOT_FOUND", "Account not found.");
    if (account.accountClass === "ledger") throw new AppError("VALIDATION", "This account is valued from its transactions. Record transactions instead.");
    const [row] = await tx.insert(accountValuations).values({ orgId: ctx.orgId, accountId: account.id, valuedOn: data.valuedOn, amount: data.amount, currency: account.currency, valuationType: data.valuationType, note: data.note ?? null, createdBy: ctx.userId }).returning();
    await recordAudit(tx, { orgId: ctx.orgId, actorUserId: ctx.userId, action: "valuation.added", targetType: "financial_account", targetId: account.id });
    return row!;
  });
}

export async function listValuations(ctx: TenantContext, accountId: string) {
  return withTenant(ctx, (tx) => tx.select().from(accountValuations).where(eq(accountValuations.accountId, accountId)).orderBy(desc(accountValuations.valuedOn), desc(accountValuations.createdAt)));
}

export async function closeAccount(ctx: TenantContext, accountId: string, closedOn: string, hasOpenBalance: boolean) {
  if (!isISODate(closedOn)) throw new AppError("VALIDATION", "Use a valid closing date.");
  return withTenant(ctx, async (tx) => {
    const [account] = await tx.select().from(financialAccounts).where(and(eq(financialAccounts.id, accountId), eq(financialAccounts.status, "open"))).limit(1);
    if (!account) throw new AppError("NOT_FOUND", "Open account not found.");
    if (account.accountClass === "ledger" && hasOpenBalance) throw new AppError("CONFLICT", "Move or withdraw the remaining cash and holdings before closing this account.");
    await tx.update(financialAccounts).set({ status: "closed", closedOn, updatedAt: new Date() }).where(eq(financialAccounts.id, accountId));
    await recordAudit(tx, { orgId: ctx.orgId, actorUserId: ctx.userId, action: "account.closed", targetType: "financial_account", targetId: accountId, metadata: { closedOn } });
  });
}
