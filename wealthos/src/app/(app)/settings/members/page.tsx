import { requireApp } from "@/server/auth/context";
import { listInvitations, listMembers, ROLE_HELP, ROLE_LABELS } from "@/server/identity/members";
import { planSummary } from "@/server/billing/entitlements";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/format";
import { SettingsTabs } from "../tabs";
import { CreateSpaceForm, InviteForm } from "./forms";
import { removeAction, revokeAction, roleAction } from "./actions";

export const metadata = { title: "Members · WealthOS" };

export default async function MembersPage({ searchParams }: { searchParams: Promise<{ created?: string }> }) {
  const app = await requireApp();
  const sp = await searchParams;
  const shared = app.org.kind !== "personal" && !app.org.isDemo;
  const manage = ["owner", "admin"].includes(app.org.role);
  const [members, invitations, summary] = shared ? await Promise.all([listMembers(app.ctx), manage ? listInvitations(app.ctx) : Promise.resolve([]), planSummary(app.ctx)]) : [[], [], null];
  const limit = summary?.plan.entitlements.members ?? null;
  return (
    <>
      <PageHeader title="Settings" />
      <SettingsTabs current="members" />
      {sp.created ? <Alert tone="success" className="mb-4">Shared space created and opened. Invite people below.</Alert> : null}
      {!shared ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader><div><CardTitle>“{app.org.name}” is just for you</CardTitle><CardDescription>{app.org.isDemo ? "Demo spaces can't be shared." : "Personal spaces always have one member. To track money with family or a business partner, create a shared space: it has its own accounts, goals and plan."}</CardDescription></div></CardHeader>
            {!app.org.isDemo ? <CardContent><CreateSpaceForm /></CardContent> : null}
          </Card>
          <Card>
            <CardHeader><CardTitle>Roles in shared spaces</CardTitle></CardHeader>
            <CardContent><dl className="flex flex-col gap-2 text-[13px]">{Object.entries(ROLE_HELP).map(([k, v]) => <div key={k}><dt className="font-medium">{ROLE_LABELS[k as keyof typeof ROLE_LABELS]}</dt><dd className="text-text-2">{v}</dd></div>)}</dl></CardContent>
          </Card>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <Card>
            <CardHeader><div><CardTitle>Members of “{app.org.name}”</CardTitle><CardDescription>{members.length + invitations.length} of {limit ?? "unlimited"} places on {summary!.plan.name} (pending invitations count).</CardDescription></div></CardHeader>
            <CardContent>
              <ul className="divide-y divide-border text-[13px]">
                {members.map((m) => (
                  <li key={m.userId} className="flex flex-wrap items-center gap-3 py-2.5">
                    <div className="min-w-0 flex-1"><p className="font-medium">{m.displayName}{m.userId === app.session.userId ? <span className="text-text-3"> (you)</span> : null}</p><p className="truncate text-text-3">{m.email} · joined {formatDate(m.joinedAt.toISOString().slice(0, 10))}</p></div>
                    {app.org.role === "owner" ? (
                      <form action={roleAction} className="flex items-center gap-1">
                        <input type="hidden" name="userId" value={m.userId} />
                        <label htmlFor={`role-${m.userId}`} className="sr-only">Role for {m.displayName}</label>
                        <select id={`role-${m.userId}`} name="role" defaultValue={m.role} className="h-8 rounded-lg border border-border bg-surface px-2 text-[13px]">{Object.entries(ROLE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
                        <Button type="submit" variant="ghost" size="sm">Save</Button>
                      </form>
                    ) : <Badge>{ROLE_LABELS[m.role]}</Badge>}
                    {m.userId === app.session.userId || app.org.role === "owner" || (app.org.role === "admin" && ["member", "viewer"].includes(m.role)) ? (
                      <form action={removeAction}><input type="hidden" name="userId" value={m.userId} /><Button type="submit" variant="ghost" size="sm">{m.userId === app.session.userId ? "Leave" : "Remove"}</Button></form>
                    ) : null}
                  </li>
                ))}
              </ul>
              {invitations.length ? (
                <>
                  <p className="mt-4 text-[13px] font-medium text-text-2">Pending invitations</p>
                  <ul className="divide-y divide-border text-[13px]">
                    {invitations.map((i) => (
                      <li key={i.id} className="flex items-center gap-3 py-2"><span className="min-w-0 flex-1 truncate">{i.email} · {ROLE_LABELS[i.role]} · expires {formatDate(i.expiresAt.toISOString().slice(0, 10))}</span><form action={revokeAction}><input type="hidden" name="id" value={i.id} /><Button type="submit" variant="ghost" size="sm">Revoke</Button></form></li>
                    ))}
                  </ul>
                </>
              ) : null}
              <p className="mt-4 text-[12px] text-text-3">When someone leaves or is removed, their own alerts, notifications and assistant conversations in this space are deleted. Shared records (accounts, transactions, goals) stay with the space.</p>
            </CardContent>
          </Card>
          {manage ? (
            <Card>
              <CardHeader><div><CardTitle>Invite someone</CardTitle><CardDescription>They&apos;ll need a WealthOS account with the same email address.</CardDescription></div></CardHeader>
              <CardContent className="flex flex-col gap-4">
                <InviteForm />
                <dl className="flex flex-col gap-1.5 text-[12.5px]">{(["admin", "member", "viewer"] as const).map((k) => <div key={k}><dt className="inline font-medium">{ROLE_LABELS[k]}: </dt><dd className="inline text-text-2">{ROLE_HELP[k]}</dd></div>)}</dl>
              </CardContent>
            </Card>
          ) : null}
        </div>
      )}
    </>
  );
}
