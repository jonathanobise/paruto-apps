import Link from "next/link";
import { notFound } from "next/navigation";
import { Plus } from "lucide-react";
import { requireApp } from "@/server/auth/context";
import { getAccount, listValuations, ACCOUNT_TYPES } from "@/server/accounts/service";
import { buildDashboard, listTransactions } from "@/server/analytics/portfolio";
import { AppError } from "@/server/platform/errors";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Delta } from "@/components/ui/money";
import { formatDate, formatMoney, formatNumber } from "@/lib/format";
import { DISCLOSURES } from "@/server/compliance/features";
import { ValuationForm } from "./valuation-form";

export default async function AccountPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const app = await requireApp();
  let account;
  try {
    account = await getAccount(app.ctx, id);
  } catch (err) {
    if (err instanceof AppError && err.code === "NOT_FOUND") notFound();
    throw err;
  }
  const typeLabel = ACCOUNT_TYPES[account.type as keyof typeof ACCOUNT_TYPES]?.label ?? account.type;
  const today = new Date().toISOString().slice(0, 10);

  if (account.accountClass !== "ledger") {
    const vals = await listValuations(app.ctx, id);
    return (
      <>
        <PageHeader eyebrow={<Link href="/accounts" className="hover:text-text">← Accounts</Link>} title={account.name} description={`${typeLabel}${account.institutionName ? ` · ${account.institutionName}` : ""} · ${Number(account.ownershipPercent)}% yours`} />
        <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
          <Card>
            <CardHeader><div><CardTitle>Valuation history</CardTitle><CardDescription>{DISCLOSURES.estimates}</CardDescription></div></CardHeader>
            <CardContent>
              <table className="w-full text-[13px]">
                <thead className="text-left text-text-3"><tr><th className="py-2 font-medium">Date</th><th className="py-2 font-medium">Basis</th><th className="py-2 text-right font-medium">Amount</th></tr></thead>
                <tbody>
                  {vals.map((v) => (
                    <tr key={v.id} className="border-t border-border">
                      <td className="py-2">{formatDate(v.valuedOn)}</td>
                      <td className="py-2 capitalize text-text-2">{v.valuationType}{v.note ? ` · ${v.note}` : ""}</td>
                      <td className="num py-2 text-right">{formatMoney(v.amount, v.currency, { decimals: 0 })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
          {app.canWrite ? (
            <Card>
              <CardHeader><CardTitle>Record a new valuation</CardTitle></CardHeader>
              <CardContent><ValuationForm accountId={id} today={today} liability={account.accountClass === "liability"} /></CardContent>
            </Card>
          ) : null}
        </div>
      </>
    );
  }

  const [dash, txs] = await Promise.all([buildDashboard(app.ctx, { baseCurrency: app.baseCurrency, period: "1M" }), listTransactions(app.ctx)]);
  const holdings = dash.holdings.filter((h) => h.accountId === id);
  const cash = dash.cash.filter((c) => c.accountId === id);
  const mine = txs.filter((t) => t.account.includes(account.name)).slice(0, 25);
  return (
    <>
      <PageHeader
        eyebrow={<Link href="/accounts" className="hover:text-text">← Accounts</Link>}
        title={account.name}
        description={`${typeLabel}${account.institutionName ? ` · ${account.institutionName}` : ""}${account.isInvestment ? " · included in investment performance" : ""}`}
        actions={app.canWrite ? (
          <>
            <Button asChild variant="secondary"><Link href={`/transactions/import?account=${id}`}>Import CSV</Link></Button>
            <Button asChild variant="secondary"><Link href={`/transactions/new?account=${id}`}><Plus aria-hidden /> Record transaction</Link></Button>
          </>
        ) : null}
      />
      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <Card>
          <CardHeader><CardTitle>Holdings</CardTitle></CardHeader>
          <CardContent>
            {holdings.length ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[520px] text-[13px]">
                  <thead className="text-left text-text-3"><tr><th className="py-2 font-medium">Instrument</th><th className="py-2 text-right font-medium">Units</th><th className="py-2 text-right font-medium">Value ({dash.baseCurrency})</th><th className="py-2 text-right font-medium">Unrealised</th></tr></thead>
                  <tbody>
                    {holdings.map((h) => (
                      <tr key={h.instrumentId} className="border-t border-border">
                        <td className="py-2"><span className="font-medium">{h.symbol ?? h.name}</span> <span className="text-text-3">{h.name !== h.symbol ? h.name : ""}</span></td>
                        <td className="num py-2 text-right">{formatNumber(h.quantity)}</td>
                        <td className="num py-2 text-right">{formatMoney(h.marketValueBase, dash.baseCurrency, { decimals: 0 })}</td>
                        <td className="py-2 text-right"><Delta value={h.unrealizedBase} currency={dash.baseCurrency} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : <p className="text-sm text-text-3">No securities held in this account.</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Cash</CardTitle></CardHeader>
          <CardContent>
            {cash.length ? cash.map((c) => (
              <div key={c.currency} className="flex justify-between py-1 text-sm"><span className="text-text-2">{c.currency}</span><span className="num font-medium">{formatMoney(c.amount, c.currency)}</span></div>
            )) : <p className="text-sm text-text-3">No cash balance.</p>}
            {account.status === "closed" ? <Badge className="mt-3">Closed {formatDate(account.closedOn)}</Badge> : null}
          </CardContent>
        </Card>
      </div>
      <Card className="mt-6">
        <CardHeader><CardTitle>Recent transactions</CardTitle><Link href="/transactions" className="text-[13px] font-medium text-accent hover:underline">All transactions</Link></CardHeader>
        <CardContent>
          <ul className="divide-y divide-border text-[13px]">
            {mine.map((t) => (
              <li key={t.id} className="flex justify-between gap-3 py-2">
                <span className={t.reversedBy ? "text-text-3 line-through" : ""}>{t.label}{t.instrument ? ` · ${t.instrument}` : ""}{t.description ? <span className="text-text-3"> · {t.description}</span> : null}</span>
                <span className="num shrink-0 text-text-3">{t.amount ? formatMoney(t.amount, t.currency ?? "NGN") : ""} · {formatDate(t.date)}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </>
  );
}
