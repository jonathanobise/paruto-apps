import { requireApp } from "@/server/auth/context";
import { buildDashboard } from "@/server/analytics/portfolio";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Stat } from "@/components/app/stat";
import { NetWorthChart } from "@/components/app/net-worth-chart";
import { formatDate, formatMoney } from "@/lib/format";
import { DISCLOSURES } from "@/server/compliance/features";

export const metadata = { title: "Net worth" };

export default async function NetWorthPage() {
  const app = await requireApp();
  const d = await buildDashboard(app.ctx, { baseCurrency: app.baseCurrency, period: "ALL" });
  const ccy = d.baseCurrency;
  const ledgerTotal = Number(d.totals.assets) - Number(d.totals.manualAssets);
  const first = d.history.find((h) => h.netWorth !== null);
  const last = [...d.history].reverse().find((h) => h.netWorth !== null);
  return (
    <>
      <PageHeader title="Net worth" description={`What you own minus what you owe, in ${ccy}, as of ${formatDate(d.asOf)}. Jointly owned items count at your share.`} />
      <Card className="mb-6">
        <CardContent className="pt-5">
          <dl className="grid gap-6 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
            <Stat size="lg" label="Net worth" value={formatMoney(d.totals.netWorth, ccy, { decimals: 0 })} />
            <Stat label="Financial assets" value={formatMoney(String(ledgerTotal), ccy, { decimals: 0 })} sub="Cash and investments (ledger)" />
            <Stat label="Other assets" value={formatMoney(d.totals.manualAssets, ccy, { decimals: 0 })} sub="Your estimates" />
            <Stat label="Liabilities" value={formatMoney(d.totals.liabilities, ccy, { decimals: 0 })} sub="Outstanding balances" />
          </dl>
          {first && last && first.date !== last.date ? (
            <p className="mt-5 text-[13px] text-text-2">
              Since {formatDate(first.date)}: net worth changed by <span className="num font-medium text-text">{formatMoney(String(last.netWorth! - first.netWorth!), ccy, { decimals: 0, signed: true })}</span>, of which{" "}
              <span className="num font-medium text-text">{formatMoney(String((last.contributions ?? 0) - (first.contributions ?? 0)), ccy, { decimals: 0, signed: true })}</span> was money you added or withdrew.
            </p>
          ) : null}
        </CardContent>
      </Card>
      <Card className="mb-6">
        <CardHeader><div><CardTitle>History</CardTitle><CardDescription>Month-end values from your first record.</CardDescription></div></CardHeader>
        <CardContent>{d.history.length > 1 ? <NetWorthChart data={d.history} currency={ccy} /> : <p className="text-sm text-text-3">History appears after your first month of records.</p>}</CardContent>
      </Card>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><div><CardTitle>Other assets</CardTitle><CardDescription>{DISCLOSURES.estimates}</CardDescription></div></CardHeader>
          <CardContent>
            {d.manual.filter((m) => m.kind === "asset").length ? (
              <ul className="divide-y divide-border text-[13px]">
                {d.manual.filter((m) => m.kind === "asset").map((m) => (
                  <li key={m.accountId} className="flex justify-between gap-3 py-2"><span>{m.name}<span className="block text-text-3">{m.valuationType} · {formatDate(m.valuedOn)}{m.ownershipPercent !== "100" ? ` · ${m.ownershipPercent}% yours` : ""}</span></span><span className="num font-medium">{formatMoney(m.amountBase, ccy, { decimals: 0 })}</span></li>
                ))}
              </ul>
            ) : <p className="text-sm text-text-3">Add property, business interests or a pension from Accounts.</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Liabilities</CardTitle></CardHeader>
          <CardContent>
            {d.manual.filter((m) => m.kind === "liability").length ? (
              <ul className="divide-y divide-border text-[13px]">
                {d.manual.filter((m) => m.kind === "liability").map((m) => (
                  <li key={m.accountId} className="flex justify-between gap-3 py-2"><span>{m.name}<span className="block text-text-3">{m.valuationType} · {formatDate(m.valuedOn)}</span></span><span className="num font-medium">{formatMoney(m.amountBase, ccy, { decimals: 0 })}</span></li>
                ))}
              </ul>
            ) : <p className="text-sm text-text-3">No liabilities recorded.</p>}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
