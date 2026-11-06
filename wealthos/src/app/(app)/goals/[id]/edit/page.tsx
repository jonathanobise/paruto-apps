import Link from "next/link";
import { notFound } from "next/navigation";
import { requireApp } from "@/server/auth/context";
import { featureDecision } from "@/server/compliance/gate";
import { listAccounts } from "@/server/accounts/service";
import { GOAL_KINDS, getGoalRow } from "@/server/planning/goals";
import { AppError } from "@/server/platform/errors";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { d } from "@/engine";
import { GoalForm } from "../../goal-form";

export default async function EditGoal({ params }: { params: Promise<{ id: string }> }) {
  const app = await requireApp();
  if (!(await featureDecision("GOAL_PROJECTIONS", app.org.jurisdiction)).available || !app.canWrite) notFound();
  const { id } = await params;
  let g;
  try {
    g = await getGoalRow(app.ctx, id);
  } catch (err) {
    if (err instanceof AppError && err.code === "NOT_FOUND") notFound();
    throw err;
  }
  const accounts = (await listAccounts(app.ctx)).filter((a) => a.status === "open");
  const pct = (v: string) => d(v).times(100).toDecimalPlaces(4).toFixed();
  return (
    <>
      <PageHeader eyebrow={<Link href={`/goals/${id}`} className="hover:text-text">← {g.name}</Link>} title="Edit goal" />
      <Card><CardContent className="pt-5">
        <GoalForm
          g={{ id, name: g.name, kind: g.kind, targetAmount: d(g.targetAmount).toFixed(2), currency: g.currency, targetDate: g.targetDate, targetIsReal: g.targetIsReal, scope: g.scope, accountIds: g.accountIds, monthlyContribution: d(g.monthlyContribution).toFixed(2), contributionTiming: g.contributionTiming, contributionGrowthPct: pct(g.contributionGrowth), inflationPct: pct(g.inflation), annualFeePct: pct(g.annualFee), scenarios: g.scenarios.map((s) => ({ label: s.label, annualReturnPct: pct(s.annualReturn) })), notes: g.notes ?? "" }}
          kinds={Object.entries(GOAL_KINDS)}
          accounts={accounts.map((a) => ({ id: a.id, name: a.name }))}
        />
      </CardContent></Card>
    </>
  );
}
