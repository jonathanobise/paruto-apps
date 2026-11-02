import Link from "next/link";
import { requireStaffPage } from "@/server/auth/context";
import { searchOrgs } from "@/server/admin/console";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/form";
import { formatDate } from "@/lib/format";

export const metadata = { title: "Organisations · Admin · WealthOS" };

export default async function AdminOrgs({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const app = await requireStaffPage(["support"]);
  const q = (await searchParams).q ?? "";
  const rows = await searchOrgs({ userId: app.session.userId }, q);
  return (
    <>
      <PageHeader title="Organisations" description="Spaces, their members and plans." />
      <form className="mb-4 flex max-w-lg gap-2" method="get"><label htmlFor="q" className="sr-only">Search</label><Input id="q" name="q" defaultValue={q} placeholder="name or id" /><Button type="submit" variant="secondary">Search</Button></form>
      <Card><CardContent className="pt-4">
        <table className="w-full text-[13px]">
          <thead className="text-left text-text-3"><tr><th className="py-1.5 font-normal">Space</th><th className="font-normal">Kind</th><th className="text-right font-normal">Members</th><th className="pl-3 font-normal">Plan</th><th className="font-normal">Created</th></tr></thead>
          <tbody>{rows.map((o) => (
            <tr key={o.id} className="border-t border-border">
              <td className="py-2"><Link href={`/admin/orgs/${o.id}`} className="font-medium hover:underline">{o.name}</Link></td>
              <td>{o.kind}{o.isDemo ? " (demo)" : ""}</td>
              <td className="num text-right">{o.members}</td>
              <td className="pl-3">{o.subscription ? <Badge tone={o.subscription.status === "past_due" ? "warning" : "accent"}>{o.subscription.planCode} · {o.subscription.complimentary ? "comp" : o.subscription.status}</Badge> : <span className="text-text-3">Free</span>}</td>
              <td>{formatDate(o.createdAt.toISOString().slice(0, 10))}</td>
            </tr>
          ))}</tbody>
        </table>
      </CardContent></Card>
    </>
  );
}
