import Link from "next/link";
import { requireApp } from "@/server/auth/context";
import { listAccounts } from "@/server/accounts/service";
import { withTenant } from "@/server/db/client";
import { listVisibleInstruments } from "@/server/market-data/service";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { TransactionForm } from "./form";
import { InstrumentForm } from "./instrument-form";

export const metadata = { title: "Record transaction · WealthOS" };

export default async function NewTransactionPage({ searchParams }: { searchParams: Promise<{ account?: string }> }) {
  const app = await requireApp();
  const sp = await searchParams;
  const accounts = (await listAccounts(app.ctx)).filter((a) => a.accountClass === "ledger" && a.status === "open");
  const instruments = await withTenant(app.ctx, (tx) => listVisibleInstruments(tx));
  if (!app.canWrite) return <Alert tone="warning">You have view-only access to this portfolio.</Alert>;
  return (
    <>
      <PageHeader eyebrow={<Link href="/transactions" className="hover:text-text">← Transactions</Link>} title="Record a transaction" description="Each entry is validated against your full history before it is saved — for example, you can't sell units you didn't hold on that date." />
      {accounts.length === 0 ? (
        <EmptyState title="Add an account first" action={<Button asChild><Link href="/accounts/new">Add account</Link></Button>}>Transactions belong to a bank, brokerage, fund or T-bill account.</EmptyState>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
          <Card>
            <CardContent className="pt-5">
              <TransactionForm
                accounts={accounts.map((a) => ({ id: a.id, name: a.name, currency: a.currency }))}
                instruments={instruments.map((i) => ({ id: i.id, name: i.name, symbol: i.symbol, currency: i.currency, private: Boolean(i.orgId) }))}
                today={new Date().toISOString().slice(0, 10)}
                {...(sp.account ? { defaultAccount: sp.account } : {})}
              />
            </CardContent>
          </Card>
          <Card className="self-start">
            <CardHeader>
              <div>
                <CardTitle>Instrument not listed?</CardTitle>
                <CardDescription>Add a private instrument visible only to you — for example a specific T-bill, fixed deposit or unlisted fund.</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <InstrumentForm />
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}
