import Link from "next/link";
import { Download, FileUp } from "lucide-react";
import { requireApp } from "@/server/auth/context";
import { listAccounts } from "@/server/accounts/service";
import { listImports, listMappings } from "@/server/imports/service";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDate } from "@/lib/format";
import { UploadForm } from "./upload-form";
import { STATUS } from "./status";

export const metadata = { title: "Import CSV · WealthOS" };

export default async function ImportPage({ searchParams }: { searchParams: Promise<{ account?: string }> }) {
  const app = await requireApp();
  const sp = await searchParams;
  const [accounts, mappings, imports] = await Promise.all([listAccounts(app.ctx), listMappings(app.ctx), listImports(app.ctx)]);
  const ledgerAccounts = accounts.filter((a) => a.accountClass === "ledger" && a.status === "open");
  return (
    <>
      <PageHeader eyebrow={<Link href="/transactions" className="hover:text-text">← Transactions</Link>} title="Import transactions" description="Upload a CSV from your bank, broker or fund manager. You'll see every row checked — errors, duplicates and all — before anything is recorded, and you can roll an import back later." actions={<Button asChild variant="secondary"><a href="/api/import/template.csv"><Download aria-hidden /> CSV template</a></Button>} />
      {!app.canWrite ? (
        <Alert tone="warning">You have view-only access to this portfolio.</Alert>
      ) : ledgerAccounts.length === 0 ? (
        <EmptyState icon={<FileUp />} title="Add an account first" action={<Button asChild><Link href="/accounts/new">Add account</Link></Button>}>Imports go into a bank, brokerage, fund or T-bill account.</EmptyState>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
          <Card>
            <CardContent className="pt-5">
              <UploadForm accounts={ledgerAccounts.map((a) => ({ id: a.id, name: a.name, currency: a.currency }))} mappings={mappings} {...(sp.account ? { defaultAccount: sp.account } : {})} />
            </CardContent>
          </Card>
          <Card className="self-start">
            <CardHeader><div><CardTitle>What can be imported</CardTitle><CardDescription>One account per file.</CardDescription></div></CardHeader>
            <CardContent className="text-[13px] leading-relaxed text-text-2">
              <ul className="list-disc space-y-1 pl-4">
                <li><strong className="text-text">Bank statements</strong> with Debit/Credit columns or a signed Amount become deposits and withdrawals.</li>
                <li><strong className="text-text">Broker and fund statements</strong> with a type column: purchases, sales, dividends, interest, coupons, fees, taxes, reinvestments, maturities, redemptions, bonus issues and opening positions.</li>
                <li>Instruments are matched by ticker or ISIN. Add missing ones as private instruments first.</li>
                <li>Transfers between your own accounts and currency conversions are recorded by hand for now.</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      )}
      <Card className="mt-6">
        <CardHeader><CardTitle>Recent imports</CardTitle></CardHeader>
        <CardContent>
          {imports.length === 0 ? (
            <p className="text-sm text-text-3">No imports yet.</p>
          ) : (
            <ul className="divide-y divide-border text-[13px]">
              {imports.map((i) => {
                const s = i.summary as Record<string, number>;
                const st = STATUS[i.status]!;
                return (
                  <li key={i.id}>
                    <Link href={`/transactions/import/${i.id}`} className="flex items-center justify-between gap-3 py-2.5 hover:text-accent">
                      <span className="min-w-0">
                        <span className="font-medium">{i.fileName}</span> <Badge tone={st.tone}>{st.label}</Badge>
                        <span className="block text-text-3">{i.accountName} · {s.imported ?? s.ready ?? 0} of {s.total ?? 0} rows{i.status === "committed" ? " imported" : " ready"}</span>
                      </span>
                      <span className="num shrink-0 text-text-3">{formatDate((i.committedAt ?? i.createdAt).toISOString())}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </>
  );
}
