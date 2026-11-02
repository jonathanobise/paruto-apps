import Link from "next/link";
import { Bell } from "lucide-react";
import { requireApp } from "@/server/auth/context";
import { listNotifications } from "@/server/alerts/service";
import { PageHeader } from "@/components/app/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";
import { markReadAction } from "../alerts/actions";

export const metadata = { title: "Notifications · WealthOS" };
const dt = (d: Date) => new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Lagos" }).format(d);

export default async function NotificationsPage() {
  const app = await requireApp();
  const items = await listNotifications(app.ctx, 100);
  const unread = items.filter((n) => !n.readAt).length;
  return (
    <>
      <PageHeader title="Notifications" actions={<>{unread ? <form action={markReadAction}><Button variant="secondary">Mark all as read</Button></form> : null}<Button asChild variant="ghost"><Link href="/alerts">Manage alerts</Link></Button></>} />
      {items.length === 0 ? (
        <EmptyState icon={<Bell />} title="Nothing yet" action={<Button asChild variant="secondary"><Link href="/alerts">Set up an alert</Link></Button>}>Notifications from your alerts appear here.</EmptyState>
      ) : (
        <Card>
          <ul className="divide-y divide-border">
            {items.map((n) => (
              <li key={n.id} className={cn("flex items-start justify-between gap-4 px-5 py-3.5", !n.readAt && "bg-accent-soft/40")}>
                <div className="min-w-0">
                  <p className="text-[14px] font-medium">{!n.readAt ? <span className="mr-2 inline-block size-2 rounded-full bg-accent align-middle" aria-label="Unread" /> : null}{n.title}</p>
                  <p className="text-[13px] text-text-2">{n.body}</p>
                  <p className="mt-0.5 text-[12px] text-text-3">{dt(n.createdAt)}{n.link ? <> · <Link href={n.link} className="text-accent hover:underline">View</Link></> : null}</p>
                </div>
                {!n.readAt ? <form action={markReadAction}><input type="hidden" name="id" value={n.id} /><Button size="sm" variant="ghost">Mark read</Button></form> : null}
              </li>
            ))}
          </ul>
        </Card>
      )}
    </>
  );
}
