import Link from "next/link";
import { Check } from "lucide-react";
import { requireApp } from "@/server/auth/context";
import { featureDecision } from "@/server/compliance/gate";
import { LIMIT_LABELS, planSummary, type LimitKey } from "@/server/billing/entitlements";
import { billingPaymentDetails, listInvoices } from "@/server/billing/service";
import { d } from "@/engine";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate, formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import { SettingsTabs } from "../tabs";
import { PlanButton } from "./plan-button";
import { cancelAction } from "./actions";

export const metadata = { title: "Plan & billing · WealthOS" };

const STATUS: Record<string, { label: string; tone: "accent" | "warning" | "neutral" | "danger" }> = {
  trialing: { label: "Free trial", tone: "accent" },
  active: { label: "Active", tone: "accent" },
  past_due: { label: "Payment overdue", tone: "warning" },
  canceled: { label: "Ended", tone: "neutral" },
  expired: { label: "Ended", tone: "neutral" },
};
const ORDER: LimitKey[] = ["accounts", "goals", "alerts", "watchlists", "members", "csvImportsPerMonth", "aiQuestionsPerMonth"];
const iso = (x: Date | null | undefined) => (x ? x.toISOString().slice(0, 10) : null);

export default async function BillingPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const app = await requireApp();
  const sp = await searchParams;
  const [summary, gate, invoices, bank] = await Promise.all([planSummary(app.ctx), featureDecision("SUBSCRIPTION_BILLING", app.org.jurisdiction), listInvoices(app.ctx), billingPaymentDetails(app.ctx)]);
  const canManage = ["owner", "admin"].includes(app.org.role) && !app.org.isDemo;
  const sub = summary.subscription && ["trialing", "active", "past_due"].includes(summary.subscription.status) ? summary.subscription : null;
  const current = summary.plan;
  const open = invoices.filter((i) => i.status === "open");

  const actionFor = (code: string, price: string, trialDays: number) => {
    if (!gate.available || !canManage) return null;
    if (code === current.code && summary.source === "subscription" && sub?.status !== "trialing") return sub?.pendingPlanCode || sub?.cancelAtPeriodEnd ? <PlanButton plan={code} intent="change" label="Keep this plan" variant="secondary" /> : null;
    if (code === "free") return summary.source === "subscription" && !sub?.cancelAtPeriodEnd ? <PlanButton plan="free" intent="change" label="Move to Free at period end" variant="secondary" /> : null;
    if (sub?.complimentary) return null;
    if (!sub) {
      return (
        <div className="flex flex-col gap-2">
          {trialDays > 0 && !summary.hadTrial ? <PlanButton plan={code} intent="trial" label={`Start ${trialDays}-day free trial`} /> : null}
          <PlanButton plan={code} intent="change" label="Choose and pay" variant={trialDays > 0 && !summary.hadTrial ? "secondary" : "primary"} />
        </div>
      );
    }
    if (sub.status === "trialing") return <PlanButton plan={code} intent="change" label={code === sub.planCode ? "Pay to keep it after the trial" : "Pay for this plan instead"} />;
    return d(price).gt(d(sub.price)) ? <PlanButton plan={code} intent="change" label="Upgrade (prorated)" /> : <PlanButton plan={code} intent="change" label="Switch at period end" variant="secondary" />;
  };

  return (
    <>
      <PageHeader title="Settings" />
      <SettingsTabs current="billing" />
      {sp.trial ? <Alert tone="success" className="mb-4">Your free trial has started. No payment details needed.</Alert> : null}
      {sp.scheduled ? <Alert tone="success" className="mb-4">Change scheduled for the end of the current period.</Alert> : null}
      {sp.canceled ? <Alert tone="success" className="mb-4">Your plan will end at the end of the current period. You can change your mind until then.</Alert> : null}
      {sp.resumed ? <Alert tone="success" className="mb-4">Your plan will renew as normal.</Alert> : null}
      {sp.withdrawn ? <Alert tone="success" className="mb-4">The unpaid request was withdrawn.</Alert> : null}
      {!gate.available ? <Alert tone="info" className="mb-4" title="Paid plans aren't available yet">{gate.reason} Every space is on Free until they are.</Alert> : gate.status === "pending_review" ? <Alert tone="warning" className="mb-4" title="Pre-release feature">{gate.reason}</Alert> : null}
      {!canManage && !app.org.isDemo ? <Alert tone="info" className="mb-4">Only owners and admins of “{app.org.name}” can change its plan.</Alert> : null}

      <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
        <Card>
          <CardHeader className="flex-wrap">
            <div className="min-w-0">
              <CardDescription>“{app.org.name}” is on</CardDescription>
              <CardTitle className="mt-1 text-[22px]">{current.name}</CardTitle>
            </div>
            {sub ? <Badge tone={STATUS[sub.status]!.tone}>{sub.complimentary ? "Complimentary" : STATUS[sub.status]!.label}</Badge> : null}
          </CardHeader>
          <CardContent className="flex flex-col gap-4 text-[13px]">
            {sub ? (
              <p className="text-text-2">
                {sub.status === "trialing" ? `Trial ends ${formatDate(iso(sub.trialEndsAt)!)}. Afterwards this space returns to Free unless you pay for a plan.` : null}
                {sub.status === "active" && !sub.cancelAtPeriodEnd ? `${sub.complimentary ? "Complimentary until" : "Renews"} ${formatDate(iso(sub.currentPeriodEnd)!)}${sub.complimentary ? "" : ` at ${formatMoney(sub.price, sub.currency, { decimals: 0 })} a ${sub.interval}`}.` : null}
                {sub.cancelAtPeriodEnd ? `Ends ${formatDate(iso(sub.currentPeriodEnd)!)}, then Free.` : null}
                {sub.pendingPlanCode ? ` Moves to ${summary.plans.find((p) => p.code === sub.pendingPlanCode)?.name ?? sub.pendingPlanCode} on ${formatDate(iso(sub.currentPeriodEnd)!)}.` : null}
                {sub.status === "past_due" ? `Renewal is unpaid. The plan stays on until ${formatDate(iso(sub.graceEndsAt)!)}.` : null}
              </p>
            ) : app.org.isDemo ? <p className="text-text-2">Demo spaces have Pro limits and are never billed.</p> : <p className="text-text-2">Free never expires. Downgrading never deletes anything: items above a limit are kept, you just can&apos;t add more.</p>}
            <ul className="flex flex-col gap-2.5" aria-label="Usage">
              {ORDER.map((k) => {
                const limit = current.entitlements[k];
                const used = summary.used[k];
                const pct = limit ? Math.min(100, Math.round((used / limit) * 100)) : 0;
                return (
                  <li key={k}>
                    <div className="flex justify-between gap-2"><span className="capitalize">{LIMIT_LABELS[k].plural}{LIMIT_LABELS[k].period ? ` ${LIMIT_LABELS[k].period}` : ""}</span><span className="num text-text-2">{used} / {limit ?? "unlimited"}</span></div>
                    {limit ? <div className="mt-1 h-1.5 rounded-full bg-surface-2" aria-hidden><div className={cn("h-1.5 rounded-full", pct >= 100 ? "bg-warning" : "bg-accent")} style={{ width: `${pct}%` }} /></div> : null}
                  </li>
                );
              })}
              <li className="flex justify-between gap-2"><span>PDF reports</span><span className="text-text-2">{current.entitlements.pdfReports ? "Included" : "Not included (CSV is)"}</span></li>
            </ul>
            {canManage && sub && sub.status !== "trialing" && !sub.complimentary ? (
              <form action={cancelAction}>
                <input type="hidden" name="cancel" value={sub.cancelAtPeriodEnd ? "false" : "true"} />
                <Button type="submit" variant="ghost" size="sm">{sub.cancelAtPeriodEnd ? "Keep my plan" : "Cancel at period end"}</Button>
              </form>
            ) : null}
            {canManage && sub?.status === "trialing" ? (
              <form action={cancelAction}><input type="hidden" name="cancel" value="true" /><Button type="submit" variant="ghost" size="sm">End trial now</Button></form>
            ) : null}
          </CardContent>
        </Card>

        <div className="grid gap-4 sm:grid-cols-3">
          {summary.plans.map((p) => (
            <Card key={p.code} className={cn(p.code === current.code && summary.source !== "demo" ? "border-accent" : "")}>
              <CardHeader><div><CardTitle>{p.name}</CardTitle><p className="mt-1 num text-[18px] font-semibold">{d(p.price).isZero() ? "₦0" : formatMoney(p.price, p.currency, { decimals: 0 })}<span className="text-[12px] font-normal text-text-3"> / {p.interval}</span></p></div></CardHeader>
              <CardContent className="flex flex-col gap-3 text-[12.5px]">
                <p className="text-text-2">{p.description}</p>
                <ul className="flex flex-col gap-1">
                  {ORDER.map((k) => <li key={k} className="flex gap-1.5"><Check className="mt-0.5 size-3.5 shrink-0 text-accent" aria-hidden /><span>{p.entitlements[k] ?? "Unlimited"} {LIMIT_LABELS[k].plural}{LIMIT_LABELS[k].period ? ` a month` : ""}</span></li>)}
                  {p.entitlements.pdfReports ? <li className="flex gap-1.5"><Check className="mt-0.5 size-3.5 shrink-0 text-accent" aria-hidden />PDF reports</li> : null}
                </ul>
                <div className="mt-auto">{actionFor(p.code, p.price, p.trialDays)}</div>
              </CardContent>
            </Card>
          ))}
          <p className="text-[12px] text-text-3 sm:col-span-3">Prices are in naira{summary.plans.some((p) => p.trialDays) ? "; trials need no payment details" : ""}. Plans are paid by bank transfer against an invoice for now; card payments will come once a payment provider is connected.</p>
        </div>
      </div>

      {open.length ? (
        <Card className="mt-6">
          <CardHeader><div><CardTitle>To pay</CardTitle><CardDescription>Your plan changes as soon as the payment is matched to the invoice.</CardDescription></div></CardHeader>
          <CardContent className="text-[13px]">
            {bank ? (
              <dl className="grid gap-x-6 gap-y-1 sm:grid-cols-[auto_1fr]">
                <dt className="text-text-3">Bank</dt><dd>{bank.bankName}</dd>
                <dt className="text-text-3">Account name</dt><dd>{bank.accountName}</dd>
                <dt className="text-text-3">Account number</dt><dd className="num">{bank.accountNumber}</dd>
                <dt className="text-text-3">Reference</dt><dd>The invoice number{bank.instructions ? `. ${bank.instructions}` : ""}</dd>
              </dl>
            ) : <Alert tone="warning">Payment details haven&apos;t been set up yet, so invoices can&apos;t be paid. Contact support.</Alert>}
          </CardContent>
        </Card>
      ) : null}

      <Card className="mt-6">
        <CardHeader><CardTitle>Invoices and receipts</CardTitle></CardHeader>
        <CardContent>
          {invoices.length ? (
            <table className="w-full text-[13px]">
              <thead className="text-left text-text-3"><tr><th className="py-1.5 font-normal">Number</th><th className="font-normal">Issued</th><th className="hidden font-normal sm:table-cell">For</th><th className="text-right font-normal">Total</th><th className="pl-3 text-right font-normal">Status</th></tr></thead>
              <tbody>
                {invoices.map((i) => (
                  <tr key={i.id} className="border-t border-border">
                    <td className="py-2"><Link href={`/settings/billing/invoices/${i.id}`} className="num text-accent hover:underline">{i.number}</Link></td>
                    <td>{formatDate(iso(i.issuedAt)!)}</td>
                    <td className="hidden max-w-[28ch] truncate sm:table-cell">{i.lines[0]?.description}</td>
                    <td className="num text-right">{formatMoney(i.total, i.currency)}</td>
                    <td className="pl-3 text-right"><Badge tone={i.status === "paid" ? "accent" : i.status === "open" ? "warning" : "neutral"}>{i.status === "paid" ? "Paid" : i.status === "open" ? "Unpaid" : "Void"}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <p className="text-sm text-text-3">No invoices yet.</p>}
        </CardContent>
      </Card>
    </>
  );
}
