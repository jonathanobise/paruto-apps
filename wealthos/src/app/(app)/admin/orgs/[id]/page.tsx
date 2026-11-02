import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStaffPage } from "@/server/auth/context";
import { orgDetail } from "@/server/admin/console";
import { AppError } from "@/server/platform/errors";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AdminForm } from "@/components/app/admin-form";
import { Field, Input, Select } from "@/components/ui/form";
import { InvoiceAdmin } from "../../invoice-admin";
import { formatDate, formatMoney } from "@/lib/format";
import { endSubscriptionAction, grantPlanAction } from "../../console-actions";

export const metadata = { title: "Organisation · Admin · WealthOS" };
const day = (x: Date | null) => (x ? formatDate(x.toISOString().slice(0, 10)) : "—");

export default async function AdminOrg({ params }: { params: Promise<{ id: string }> }) {
  const app = await requireStaffPage(["support"]);
  const r = await orgDetail({ userId: app.session.userId }, (await params).id).catch((e) => (e instanceof AppError && e.code === "NOT_FOUND" ? null : Promise.reject(e)));
  if (!r) notFound();
  const current = r.subscriptions.find((s) => ["trialing", "active", "past_due"].includes(s.status));
  return (
    <>
      <PageHeader title={r.org.name} description={`${r.org.kind}${r.org.isDemo ? " (demo)" : ""} · created ${day(r.org.createdAt)} · ${r.org.id}`} />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Members</CardTitle></CardHeader>
          <CardContent><ul className="divide-y divide-border text-[13px]">{r.members.map((m) => <li key={m.userId} className="flex justify-between py-2"><Link href={`/admin/users/${m.userId}`} className="hover:underline">{m.name} <span className="text-text-3">{m.email}</span></Link><Badge>{m.role}</Badge></li>)}</ul></CardContent>
        </Card>
        <Card>
          <CardHeader><div><CardTitle>Plan</CardTitle><CardDescription>{current ? `${current.planCode} · ${current.complimentary ? "complimentary" : current.status} · to ${day(current.currentPeriodEnd)}${current.cancelAtPeriodEnd ? " (cancelling)" : ""}${current.pendingPlanCode ? ` → ${current.pendingPlanCode}` : ""}` : "Free"}</CardDescription></div></CardHeader>
          <CardContent className="flex flex-col gap-5">
            {app.staffRole === "admin" ? <>
            <AdminForm action={grantPlanAction} submit="Grant complimentary plan">
              <input type="hidden" name="orgId" value={r.org.id} />
              <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                <Field label="Plan" htmlFor="planCode"><Select id="planCode" name="planCode"><option value="plus">Wealth Plus</option><option value="pro">Wealth Pro</option></Select></Field>
                <Field label="Months" htmlFor="months"><Input id="months" name="months" defaultValue="3" inputMode="numeric" className="w-20" /></Field>
              </div>
              <Field label="Reason (audited)" htmlFor="note"><Input id="note" name="note" placeholder="e.g. beta tester" /></Field>
            </AdminForm>
            {current ? (
              <AdminForm action={endSubscriptionAction} submit="End subscription now" variant="danger">
                <input type="hidden" name="orgId" value={r.org.id} />
                <Field label="Reason (audited)" htmlFor="reason"><Input id="reason" name="reason" /></Field>
              </AdminForm>
            ) : null}
            </> : <p className="text-[12.5px] text-text-3">Plan changes and payments are handled by administrators.</p>}
            <details className="text-[12.5px]"><summary className="cursor-pointer text-text-2">Subscription history ({r.subscriptions.length})</summary>
              <ul className="mt-2">{r.subscriptions.map((s) => <li key={s.id} className="border-t border-border py-1.5">{s.planCode} · {s.status}{s.complimentary ? " · comp" : ""} · {day(s.currentPeriodStart)} → {day(s.currentPeriodEnd)}{s.note ? ` · ${s.note}` : ""}</li>)}</ul>
            </details>
          </CardContent>
        </Card>
      </div>
      <Card className="mt-6">
        <CardHeader><CardTitle>Invoices</CardTitle></CardHeader>
        <CardContent className="flex flex-col gap-3">
          {r.invoices.length ? r.invoices.map((i) => <InvoiceAdmin key={i.id} readOnly={app.staffRole !== "admin"} invoice={{ id: i.id, number: i.number, status: i.status, total: i.total, currency: i.currency, issuedAt: day(i.issuedAt), dueAt: day(i.dueAt), description: i.lines.map((l) => l.description).join("; "), paid: i.status === "paid" ? `${day(i.paidAt)} · ${i.paymentMethod} · ${i.paymentRef}` : null, totalLabel: formatMoney(i.total, i.currency) }} />) : <p className="text-sm text-text-3">No invoices.</p>}
        </CardContent>
      </Card>
    </>
  );
}
