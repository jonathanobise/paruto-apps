import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle, CircleCheck, Copy, XCircle } from "lucide-react";
import { requireApp } from "@/server/auth/context";
import { getImport } from "@/server/imports/service";
import { IMPORT_FIELDS, IMPORTABLE_TYPES, resolveType } from "@/server/imports/csv";
import { EVENT_LABELS } from "@/server/ledger/codec";
import { withTenant } from "@/server/db/client";
import { listVisibleInstruments } from "@/server/market-data/service";
import { AppError } from "@/server/platform/errors";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { formatDate, formatMoney, formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Disclosure } from "@/components/ui/disclosure";
import { CommitForm, MappingForm, RollbackForm } from "./forms";
import { discardAction } from "../actions";
import { STATUS } from "../status";

export const metadata = { title: "Import preview · WealthOS" };

const FILTERS = ["all", "ready", "error", "duplicate"] as const;

export default async function ImportPreviewPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ show?: string; done?: string; rolledBack?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  const app = await requireApp();
  let batch;
  try {
    batch = await getImport(app.ctx, id);
  } catch (err) {
    if (err instanceof AppError && err.code === "NOT_FOUND") notFound();
    throw err;
  }
  const instruments = await withTenant(app.ctx, (tx) => listVisibleInstruments(tx));
  const instName = (iid?: string) => instruments.find((i) => i.id === iid)?.symbol ?? instruments.find((i) => i.id === iid)?.name ?? "";
  const s = batch.summary as Record<string, number | string | undefined>;
  const show = FILTERS.includes(sp.show as (typeof FILTERS)[number]) ? (sp.show as (typeof FILTERS)[number]) : "all";
  const rows = show === "all" ? batch.rows : batch.rows.filter((r) => r.status === show);
  const st = STATUS[batch.status]!;
  const isPreview = batch.status === "previewed" && !batch.expired;
  const unknownTypes = [...new Set(batch.rows.map((r) => r.cells.type).filter((t): t is string => Boolean(t) && !resolveType(t!, batch.mapping)))].slice(0, 20);
  const IMPORT_ONLY_LABELS: Record<string, string> = { transfer_out: "Transfer to another of my accounts", transfer_in: "Transfer from another of my accounts" };
  const typeOptions = IMPORTABLE_TYPES.map((t) => ({ value: t, label: IMPORT_ONLY_LABELS[t] ?? EVENT_LABELS[t as keyof typeof EVENT_LABELS] }));

  return (
    <>
      <PageHeader eyebrow={<Link href="/transactions/import" className="hover:text-text">← Imports</Link>} title={batch.fileName} description={<>Into <strong className="text-text">{batch.accountName}</strong> · uploaded {formatDate(batch.createdAt.toISOString())} · <Badge tone={st.tone}>{batch.expired ? "Expired" : st.label}</Badge></>} />

      {sp.done ? <Alert tone="success" className="mb-4" title={`Imported ${s.imported} transactions`}>They&apos;re now in your <Link href="/transactions" className="font-medium text-accent hover:underline">transactions</Link> and dashboard.</Alert> : null}
      {sp.rolledBack ? <Alert tone="success" className="mb-4">Import rolled back. Every imported transaction now has a matching reversal.</Alert> : null}
      {s.alreadyImportedBatchId && batch.status === "previewed" ? (
        <Alert tone="warning" className="mb-4" title="This exact file has been imported before">
          It was imported on {formatDate(String(s.alreadyImportedAt))} (<Link href={`/transactions/import/${s.alreadyImportedBatchId}`} className="text-accent hover:underline">view that import</Link>). Its rows show as duplicates; roll that import back first if you meant to replace it.
        </Alert>
      ) : null}
      {batch.expired ? <Alert tone="warning" className="mb-4">This preview expired after 24 hours and its file was deleted. Upload the file again.</Alert> : null}
      {s.needsMapping ? <Alert tone="info" className="mb-4" title="Tell us which columns are which">We couldn&apos;t recognise the columns automatically. Choose at least the Date column, then the amount or type columns, and update the preview.</Alert> : null}

      <dl className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
        {[
          ["Rows", s.total, "neutral"],
          ["Ready", s.ready, "accent"],
          ["Errors", s.errors, "danger"],
          ["Possible duplicates", s.duplicates, "warning"],
          [batch.status === "committed" || batch.status === "rolled_back" ? "Imported" : "With warnings", batch.status === "committed" || batch.status === "rolled_back" ? s.imported : s.warnings, "neutral"],
        ].map(([label, value]) => (
          <div key={String(label)} className="rounded-xl border border-border bg-surface px-4 py-3">
            <dt className="text-[12px] text-text-3">{label}</dt>
            <dd className="num text-xl font-semibold">{value ?? 0}</dd>
          </div>
        ))}
      </dl>

      {isPreview && app.canWrite ? (
        <div className="mb-6 grid gap-6 xl:grid-cols-[2fr_1fr]">
          <Card>
            <Disclosure
              defaultOpen={Boolean(s.needsMapping) || unknownTypes.length > 0}
              summary={
              <summary className="cursor-pointer list-none px-5 pt-5 pb-4">
                <span className="text-[15px] font-semibold">Columns</span> <span className="text-[13px] text-text-3 group-open:hidden">· {Object.entries(batch.mapping.columns).map(([f, h]) => `${h} → ${IMPORT_FIELDS[f as keyof typeof IMPORT_FIELDS]}`).join(" · ") || "none mapped"} · <span className="text-accent">Change</span></span>
                <CardDescription className="hidden group-open:block">Detected from the file&apos;s headers. Change any that are wrong and update the preview.</CardDescription>
              </summary>
              }
            >
            <CardContent>
              <MappingForm batchId={batch.id} headers={batch.headers} fields={Object.entries(IMPORT_FIELDS).map(([key, label]) => ({ key, label }))} columns={batch.mapping.columns as Record<string, string>} dateFormat={batch.mapping.dateFormat} unknownTypes={unknownTypes} typeAliases={batch.mapping.typeAliases} types={typeOptions} />
            </CardContent>
            </Disclosure>
          </Card>
          <Card className="self-start">
            <CardHeader><CardTitle>Confirm</CardTitle></CardHeader>
            <CardContent className="flex flex-col gap-4">
              <CommitForm batchId={batch.id} ready={Number(s.ready ?? 0)} duplicates={Number(s.duplicates ?? 0)} />
              <form action={discardAction}>
                <input type="hidden" name="batchId" value={batch.id} />
                <Button type="submit" variant="ghost" size="sm">Discard this preview</Button>
              </form>
            </CardContent>
          </Card>
        </div>
      ) : null}
      {batch.status === "committed" && app.canWrite ? (
        <Card className="mb-6"><CardContent className="pt-5"><RollbackForm batchId={batch.id} count={Number(s.imported ?? 0)} /></CardContent></Card>
      ) : null}
      {batch.status === "rolled_back" ? <Alert tone="info" className="mb-6">Rolled back on {formatDate(batch.rolledBackAt?.toISOString())}: {batch.rollbackReason}</Alert> : null}

      {batch.rows.length ? (
        <Card className="overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-4">
            <h2 className="text-[15px] font-semibold">Rows</h2>
            <nav aria-label="Filter rows" className="inline-flex rounded-lg border border-border bg-surface-2 p-0.5">
              {FILTERS.map((f) => (
                <Link key={f} href={`?show=${f}`} scroll={false} aria-current={f === show ? "true" : undefined} className={cn("rounded-md px-2.5 py-1 text-[12px] font-medium capitalize", f === show ? "bg-surface text-text shadow-sm" : "text-text-3 hover:text-text")}>
                  {f === "error" ? "Errors" : f === "duplicate" ? "Duplicates" : f}
                </Link>
              ))}
            </nav>
          </div>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[820px] text-[13px]">
              <thead className="bg-surface-2 text-left text-text-3">
                <tr>
                  <th className="px-4 py-2 font-medium">Row</th>
                  <th className="px-4 py-2 font-medium">Status</th>
                  <th className="px-4 py-2 font-medium">Date</th>
                  <th className="px-4 py-2 font-medium">Type</th>
                  <th className="px-4 py-2 font-medium">Details</th>
                  <th className="px-4 py-2 font-medium">Notes</th>
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 500).map((r) => {
                  const inp = r.input as Record<string, string> | null;
                  const amount = inp?.amount ?? inp?.grossAmount ?? inp?.proceeds ?? inp?.costBasis;
                  return (
                    <tr key={r.rowNumber} className="border-t border-border align-top">
                      <td className="num px-4 py-2 text-text-3">{r.rowNumber}</td>
                      <td className="px-4 py-2">
                        {r.status === "ready" ? <span className="inline-flex items-center gap-1 text-positive"><CircleCheck className="size-3.5" aria-hidden />Ready</span> : r.status === "error" ? <span className="inline-flex items-center gap-1 text-negative"><XCircle className="size-3.5" aria-hidden />Error</span> : <span className="inline-flex items-center gap-1 text-warning"><Copy className="size-3.5" aria-hidden />Duplicate</span>}
                      </td>
                      <td className="num whitespace-nowrap px-4 py-2">{inp ? formatDate(inp.occurredOn) : (r.cells.date ?? "—")}</td>
                      <td className="px-4 py-2">{inp ? EVENT_LABELS[inp.type as keyof typeof EVENT_LABELS] : (r.cells.type ?? "—")}</td>
                      <td className="px-4 py-2 text-text-2">
                        {inp ? (
                          <>
                            {inp.instrumentId ? <span className="font-medium text-text">{instName(inp.instrumentId)} </span> : null}
                            {inp.quantity ? <span className="num">{formatNumber(inp.quantity)} units </span> : null}
                            {inp.price ? <span className="num">@ {formatMoney(inp.price, inp.currency ?? "NGN", { decimals: 4 }).replace(/\.?0+$/, "")} </span> : null}
                            {amount ? <span className="num">{formatMoney(amount, inp.currency ?? "NGN")} </span> : null}
                            {inp.fees && inp.fees !== "0" ? <span className="num text-text-3">fees {formatMoney(inp.fees, inp.currency ?? "NGN")} </span> : null}
                            {inp.withholdingTax && inp.withholdingTax !== "0" ? <span className="num text-text-3">WHT {formatMoney(inp.withholdingTax, inp.currency ?? "NGN")} </span> : null}
                            {inp.description ? <span className="block text-text-3">{inp.description}</span> : null}
                          </>
                        ) : (
                          <span className="text-text-3">{Object.entries(r.cells).filter(([k]) => k !== "date" && k !== "type").map(([, v]) => v).join(" · ").slice(0, 160)}</span>
                        )}
                      </td>
                      <td className="px-4 py-2">
                        {r.errors.map((e, n) => <p key={n} className="text-negative">{e}</p>)}
                        {r.status === "duplicate" ? <p className="text-warning">Matches a transaction you already have{r.externalRef ? ` (reference ${r.externalRef})` : ""}.</p> : null}
                        {r.warnings.map((w, n) => <p key={n} className="flex gap-1 text-text-2"><AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-warning" aria-hidden />{w}</p>)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {rows.length > 500 ? <p className="px-5 py-3 text-[13px] text-text-3">Showing the first 500 of {rows.length} rows. Use the filters to find errors.</p> : null}
          </div>
        </Card>
      ) : null}
    </>
  );
}
