import Link from "next/link";
import { requireApp } from "@/server/auth/context";
import { featureDecision } from "@/server/compliance/gate";
import { DISCLOSURES } from "@/server/compliance/features";
import { ARTICLES } from "@/content/learn";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

export const metadata = { title: "Learn" };

export default async function LearnPage() {
  const app = await requireApp();
  const gate = await featureDecision("EDUCATION", app.org.jurisdiction);
  if (!gate.available) return (<><PageHeader title="Learn" /><Alert tone="info" title="Not available yet">{gate.reason}</Alert></>);
  return (
    <>
      <PageHeader title="Learn" description="Short, general explanations of how yields, returns, currencies and fees work, with worked examples calculated by the same engine as your figures." />
      <div className="grid gap-4 md:grid-cols-2">
        {ARTICLES.map((a) => (
          <Link key={a.slug} href={`/learn/${a.slug}`} className="group rounded-[var(--radius-card)] focus-visible:outline-offset-4">
            <Card className="h-full transition-colors group-hover:border-border-strong">
              <CardHeader>
                <div className="min-w-0">
                  <CardTitle className="group-hover:underline">{a.title}</CardTitle>
                  <CardDescription>{a.summary}</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="flex flex-wrap items-center gap-1.5 text-[12px] text-text-3">
                {a.topics.map((t) => <Badge key={t}>{t}</Badge>)}
                <span className="ml-auto">{a.minutes} min read</span>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
      <p className="mt-6 text-[12px] text-text-3">General education only. {DISCLOSURES.not_advice}</p>
    </>
  );
}
