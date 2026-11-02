import Link from "next/link";
import { requireApp } from "@/server/auth/context";
import { listMyCases, SUPPORT_TOPICS } from "@/server/support/service";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AdminForm } from "@/components/app/admin-form";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { newCaseAction } from "./actions";

export const metadata = { title: "Help · WealthOS" };

export default async function SupportPage() {
  const app = await requireApp();
  const cases = await listMyCases(app.session.userId);
  return (
    <>
      <PageHeader title="Help" description="Ask the WealthOS team about your account, data, imports or billing. Only you and WealthOS support can see your requests." />
      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <Card>
          <CardHeader><div><CardTitle>New request</CardTitle><CardDescription>We&apos;ll never ask for your password, sign-in codes or bank login details. We can&apos;t give personal investment advice.</CardDescription></div></CardHeader>
          <CardContent>
            <AdminForm action={newCaseAction} submit="Send request">
              <Field label="Topic" htmlFor="topic"><Select id="topic" name="topic">{Object.entries(SUPPORT_TOPICS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select></Field>
              <Field label="Subject" htmlFor="subject"><Input id="subject" name="subject" required maxLength={120} /></Field>
              <Field label="What happened?" htmlFor="body" hint="Include what you expected and what you saw. Don't include card or account numbers."><Textarea id="body" name="body" rows={6} required maxLength={5000} /></Field>
            </AdminForm>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Your requests</CardTitle></CardHeader>
          <CardContent>{cases.length ? <ul className="divide-y divide-border text-[13px]">{cases.map((c) => <li key={c.id} className="flex items-center justify-between gap-2 py-2"><Link href={`/support/${c.id}`} className="min-w-0 truncate hover:underline">{c.subject}<span className="block text-text-3">{SUPPORT_TOPICS[c.topic]}</span></Link><Badge tone={c.status === "answered" ? "accent" : "neutral"}>{c.status === "answered" ? "Reply waiting" : c.status === "open" ? "With us" : "Closed"}</Badge></li>)}</ul> : <p className="text-sm text-text-3">None yet.</p>}</CardContent>
        </Card>
      </div>
    </>
  );
}
