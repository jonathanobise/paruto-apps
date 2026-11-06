import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdminPage } from "@/server/auth/context";
import { getMarketImport, MARKET_IMPORT_KINDS } from "@/server/admin/catalogue";
import { AppError } from "@/server/platform/errors";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { formatDate } from "@/lib/format";
import { CommitMarketForm } from "../forms";
import { discardMarketDataAction } from "../../actions";

export default async function MarketImportPreview({ params }: { params: Promise<{ id: string }> }) {
  const app = await requireAdminPage();
  const { id } = await params;
  let imp;
  try {
    imp = await getMarketImport({ userId: app.session.userId }, id);
  } catch (err) {
    if (err instanceof AppError && err.code === "NOT_FOUND") notFound();
    throw err;
  }
  const s = imp.summary as Record<string, number>;
  return (
    <>
      <PageHeader eyebrow={<Link href="/admin/imports" className="hover:text-text">← Imports</Link>} title={imp.fileName} description={`${MARKET_IMPORT_KINDS[imp.kind as keyof typeof MARKET_IMPORT_KINDS]?.label} from ${imp.sourceName} · ${s.ready} of ${s.total} rows ready · ${imp.status}`} />
      {imp.status === "previewed" ? (
        <Card className="mb-6"><CardContent className="flex flex-wrap items-start gap-4 pt-5">
          <CommitMarketForm id={imp.id} ready={s.ready ?? 0} />
          <form action={discardMarketDataAction}><input type="hidden" name="id" value={imp.id} /><Button variant="ghost" size="sm">Discard</Button></form>
        </CardContent></Card>
      ) : null}
      {imp.status === "committed" ? <Alert tone="success" className="mb-6">Imported {s.ready} rows as verified data{imp.committedAt ? ` on ${formatDate(imp.committedAt.toISOString())}` : ""}. Analytics caches were invalidated automatically.</Alert> : null}
      <Card className="overflow-hidden">
        <table className="w-full text-[13px]">
          <thead className="bg-surface-2 text-left text-text-3"><tr><th className="px-4 py-2 font-medium">Row</th><th className="px-4 py-2 font-medium">Data</th><th className="px-4 py-2 font-medium">Problems</th></tr></thead>
          <tbody>
            {imp.rows.slice(0, 500).map((r) => (
              <tr key={r.rowNumber} className="border-t border-border align-top">
                <td className="num px-4 py-2 text-text-3">{r.rowNumber}</td>
                <td className="px-4 py-2 font-mono text-[12px]">{r.data ? Object.entries(r.data).filter(([k]) => k !== "instrumentId").map(([k, v]) => `${k}=${v ?? "—"}`).join("  ") : "—"}</td>
                <td className="px-4 py-2 text-negative">{r.errors.join("; ")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </>
  );
}
