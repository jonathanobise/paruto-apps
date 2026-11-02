import Link from "next/link";
import { requireApp } from "@/server/auth/context";
import { featureDecision } from "@/server/compliance/gate";
import { DISCLOSURES } from "@/server/compliance/features";
import { householdView } from "@/server/household/service";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { AdminForm } from "@/components/app/admin-form";
import { formatDate, formatMoney, formatPercent } from "@/lib/format";
import { ownersAction } from "./actions";

export const metadata = { title: "Household · WealthOS" };

export default async function HouseholdPage() {
  const app = await requireApp();
  const gate = await featureDecision("HOUSEHOLD_PLANNING", app.org.jurisdiction);
  if (!gate.available) return (<><PageHeader title="Household" /><Alert tone="info" title="Not available">{gate.reason}</Alert></>);
  if (app.org.kind === "personal" || app.org.isDemo) {
    return (
      <>
        <PageHeader title="Household" description="See who in your household owns what, and net worth by person." />
        <Alert tone="info" title="This needs a shared space">“{app.org.name}” is just for you. Create a household space and invite the people you share finances with under <Link href="/settings/members" className="underline">Settings → Members</Link>, then switch to it.</Alert>
      </>
    );
  }
  const h = await householdView(app.ctx, app.baseCurrency);
  const ccy = h.baseCurrency;
  return (
    <>
      <PageHeader title="Household" description={`Net worth of “${app.org.name}” by person on ${formatDate(h.asOf)}. Each account's value in this space is split by the shares you set; anything not assigned stays shared.`} />
      {!h.complete ? <Alert tone="warning" className="mb-4">Some items couldn&apos;t be valued (missing prices or exchange rates) and are left out.</Alert> : null}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {h.people.map((p) => (
          <Card key={p.userId}><CardContent className="pt-5"><p className="text-[13px] text-text-3">{p.name}{p.userId === app.session.userId ? " (you)" : ""}</p><p className="num text-2xl font-semibold">{formatMoney(p.netWorth, ccy, { decimals: 0 })}</p><p className="text-[12px] text-text-3">{p.share ? `${formatPercent(p.share, { decimals: 1 })} of the household` : "—"}</p></CardContent></Card>
        ))}
        <Card><CardContent className="pt-5"><p className="text-[13px] text-text-3">Shared / unassigned</p><p className="num text-2xl font-semibold">{formatMoney(h.unassigned, ccy, { decimals: 0 })}</p><p className="text-[12px] text-text-3">Household total {formatMoney(h.netWorth, ccy, { decimals: 0 })}</p></CardContent></Card>
      </div>
      <Card className="mt-6">
        <CardHeader><div><CardTitle>Who owns each account</CardTitle><CardDescription>Shares are of this space&apos;s part of the account (after its ownership percentage). Leave everyone at 0 for jointly held or not yet decided.</CardDescription></div></CardHeader>
        <CardContent className="flex flex-col gap-4">
          {h.accounts.map((a) => (
            <div key={a.accountId} className="rounded-[var(--radius-inner)] border border-border p-3">
              <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
                <p className="font-medium">{a.name} {a.kind === "liability" ? <Badge>Liability</Badge> : null}</p>
                <p className="num text-[13px] text-text-2">{a.value === null ? "Not valued" : formatMoney(a.value, ccy)}</p>
              </div>
              {app.canWrite ? (
                <AdminForm action={ownersAction} submit="Save shares" variant="secondary" className="flex flex-col gap-2">
                  <input type="hidden" name="accountId" value={a.accountId} />
                  <div className="flex flex-wrap gap-3">
                    {h.people.map((p) => (
                      <label key={p.userId} className="flex items-center gap-2 text-[13px]">
                        <input type="hidden" name="userId" value={p.userId} />
                        <span className="min-w-20">{p.name}</span>
                        <input name="percent" inputMode="decimal" defaultValue={a.owners.find((o) => o.userId === p.userId)?.percent ?? ""} placeholder="0" aria-label={`${p.name}'s share of ${a.name} (%)`} className="num h-8 w-20 rounded-[var(--radius-inner)] border border-border bg-surface px-2 text-right" />
                        <span className="text-text-3">%</span>
                      </label>
                    ))}
                  </div>
                </AdminForm>
              ) : <p className="text-[13px] text-text-2">{a.owners.length ? a.owners.map((o) => `${h.people.find((p) => p.userId === o.userId)?.name ?? "Former member"} ${o.percent}%`).join(" · ") : "Shared / unassigned"}</p>}
            </div>
          ))}
          {!h.accounts.length ? <p className="text-sm text-text-3">No accounts in this space yet.</p> : null}
        </CardContent>
      </Card>
      <p className="mt-6 text-[12px] text-text-3">Ownership here is for your household&apos;s own view; it isn&apos;t a legal record of title. {DISCLOSURES.estimates}</p>
    </>
  );
}
