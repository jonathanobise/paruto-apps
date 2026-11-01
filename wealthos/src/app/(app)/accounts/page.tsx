import Link from "next/link";
import { Landmark, Plus } from "lucide-react";
import { requireApp } from "@/server/auth/context";
import { listAccounts, ACCOUNT_TYPES } from "@/server/accounts/service";
import { buildDashboard } from "@/server/analytics/portfolio";
import { PageHeader } from "@/components/app/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDate, formatMoney } from "@/lib/format";

export const metadata = { title: "Accounts · WealthOS" };

export default async function AccountsPage() {
  const app = await requireApp();
  const [accounts, dash] = await Promise.all([listAccounts(app.ctx), buildDashboard(app.ctx, { baseCurrency: app.baseCurrency, period: "1M" })]);
  const valueOf = (id: string) => {
    const h = dash.holdings.filter((x) => x.accountId === id).reduce((s, x) => s + Number(x.marketValueBase ?? 0), 0);
    const c = dash.cash.filter((x) => x.accountId === id).reduce((s, x) => s + Number(x.amountBase ?? 0), 0);
    const m = dash.manual.find((x) => x.accountId === id);
    return m ? Number(m.amountBase ?? 0) * (m.kind === "liability" ? -1 : 1) : h + c;
  };
  const groups = [
    { key: "ledger", title: "Cash & investments", hint: "Valued from transactions" },
    { key: "manual_asset", title: "Other assets", hint: "Valued from your estimates" },
    { key: "liability", title: "Liabilities", hint: "Outstanding balances" },
  ] as const;
  return (
    <>
      <PageHeader
        title="Accounts"
        description="Every place you hold money, investments, property or debt."
        actions={app.canWrite ? <Button asChild><Link href="/accounts/new"><Plus aria-hidden /> Add account</Link></Button> : null}
      />
      {accounts.length === 0 ? (
        <EmptyState icon={<Landmark />} title="No accounts yet" action={<Button asChild><Link href="/accounts/new">Add your first account</Link></Button>}>
          Add bank, brokerage, fund and T-bill accounts, plus property, business interests, pensions and loans.
        </EmptyState>
      ) : (
        <div className="flex flex-col gap-6">
          {groups.map((g) => {
            const rows = accounts.filter((a) => a.accountClass === g.key);
            if (!rows.length) return null;
            return (
              <Card key={g.key}>
                <div className="flex items-baseline justify-between px-5 pt-4">
                  <h2 className="text-[15px] font-semibold">{g.title}</h2>
                  <span className="text-[12px] text-text-3">{g.hint}</span>
                </div>
                <ul className="mt-2 divide-y divide-border">
                  {rows.map((a) => {
                    const manual = dash.manual.find((m) => m.accountId === a.id);
                    return (
                      <li key={a.id}>
                        <Link href={`/accounts/${a.id}`} className="flex items-center gap-4 px-5 py-3.5 hover:bg-surface-2">
                          <div className="min-w-0 flex-1">
                            <p className="flex items-center gap-2 font-medium">
                              {a.name}
                              {a.status === "closed" ? <Badge>Closed</Badge> : null}
                              {a.isInvestment ? <Badge tone="accent">Investment</Badge> : null}
                            </p>
                            <p className="text-[13px] text-text-3">
                              {ACCOUNT_TYPES[a.type as keyof typeof ACCOUNT_TYPES]?.label}
                              {a.institutionName ? ` · ${a.institutionName}` : ""}
                              {a.maskedNumber ? ` · ••${a.maskedNumber}` : ""}
                              {Number(a.ownershipPercent) !== 100 ? ` · ${Number(a.ownershipPercent)}% yours` : ""}
                              {manual ? ` · ${manual.valuationType} as of ${formatDate(manual.valuedOn)}` : ""}
                            </p>
                          </div>
                          <span className="num text-right font-medium">{formatMoney(String(valueOf(a.id)), dash.baseCurrency, { decimals: 0 })}</span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
