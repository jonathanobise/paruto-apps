import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStaffPage } from "@/server/auth/context";
import { userDetail } from "@/server/admin/console";
import { AppError } from "@/server/platform/errors";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AdminForm } from "@/components/app/admin-form";
import { formatDate } from "@/lib/format";
import { revokeSessionsAction } from "../../console-actions";

export const metadata = { title: "User · Admin" };
const day = (x: Date | null) => (x ? formatDate(x.toISOString().slice(0, 10)) : "—");

export default async function AdminUser({ params }: { params: Promise<{ id: string }> }) {
  const app = await requireStaffPage(["support"]);
  const r = await userDetail({ userId: app.session.userId }, (await params).id).catch((e) => (e instanceof AppError && e.code === "NOT_FOUND" ? null : Promise.reject(e)));
  if (!r) notFound();
  const u = r.user;
  return (
    <>
      <PageHeader title={u.name} description={`${u.email} · joined ${day(u.createdAt)} · this view was recorded in the audit log`} />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Account</CardTitle></CardHeader>
          <CardContent className="flex flex-col gap-3 text-[13px]">
            <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-1">
              <dt className="text-text-3">Email verified</dt><dd>{day(u.verified)}</dd>
              <dt className="text-text-3">Two-step verification</dt><dd>{u.mfa ? `On since ${day(u.mfa)}` : "Off"}</dd>
              <dt className="text-text-3">Platform role</dt><dd>{u.role}</dd>
              <dt className="text-text-3">Failed sign-ins</dt><dd>{u.failedLogins}{u.lockedUntil && u.lockedUntil > new Date() ? ` · locked until ${u.lockedUntil.toISOString().slice(0, 16).replace("T", " ")}` : ""}</dd>
              <dt className="text-text-3">Active sessions</dt><dd>{r.activeSessions}</dd>
              {u.deletedAt ? <><dt className="text-text-3">Erased</dt><dd>{day(u.deletedAt)}</dd></> : null}
            </dl>
            <AdminForm action={revokeSessionsAction} submit="Sign out everywhere" variant="secondary"><input type="hidden" name="userId" value={u.id} /></AdminForm>
            <p className="text-[12px] text-text-3">Platform roles are granted only with <code>scripts/grant-admin.ts</code> by an operator.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Spaces</CardTitle></CardHeader>
          <CardContent><ul className="divide-y divide-border text-[13px]">{r.orgs.map((o) => <li key={o.id} className="flex justify-between py-2"><Link href={`/admin/orgs/${o.id}`} className="hover:underline">{o.name}</Link><span className="text-text-3">{o.kind}{o.isDemo ? " (demo)" : ""} · {o.role}</span></li>)}</ul></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Security events</CardTitle></CardHeader>
          <CardContent><ul className="text-[12.5px]">{r.events.map((e, i) => <li key={i} className="flex justify-between border-t border-border py-1.5 first:border-0"><span>{e.type}</span><span className="text-text-3">{e.createdAt.toISOString().slice(0, 16).replace("T", " ")}{e.ip ? ` · ${e.ip}` : ""}</span></li>)}</ul></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Support requests</CardTitle></CardHeader>
          <CardContent>{r.cases.length ? <ul className="text-[13px]">{r.cases.map((c) => <li key={c.id} className="flex justify-between border-t border-border py-1.5 first:border-0"><Link href={`/admin/support/${c.id}`} className="hover:underline">{c.subject}</Link><Badge>{c.status}</Badge></li>)}</ul> : <p className="text-sm text-text-3">None.</p>}</CardContent>
        </Card>
      </div>
    </>
  );
}
