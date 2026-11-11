import Link from "next/link";
import { ArrowLeftRight, Plus } from "lucide-react";
import { requireApp } from "@/server/auth/context";
import { listTransactions } from "@/server/analytics/portfolio";
import { PageHeader } from "@/components/app/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDate, formatMoney, formatNumber } from "@/lib/format";
import { ReverseForm } from "./reverse-form";
import { Fragment } from "react";
import { KindIcon } from "@/components/app/kind-icon";

export const metadata = { title: "Transactions" };

export default async function TransactionsPage({ searchParams }: { searchParams: Promise<{ saved?: string; reversed?: string; type?: string }> }) {
  const app = await requireApp();
  const sp = await searchParams;
  const all = await listTransactions(app.ctx);
  const rows = sp.type ? all.filter((t) => t.type === sp.type) : all;
  return (
    <>
      <PageHeader
        title="Transactions"
        description="Your append-only ledger. Corrections are made by reversal, so the full history is always auditable."
        actions={
          <>
            <Button asChild variant="secondary"><a href="/api/export/transactions.csv">Export CSV</a></Button>
            {app.canWrite ? <Button asChild variant="secondary"><Link href="/transactions/import">Import CSV</Link></Button> : null}
            {app.canWrite ? <Button asChild><Link href="/transactions/new"><Plus aria-hidden /> Record transaction</Link></Button> : null}
          </>
        }
      />
      {sp.saved ? <Alert tone="success" className="mb-4">Transaction saved.</Alert> : null}
      {sp.reversed ? <Alert tone="success" className="mb-4">Reversed. The original entry stays in your history, marked as reversed.</Alert> : null}
      {rows.length === 0 ? (
        <EmptyState icon={<ArrowLeftRight />} title="No transactions yet" action={app.canWrite ? <Button asChild><Link href="/transactions/new">Record your first transaction</Link></Button> : null}>
          Start with a deposit or an existing holding (opening position).
        </EmptyState>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-[13px]">
              <thead className="text-left text-text-3 text-[12px]">
                <tr className="border-b border-border">
                  <th className="px-4 py-2.5 font-medium">Date</th>
                  <th className="px-4 py-2.5 font-medium">Type</th>
                  <th className="px-4 py-2.5 font-medium">Account</th>
                  <th className="px-4 py-2.5 font-medium">Instrument</th>
                  <th className="px-4 py-2.5 text-right font-medium">Units</th>
                  <th className="px-4 py-2.5 text-right font-medium">Amount</th>
                  <th className="px-4 py-2.5 font-medium"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((t, i) => (
                  <Fragment key={t.id}>
                  {i === 0 || rows[i - 1]!.date.slice(0, 7) !== t.date.slice(0, 7) ? (
                    <tr className="bg-text/[0.02] hover:!bg-text/[0.02]">
                      <th colSpan={7} scope="colgroup" className="border-t border-border px-4 pb-1.5 pt-4 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-text-3">
                        {new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${t.date.slice(0, 7)}-01T00:00:00Z`))}
                      </th>
                    </tr>
                  ) : null}
                  <tr className="border-t border-border">
                    <td className="num whitespace-nowrap px-4 py-3 text-text-2">{formatDate(t.date)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-start gap-3">
                        <KindIcon event={t.type} className="size-8 rounded-[10px]" />
                        <div className="min-w-0">
                          <span className={t.reversedBy ? "text-text-3 line-through" : "font-medium"}>{t.label}</span>
                          {t.reversedBy ? <Badge className="ml-2">Reversed</Badge> : null}
                          {t.source === "demo" ? <Badge tone="demo" className="ml-2">Demo</Badge> : null}
                          {t.source === "import" ? <Badge className="ml-2">Imported</Badge> : null}
                          {t.description ? <p className="text-text-3">{t.description}</p> : null}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-text-2">{t.account}</td>
                    <td className="px-4 py-3 text-text-2">{t.instrument ?? "—"}</td>
                    <td className="num px-4 py-3 text-right">{t.quantity ? formatNumber(t.quantity) : ""}</td>
                    <td className="num whitespace-nowrap px-4 py-3 text-right font-semibold">{t.amount && t.currency ? formatMoney(t.amount, t.currency) : ""}</td>
                    <td className="w-12 px-2 py-2">{app.canWrite && !t.reversedBy && t.type !== "reversal" ? <ReverseForm eventId={t.id} /> : null}</td>
                  </tr>
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </>
  );
}
