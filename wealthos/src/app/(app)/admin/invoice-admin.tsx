import { Badge } from "@/components/ui/badge";
import { AdminForm } from "@/components/app/admin-form";
import { Field, Input, Select } from "@/components/ui/form";
import { recordPaymentAction, voidInvoiceAction } from "./console-actions";

export interface InvoiceRow { id: string; number: string; status: string; total: string; totalLabel: string; currency: string; issuedAt: string; dueAt: string; description: string; paid: string | null }

/** An invoice with the reconciliation actions an administrator can take on it. */
export function InvoiceAdmin({ invoice: i }: { invoice: InvoiceRow }) {
  return (
    <div className="rounded-lg border border-border p-3 text-[13px]">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p><span className="num font-medium">{i.number}</span> · {i.description}</p>
        <p className="flex items-center gap-2"><span className="num font-semibold">{i.totalLabel}</span><Badge tone={i.status === "paid" ? "accent" : i.status === "open" ? "warning" : "neutral"}>{i.status}</Badge></p>
      </div>
      <p className="text-text-3">Issued {i.issuedAt} · due {i.dueAt}{i.paid ? ` · paid ${i.paid}` : ""}</p>
      {i.status === "open" ? (
        <details className="mt-2"><summary className="cursor-pointer text-accent">Record payment or void</summary>
          <div className="mt-3 grid gap-4 lg:grid-cols-2">
            <AdminForm action={recordPaymentAction} submit="Record payment">
              <input type="hidden" name="invoiceId" value={i.id} />
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label={`Amount received (${i.currency})`} htmlFor={`amt-${i.id}`}><Input id={`amt-${i.id}`} name="amount" defaultValue={Number(i.total).toFixed(2)} inputMode="decimal" className="num" /></Field>
                <Field label="Paid on" htmlFor={`on-${i.id}`}><Input id={`on-${i.id}`} name="paidOn" type="date" defaultValue={new Date().toISOString().slice(0, 10)} /></Field>
                <Field label="Method" htmlFor={`m-${i.id}`}><Select id={`m-${i.id}`} name="method"><option value="bank_transfer">Bank transfer</option><option value="cash">Cash</option><option value="other">Other</option></Select></Field>
                <Field label="Bank reference" htmlFor={`ref-${i.id}`}><Input id={`ref-${i.id}`} name="reference" /></Field>
              </div>
              <p className="text-[12px] text-text-3">The amount must equal the invoice total exactly; part-payments are refused.</p>
            </AdminForm>
            <AdminForm action={voidInvoiceAction} submit="Void invoice" variant="secondary">
              <input type="hidden" name="invoiceId" value={i.id} />
              <Field label="Reason (audited)" htmlFor={`void-${i.id}`}><Input id={`void-${i.id}`} name="reason" /></Field>
            </AdminForm>
          </div>
        </details>
      ) : null}
    </div>
  );
}
