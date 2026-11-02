import { requireAdminPage } from "@/server/auth/context";
import { featureGates } from "@/server/admin/console";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata = { title: "Feature gates · Admin · WealthOS" };

export default async function AdminGates() {
  const app = await requireAdminPage();
  const rows = await featureGates({ userId: app.session.userId });
  return (
    <>
      <PageHeader title="Regulatory feature gates" description="The registry in src/server/compliance/features.ts with the decision in force for Nigeria in this environment. Compliance decisions are append-only and recorded by a compliance reviewer with an operator script, not from this console; regulated features are hard-disabled in code." />
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
