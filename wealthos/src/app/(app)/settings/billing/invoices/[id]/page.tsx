import Link from "next/link";
import { notFound } from "next/navigation";
import { requireApp } from "@/server/auth/context";
import { getInvoice } from "@/server/billing/service";
import { AppError } from "@/server/platform/errors";
import { d } from "@/engine";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PrintButton } from "@/components/app/print-button";
import { formatDate, formatMoney } from "@/lib/format";
import { withdrawInvoiceAction } from "../../actions";

export const metadata = { title: "Invoice · WealthOS" };

export default async function InvoicePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ new?: string }> }) {
  const app = await requireApp();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const r = await getInvoice(app.ctx, id).catch((e) => (e instanceof AppError && e.code === "NOT_FOUND" ? null : Promise.reject(e)));
  if (!r) notFound();
  const { invoice: inv, settings } = r;
  const sp = await searchParams;
  const day = (x: Date | null) => (x ? formatDate(x.toISOString().slice(0, 10)) : "—");
  const canWithdraw = inv.status === "open" && /^(start|upgrade):/.test(inv.purpose) && ["owner", "admin"].includes(app.org.role);
  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 print:hidden">
        <Link href="/settings/billing" className="text-[13px] text-text-3 hover:text-text">← Plan & billing</Link>
        <div className="flex gap-2">
          {canWithdraw ? <form action={withdrawInvoiceAction}><input type="hidden" name="id" value={inv.id} /><Button type="submit" variant="ghost" size="sm">Withdraw request</Button></form> : null}
          <PrintButton />
        </div>
      </div>
      {sp.new ? <Alert tone="info" className="mb-4 print:hidden" title="Invoice issued">Pay by bank transfer using the details below. Your plan changes when the payment is matched, usually within one working day.</Alert> : null}
      <article className="rounded-[var(--radius-card)] border border-border bg-surface p-6 sm:p-8 print:border-0 print:p-0">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="font-display text-[22px] font-semibold">{inv.status === "paid" ? "Receipt" : "Invoice"}</p>
            <p className="num mt-1 text-[13px] text-text-2">{inv.number}</p>
          </div>
          <div className="text-right text-[13px]">
            <p className="font-medium">{settings.sellerName}</p>
            {settings.sellerDetails ? <p className="whitespace-pre-line text-text-2">{settings.sellerDetails}</p> : null}
          </div>
        </header>
        <div className="mt-6 grid gap-4 text-[13px] sm:grid-cols-3">
          <div><p className="text-text-3">Billed to</p><p>{inv.billedTo.name}</p>{inv.billedTo.email ? <p className="text-text-2">{inv.billedTo.email}</p> : null}</div>
          <div><p className="text-text-3">Issued</p><p>{day(inv.issuedAt)}</p><p className="mt-1 text-text-3">Due</p><p>{day(inv.dueAt)}</p></div>
          <div>
            <p className="text-text-3">Status</p>
            <p><Badge tone={inv.status === "paid" ? "accent" : inv.status === "open" ? "warning" : "neutral"}>{inv.status === "paid" ? "Paid" : inv.status === "open" ? "Unpaid" : "Void"}</Badge></p>
            {inv.status === "paid" ? <p className="mt-1 text-text-2">{day(inv.paidAt)} · {inv.paymentMethod?.replace(/_/g, " ")} · ref <span className="num">{inv.paymentRef}</span></p> : null}
            {inv.status === "void" ? <p className="mt-1 text-text-2">{inv.voidReason}</p> : null}
          </div>
        </div>
        <table className="mt-6 w-full text-[13.5px]">
          <thead className="border-b border-border text-left text-text-3"><tr><th className="py-2 font-normal">Description</th><th className="py-2 text-right font-normal">Amount</th></tr></thead>
          <tbody>
            {inv.lines.map((l, i) => <tr key={i} className="border-b border-border"><td className="py-2 pr-4">{l.description}</td><td className="num py-2 text-right">{formatMoney(l.amount, inv.currency)}</td></tr>)}
          </tbody>
          <tfoot className="text-[13px]">
            <tr><td className="pt-3 text-right text-text-2">Subtotal</td><td className="num pt-3 text-right">{formatMoney(inv.subtotal, inv.currency)}</td></tr>
            {!d(inv.tax).isZero() ? <tr><td className="text-right text-text-2">{inv.taxLabel ?? "Tax"} {d(inv.taxRatePercent).toString()}%</td><td className="num text-right">{formatMoney(inv.tax, inv.currency)}</td></tr> : null}
            <tr className="text-[15px] font-semibold"><td className="pt-2 text-right">Total</td><td className="num pt-2 text-right">{formatMoney(inv.total, inv.currency)}</td></tr>
          </tfoot>
        </table>
        {inv.status === "open" ? (
          settings.bankTransfer ? (
            <div className="mt-8 rounded-[var(--radius-inner)] bg-surface-2 p-4 text-[13px]">
              <p className="font-medium">Pay by bank transfer</p>
              <p className="mt-1">{settings.bankTransfer.bankName} · {settings.bankTransfer.accountName} · <span className="num">{settings.bankTransfer.accountNumber}</span></p>
              <p className="mt-1 text-text-2">Use <span className="num font-medium text-text">{inv.number}</span> as the payment reference. {settings.bankTransfer.instructions}</p>
            </div>
          ) : <Alert tone="warning" className="mt-8">Payment details haven&apos;t been set up yet. Contact support before paying.</Alert>
        ) : null}
        <p className="mt-8 text-[11.5px] text-text-3">WealthOS is a subscription software service. It does not hold client money or provide investment advice.</p>
      </article>
    </div>
  );
}
