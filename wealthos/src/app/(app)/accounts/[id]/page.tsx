import Link from "next/link";
import { notFound } from "next/navigation";
import { Plus } from "lucide-react";
import { requireApp } from "@/server/auth/context";
import { getAccount, listValuations, ACCOUNT_TYPES } from "@/server/accounts/service";
import { buildDashboard, listTransactions, PERIODS, type PeriodKey } from "@/server/analytics/portfolio";
import { accountPerformance, holdingsPerformance } from "@/server/analytics/performance";
import { AppError } from "@/server/platform/errors";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { Delta } from "@/components/ui/money";
import { Stat } from "@/components/app/stat";
import { PeriodTabs } from "@/components/app/period-tabs";
import { formatDate, formatMoney, formatNumber, formatPercent } from "@/lib/format";
import { DISCLOSURES } from "@/server/compliance/features";
import { ValuationForm } from "./valuation-form";
import { ConnectionsCard } from "./connections-card";
import { CloseAccountForm, EditAccountForm } from "./settings-forms";
import { reopenAccountAction } from "../actions";

export default async function AccountPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ period?: string; closed?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  const period: PeriodKey = sp.period && sp.period in PERIODS ? (sp.period as PeriodKey) : "1Y";
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
  const isLedger = account.accountClass === "ledger";
  const closed = account.status === "closed";
  const details = { id, name: account.name, institutionName: account.institutionName, isInvestment: account.isInvestment, ownershipPercent: account.ownershipPercent, maskedNumber: account.maskedNumber, notes: account.notes, isLedger, typeLabel, currency: account.currency };

  const settings = app.canWrite ? (
    <Card className="mt-6">
      <CardHeader><div><CardTitle>Account details</CardTitle><CardDescription>Changes are recorded in the audit log.</CardDescription></div></CardHeader>
      <CardContent className="flex flex-col gap-6">
        <EditAccountForm a={details} />
        <div className="border-t border-border pt-5">
          {closed ? (
            <form action={reopenAccountAction} className="flex flex-wrap items-center gap-3 text-sm text-text-2">
              <input type="hidden" name="accountId" value={id} />
              <span>Closed on {formatDate(account.closedOn)}.</span>
              <Button type="submit" variant="secondary" size="sm">Re-open account</Button>
            </form>
          ) : (
            <CloseAccountForm id={id} today={today} isLedger={isLedger} />
          )}
        </div>
      </CardContent>
    </Card>
  ) : null;

  const header = (actions?: React.ReactNode) => (
    <>
    <PageHeader
      eyebrow={<Link href="/accounts" className="hover:text-text">← Accounts</Link>}
      title={account.name}
      description={
        <>
          {typeLabel}
          {account.institutionName ? ` · ${account.institutionName}` : ""}
          {Number(account.ownershipPercent) !== 100 ? ` · ${Number(account.ownershipPercent)}% yours` : ""}
          {isLedger && account.isInvestment ? " · included in investment performance" : ""} {closed ? <Badge>Closed {formatDate(account.closedOn)}</Badge> : null}
        </>
      }
      actions={actions}
    />
    {sp.closed && closed ? <Alert tone="success" className="mb-6">Account closed. Its history is kept.</Alert> : null}
    </>
  );

  if (!isLedger) {
    const vals = await listValuations(app.ctx, id);
    return (
      <>
        {header()}
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
          {app.canWrite && !closed ? (
            <Card>
              <CardHeader><CardTitle>Record a new valuation</CardTitle></CardHeader>
              <CardContent><ValuationForm accountId={id} today={today} liability={account.accountClass === "liability"} /></CardContent>
            </Card>
          ) : null}
        </div>
        {settings}
      </>
    );
  }

  const [dash, txs, perf, hperf] = await Promise.all([
    buildDashboard(app.ctx, { baseCurrency: app.baseCurrency, period: "1M" }),
    listTransactions(app.ctx),
    accountPerformance(app.ctx, id, { baseCurrency: app.baseCurrency, period }),
    holdingsPerformance(app.ctx, { baseCurrency: app.baseCurrency, period, accountId: id }),
  ]);
  const ccy = dash.baseCurrency;
  const holdings = dash.holdings.filter((h) => h.accountId === id);
  const cash = dash.cash.filter((c) => c.accountId === id);
  const mine = txs.filter((t) => t.account === account.name || t.account.includes(`${account.name} →`) || t.account.includes(`→ ${account.name}`)).slice(0, 25);
  return (
    <>
      {header(
        app.canWrite && !closed ? (
          <>
            <Button asChild variant="secondary"><Link href={`/transactions/import?account=${id}`}>Import CSV</Link></Button>
            <Button asChild variant="secondary"><Link href={`/transactions/new?account=${id}`}><Plus aria-hidden /> Record transaction</Link></Button>
          </>
        ) : null,
      )}

      <Card className="mb-6">
        <CardHeader className="flex-wrap">
          <div>
            <CardTitle>Performance</CardTitle>
            <CardDescription>{perf ? `${formatDate(perf.start)} – ${formatDate(perf.end)} in ${ccy}. Transfers from your other accounts count as money in, not as return.` : "No activity in this period."}</CardDescription>
          </div>
          <PeriodTabs current={period} basePath={`/accounts/${id}`} />
        </CardHeader>
        {perf ? (
          <CardContent>
            <dl className="grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
              <Stat label="Value now" value={formatMoney(perf.endValue, ccy, { decimals: 0 })} sub={`from ${formatMoney(perf.startValue, ccy, { decimals: 0 })}`} />
              <Stat label="Money in / out" value={<Delta value={perf.netContributions} currency={ccy} className="text-text" />} sub={`in ${formatMoney(perf.contributions, ccy, { compact: true })} · out ${formatMoney(perf.withdrawals, ccy, { compact: true })}`} />
              <Stat label="Investment gain" value={<Delta value={perf.investmentGain} currency={ccy} />} sub={`income ${formatMoney(perf.incomeGross, ccy, { compact: true })}${perf.fxEffect !== null && Number(perf.fxEffect) !== 0 ? ` · FX ${formatMoney(perf.fxEffect, ccy, { compact: true, signed: true })}` : ""}`} />
              <Stat label="Time-weighted" value={perf.twr === null ? "—" : <Delta value={perf.twr} percent />} sub={perf.twrAnnualized ? `annualised ${formatPercent(perf.twrAnnualized, { signed: true, decimals: 2 })}` : "not annualised (< 1 year)"} />
              <Stat label="Money-weighted (XIRR)" value={perf.xirr === null ? "—" : formatPercent(perf.xirr, { signed: true, decimals: 2 })} sub="annual rate" />
            </dl>
            {!perf.complete ? <p className="mt-3 text-[13px] text-warning">Some prices or FX rates are missing in this period, so returns are not shown.</p> : null}
          </CardContent>
        ) : null}
      </Card>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <Card>
          <CardHeader><CardTitle>Holdings</CardTitle></CardHeader>
          <CardContent>
            {holdings.length ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[620px] text-[13px]">
                  <thead className="text-left text-text-3"><tr><th className="py-2 font-medium">Instrument</th><th className="py-2 text-right font-medium">Units</th><th className="py-2 text-right font-medium">Value ({ccy})</th><th className="py-2 text-right font-medium">Unrealised</th><th className="py-2 text-right font-medium">Return · {period}</th></tr></thead>
                  <tbody>
                    {holdings.map((h) => {
                      const p = hperf.find((x) => x.instrumentId === h.instrumentId);
                      const r = p ? (p.base ?? p.local) : null;
                      return (
                        <tr key={h.instrumentId} className="border-t border-border">
                          <td className="py-2"><span className="font-medium">{h.symbol ?? h.name}</span> <span className="text-text-3">{h.symbol ? h.name : ""}</span></td>
                          <td className="num py-2 text-right">{formatNumber(h.quantity)}</td>
                          <td className="num py-2 text-right">{formatMoney(h.marketValueBase, ccy, { decimals: 0 })}</td>
                          <td className="py-2 text-right"><Delta value={h.unrealizedBase} currency={ccy} /></td>
                          <td className="py-2 text-right">{r?.twr ? <Delta value={r.twr} percent /> : "—"}</td>
                        </tr>
                      );
                    })}
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
          </CardContent>
        </Card>
      </div>
      <ConnectionsCard ctx={app.ctx} jurisdiction={app.org.jurisdiction} account={{ id: account.id, type: account.type, status: account.status }} canWrite={app.canWrite} />
      <Card className="mt-6">
        <CardHeader><CardTitle>Recent transactions</CardTitle><Link href="/transactions" className="text-[13px] font-medium text-accent hover:underline">All transactions</Link></CardHeader>
        <CardContent>
          {mine.length ? (
            <ul className="divide-y divide-border text-[13px]">
              {mine.map((t) => (
                <li key={t.id} className="flex justify-between gap-3 py-2">
                  <span className={t.reversedBy ? "text-text-3 line-through" : ""}>{t.label}{t.instrument ? ` · ${t.instrument}` : ""}{t.description ? <span className="text-text-3"> · {t.description}</span> : null}</span>
                  <span className="num shrink-0 text-text-3">{t.amount ? formatMoney(t.amount, t.currency ?? "NGN") : ""} · {formatDate(t.date)}</span>
                </li>
              ))}
            </ul>
          ) : <p className="text-sm text-text-3">No transactions yet.</p>}
        </CardContent>
      </Card>
      {settings}
    </>
  );
}
