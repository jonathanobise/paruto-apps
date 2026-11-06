import Link from "next/link";
import { requireAdminPage } from "@/server/auth/context";
import { listMarketImports, listSources, MARKET_IMPORT_KINDS } from "@/server/admin/catalogue";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/format";
import { MarketUploadForm } from "./forms";

export const metadata = { title: "Market data imports · Admin" };

export default async function MarketImports() {
  const app = await requireAdminPage();
  const admin = { userId: app.session.userId };
  const [sources, imports] = await Promise.all([listSources(admin), listMarketImports(admin)]);
  const usable = sources.filter((s) => s.kind !== "synthetic" && s.active);
  return (
    <>
      <PageHeader title="Market data imports" description="Upload prices, NAVs, published rates or FX rates from a registered source. Rows are checked and previewed; committed rows are stored as verified with their source." />
      <div className="grid gap-6 xl:grid-cols-[2fr_3fr]">
        <Card className="self-start"><CardHeader><CardTitle>Upload</CardTitle></CardHeader><CardContent>
          {usable.length ? <MarketUploadForm sources={usable.map((s) => ({ id: s.id, name: s.name }))} kinds={Object.entries(MARKET_IMPORT_KINDS).map(([key, k]) => ({ key, label: k.label, headers: k.headers.join(",") }))} /> : <Alert tone="warning">Register an official or licensed source first (Sources tab).</Alert>}
        </CardContent></Card>
        <Card><CardHeader><CardTitle>Recent</CardTitle></CardHeader><CardContent>
          <ul className="divide-y divide-border text-[13px]">
            {imports.map((i) => { const s = i.summary as Record<string, number>; return (
              <li key={i.id}><Link href={`/admin/imports/${i.id}`} className="flex justify-between gap-3 py-2.5 hover:text-accent"><span><span className="font-medium">{i.fileName}</span> <Badge tone={i.status === "committed" ? "accent" : i.status === "previewed" ? "warning" : "neutral"}>{i.status}</Badge><span className="block text-text-3">{MARKET_IMPORT_KINDS[i.kind as keyof typeof MARKET_IMPORT_KINDS]?.label} · {s.ready}/{s.total} ready</span></span><span className="text-text-3">{formatDate(i.createdAt.toISOString())}</span></Link></li>
            ); })}
          </ul>
        </CardContent></Card>
      </div>
    </>
  );
}
