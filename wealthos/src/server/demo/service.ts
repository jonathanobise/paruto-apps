import "server-only";
import { and, eq, inArray, sql } from "drizzle-orm";
import { instruments, modelPortfolios } from "@/server/db/schema";
import { db, withTenant, withUser } from "@/server/db/client";
import { AppError } from "@/server/platform/errors";
import { createAccount } from "@/server/accounts/service";
import { postEvent } from "@/server/ledger/service";
import { Decimal, d } from "@/engine";
import { DEMO_INSTRUMENTS, DEMO_START, FOUNDER_MODEL, sampleFxSeries, samplePriceSeries, tbillPrice, type DemoInstrument } from "./data";

/**
 * Create a separate DEMO organisation for the user and fill it with the founder's hypothetical
 * balanced portfolio. Every transaction goes through the normal ledger service (source "demo"),
 * so the demo exercises exactly the same code paths as real data. Prices are SAMPLE data.
 */
export async function createDemoPortfolio(userId: string): Promise<string> {
  const today = new Date().toISOString().slice(0, 10);
  const catalogue = await db().select().from(instruments).where(and(eq(instruments.isDemo, true), inArray(instruments.symbol, DEMO_INSTRUMENTS.map((i) => i.symbol))));
  if (catalogue.length !== DEMO_INSTRUMENTS.length) throw new AppError("FEATURE_UNAVAILABLE", "Demo data is not installed on this server. An administrator must run `npm run db:seed-demo`.");
  const idOf = (key: string) => {
    const inst = DEMO_INSTRUMENTS.find((i) => i.key === key)!;
    return catalogue.find((c) => c.symbol === inst.symbol)!.id;
  };
  const series = new Map(DEMO_INSTRUMENTS.map((i) => [i.key, samplePriceSeries(i, today)]));
  const priceOn = (key: string, date: string): Decimal => {
    const s = series.get(key)!;
    const hit = [...s].reverse().find((p) => p.date <= date);
    if (!hit) throw new Error(`no sample price for ${key} on ${date}`);
    return d(hit.price);
  };
  const fx = sampleFxSeries(today).filter((r) => r.base === "USD" && r.quote === "NGN");
  const usdNgnOn = (date: string) => d([...fx].reverse().find((r) => r.date <= date)!.rate);

  const orgRes = await withUser(userId, (tx) => tx.execute<{ id: string }>(sql`select app_create_organization(${userId}::uuid, ${"Founder demo portfolio"}, 'demo'::org_kind, true) as id`));
  const ctx = { userId, orgId: orgRes.rows[0]!.id };

  const bank = (await createAccount(ctx, { name: "Demo current account", type: "bank", currency: "NGN", institutionName: "Sample Bank" })).id;
  const funds = (await createAccount(ctx, { name: "Demo fund account", type: "mutual_fund", currency: "NGN", institutionName: "Sample fund platform" })).id;
  const bills = (await createAccount(ctx, { name: "Demo T-bill account", type: "treasury_bills", currency: "NGN", institutionName: "Sample bank (T-bills)" })).id;
  const ngBroker = (await createAccount(ctx, { name: "Demo NGX stockbroking account", type: "brokerage", currency: "NGN", institutionName: "Sample stockbroker" })).id;
  const usdBroker = (await createAccount(ctx, { name: "Demo USD investment account", type: "brokerage", currency: "USD", institutionName: "Sample global broker" })).id;

  const post = (e: Record<string, unknown>) => (String(e.occurredOn) <= today ? postEvent(ctx, e, "demo") : Promise.resolve(null));
  const ngn = (v: Decimal) => v.toDecimalPlaces(2, Decimal.ROUND_DOWN).toFixed(2);
  const units = (amount: Decimal, price: Decimal, dp: number) => amount.div(price).toDecimalPlaces(dp, Decimal.ROUND_DOWN);

  const t0 = DEMO_START;
  await post({ type: "deposit", accountId: bank, currency: "NGN", amount: "10000000", occurredOn: t0, description: "Starting capital (hypothetical)" });

  // 25% money-market funds
  await post({ type: "transfer", fromAccountId: bank, toAccountId: funds, currency: "NGN", amount: "2500000", occurredOn: t0 });
  for (const key of ["coronation-mmf", "stanbic-mmf"]) {
    const p = priceOn(key, t0);
    await post({ type: "buy", accountId: funds, instrumentId: idOf(key), quantity: units(d(1_250_000), p, 4).toFixed(), price: p.toFixed(), fees: "0", currency: "NGN", occurredOn: t0 });
  }

  // 20% Treasury bills
  const tb1 = DEMO_INSTRUMENTS.find((i) => i.key === "ntb-2026-01") as DemoInstrument;
  const tb1Price = tbillPrice(tb1, t0);
  const tb1Face = units(d(2_000_000), tb1Price, 0);
  await post({ type: "transfer", fromAccountId: bank, toAccountId: bills, currency: "NGN", amount: "2000000", occurredOn: t0 });
  await post({ type: "buy", accountId: bills, instrumentId: idOf("ntb-2026-01"), quantity: tb1Face.toFixed(), price: tb1Price.toFixed(), fees: "0", currency: "NGN", occurredOn: t0, description: `SAMPLE ${d(tb1.sampleDiscountRate!).times(100).toFixed(1)}% discount rate` });

  // 15% Nigerian equities (0.75% SAMPLE dealing costs)
  await post({ type: "transfer", fromAccountId: bank, toAccountId: ngBroker, currency: "NGN", amount: "1500000", occurredOn: t0 });
  const shares: Record<string, Decimal> = {};
  for (const key of ["gtco", "zenith", "mtnn", "dangcem"]) {
    const p = priceOn(key, t0);
    const q = units(d(370_000), p, 0);
    shares[key] = q;
    await post({ type: "buy", accountId: ngBroker, instrumentId: idOf(key), quantity: q.toFixed(), price: p.toFixed(), fees: ngn(q.times(p).times("0.0075")), currency: "NGN", occurredOn: t0 });
  }

  // 40% USD: 10% short-term USD fixed income + 30% global equity ETFs
  const rate0 = usdNgnOn(t0);
  const usd = d(4_000_000).div(rate0).toDecimalPlaces(2, Decimal.ROUND_DOWN);
  await post({ type: "transfer", fromAccountId: bank, toAccountId: usdBroker, currency: "NGN", amount: "4000000", occurredOn: t0 });
  await post({ type: "fx_conversion", accountId: usdBroker, fromCurrency: "NGN", fromAmount: "4000000", toCurrency: "USD", toAmount: usd.toFixed(2), fees: "0", occurredOn: t0, description: `SAMPLE rate ₦${rate0.toFixed(2)}/$` });
  for (const [key, share] of [["ib01", "0.25"], ["vt", "0.375"], ["cspx", "0.375"]] as const) {
    const p = priceOn(key, t0);
    await post({ type: "buy", accountId: usdBroker, instrumentId: idOf(key), quantity: units(usd.times(share).minus(1), p, 4).toFixed(), price: p.toFixed(), fees: "1", currency: "USD", occurredOn: t0 });
  }

  // Later activity
  await post({ type: "dividend", accountId: ngBroker, instrumentId: idOf("gtco"), currency: "NGN", grossAmount: ngn(shares.gtco!.times(3)), withholdingTax: ngn(shares.gtco!.times("0.3")), occurredOn: "2025-04-22", description: "SAMPLE final dividend" });
  await post({ type: "dividend", accountId: ngBroker, instrumentId: idOf("zenith"), currency: "NGN", grossAmount: ngn(shares.zenith!.times(4)), withholdingTax: ngn(shares.zenith!.times("0.4")), occurredOn: "2025-05-14", description: "SAMPLE final dividend" });
  await post({ type: "deposit", accountId: bank, currency: "NGN", amount: "1000000", occurredOn: "2025-07-01", description: "Top-up (hypothetical)" });
  await post({ type: "transfer", fromAccountId: bank, toAccountId: funds, currency: "NGN", amount: "1000000", occurredOn: "2025-07-01" });
  const pMid = priceOn("coronation-mmf", "2025-07-01");
  await post({ type: "buy", accountId: funds, instrumentId: idOf("coronation-mmf"), quantity: units(d(1_000_000), pMid, 4).toFixed(), price: pMid.toFixed(), fees: "0", currency: "NGN", occurredOn: "2025-07-01" });
  await post({ type: "dividend", accountId: ngBroker, instrumentId: idOf("mtnn"), currency: "NGN", grossAmount: ngn(shares.mtnn!.times(5)), withholdingTax: ngn(shares.mtnn!.times("0.5")), occurredOn: "2025-09-30", description: "SAMPLE interim dividend" });

  // T-bill maturity and roll-over
  await post({ type: "maturity", accountId: bills, instrumentId: idOf("ntb-2026-01"), quantity: tb1Face.toFixed(), proceeds: tb1Face.toFixed(2), currency: "NGN", occurredOn: "2026-01-01" });
  const tb2 = DEMO_INSTRUMENTS.find((i) => i.key === "ntb-2026-12") as DemoInstrument;
  const tb2Price = tbillPrice(tb2, "2026-01-02");
  await post({ type: "buy", accountId: bills, instrumentId: idOf("ntb-2026-12"), quantity: units(tb1Face, tb2Price, 0).toFixed(), price: tb2Price.toFixed(), fees: "0", currency: "NGN", occurredOn: "2026-01-02", description: `Roll-over at SAMPLE ${d(tb2.sampleDiscountRate!).times(100).toFixed(1)}% discount rate` });

  // A partial sale (realised gain/loss) and another dividend
  const gtcoSale = shares.gtco!.div(4).toDecimalPlaces(0, Decimal.ROUND_DOWN);
  const pSale = priceOn("gtco", "2026-03-02");
  await post({ type: "sell", accountId: ngBroker, instrumentId: idOf("gtco"), quantity: gtcoSale.toFixed(), price: pSale.toFixed(), fees: ngn(gtcoSale.times(pSale).times("0.0075")), currency: "NGN", occurredOn: "2026-03-02", description: "Partial sale (hypothetical)" });
  await post({ type: "dividend", accountId: ngBroker, instrumentId: idOf("gtco"), currency: "NGN", grossAmount: ngn(shares.gtco!.minus(gtcoSale).times("3.5")), withholdingTax: ngn(shares.gtco!.minus(gtcoSale).times("0.35")), occurredOn: "2026-04-21", description: "SAMPLE final dividend" });

  await withTenant(ctx, (tx) => tx.insert(modelPortfolios).values({ orgId: ctx.orgId, name: FOUNDER_MODEL.name, description: FOUNDER_MODEL.description, targets: FOUNDER_MODEL.targets, isHypothetical: true, createdBy: userId }));
  return ctx.orgId;
}
