import Link from "next/link";
import { Download, FileSpreadsheet, FileText } from "lucide-react";
import { requireApp } from "@/server/auth/context";
import { featureDecision } from "@/server/compliance/gate";
import { DISCLOSURES } from "@/server/compliance/features";
import { planSummary } from "@/server/billing/entitlements";
import { REPORT_PERIODS } from "@/server/reports/statement";
import { SUPPORTED_CURRENCIES as DISPLAY_CURRENCIES } from "@/engine";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const metadata = { title: "Reports" };

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ period?: string; currency?: string }> }) {
  const app = await requireApp();
  const gate = await featureDecision("REPORTS", app.org.jurisdiction);
  if (!gate.available) return (<><PageHeader title="Reports" /><Alert tone="info" title="Not available yet">{gate.reason}</Alert></>);
  const sp = await searchParams;
  const period = REPORT_PERIODS.some((p) => p.key === sp.period) ? sp.period! : "1Y";
  const currency = (DISPLAY_CURRENCIES as readonly string[]).includes(sp.currency ?? "") ? sp.currency! : app.baseCurrency;
  const { plan } = await planSummary(app.ctx);
  const q = `period=${period}&currency=${currency}`;
  return (
    <>
      <PageHeader title="Reports" description={`Statements for “${app.org.name}”, built from the same calculations as your dashboard, with sources, dates and methodology notes.`} />
      <form className="mb-6 flex flex-wrap items-end gap-3" method="get">
        <label className="flex flex-col gap-1 text-[13px] text-text-2">Period
          <select name="period" defaultValue={period} className="h-9 rounded-[var(--radius-inner)] border border-border bg-surface px-2 text-sm text-text">{REPORT_PERIODS.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}</select>
        </label>
        <label className="flex flex-col gap-1 text-[13px] text-text-2">Currency
          <select name="currency" defaultValue={currency} className="num h-9 rounded-[var(--radius-inner)] border border-border bg-surface px-2 text-sm text-text">{DISPLAY_CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}</select>
        </label>
        <Button type="submit" variant="secondary" size="sm">Apply</Button>
      </form>
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader><div><CardTitle className="flex items-center gap-2"><FileText className="size-4 text-accent" aria-hidden />Wealth statement (PDF)</CardTitle><CardDescription>Net worth, performance, net-worth history, allocation and currency exposure, holdings, income and costs, transactions, goals, data quality and methodology.</CardDescription></div></CardHeader>
          <CardContent>
            {plan.entitlements.pdfReports ? (
              <Button asChild><a href={`/api/reports/statement.pdf?${q}`}><Download aria-hidden /> Download PDF</a></Button>
            ) : (
              <div className="flex flex-col items-start gap-2 text-[13px] text-text-2"><Badge tone="accent">Plus and Pro</Badge><p>PDF statements come with Wealth Plus and Pro. The same figures are in the CSV on every plan.</p><Link href="/settings/billing" className="text-accent hover:underline">See plans</Link></div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><div><CardTitle className="flex items-center gap-2"><FileSpreadsheet className="size-4 text-accent" aria-hidden />Statement data (CSV)</CardTitle><CardDescription>Every figure in the statement as rows (section, item, value, currency, as-of date, note), with exact decimals for spreadsheets.</CardDescription></div></CardHeader>
          <CardContent><Button asChild variant="secondary"><a href={`/api/reports/statement.csv?${q}`}><Download aria-hidden /> Download CSV</a></Button></CardContent>
        </Card>
        <Card>
          <CardHeader><div><CardTitle className="flex items-center gap-2"><FileSpreadsheet className="size-4 text-accent" aria-hidden />Holdings and transactions (CSV)</CardTitle><CardDescription>Current holdings with units, prices and their dates, cost and value; and the full transaction ledger including reversals.</CardDescription></div></CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button asChild variant="secondary"><a href={`/api/reports/holdings.csv?${q}`}><Download aria-hidden /> Holdings</a></Button>
            <Button asChild variant="ghost"><a href="/api/export/transactions.csv">All transactions</a></Button>
          </CardContent>
        </Card>
      </div>
      <p className="mt-6 text-[12px] text-text-3">{app.org.isDemo ? `${DISCLOSURES.demo_data} ` : ""}{DISCLOSURES.not_advice} {DISCLOSURES.past_performance}</p>
    </>
  );
}
