import Link from "next/link";
import { notFound } from "next/navigation";
import { requireApp } from "@/server/auth/context";
import { featureDecision } from "@/server/compliance/gate";
import { listAccounts } from "@/server/accounts/service";
import { GOAL_KINDS } from "@/server/planning/goals";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { GoalForm } from "../goal-form";

export const metadata = { title: "New goal · WealthOS" };

export default async function NewGoal() {
  const app = await requireApp();
  if (!(await featureDecision("GOAL_PROJECTIONS", app.org.jurisdiction)).available || !app.canWrite) notFound();
  const accounts = (await listAccounts(app.ctx)).filter((a) => a.status === "open");
  return (
    <>
      <PageHeader eyebrow={<Link href="/goals" className="hover:text-text">← Goals</Link>} title="New goal" />
      <Card><CardContent className="pt-5"><GoalForm g={{ currency: app.baseCurrency }} kinds={Object.entries(GOAL_KINDS)} accounts={accounts.map((a) => ({ id: a.id, name: a.name }))} /></CardContent></Card>
    </>
  );
}
