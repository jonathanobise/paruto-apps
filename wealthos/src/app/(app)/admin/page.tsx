import Link from "next/link";
import { requireAdminPage } from "@/server/auth/context";
import { listCatalogue, listMarketImports, listSources } from "@/server/admin/catalogue";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";

export const metadata = { title: "Admin · WealthOS" };

export default async function AdminHome() {
  const app = await requireAdminPage();
  const admin = { userId: app.session.userId };
  const [sources, catalogue, imports] = await Promise.all([listSources(admin), listCatalogue(admin), listMarketImports(admin)]);
  const verified = catalogue.filter((c) => c.verificationState === "verified").length;
  return (
    <>
      <PageHeader title="Administration" description="Catalogue and market data. Every change is written to the audit log; the database re-checks your administrator role on each write." />
      <Alert tone="info" className="mb-6" title="No live data feeds are connected">Market data enters WealthOS only through verified imports from the sources registered here. Record each source&apos;s licence or terms before importing from it.</Alert>
      <div className="grid gap-4 sm:grid-cols-3">
        {[["/admin/sources", "Sources", sources.filter((s) => s.kind !== "synthetic").length, "registered (excluding sample)"], ["/admin/instruments", "Catalogue", catalogue.filter((c) => !c.isDemo).length, `instruments · ${verified} verified`], ["/admin/imports", "Imports", imports.length, "recent market data imports"]].map(([href, title, n, sub]) => (
          <Link key={String(href)} href={String(href)}><Card className="hover:border-border-strong"><CardContent className="pt-5"><p className="text-[13px] text-text-3">{title}</p><p className="num text-3xl font-semibold">{n}</p><p className="text-[13px] text-text-2">{sub}</p></CardContent></Card></Link>
        ))}
      </div>
    </>
  );
}
