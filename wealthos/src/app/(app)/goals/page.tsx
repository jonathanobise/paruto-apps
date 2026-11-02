import Link from "next/link";
import { Plus, Target } from "lucide-react";
import { requireApp } from "@/server/auth/context";
import { featureDecision } from "@/server/compliance/gate";
import { GOAL_KINDS, listGoals } from "@/server/planning/goals";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDate, formatMoney } from "@/lib/format";

export const metadata = { title: "Goals · WealthOS" };

export default async function GoalsPage() {
  const app = await requireApp();
  const gate = await featureDecision("GOAL_PROJECTIONS", app.org.jurisdiction);
  if (!gate.available) return (<><PageHeader title="Goals" /><Alert tone="info" title="Not available yet">{gate.reason}</Alert></>);
  const goals = await listGoals(app.ctx);
  return (
    <>
      <PageHeader title="Goals" description="Set targets and see how different assumptions play out. Every projection shows several scenarios and its assumptions." actions={app.canWrite ? <Button asChild><Link href="/goals/new"><Plus aria-hidden /> New goal</Link></Button> : null} />
      {gate.status === "pending_review" ? <Alert tone="warning" className="mb-4" title="Pre-release feature">{gate.reason}</Alert> : null}
      {goals.length === 0 ? (
        <EmptyState icon={<Target />} title="No goals yet" action={app.canWrite ? <Button asChild><Link href="/goals/new">Create a goal</Link></Button> : null}>A home deposit, school fees, an emergency reserve, retirement — pick a target, a date and the accounts that count towards it.</EmptyState>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {goals.map((g) => (
            <Link key={g.id} href={`/goals/${g.id}`}>
              <Card className="h-full hover:border-border-strong">
                <CardContent className="pt-5">
                  <p className="text-[13px] text-text-3">{GOAL_KINDS[g.kind]}</p>
                  <p className="text-lg font-semibold">{g.name}</p>
                  <p className="num mt-1 text-sm text-text-2">{formatMoney(g.targetAmount, g.currency, { decimals: 0 })}{g.targetIsReal ? " in today's money" : ""} by {formatDate(g.targetDate)}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
