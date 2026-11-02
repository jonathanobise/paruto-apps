import "server-only";
import { enforceLimit } from "@/server/billing/entitlements";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { accountValuations, financialAccounts, institutions } from "@/server/db/schema";
import { withTenant, type TenantContext } from "@/server/db/client";
import { AppError } from "@/server/platform/errors";
import { parseOrThrow } from "@/server/identity/service";
import { recordAudit } from "@/server/audit/audit";
import { PortfolioBook, effectiveEvents, eventAccountIds, isISODate } from "@/engine";
import { instrumentIdsOf, loadEvents, loadInstrumentMap, lockLedger } from "@/server/ledger/service";
import { toEngineEvent } from "@/server/ledger/codec";

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
    await enforceLimit(tx, ctx, "accounts");
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

export const updateAccountSchema = z.object({
  name: z.string().trim().min(1, "Give the account a name").max(80),
  institutionName: z.string().trim().max(120).optional().transform((v) => v || null),
  isInvestment: z.boolean(),
  ownershipPercent: decimalString.refine((v) => Number(v) > 0 && Number(v) <= 100, "Between 0 and 100"),
  maskedNumber: z.string().trim().max(4, "Only the last 4 characters").optional().transform((v) => v || null),
  notes: z.string().trim().max(500).optional().transform((v) => v || null),
});

/**
 * Edit descriptive fields. Type and currency are fixed once created because the ledger and
 * valuations depend on them; create a new account instead.
 */
export async function updateAccount(ctx: TenantContext, accountId: string, input: unknown) {
  const data = parseOrThrow(updateAccountSchema, input);
  return withTenant(ctx, async (tx) => {
    const [before] = await tx.select().from(financialAccounts).where(eq(financialAccounts.id, accountId)).limit(1);
    if (!before) throw new AppError("NOT_FOUND", "Account not found.");
    const [inst] = data.institutionName ? await tx.select({ id: institutions.id }).from(institutions).where(eq(institutions.name, data.institutionName)).limit(1) : [];
    await tx
      .update(financialAccounts)
      .set({ name: data.name, institutionName: data.institutionName, institutionId: inst?.id ?? null, isInvestment: before.accountClass === "ledger" ? data.isInvestment : false, ownershipPercent: data.ownershipPercent, maskedNumber: data.maskedNumber, notes: data.notes, updatedAt: new Date() })
      .where(eq(financialAccounts.id, accountId));
    const changed = (["name", "institutionName", "isInvestment", "ownershipPercent", "maskedNumber", "notes"] as const).filter((k) => String(before[k] ?? "") !== String(data[k] ?? ""));
    await recordAudit(tx, { orgId: ctx.orgId, actorUserId: ctx.userId, action: "account.updated", targetType: "financial_account", targetId: accountId, metadata: { changed } });
  });
}

/**
 * Close an account as of a date. Ledger accounts must be empty (no cash or holdings) and have no
 * transactions after the closing date. Closed accounts keep their history; manual assets and
 * liabilities stop counting towards net worth from the closing date.
 */
export async function closeAccount(ctx: TenantContext, accountId: string, closedOn: string) {
  if (!isISODate(closedOn)) throw new AppError("VALIDATION", "Use a valid closing date.", { fieldErrors: { closedOn: ["Use a valid date"] } });
  if (closedOn > new Date().toISOString().slice(0, 10)) throw new AppError("VALIDATION", "The closing date can't be in the future.", { fieldErrors: { closedOn: ["Can't be in the future"] } });
  return withTenant(ctx, async (tx) => {
    await lockLedger(tx, ctx.orgId);
    const [account] = await tx.select().from(financialAccounts).where(eq(financialAccounts.id, accountId)).limit(1);
    if (!account) throw new AppError("NOT_FOUND", "Account not found.");
    if (account.status === "closed") throw new AppError("CONFLICT", "This account is already closed.");
    if (account.accountClass === "ledger") {
      const events = (await loadEvents(tx)).map(toEngineEvent);
      const live = effectiveEvents(events);
      if (live.some((e) => e.date > closedOn && eventAccountIds(e).includes(accountId))) throw new AppError("CONFLICT", "There are transactions after this date. Choose a later closing date.");
      const book = PortfolioBook.replay(events, { baseCurrency: "NGN", instruments: await loadInstrumentMap(tx, instrumentIdsOf(events)) });
      const cash = book.cashBalances().filter((c) => c.accountId === accountId);
      const positions = book.positions().filter((p) => p.accountId === accountId && !p.quantity.isZero());
      if (cash.length || positions.length) {
        const parts = [...cash.map((c) => `${c.amount.toFixed(2)} ${c.currency} cash`), ...positions.map((p) => `${p.quantity.toFixed()} units of a holding`)];
        throw new AppError("CONFLICT", `Move or withdraw what's left before closing (${parts.join(", ")}).`);
      }
    } else {
      const [first] = await tx.select({ d: accountValuations.valuedOn }).from(accountValuations).where(eq(accountValuations.accountId, accountId)).orderBy(accountValuations.valuedOn).limit(1);
      if (first && closedOn < first.d) throw new AppError("VALIDATION", "The closing date is before the first valuation.");
    }
    await tx.update(financialAccounts).set({ status: "closed", closedOn, updatedAt: new Date() }).where(eq(financialAccounts.id, accountId));
    await recordAudit(tx, { orgId: ctx.orgId, actorUserId: ctx.userId, action: "account.closed", targetType: "financial_account", targetId: accountId, metadata: { closedOn } });
  });
}

export async function reopenAccount(ctx: TenantContext, accountId: string) {
  return withTenant(ctx, async (tx) => {
    const [account] = await tx.select().from(financialAccounts).where(eq(financialAccounts.id, accountId)).limit(1);
    if (!account) throw new AppError("NOT_FOUND", "Account not found.");
    if (account.status !== "closed") throw new AppError("CONFLICT", "This account is open.");
    await enforceLimit(tx, ctx, "accounts");
    await tx.update(financialAccounts).set({ status: "open", closedOn: null, updatedAt: new Date() }).where(eq(financialAccounts.id, accountId));
    await recordAudit(tx, { orgId: ctx.orgId, actorUserId: ctx.userId, action: "account.reopened", targetType: "financial_account", targetId: accountId, metadata: { previousClosedOn: account.closedOn } });
  });
}
