import Link from "next/link";
import { requireAdminPage } from "@/server/auth/context";
import { listJobs } from "@/server/admin/console";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { AdminForm } from "@/components/app/admin-form";
import { retryJobAction } from "../console-actions";

export const metadata = { title: "Jobs · Admin · WealthOS" };
const STATUSES = ["dead", "queued", "running", "succeeded"] as const;

export default async function AdminJobs({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const app = await requireAdminPage();
  const sp = (await searchParams).status;
  const status = (STATUSES as readonly string[]).includes(sp ?? "") ? (sp as (typeof STATUSES)[number]) : "dead";
  const rows = await listJobs({ userId: app.session.userId }, status);
  return (
    <>
      <PageHeader title="Background jobs" description="Alert evaluation and the billing lifecycle run through a durable queue. Dead-lettered jobs failed every retry." />
      <p className="mb-3 flex gap-3 text-[13px]">{STATUSES.map((s) => <Link key={s} href={`/admin/jobs?status=${s}`} className={s === status ? "font-medium" : "text-accent"}>{s === "dead" ? "Failed" : s[0]!.toUpperCase() + s.slice(1)}</Link>)}</p>
      <Card><CardContent className="pt-4">
        {rows.length ? <ul className="divide-y divide-border text-[13px]">{rows.map((j) => (
          <li key={j.id} className="flex flex-wrap items-start justify-between gap-3 py-2.5">
            <div className="min-w-0"><p className="font-medium">{j.queue} <span className="font-normal text-text-3">· {j.attempts}/{j.maxAttempts} attempts · {j.createdAt.toISOString().slice(0, 16).replace("T", " ")}</span></p>{j.lastError ? <p className="mt-0.5 max-w-[80ch] truncate text-[12px] text-negative">{j.lastError}</p> : null}</div>
            {j.status === "dead" ? <AdminForm action={retryJobAction} submit="Retry" variant="secondary"><input type="hidden" name="jobId" value={j.id} /></AdminForm> : null}
          </li>
        ))}</ul> : <p className="py-4 text-sm text-text-3">None.</p>}
      </CardContent></Card>
    </>
  );
}
