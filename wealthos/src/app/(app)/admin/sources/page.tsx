import { requireAdminPage } from "@/server/auth/context";
import { listSources } from "@/server/admin/catalogue";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SourceForm } from "./form";

export const metadata = { title: "Sources · Admin" };

export default async function SourcesPage() {
  const app = await requireAdminPage();
  const sources = await listSources({ userId: app.session.userId });
  return (
    <>
      <PageHeader title="Data sources" description="Every price, rate and FX figure points to one of these, with its licence and freshness threshold." />
      <div className="grid gap-6 xl:grid-cols-[3fr_2fr]">
        <Card>
          <ul className="divide-y divide-border text-[13px]">
            {sources.map((s) => (
              <li key={s.id} className="px-5 py-3">
                <p className="font-medium">{s.name} <Badge tone={s.kind === "synthetic" ? "demo" : "neutral"}>{s.kind.replace(/_/g, " ")}</Badge> <span className="font-mono text-[12px] text-text-3">{s.key}</span></p>
                <p className="text-text-2">{s.licenseNote}</p>
                <p className="text-text-3">Stale after {s.defaultFreshnessDays} days{s.url ? ` · ${s.url}` : ""}</p>
              </li>
            ))}
          </ul>
        </Card>
        <Card className="self-start"><CardHeader><CardTitle>Add a source</CardTitle></CardHeader><CardContent><SourceForm /></CardContent></Card>
      </div>
    </>
  );
}
