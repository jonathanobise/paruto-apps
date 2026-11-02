import "server-only";
import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { accountOwners, financialAccounts } from "@/server/db/schema";
import { withTenant, type TenantContext } from "@/server/db/client";
import { AppError } from "@/server/platform/errors";
import { parseOrThrow } from "@/server/identity/service";
import { recordAudit } from "@/server/audit/audit";
import { buildDashboard } from "@/server/analytics/portfolio";
import { listMembers } from "@/server/identity/members";
import { d, sum, ZERO, type Decimal } from "@/engine";

/**
 * Household view: net worth by person in a shared space. Each account's value in the space (after
 * its ownership percent) is split between members by their shares; whatever isn't assigned is
 * shown as "shared / unassigned". Figures come from the dashboard calculation, so the people plus
 * unassigned always add up to the space's net worth.
 */
export interface HouseholdView {
  asOf: string;
  baseCurrency: string;
  complete: boolean;
  netWorth: string;
  people: Array<{ userId: string; name: string; role: string; netWorth: string; share: string | null }>;
  unassigned: string;
  accounts: Array<{ accountId: string; name: string; kind: "asset" | "liability"; value: string | null; owners: Array<{ userId: string; percent: string }> }>;
}

export async function householdView(ctx: TenantContext, baseCurrency: string): Promise<HouseholdView> {
  const [dash, members] = await Promise.all([buildDashboard(ctx, { baseCurrency, period: "1M" }), listMembers(ctx)]);
  const { accounts, owners } = await withTenant(ctx, async (tx) => ({
    accounts: await tx.select({ id: financialAccounts.id, name: financialAccounts.name, accountClass: financialAccounts.accountClass, status: financialAccounts.status }).from(financialAccounts),
    owners: await tx.select().from(accountOwners),
  }));
  const value = new Map<string, Decimal>();
  const add = (id: string, v: Decimal) => value.set(id, (value.get(id) ?? ZERO).plus(v));
  for (const h of dash.holdings) if (h.marketValueBase) add(h.accountId, d(h.marketValueBase).times(h.ownershipShare));
  for (const c of dash.cash) if (c.amountBase) add(c.accountId, d(c.amountBase).times(c.ownershipShare));
  for (const m of dash.manual) if (m.amountBase) add(m.accountId, m.kind === "liability" ? d(m.amountBase).negated() : d(m.amountBase));

  const total = sum([...value.values()]);
  const perPerson = new Map<string, Decimal>(members.map((m) => [m.userId, ZERO]));
  for (const o of owners) {
    const v = value.get(o.accountId);
    if (v && perPerson.has(o.userId)) perPerson.set(o.userId, perPerson.get(o.userId)!.plus(v.times(d(o.percent).div(100))));
  }
  const assigned = sum([...perPerson.values()]);
  return {
    asOf: dash.asOf,
    baseCurrency: dash.baseCurrency,
    complete: dash.totals.complete,
    netWorth: total.toFixed(2),
    people: members.map((m) => {
      const v = perPerson.get(m.userId)!;
      return { userId: m.userId, name: m.displayName, role: m.role, netWorth: v.toFixed(2), share: total.isZero() ? null : v.div(total).toFixed(6) };
    }),
    unassigned: total.minus(assigned).toFixed(2),
    accounts: accounts
      .filter((a) => a.status === "open" || value.has(a.id))
      .map((a) => ({ accountId: a.id, name: a.name, kind: a.accountClass === "liability" ? ("liability" as const) : ("asset" as const), value: value.get(a.id)?.toFixed(2) ?? null, owners: owners.filter((o) => o.accountId === a.id).map((o) => ({ userId: o.userId, percent: d(o.percent).toFixed() })) })),
  };
}

const sharesSchema = z.array(z.object({ userId: z.string().uuid(), percent: z.string().trim().regex(/^\d{1,3}(\.\d{1,4})?$/, "A percentage like 50") })).max(20);

/** Replace who owns an account (shares in percent; empty = shared / unassigned). */
export async function setAccountOwners(ctx: TenantContext, accountId: string, input: unknown): Promise<void> {
  const shares = parseOrThrow(sharesSchema, input).filter((s) => d(s.percent).gt(0));
  if (new Set(shares.map((s) => s.userId)).size !== shares.length) throw new AppError("VALIDATION", "Each person can appear once.");
  const totalPct = shares.reduce((a, s) => a.plus(d(s.percent)), ZERO);
  if (totalPct.gt(100)) throw new AppError("VALIDATION", `Shares add up to ${totalPct.toFixed()}%; they can't exceed 100%.`);
  await withTenant(ctx, async (tx) => {
    // Lock the account so two edits can't race past the 100% check.
    const r = await tx.execute(sql`select id from financial_accounts where id = ${accountId} for update`);
    if (!r.rows.length) throw new AppError("NOT_FOUND", "Account not found.");
    await tx.delete(accountOwners).where(and(eq(accountOwners.accountId, accountId), eq(accountOwners.orgId, ctx.orgId)));
    if (shares.length) await tx.insert(accountOwners).values(shares.map((s) => ({ orgId: ctx.orgId, accountId, userId: s.userId, percent: s.percent })));
    await recordAudit(tx, { orgId: ctx.orgId, actorUserId: ctx.userId, action: "household.owners_set", targetType: "financial_account", targetId: accountId, metadata: { shares } });
  }).catch((err: unknown) => {
    let cur = err;
    for (let i = 0; i < 4 && cur; i++) {
      const m = (cur as { message?: string }).message ?? "";
      if (m.includes("WOS_HOUSEHOLD")) throw new AppError("VALIDATION", m.replace(/^.*WOS_HOUSEHOLD:\s*/, "").replace(/^./, (c) => c.toUpperCase()) + ".");
      cur = (cur as { cause?: unknown }).cause;
    }
    throw err;
  });
}
