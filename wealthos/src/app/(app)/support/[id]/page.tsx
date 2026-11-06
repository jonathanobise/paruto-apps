import Link from "next/link";
import { notFound } from "next/navigation";
import { requireApp } from "@/server/auth/context";
import { getMyCase, SUPPORT_TOPICS } from "@/server/support/service";
import { AppError } from "@/server/platform/errors";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AdminForm } from "@/components/app/admin-form";
import { Textarea } from "@/components/ui/form";
import { cn } from "@/lib/utils";
import { closeAction, replyAction } from "../actions";
import { BRAND } from "@/lib/brand";

export const metadata = { title: "Help request" };

export default async function CasePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ new?: string }> }) {
  const app = await requireApp();
  const r = await getMyCase(app.session.userId, (await params).id).catch((e) => (e instanceof AppError && e.code === "NOT_FOUND" ? null : Promise.reject(e)));
  if (!r) notFound();
  const sp = await searchParams;
  return (
    <>
      <p className="mb-2 text-[13px]"><Link href="/support" className="text-text-3 hover:text-text">← Help</Link></p>
      <PageHeader title={r.case.subject} description={`${SUPPORT_TOPICS[r.case.topic]} · ${r.case.status === "closed" ? "closed" : r.case.status === "answered" ? "we've replied" : "with us"}`} />
      {sp.new ? <Alert tone="success" className="mb-4">Request sent. We&apos;ll reply here and by email.</Alert> : null}
      <div className="flex max-w-3xl flex-col gap-3">
        {r.messages.map((m) => (
          <Card key={m.id} className={cn(m.fromStaff ? "border-accent/40" : "ml-8")}><CardContent className="pt-4 text-[14px]"><p className="mb-1 text-[12px] text-text-3">{m.fromStaff ? `${BRAND} support` : "You"} · {m.createdAt.toISOString().slice(0, 16).replace("T", " ")} UTC</p><p className="whitespace-pre-wrap">{m.body}</p></CardContent></Card>
        ))}
        {r.case.status !== "closed" ? (
          <Card><CardContent className="flex flex-col gap-3 pt-4">
            <AdminForm action={replyAction} submit="Send">
              <input type="hidden" name="caseId" value={r.case.id} />
              <label htmlFor="body" className="sr-only">Your message</label>
              <Textarea id="body" name="body" rows={4} required maxLength={5000} />
            </AdminForm>
            <form action={closeAction}><input type="hidden" name="caseId" value={r.case.id} /><Button type="submit" variant="ghost" size="sm">Mark as resolved</Button></form>
          </CardContent></Card>
        ) : null}
      </div>
    </>
  );
}
