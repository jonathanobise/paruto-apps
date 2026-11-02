import { notFound } from "next/navigation";
import { requireAdminPage } from "@/server/auth/context";
import { adminGetCase, SUPPORT_TOPICS } from "@/server/support/service";
import { AppError } from "@/server/platform/errors";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { AdminForm } from "@/components/app/admin-form";
import { Textarea } from "@/components/ui/form";
import { cn } from "@/lib/utils";
import { supportCloseAction, supportReplyAction } from "../../console-actions";

export const metadata = { title: "Support case · Admin · WealthOS" };

export default async function AdminCase({ params }: { params: Promise<{ id: string }> }) {
  const app = await requireAdminPage();
  const r = await adminGetCase({ userId: app.session.userId }, (await params).id).catch((e) => (e instanceof AppError && e.code === "NOT_FOUND" ? null : Promise.reject(e)));
  if (!r) notFound();
  return (
    <>
      <PageHeader title={r.case.subject} description={`${r.user.name} · ${r.user.email} · ${SUPPORT_TOPICS[r.case.topic]} · ${r.case.status}`} />
      <div className="flex max-w-3xl flex-col gap-3">
        {r.messages.map((m) => (
          <Card key={m.id} className={cn(m.fromStaff ? "ml-8 border-accent/40" : "")}><CardContent className="pt-4 text-[14px]"><p className="mb-1 text-[12px] text-text-3">{m.fromStaff ? "WealthOS support" : r.user.name} · {m.createdAt.toISOString().slice(0, 16).replace("T", " ")}</p><p className="whitespace-pre-wrap">{m.body}</p></CardContent></Card>
        ))}
        {r.case.status !== "closed" ? (
          <Card><CardContent className="pt-4">
            <AdminForm action={supportReplyAction} submit="Send reply">
              <input type="hidden" name="caseId" value={r.case.id} />
              <label htmlFor="body" className="sr-only">Reply</label>
              <Textarea id="body" name="body" rows={5} required />
              <label className="flex items-center gap-2 text-[13px]"><input type="checkbox" name="close" /> Close the request after replying</label>
              <p className="text-[12px] text-text-3">Never ask for passwords, codes or bank login details. Don&apos;t give personal investment advice.</p>
            </AdminForm>
            <div className="mt-3"><AdminForm action={supportCloseAction} submit="Close without replying" variant="secondary"><input type="hidden" name="caseId" value={r.case.id} /></AdminForm></div>
          </CardContent></Card>
        ) : null}
      </div>
    </>
  );
}
