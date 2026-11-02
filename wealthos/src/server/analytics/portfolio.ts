import "server-only";
import { asc, desc, eq } from "drizzle-orm";
import { accountValuations, financialAccounts, ledgerEvents, organizations } from "@/server/db/schema";
import { withTenant, type TenantContext, type Tx } from "@/server/db/client";
import {
  ASSET_CLASS_LABELS,
  Decimal,
  MissingFxRateError,
  PortfolioBook,
  ZERO,
  addDays,
  allocate,
  analyzePerformance,
  concentration,
  d,
  daysBetween,
  effectiveEvents,
  monthEndsBetween,
  sortEvents,
  sum,
  valueBook,
  type FxTable,
  type ISODate,
  type InstrumentInfo,
  type LedgerEvent,
  type PerformanceResult,
  type Valuation,
  type ValuationIssue,
} from "@/engine";
import { loadEvents, loadInstrumentMap, instrumentIdsOf } from "@/server/ledger/service";
import { toEngineEvent, EVENT_LABELS } from "@/server/ledger/codec";
import { loadFxTable, loadPriceTable } from "@/server/market-data/service";
import { withSnapshot } from "./cache";

export { periodStart };
export const PERIODS = { "1M": 30, "3M": 91, "6M": 182, YTD: -1, "1Y": 365, "3Y": 1095, ALL: 0 } as const;
export type PeriodKey = keyof typeof PERIODS;

type AccountRow = typeof financialAccounts.$inferSelect;
type ValuationRow = typeof accountValuations.$inferSelect;

export interface ManualItem {
  accountId: string;
  name: string;
  kind: "asset" | "liability";
  type: string;
  currency: string;
  amount: Decimal;
  amountBase: Decimal | null;
  ownershipPercent: Decimal;
  valuedOn: ISODate;
  valuationType: string;
  ageDays: number;
}

export interface HoldingView {
  accountId: string;
  accountName: string;
  instrumentId: string;
  name: string;
  symbol: string | null;
  assetClass: string;
  assetClassKey: string;
  country: string;
  currency: string;
  quantity: string;
  price: string | null;
  priceDate: string | null;
  method: string;
  marketValue: string | null;
  marketValueBase: string | null;
  cost: string;
  costBase: string | null;
  unrealized: string | null;
  unrealizedBase: string | null;
  weight: string | null;
  synthetic: boolean;
  maturityDate: string | null;
}

export interface DashboardData {
  asOf: ISODate;
  baseCurrency: string;
  isDemo: boolean;
  orgName: string;
  hasData: boolean;
  totals: {
    netWorth: string;
    assets: string;
    liabilities: string;
    invested: string;
    cash: string;
    manualAssets: string;
    unrealized: string;
    realized: string;
    income: string;
    complete: boolean;
  };
  performance: null | {
    period: PeriodKey;
    start: ISODate;
    end: ISODate;
    startValue: string;
    endValue: string;
    netContributions: string;
    investmentGain: string;
    incomeGross: string;
    withholdingTax: string;
    fees: string;
    realizedGain: string;
    fxEffect: string | null;
    twr: string | null;
    twrAnnualized: string | null;
    xirr: number | null;
    complete: boolean;
    days: number;
  };
  history: Array<{ date: ISODate; netWorth: number | null; invested: number | null; contributions: number | null; complete: boolean }>;
  allocation: { assetClass: Slice[]; geography: Slice[]; currency: Slice[] };
  concentration: { largestName: string | null; largestWeight: string | null; top5Weight: string; effectiveHoldings: string | null } | null;
  holdings: HoldingView[];
  cash: Array<{ accountId: string; accountName: string; currency: string; amount: string; amountBase: string | null }>;
  manual: Array<Omit<ManualItem, "amount" | "amountBase" | "ownershipPercent"> & { amount: string; amountBase: string | null; ownershipPercent: string }>;
  recent: Array<{ id: string; date: string; type: string; label: string; description: string | null; accountName: string; reversed: boolean; isReversal: boolean }>;
  maturities: Array<{ instrumentId: string; name: string; accountName: string; maturityDate: string; daysToGo: number; faceValue: string | null; currency: string }>;
  issues: Array<ValuationIssue & { label: string }>;
  freshness: { latestPriceDate: string | null; oldestPriceDate: string | null; syntheticData: boolean };
}

export interface Slice {
  key: string;
  label: string;
  value: string;
  weight: string;
}

function toSlices(r: ReturnType<typeof allocate>): Slice[] {
  return r.slices.map((s) => ({ key: s.key, label: s.label, value: s.value.toFixed(2), weight: s.weight.toFixed(6) }));
}

function periodStart(period: PeriodKey, asOf: ISODate, firstEvent: ISODate | null): ISODate {
  const first = firstEvent ?? asOf;
  if (period === "ALL") return first;
  if (period === "YTD") return `${asOf.slice(0, 4)}-01-01` > first ? `${asOf.slice(0, 4)}-01-01` : first;
  const s = addDays(asOf, -PERIODS[period]);
  return s > first ? s : first;
}

function latestValuation(rows: ValuationRow[], accountId: string, date: ISODate): ValuationRow | undefined {
  let best: ValuationRow | undefined;
  for (const r of rows) {
    if (r.accountId !== accountId || r.valuedOn > date) continue;
    if (!best || r.valuedOn > best.valuedOn || (r.valuedOn === best.valuedOn && r.createdAt > best.createdAt)) best = r;
  }
  return best;
}

function manualItems(accounts: AccountRow[], valuations: ValuationRow[], date: ISODate, base: string, fx: FxTable): { items: ManualItem[]; issues: ValuationIssue[] } {
  const items: ManualItem[] = [];
  const issues: ValuationIssue[] = [];
  for (const a of accounts) {
    if (a.accountClass === "ledger") continue;
    if (a.status === "closed" && a.closedOn && a.closedOn <= date) continue;
    const v = latestValuation(valuations, a.id, date);
    if (!v) continue;
    const share = d(a.ownershipPercent).div(100);
    const amount = d(v.amount).times(share);
    let amountBase: Decimal | null = null;
    try {
      amountBase = amount.times(fx.quote(v.currency, base, date).rate);
    } catch (err) {
      if (!(err instanceof MissingFxRateError)) throw err;
      issues.push({ code: "MISSING_FX", accountId: a.id, currency: v.currency, message: `${a.name}: no ${v.currency}->${base} rate for ${date}` });
    }
    const ageDays = daysBetween(v.valuedOn, date);
    items.push({ accountId: a.id, name: a.name, kind: a.accountClass === "liability" ? "liability" : "asset", type: a.type, currency: v.currency, amount, amountBase, ownershipPercent: d(a.ownershipPercent), valuedOn: v.valuedOn, valuationType: v.valuationType, ageDays });
  }
  return { items, issues };
}

const ISSUE_LABELS: Record<string, string> = {
  STALE_PRICE: "Stale price",
  MISSING_PRICE: "Missing price",
  VALUED_AT_COST: "Valued at cost",
  MODEL_VALUATION: "Model valuation",
  MATURED_NOT_REDEEMED: "Matured",
  MISSING_FX: "Missing FX rate",
  STALE_FX: "Stale FX rate",
  TRIANGULATED_FX: "Cross FX rate",
  SYNTHETIC_DATA: "Sample data",
};

/** Ownership share applied to ledger accounts for net worth (performance uses full values). */
function ownershipShare(accounts: AccountRow[], accountId: string): Decimal {
  const a = accounts.find((x) => x.id === accountId);
  return a ? d(a.ownershipPercent).div(100) : d(1);
}

function netWorthOf(valuation: Valuation, accounts: AccountRow[], manual: ManualItem[]): { assets: Decimal; liabilities: Decimal; ledger: Decimal; manualAssets: Decimal } {
  const ledger = sum([
    ...valuation.holdings.flatMap((h) => (h.marketValueBase ? [h.marketValueBase.times(ownershipShare(accounts, h.accountId))] : [])),
    ...valuation.cash.flatMap((c) => (c.amountBase ? [c.amountBase.times(ownershipShare(accounts, c.accountId))] : [])),
  ]);
  const manualAssets = sum(manual.filter((m) => m.kind === "asset" && m.amountBase).map((m) => m.amountBase!));
  const liabilities = sum(manual.filter((m) => m.kind === "liability" && m.amountBase).map((m) => m.amountBase!));
  return { assets: ledger.plus(manualAssets), liabilities, ledger, manualAssets };
}

/** Everything the analytics need, loaded once inside a tenant transaction. */
export async function loadPortfolioInputs(tx: Tx, ctx: TenantContext, asOf: ISODate, earliest?: ISODate) {
  const [org] = await tx.select().from(organizations).where(eq(organizations.id, ctx.orgId)).limit(1);
  const accounts = await tx.select().from(financialAccounts).orderBy(asc(financialAccounts.createdAt));
  const valuations = await tx.select().from(accountValuations).orderBy(desc(accountValuations.valuedOn));
  const eventRows = await loadEvents(tx);
  const events: LedgerEvent[] = eventRows.map(toEngineEvent);
  const effective = sortEvents(effectiveEvents(events));
  const firstDate = [...effective.map((e) => e.date), ...valuations.map((v) => v.valuedOn)].sort()[0] ?? null;
  const instrumentMap = await loadInstrumentMap(tx, instrumentIdsOf(events));
  const from = [firstDate ?? asOf, earliest ?? asOf].sort()[0]!;
  const { table: prices, latest } = await loadPriceTable(tx, [...instrumentMap.keys()], from, asOf);
  const fx = await loadFxTable(tx, from, asOf);
  return { org, accounts, valuations, eventRows, events, effective, firstDate, instrumentMap, prices, latest, fx };
}

export async function buildDashboard(ctx: TenantContext, opts: { baseCurrency: string; period: PeriodKey; asOf?: ISODate; bypassCache?: boolean }): Promise<DashboardData> {
  const asOf = opts.asOf ?? new Date().toISOString().slice(0, 10);
  const base = opts.baseCurrency;
  return withTenant(ctx, (tx) => withSnapshot(tx, ctx, "dashboard", `${base}|${opts.period}|${asOf}`, async () => {
    const { org, accounts, valuations, eventRows, events, effective, firstDate, instrumentMap, prices, latest, fx } = await loadPortfolioInputs(tx, ctx, asOf);
    const start = periodStart(opts.period, asOf, firstDate);
    const accountName = (id: string) => accounts.find((a) => a.id === id)?.name ?? "Unknown account";

    const ledgerIds = new Set(accounts.filter((a) => a.accountClass === "ledger").map((a) => a.id));
    const investmentIds = new Set(accounts.filter((a) => a.accountClass === "ledger" && a.isInvestment).map((a) => a.id));
    const book = PortfolioBook.replay(events, { baseCurrency: base, instruments: instrumentMap, fx });
    const valuation = valueBook(book, { date: asOf, baseCurrency: base, instruments: instrumentMap, prices, fx }, ledgerIds);
    const manual = manualItems(accounts, valuations, asOf, base, fx);
    const nw = netWorthOf(valuation, accounts, manual.items);

    const investedHoldings = valuation.holdings.filter((h) => investmentIds.has(h.accountId));
    const invested = sum(investedHoldings.flatMap((h) => (h.marketValueBase ? [h.marketValueBase] : [])));
    const unrealized = sum(valuation.holdings.flatMap((h) => (h.unrealizedBase ? [h.unrealizedBase] : [])));
    const realizedAll = sum(book.realized.flatMap((r) => (r.gainBase ? [r.gainBase] : [])));
    let incomeAll = ZERO;
    for (const r of book.income) {
      try {
        incomeAll = incomeAll.plus(r.gross.times(fx.quote(r.currency, base, r.date).rate));
      } catch (err) {
        if (!(err instanceof MissingFxRateError)) throw err;
      }
    }

    // Performance over the selected period for investment accounts (falls back to all ledger accounts).
    const perfScope = investmentIds.size ? investmentIds : ledgerIds;
    let performance: PerformanceResult | null = null;
    if (effective.length && start < asOf) {
      performance = analyzePerformance({ events, instruments: instrumentMap, prices, fx, baseCurrency: base, scope: perfScope, start, end: asOf });
    }

    // Net-worth history (month ends + period endpoints), always from the first record.
    const history: DashboardData["history"] = [];
    if (firstDate) {
      const dates = [...new Set([...monthEndsBetween(firstDate, asOf)])].sort();
      const hBook = new PortfolioBook({ baseCurrency: base, instruments: instrumentMap, fx });
      let i = 0;
      let flowCursor = 0;
      let contributions = ZERO;
      let contributionsComplete = true;
      for (const date of dates) {
        while (i < effective.length && effective[i]!.date <= date) hBook.apply(effective[i++]!);
        for (const f of hBook.flows.slice(flowCursor)) {
          if (f.kind !== "cash" || !ledgerIds.has(f.accountId) || (f.counterpartyAccountId && ledgerIds.has(f.counterpartyAccountId))) continue;
          try {
            contributions = contributions.plus(f.amount!.times(f.direction).times(fx.quote(f.currency, base, f.date).rate));
          } catch (err) {
            if (!(err instanceof MissingFxRateError)) throw err;
            contributionsComplete = false;
          }
        }
        flowCursor = hBook.flows.length;
        const v = valueBook(hBook, { date, baseCurrency: base, instruments: instrumentMap, prices, fx }, ledgerIds);
        const m = manualItems(accounts, valuations, date, base, fx);
        const n = netWorthOf(v, accounts, m.items);
        const complete = v.complete && m.issues.length === 0;
        const inv = sum(v.holdings.filter((h) => investmentIds.has(h.accountId)).flatMap((h) => (h.marketValueBase ? [h.marketValueBase] : [])));
        history.push({ date, netWorth: complete ? n.assets.minus(n.liabilities).toNumber() : null, invested: v.complete ? inv.toNumber() : null, contributions: contributionsComplete ? contributions.toNumber() : null, complete });
      }
    }

    // Allocation of assets (ledger holdings + cash + manual assets), base currency.
    const allocItems = [
      ...valuation.holdings.flatMap((h) => {
        const info = instrumentMap.get(h.instrumentId)!;
        return h.marketValueBase ? [{ info, value: h.marketValueBase.times(ownershipShare(accounts, h.accountId)), currency: h.currency }] : [];
      }),
    ];
    const cashItems = valuation.cash.flatMap((c) => (c.amountBase ? [{ value: c.amountBase.times(ownershipShare(accounts, c.accountId)), currency: c.currency }] : []));
    const manualAssetItems = manual.items.filter((m) => m.kind === "asset" && m.amountBase);
    const manualClass = (type: string) => (type === "real_estate" ? "real_estate" : type === "business" ? "business" : type === "pension" ? "pension" : "other");
    const byClass = allocate([
      ...allocItems.map((x) => ({ key: x.info.assetClass, label: ASSET_CLASS_LABELS[x.info.assetClass], value: x.value })),
      ...cashItems.map((c) => ({ key: "cash", label: "Cash", value: c.value })),
      ...manualAssetItems.map((m) => ({ key: manualClass(m.type), label: ASSET_CLASS_LABELS[manualClass(m.type) as keyof typeof ASSET_CLASS_LABELS], value: m.amountBase! })),
    ]);
    const geoLabel = (c: string) => (c === "NG" ? "Nigeria" : c === "GLOBAL" ? "Global (diversified)" : c === "US" ? "United States" : c);
    const byGeo = allocate([
      ...allocItems.map((x) => ({ key: x.info.country, label: geoLabel(x.info.country), value: x.value })),
      ...cashItems.map((c) => ({ key: c.currency === "NGN" ? "NG" : `CASH-${c.currency}`, label: c.currency === "NGN" ? "Nigeria" : `Cash (${c.currency})`, value: c.value })),
      ...manualAssetItems.map((m) => ({ key: "NG", label: "Nigeria", value: m.amountBase! })),
    ]);
    const byCurrency = allocate([
      ...allocItems.map((x) => ({ key: x.currency, label: x.currency, value: x.value })),
      ...cashItems.map((c) => ({ key: c.currency, label: c.currency, value: c.value })),
      ...manualAssetItems.map((m) => ({ key: m.currency, label: m.currency, value: m.amountBase! })),
    ]);
    const conc = allocItems.length ? concentration(valuation.holdings.flatMap((h) => (h.marketValueBase ? [{ key: h.instrumentId, label: instrumentMap.get(h.instrumentId)?.name ?? h.instrumentId, value: h.marketValueBase }] : [])), d("0.25")) : null;

    const holdingsTotal = sum(valuation.holdings.flatMap((h) => (h.marketValueBase ? [h.marketValueBase] : [])));
    const holdings: HoldingView[] = valuation.holdings
      .map((h) => {
        const info = instrumentMap.get(h.instrumentId) as InstrumentInfo;
        return {
          accountId: h.accountId,
          accountName: accountName(h.accountId),
          instrumentId: h.instrumentId,
          name: info.name,
          symbol: info.symbol ?? null,
          assetClass: ASSET_CLASS_LABELS[info.assetClass],
          assetClassKey: info.assetClass,
          country: info.country,
          currency: h.currency,
          quantity: h.quantity.toFixed(),
          price: h.price?.toFixed(6) ?? null,
          priceDate: h.priceDate,
          method: h.method,
          marketValue: h.marketValue?.toFixed(2) ?? null,
          marketValueBase: h.marketValueBase?.toFixed(2) ?? null,
          cost: h.cost.toFixed(2),
          costBase: h.costBase?.toFixed(2) ?? null,
          unrealized: h.unrealized?.toFixed(2) ?? null,
          unrealizedBase: h.unrealizedBase?.toFixed(2) ?? null,
          weight: h.marketValueBase && !holdingsTotal.isZero() ? h.marketValueBase.div(holdingsTotal).toFixed(6) : null,
          synthetic: h.synthetic,
          maturityDate: info.maturityDate ?? null,
        };
      })
      .sort((a, b) => Number(b.marketValueBase ?? 0) - Number(a.marketValueBase ?? 0));

    const reversedIds = new Set(eventRows.filter((r) => r.reversesEventId).map((r) => r.reversesEventId!));
    const recent = [...eventRows]
      .sort((a, b) => (a.occurredOn < b.occurredOn ? 1 : a.occurredOn > b.occurredOn ? -1 : b.createdAt.getTime() - a.createdAt.getTime()))
      .slice(0, 8)
      .map((r) => {
        const p = r.payload as { accountId?: string; fromAccountId?: string };
        return { id: r.id, date: r.occurredOn, type: r.type, label: EVENT_LABELS[r.type as keyof typeof EVENT_LABELS] ?? r.type, description: r.description, accountName: p.accountId ? accountName(p.accountId) : p.fromAccountId ? accountName(p.fromAccountId) : "—", reversed: reversedIds.has(r.id), isReversal: r.type === "reversal" };
      });

    const maturities = book
      .positions()
      .flatMap((p) => {
        const info = instrumentMap.get(p.instrumentId);
        if (!info?.maturityDate || info.maturityDate < addDays(asOf, -30)) return [];
        return [{ instrumentId: p.instrumentId, name: info.name, accountName: accountName(p.accountId), maturityDate: info.maturityDate, daysToGo: daysBetween(asOf, info.maturityDate), faceValue: info.faceValuePerUnit ? p.quantity.times(info.faceValuePerUnit).toFixed(2) : null, currency: info.currency }];
      })
      .sort((a, b) => (a.maturityDate < b.maturityDate ? -1 : 1));

    const allIssues = [...valuation.issues, ...manual.issues, ...(performance?.issues ?? [])];
    for (const m of manual.items) if (m.ageDays > 180) allIssues.push({ code: "STALE_PRICE", accountId: m.accountId, message: `${m.name}: valuation is ${m.ageDays} days old (${m.valuedOn}). Update your estimate.` });
    const seen = new Set<string>();
    const issues = allIssues
      .filter((i) => {
        const k = `${i.code}|${i.accountId ?? ""}|${i.instrumentId ?? ""}|${i.currency ?? ""}`;
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      })
      .map((i) => ({ ...i, label: ISSUE_LABELS[i.code] ?? i.code }));
    const priceDates = [...latest.values()].map((l) => l.observedOn).sort();
    const syntheticData = [...latest.values()].some((l) => l.synthetic) || issues.some((i) => i.code === "SYNTHETIC_DATA");

    return {
      asOf,
      baseCurrency: base,
      isDemo: Boolean(org?.isDemo),
      orgName: org?.name ?? "",
      hasData: accounts.length > 0,
      totals: {
        netWorth: nw.assets.minus(nw.liabilities).toFixed(2),
        assets: nw.assets.toFixed(2),
        liabilities: nw.liabilities.toFixed(2),
        invested: invested.toFixed(2),
        cash: valuation.cashBase.toFixed(2),
        manualAssets: nw.manualAssets.toFixed(2),
        unrealized: unrealized.toFixed(2),
        realized: realizedAll.toFixed(2),
        income: incomeAll.toFixed(2),
        complete: valuation.complete && manual.issues.length === 0,
      },
      performance: performance
        ? {
            period: opts.period,
            start: performance.start,
            end: performance.end,
            startValue: performance.startValue.toFixed(2),
            endValue: performance.endValue.toFixed(2),
            netContributions: performance.netContributions.toFixed(2),
            investmentGain: performance.investmentGain.toFixed(2),
            incomeGross: performance.incomeGross.toFixed(2),
            withholdingTax: performance.withholdingTax.toFixed(2),
            fees: performance.fees.toFixed(2),
            realizedGain: performance.realizedGain.toFixed(2),
            fxEffect: performance.fxEffect?.toFixed(2) ?? null,
            twr: performance.twr?.toFixed(8) ?? null,
            twrAnnualized: performance.twrAnnualized?.toFixed(8) ?? null,
            xirr: performance.xirr,
            complete: performance.complete,
            days: performance.days,
          }
        : null,
      history,
      allocation: { assetClass: toSlices(byClass), geography: toSlices(byGeo), currency: toSlices(byCurrency) },
      concentration: conc ? { largestName: conc.largest?.label ?? null, largestWeight: conc.largest?.weight.toFixed(6) ?? null, top5Weight: conc.topNWeight.toFixed(6), effectiveHoldings: conc.effectiveHoldings?.toFixed(2) ?? null } : null,
      holdings,
      cash: valuation.cash.map((c) => ({ accountId: c.accountId, accountName: accountName(c.accountId), currency: c.currency, amount: c.amount.toFixed(2), amountBase: c.amountBase?.toFixed(2) ?? null })),
      manual: manual.items.map((m) => ({ ...m, amount: m.amount.toFixed(2), amountBase: m.amountBase?.toFixed(2) ?? null, ownershipPercent: m.ownershipPercent.toFixed() })),
      recent,
      maturities,
      issues,
      freshness: { latestPriceDate: priceDates[priceDates.length - 1] ?? null, oldestPriceDate: priceDates[0] ?? null, syntheticData },
    };
  }, { bypass: Boolean(opts.bypassCache) }));
}

export async function listTransactions(ctx: TenantContext) {
  return withTenant(ctx, async (tx) => {
    const rows = await tx.select().from(ledgerEvents).orderBy(desc(ledgerEvents.occurredOn), desc(ledgerEvents.createdAt));
    const accounts = await tx.select({ id: financialAccounts.id, name: financialAccounts.name }).from(financialAccounts);
    const instrumentMap = await loadInstrumentMap(tx, instrumentIdsOf(rows.map(toEngineEvent)));
    const reversedIds = new Map(rows.filter((r) => r.reversesEventId).map((r) => [r.reversesEventId!, r.id]));
    return rows.map((r) => {
      const p = r.payload as Record<string, string | undefined>;
      const name = (id?: string) => (id ? (accounts.find((a) => a.id === id)?.name ?? "—") : null);
      const amount = p.amount ?? p.grossAmount ?? p.proceeds ?? p.fromAmount ?? p.costBasis ?? (p.quantity && p.price ? d(p.quantity).times(d(p.price)).plus(d(p.fees ?? "0")).toFixed() : undefined);
      return {
        id: r.id,
        date: r.occurredOn,
        type: r.type,
        label: EVENT_LABELS[r.type as keyof typeof EVENT_LABELS] ?? r.type,
        description: r.description,
        account: name(p.accountId) ?? (p.fromAccountId ? `${name(p.fromAccountId)} → ${name(p.toAccountId)}` : "All accounts"),
        instrument: p.instrumentId ? (instrumentMap.get(p.instrumentId)?.name ?? "—") : null,
        quantity: p.quantity ?? null,
        price: p.price ?? null,
        amount: amount ?? null,
        currency: p.currency ?? p.fromCurrency ?? null,
        source: r.source,
        reversedBy: reversedIds.get(r.id) ?? null,
        reversesEventId: r.reversesEventId,
        createdAt: r.createdAt.toISOString(),
      };
    });
  });
}
