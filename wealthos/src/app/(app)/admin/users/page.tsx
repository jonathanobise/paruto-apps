import Link from "next/link";
import { requireStaffPage } from "@/server/auth/context";
import { searchUsers } from "@/server/admin/console";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/form";
import { formatDate } from "@/lib/format";

export const metadata = { title: "Users · Admin · WealthOS" };

export default async function AdminUsers({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const app = await requireStaffPage(["support"]);
  const q = (await searchParams).q ?? "";
  const rows = await searchUsers({ userId: app.session.userId }, q);
  return (
    <>
      <PageHeader title="Users" description="Search by email, name or id. Searches are audited. Financial records are never shown here." />
      <form className="mb-4 flex max-w-lg gap-2" method="get"><label htmlFor="q" className="sr-only">Search</label><Input id="q" name="q" defaultValue={q} placeholder="email, name or id" /><Button type="submit" variant="secondary">Search</Button></form>
      <Card><CardContent className="pt-4">
        <table className="w-full text-[13px]">
          <thead className="text-left text-text-3"><tr><th className="py-1.5 font-normal">User</th><th className="font-normal">Joined</th><th className="font-normal">Status</th></tr></thead>
          <tbody>{rows.map((u) => (
            <tr key={u.id} className="border-t border-border">
              <td className="py-2"><Link href={`/admin/users/${u.id}`} className="font-medium hover:underline">{u.name}</Link><span className="block text-text-3">{u.email}</span></td>
              <td>{formatDate(u.createdAt.toISOString().slice(0, 10))}</td>
              <td className="flex flex-wrap gap-1 py-2">{u.deletedAt ? <Badge>Erased</Badge> : null}{u.verified ? null : <Badge tone="warning">Unverified</Badge>}{u.mfa ? <Badge tone="accent">2FA</Badge> : null}{u.role !== "user" ? <Badge tone="demo">{u.role}</Badge> : null}{u.lockedUntil && u.lockedUntil > new Date() ? <Badge tone="danger">Locked</Badge> : null}</td>
            </tr>
          ))}</tbody>
        </table>
        {!rows.length ? <p className="py-4 text-sm text-text-3">No users match.</p> : null}
      </CardContent></Card>
    </>
  );
}
