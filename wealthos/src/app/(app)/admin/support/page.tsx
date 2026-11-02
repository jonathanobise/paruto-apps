import Link from "next/link";
import { requireStaffPage } from "@/server/auth/context";
import { adminListCases, SUPPORT_TOPICS } from "@/server/support/service";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata = { title: "Support · Admin · WealthOS" };

export default async function AdminSupport({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const app = await requireStaffPage(["support"]);
  const closed = (await searchParams).status === "closed";
  const rows = await adminListCases({ userId: app.session.userId }, closed ? ["closed"] : ["open", "answered"]);
  return (
    <>
      <PageHeader title="Support" description="Requests from users. Opening a request is recorded in the audit log." />
      <p className="mb-3 text-[13px]"><Link href="/admin/support" className={closed ? "text-accent" : "font-medium"}>Open and answered</Link> · <Link href="/admin/support?status=closed" className={closed ? "font-medium" : "text-accent"}>Closed</Link></p>
      <Card><CardContent className="pt-4">
        {rows.length ? <ul className="divide-y divide-border text-[13px]">{rows.map((c) => (
          <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
            <div><Link href={`/admin/support/${c.id}`} className="font-medium hover:underline">{c.subject}</Link><span className="block text-text-3">{c.name} · {c.email} · {SUPPORT_TOPICS[c.topic]}</span></div>
            <div className="flex items-center gap-2"><span className="text-text-3">{c.updatedAt.toISOString().slice(0, 16).replace("T", " ")}</span><Badge tone={c.status === "open" ? "warning" : "neutral"}>{c.status === "open" ? "Waiting for us" : c.status}</Badge></div>
          </li>
        ))}</ul> : <p className="py-4 text-sm text-text-3">Nothing here.</p>}
      </CardContent></Card>
    </>
  );
}
