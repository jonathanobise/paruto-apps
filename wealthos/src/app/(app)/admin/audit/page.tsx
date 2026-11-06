import Link from "next/link";
import { requireStaffPage } from "@/server/auth/context";
import { auditLog, securityLog } from "@/server/admin/console";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/form";

export const metadata = { title: "Audit log · Admin" };

export default async function AdminAudit({ searchParams }: { searchParams: Promise<{ tab?: string; action?: string; org?: string; actor?: string }> }) {
  const app = await requireStaffPage(["compliance"]);
  const sp = await searchParams;
  const security = sp.tab === "security";
  const admin = { userId: app.session.userId };
  const rows = security ? await securityLog(admin, { type: sp.action, userId: sp.actor }) : await auditLog(admin, { action: sp.action, orgId: sp.org, actorId: sp.actor });
  return (
    <>
      <PageHeader title="Audit log" description="Append-only. Tenant and administrator actions, and sign-in/security events. Latest 200 matching." />
      <p className="mb-3 text-[13px]"><Link href="/admin/audit" className={security ? "text-accent" : "font-medium"}>Actions</Link> · <Link href="/admin/audit?tab=security" className={security ? "font-medium" : "text-accent"}>Security events</Link></p>
      <form className="mb-4 flex flex-wrap gap-2" method="get">
        {security ? <input type="hidden" name="tab" value="security" /> : null}
        <label className="sr-only" htmlFor="f-action">{security ? "Event type starts with" : "Action starts with"}</label><Input id="f-action" name="action" defaultValue={sp.action ?? ""} placeholder={security ? "type, e.g. auth." : "action, e.g. admin. or billing."} className="max-w-56" />
        {!security ? <><label className="sr-only" htmlFor="f-org">Organisation id</label><Input id="f-org" name="org" defaultValue={sp.org ?? ""} placeholder="organisation id" className="max-w-72" /></> : null}
        <label className="sr-only" htmlFor="f-actor">{security ? "User id" : "Actor id"}</label><Input id="f-actor" name="actor" defaultValue={sp.actor ?? ""} placeholder={security ? "user id" : "actor id"} className="max-w-72" />
        <Button type="submit" variant="secondary">Filter</Button>
      </form>
      <Card><CardContent className="pt-4 overflow-x-auto">
        <table className="w-full min-w-[640px] text-[12.5px]">
          <thead className="text-left text-text-3"><tr><th className="py-1.5 font-normal">When (UTC)</th><th className="font-normal">{security ? "Event" : "Action"}</th><th className="font-normal">{security ? "User" : "Actor / target"}</th><th className="font-normal">Details</th></tr></thead>
          <tbody>{rows.map((r) => (
            <tr key={r.id} className="border-t border-border align-top">
              <td className="py-1.5 whitespace-nowrap">{r.createdAt.toISOString().slice(0, 19).replace("T", " ")}</td>
              <td className="font-medium">{"action" in r ? r.action : r.type}</td>
              <td className="text-text-2">{"action" in r ? <>{r.actorUserId ? <Link href={`/admin/users/${r.actorUserId}`} className="hover:underline">{r.actorUserId.slice(0, 8)}</Link> : "system"}{r.targetType ? ` → ${r.targetType} ${String(r.targetId ?? "").slice(0, 8)}` : ""}</> : r.userId ? <Link href={`/admin/users/${r.userId}`} className="hover:underline">{r.userId.slice(0, 8)}</Link> : "—"}</td>
              <td className="max-w-[48ch] truncate text-text-3">{JSON.stringify(r.metadata)}</td>
            </tr>
          ))}</tbody>
        </table>
      </CardContent></Card>
    </>
  );
}
