import Link from "next/link";
import { requireAdminPage } from "@/server/auth/context";
import { adminBillingConfig, adminRevenue } from "@/server/billing/admin";
import { LIMIT_LABELS, type LimitKey } from "@/server/billing/entitlements";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { AdminForm } from "@/components/app/admin-form";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { formatDate, formatMoney } from "@/lib/format";
import { InvoiceAdmin } from "../invoice-admin";
import { saveBillingSettingsAction, savePlanAction } from "../console-actions";

export const metadata = { title: "Billing · Admin · WealthOS" };
const day = (x: Date | null) => (x ? formatDate(x.toISOString().slice(0, 10)) : "—");
const KEYS = Object.keys(LIMIT_LABELS) as LimitKey[];

export default async function AdminBilling() {
  const app = await requireAdminPage();
  const admin = { userId: app.session.userId };
  const [rev, cfg] = await Promise.all([adminRevenue(admin), adminBillingConfig(admin)]);
  const open = rev.recentInvoices.filter((i) => i.status === "open");
  const s = cfg.settings;
  return (
    <>
      <PageHeader title="Billing" description="Revenue from WealthOS's own records, payment reconciliation, plans and billing settings. Every change is audited." />
      <Alert tone="info" className="mb-6" title="No payment provider is connected">Customers pay by bank transfer against an invoice; record each payment here after it appears in the bank account. A provider (card/transfer checkout and notifications) needs its terms confirmed first.</Alert>
      <div className="grid gap-4 sm:grid-cols-3">
        <Card><CardContent className="pt-5"><p className="text-[13px] text-text-3">Monthly recurring revenue</p><p className="num text-3xl font-semibold">{formatMoney(rev.mrr, "NGN", { decimals: 0 })}</p><p className="text-[12px] text-text-3">active and past-due paid plans, excluding trials and complimentary</p></CardContent></Card>
        <Card><CardContent className="pt-5"><p className="text-[13px] text-text-3">Unpaid invoices</p><p className="num text-3xl font-semibold">{rev.openInvoices.count}</p><p className="text-[12px] text-text-3">{formatMoney(rev.openInvoices.total, "NGN")}</p></CardContent></Card>
        <Card><CardContent className="pt-5"><p className="text-[13px] text-text-3">Current subscriptions</p><ul className="mt-1 text-[13px]">{Object.entries(rev.byPlan).map(([plan, b]) => <li key={plan}><span className="font-medium">{plan}</span>: {b.active} active · {b.trialing} trial · {b.past_due} overdue · {b.complimentary} comp</li>)}</ul></CardContent></Card>
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Collected by month</CardTitle></CardHeader>
          <CardContent>{rev.monthly.length ? <table className="w-full text-[13px]"><tbody>{rev.monthly.map((m) => <tr key={`${m.month}${m.currency}`} className="border-t border-border first:border-0"><td className="py-1.5">{m.month}</td><td className="text-right text-text-3">{m.invoices} invoices</td><td className="num text-right">{formatMoney(m.collected, m.currency)}</td></tr>)}</tbody></table> : <p className="text-sm text-text-3">No payments yet.</p>}</CardContent>
        </Card>
        <Card>
          <CardHeader><div><CardTitle>Payment notifications needing attention</CardTitle><CardDescription>Rejected (bad signature) or failed (didn&apos;t match an invoice).</CardDescription></div></CardHeader>
          <CardContent>{rev.failedEvents.length ? <ul className="text-[12.5px]">{rev.failedEvents.map((e) => <li key={e.id} className="border-t border-border py-1.5 first:border-0"><span className="font-medium">{e.provider} · {e.outcome}</span> · {e.receivedAt.toISOString().slice(0, 16).replace("T", " ")}<span className="block text-text-3">{e.detail}</span></li>)}</ul> : <p className="text-sm text-text-3">None.</p>}</CardContent>
        </Card>
      </div>
      <Card className="mt-6">
        <CardHeader><CardTitle>Unpaid invoices</CardTitle></CardHeader>
        <CardContent className="flex flex-col gap-3">
          {open.length ? open.map((i) => (
            <div key={i.id}>
              {i.orgId ? <Link href={`/admin/orgs/${i.orgId}`} className="text-[12px] text-accent hover:underline">{i.billedTo.name}</Link> : <span className="text-[12px] text-text-3">{i.billedTo.name} (erased)</span>}
              <InvoiceAdmin invoice={{ id: i.id, number: i.number, status: i.status, total: i.total, currency: i.currency, issuedAt: day(i.issuedAt), dueAt: day(i.dueAt), description: i.lines.map((l) => l.description).join("; "), paid: null, totalLabel: formatMoney(i.total, i.currency) }} />
            </div>
          )) : <p className="text-sm text-text-3">Nothing unpaid.</p>}
        </CardContent>
      </Card>
      <h2 className="mt-8 mb-3 text-[17px] font-semibold">Plans</h2>
      <p className="mb-3 text-[13px] text-text-2">Prices and limits are business hypotheses. Leave a limit empty for unlimited. Existing subscriptions keep their price until renewal; lower limits never delete anyone&apos;s data.</p>
      <div className="grid gap-4 lg:grid-cols-2">
        {cfg.plans.map((p) => (
          <Card key={p.code}>
            <CardHeader><CardTitle>{p.name} <span className="text-[12px] font-normal text-text-3">({p.code})</span></CardTitle></CardHeader>
            <CardContent>
              <AdminForm action={savePlanAction} submit="Save plan">
                <input type="hidden" name="code" value={p.code} />
                <div className="grid gap-3 sm:grid-cols-3">
                  <Field label="Name" htmlFor={`n-${p.code}`}><Input id={`n-${p.code}`} name="name" defaultValue={p.name} /></Field>
                  <Field label={`Price (${p.currency}/${p.interval})`} htmlFor={`p-${p.code}`}><Input id={`p-${p.code}`} name="price" defaultValue={Number(p.price).toFixed(2)} className="num" /></Field>
                  <Field label="Trial days" htmlFor={`t-${p.code}`}><Input id={`t-${p.code}`} name="trialDays" defaultValue={String(p.trialDays)} className="num" /></Field>
                </div>
                <Field label="Description" htmlFor={`d-${p.code}`}><Textarea id={`d-${p.code}`} name="description" defaultValue={p.description} rows={2} /></Field>
                <div className="grid gap-3 sm:grid-cols-4">
                  {KEYS.map((k) => <Field key={k} label={LIMIT_LABELS[k].plural.replace(" (including pending invitations)", "")} htmlFor={`${k}-${p.code}`}><Input id={`${k}-${p.code}`} name={k} defaultValue={p.entitlements[k] === null ? "" : String(p.entitlements[k])} placeholder="unlimited" className="num" /></Field>)}
                </div>
                <div className="flex flex-wrap gap-4 text-[13px]">
                  <label className="flex items-center gap-1.5"><input type="checkbox" name="pdfReports" defaultChecked={p.entitlements.pdfReports} /> PDF reports</label>
                  <label className="flex items-center gap-1.5"><input type="checkbox" name="isPublic" defaultChecked={p.isPublic} /> Shown to customers</label>
                  <label className="flex items-center gap-1.5"><input type="checkbox" name="active" defaultChecked={p.active} /> Active</label>
                </div>
              </AdminForm>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card className="mt-6">
        <CardHeader><div><CardTitle>Billing settings</CardTitle><CardDescription>Tax treatment and the seller&apos;s details are decisions for the business and its accountant. Without bank details, invoices can be issued but not paid.</CardDescription></div></CardHeader>
        <CardContent>
          <AdminForm action={saveBillingSettingsAction} submit="Save settings">
            <div className="grid gap-3 sm:grid-cols-4">
              <Field label="Tax label" htmlFor="taxLabel"><Input id="taxLabel" name="taxLabel" defaultValue={s.taxLabel ?? ""} placeholder="e.g. VAT" /></Field>
              <Field label="Tax rate %" htmlFor="taxRatePercent"><Input id="taxRatePercent" name="taxRatePercent" defaultValue={s.taxRatePercent} className="num" /></Field>
              <Field label="Plan prices" htmlFor="taxMode"><Select id="taxMode" name="taxMode" defaultValue={s.taxMode}><option value="exclusive">exclude tax (tax added)</option><option value="inclusive">include tax</option></Select></Field>
              <Field label="Invoice prefix" htmlFor="invoicePrefix"><Input id="invoicePrefix" name="invoicePrefix" defaultValue={s.invoicePrefix} /></Field>
              <Field label="Days to pay" htmlFor="paymentDueDays"><Input id="paymentDueDays" name="paymentDueDays" defaultValue={String(s.paymentDueDays)} className="num" /></Field>
              <Field label="Grace days after renewal" htmlFor="graceDays"><Input id="graceDays" name="graceDays" defaultValue={String(s.graceDays)} className="num" /></Field>
              <Field label="Renewal notice days" htmlFor="renewalNoticeDays"><Input id="renewalNoticeDays" name="renewalNoticeDays" defaultValue={String(s.renewalNoticeDays)} className="num" /></Field>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Seller name (on invoices)" htmlFor="sellerName"><Input id="sellerName" name="sellerName" defaultValue={s.sellerName} /></Field>
              <Field label="Seller details (address, RC number, TIN)" htmlFor="sellerDetails"><Textarea id="sellerDetails" name="sellerDetails" defaultValue={s.sellerDetails} rows={3} /></Field>
            </div>
            <p className="text-[13px] font-medium">Bank transfer details (leave the account number empty to turn payment off)</p>
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Bank" htmlFor="bankName"><Input id="bankName" name="bankName" defaultValue={s.bankTransfer?.bankName ?? ""} /></Field>
              <Field label="Account name" htmlFor="accountName"><Input id="accountName" name="accountName" defaultValue={s.bankTransfer?.accountName ?? ""} /></Field>
              <Field label="Account number (NUBAN)" htmlFor="accountNumber"><Input id="accountNumber" name="accountNumber" defaultValue={s.bankTransfer?.accountNumber ?? ""} className="num" /></Field>
            </div>
            <Field label="Payment instructions" htmlFor="instructions"><Input id="instructions" name="instructions" defaultValue={s.bankTransfer?.instructions ?? ""} /></Field>
          </AdminForm>
        </CardContent>
      </Card>
    </>
  );
}
