import { requireApp } from "@/server/auth/context";
import { listSessions } from "@/server/identity/sessions";
import { recentSecurityEvents } from "@/server/identity/preferences";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SettingsTabs } from "../tabs";
import { DisableMfa, EnableMfa } from "./mfa";
import { PasswordForm } from "./password-form";
import { revokeSessionAction } from "../actions";

export const metadata = { title: "Security" };

function device(ua: string | null): string {
  if (!ua) return "Unknown device";
  const browser = /Edg\//.test(ua) ? "Edge" : /Chrome\//.test(ua) ? "Chrome" : /Firefox\//.test(ua) ? "Firefox" : /Safari\//.test(ua) ? "Safari" : "Browser";
  const os = /iPhone|iPad/.test(ua) ? "iOS" : /Android/.test(ua) ? "Android" : /Mac OS X/.test(ua) ? "macOS" : /Windows/.test(ua) ? "Windows" : /Linux/.test(ua) ? "Linux" : "";
  return `${browser}${os ? ` on ${os}` : ""}`;
}

const dt = (d: Date) => new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Lagos" }).format(d);

export default async function SecurityPage() {
  const app = await requireApp();
  const [sessions, events] = await Promise.all([listSessions(app.session.userId), recentSecurityEvents(app.session.userId)]);
  return (
    <>
      <PageHeader title="Settings" />
      <SettingsTabs current="security" />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Two-step verification</CardTitle></CardHeader>
          <CardContent>{app.session.user.mfaEnabled ? <DisableMfa /> : <EnableMfa />}</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Password</CardTitle></CardHeader>
          <CardContent><PasswordForm /></CardContent>
        </Card>
        <Card>
          <CardHeader><div><CardTitle>Signed-in devices</CardTitle><CardDescription>Sessions end after 60 minutes of inactivity and 12 hours at most.</CardDescription></div></CardHeader>
          <CardContent>
            <ul className="divide-y divide-border text-[13px]">
              {sessions.map((s) => (
                <li key={s.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div>
                    <p className="font-medium">{device(s.userAgent)} {s.id === app.session.id ? <Badge tone="accent">This device</Badge> : null}</p>
                    <p className="text-text-3">Last active {dt(s.lastSeenAt)}{s.ip ? ` · ${s.ip}` : ""}</p>
                  </div>
                  {s.id !== app.session.id ? (
                    <form action={revokeSessionAction}>
                      <input type="hidden" name="sessionId" value={s.id} />
                      <button className="text-text-3 hover:text-negative">Sign out</button>
                    </form>
                  ) : null}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Security activity</CardTitle></CardHeader>
          <CardContent>
            <ul className="divide-y divide-border text-[13px]">
              {events.map((e) => (
                <li key={e.id} className="flex justify-between gap-3 py-2"><span className="font-mono text-[12px]">{e.type}</span><span className="text-text-3">{dt(e.createdAt)}</span></li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
