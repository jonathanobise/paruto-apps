import { requireStaffPage } from "@/server/auth/context";
import { featureGates } from "@/server/admin/console";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AdminForm } from "@/components/app/admin-form";
import { Field, Input, Select } from "@/components/ui/form";
import { CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { recordDecisionAction } from "../console-actions";

export const metadata = { title: "Feature gates · Admin" };

export default async function AdminGates() {
  const app = await requireStaffPage(["compliance"]);
  const rows = await featureGates({ userId: app.session.userId });
  return (
    <>
      <PageHeader title="Regulatory feature gates" description="The registry in src/server/compliance/features.ts with the decision in force for Nigeria in this environment. Decisions are append-only and take effect immediately; regulated features are hard-disabled in code and can't be approved here." />
      <Card className="mb-6">
        <CardHeader><div><CardTitle>Record a compliance decision</CardTitle><CardDescription>Recorded under your name with the reference you give, and written to the audit log. Approving a pending feature makes it available in production.</CardDescription></div></CardHeader>
        <CardContent>
          <AdminForm action={recordDecisionAction} submit="Record decision">
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Feature" htmlFor="feature"><Select id="feature" name="feature">{rows.filter((f) => !f.hardDisabled).map((f) => <option key={f.key} value={f.key}>{f.name}</option>)}</Select></Field>
              <Field label="Decision" htmlFor="status"><Select id="status" name="status"><option value="approved">Approved</option><option value="pending_review">Pending review</option><option value="suspended">Suspended</option><option value="rejected">Rejected</option></Select></Field>
              <Field label="Reference (memo or opinion)" htmlFor="reference"><Input id="reference" name="reference" required minLength={5} /></Field>
            </div>
            <Field label="Notes" htmlFor="notes"><Input id="notes" name="notes" /></Field>
          </AdminForm>
        </CardContent>
      </Card>
      <Card><CardContent className="pt-4 overflow-x-auto">
        <table className="w-full min-w-[720px] text-[12.5px]">
          <thead className="text-left text-text-3"><tr><th className="py-1.5 font-normal">Feature</th><th className="font-normal">Classification</th><th className="font-normal">Default</th><th className="font-normal">Now</th><th className="font-normal">Recorded decisions</th></tr></thead>
          <tbody>{rows.map((f) => (
            <tr key={f.key} className="border-t border-border align-top">
              <td className="py-2"><span className="font-medium">{f.name}</span><span className="block text-[11px] text-text-3">{f.key} · M{f.milestone}</span></td>
              <td>{f.classification.replace(/_/g, " ")}</td>
              <td>{f.hardDisabled ? <Badge tone="danger">Hard-disabled</Badge> : f.defaultApproval.replace(/_/g, " ")}</td>
              <td>{f.decision.available ? <Badge tone="accent">Available</Badge> : <Badge tone="neutral">Blocked</Badge>}<span className="block text-[11px] text-text-3">{f.decision.status.replace(/_/g, " ")}</span></td>
              <td className="text-text-3">{f.approvals.length ? f.approvals.map((a) => `${a.status} (${a.createdAt.toISOString().slice(0, 10)}${a.reference ? `, ${a.reference}` : ""})`).join("; ") : "none"}</td>
            </tr>
          ))}</tbody>
        </table>
      </CardContent></Card>
    </>
  );
}
