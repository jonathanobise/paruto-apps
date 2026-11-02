import Link from "next/link";
import { requireStaffPage } from "@/server/auth/context";
import { listCatalogue, listMarketImports } from "@/server/admin/catalogue";
import { adminOverview, sourceFreshness } from "@/server/admin/console";
import { ARTICLES } from "@/content/learn";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/format";

export const metadata = { title: "Admin · WealthOS" };

export default async function AdminHome() {
  const app = await requireStaffPage(["support", "compliance"]);
  const admin = { userId: app.session.userId };
  const isAdmin = app.staffRole === "admin";
  const [o, fresh, catalogue, imports] = await Promise.all([adminOverview(admin), isAdmin ? sourceFreshness(admin) : Promise.resolve([]), isAdmin ? listCatalogue(admin) : Promise.resolve([]), isAdmin ? listMarketImports(admin) : Promise.resolve([])]);
  const all: Array<[string, string, number, string]> = [
    ["/admin/users", "Users", o.users, "active accounts"],
    ["/admin/orgs", "Organisations", o.orgs, "excluding demos"],
    ["/admin/billing", "Subscriptions", o.activeSubs, `current · ${o.openInvoices} unpaid invoices`],
    ["/admin/support", "Support", o.openCases, "open requests"],
    ["/admin/jobs", "Jobs", o.deadJobs, `dead-lettered · ${o.queuedJobs} queued`],
    ["/admin/instruments", "Catalogue", catalogue.filter((c) => !c.isDemo).length, `instruments · ${catalogue.filter((c) => c.verificationState === "verified").length} verified · ${imports.length} imports`],
  ];
  const allowed: Record<string, string[]> = { admin: all.map(([h]) => h), support: ["/admin/users", "/admin/orgs", "/admin/support"], compliance: [] };
  const cards = all.filter(([href]) => allowed[app.staffRole]!.includes(href));
  if (!isAdmin) {
    return (
      <>
        <PageHeader title="Staff console" description={app.staffRole === "support" ? "Help customers with their accounts and requests. Every view of a person's or organisation's details is recorded in the audit log. You can't see financial records." : "Review the audit trail, AI usage and feature decisions. Record compliance decisions under Feature gates."} />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map(([href, title, n, sub]) => <Link key={href} href={href}><Card className="h-full hover:border-border-strong"><CardContent className="pt-5"><p className="text-[13px] text-text-3">{title}</p><p className="num text-3xl font-semibold">{n}</p><p className="text-[13px] text-text-2">{sub}</p></CardContent></Card></Link>)}
          {app.staffRole === "compliance" ? [["/admin/audit", "Audit log"], ["/admin/ai", "AI usage"], ["/admin/gates", "Feature gates"]].map(([href, title]) => <Link key={href} href={href!}><Card className="h-full hover:border-border-strong"><CardContent className="pt-5"><p className="text-[15px] font-medium">{title}</p></CardContent></Card></Link>) : null}
        </div>
      </>
    );
  }
  return (
    <>
      <PageHeader title="Administration" description="Every view of a person's or organisation's details and every change is written to the audit log. The database re-checks your administrator role and two-step verification on each request." />
      <Alert tone="info" className="mb-6" title="Not connected">No live market-data feed, payment provider, email provider or AI provider is connected. See docs/DEPLOYMENT.md.</Alert>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map(([href, title, n, sub]) => (
          <Link key={href} href={href}><Card className="h-full hover:border-border-strong"><CardContent className="pt-5"><p className="text-[13px] text-text-3">{title}</p><p className="num text-3xl font-semibold">{n}</p><p className="text-[13px] text-text-2">{sub}</p></CardContent></Card></Link>
        ))}
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <Card>
          <CardHeader><CardTitle>Source freshness</CardTitle></CardHeader>
          <CardContent>
            <table className="w-full text-[13px]">
              <thead className="text-left text-text-3"><tr><th className="py-1.5 font-normal">Source</th><th className="font-normal">Latest data</th><th className="text-right font-normal">Stale after</th><th className="text-right font-normal">Status</th></tr></thead>
              <tbody>{fresh.map((s) => (
                <tr key={s.name} className="border-t border-border"><td className="py-2">{s.name}<span className="block text-[11px] text-text-3">{s.kind.replace(/_/g, " ")}</span></td><td>{s.latest ? `${formatDate(s.latest)} (${s.ageDays} d)` : "none"}</td><td className="num text-right">{s.fresh_days} d</td><td className="text-right">{s.kind === "synthetic" ? <Badge tone="demo">Sample</Badge> : s.stale ? <Badge tone="warning">Stale</Badge> : <Badge tone="accent">Fresh</Badge>}</td></tr>
              ))}</tbody>
            </table>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Education content</CardTitle></CardHeader>
          <CardContent>
            <ul className="divide-y divide-border text-[13px]">{ARTICLES.map((a) => <li key={a.slug} className="flex justify-between gap-3 py-2"><Link href={`/learn/${a.slug}`} className="hover:underline">{a.title}</Link><span className="shrink-0 text-text-3">reviewed {formatDate(a.reviewedOn)}</span></li>)}</ul>
            <p className="mt-3 text-[12px] text-text-3">Articles are edited in <code>src/content/learn.ts</code> and reviewed like code; their worked examples are checked by tests. There is no user-generated public content to moderate.</p>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
