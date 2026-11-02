import Link from "next/link";
import { notFound } from "next/navigation";
import { CircleCheck, CircleDashed, Pencil } from "lucide-react";
import { requireApp } from "@/server/auth/context";
import { featureDecision } from "@/server/compliance/gate";
import { DISCLOSURES } from "@/server/compliance/features";
import { GOAL_KINDS, getGoalView } from "@/server/planning/goals";
import { AppError } from "@/server/platform/errors";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Stat } from "@/components/app/stat";
import { ScenarioChart } from "@/components/app/scenario-chart";
import { formatDate, formatMoney, formatPercent } from "@/lib/format";
import { archiveGoalAction } from "../actions";

export default async function GoalPage({ params }: { params: Promise<{ id: string }> }) {
  const app = await requireApp();
  if (!(await featureDecision("GOAL_PROJECTIONS", app.org.jurisdiction)).available) notFound();
  const { id } = await params;
  let v;
  try {
    v = await getGoalView(app.ctx, id);
  } catch (err) {
    if (err instanceof AppError && err.code === "NOT_FOUND") notFound();
    throw err;
  }
  const g = v.goal;
  const ccy = g.currency;
  const progress = v.progress === null ? 0 : Math.max(0, Math.min(1, Number(v.progress)));
  const meets = v.scenarios.filter((s) => s.meetsTarget).length;
  return (
    <>
      <PageHeader
        eyebrow={<Link href="/goals" className="hover:text-text">← Goals</Link>}
        title={g.name}
        description={`${GOAL_KINDS[g.kind]} · ${formatMoney(g.targetAmount, ccy, { decimals: 0 })}${g.targetIsReal ? " in today's money" : ""} by ${formatDate(g.targetDate)} (${v.months} months)`}
        actions={app.canWrite ? (
          <>
            <Button asChild variant="secondary"><Link href={`/goals/${id}/edit`}><Pencil aria-hidden /> Edit</Link></Button>
            <form action={archiveGoalAction}><input type="hidden" name="id" value={id} /><Button variant="ghost">Archive</Button></form>
          </>
        ) : null}
      />
      {!v.currentComplete ? <Alert tone="warning" className="mb-6">Some linked values couldn&apos;t be converted to {ccy} (missing prices or exchange rates), so the starting value is understated.</Alert> : null}
      <Card className="mb-6">
        <CardContent className="pt-5">
          <dl className="grid gap-6 sm:grid-cols-3">
            <Stat label={g.scope === "net_worth" ? "Net worth today" : "Linked accounts today"} value={formatMoney(v.current, ccy, { decimals: 0 })} />
            <Stat label="Progress" value={v.progress === null ? "—" : formatPercent(v.progress, { decimals: 1 })} sub={g.targetIsReal ? "of the target in today's money" : "of the target"} />
            <Stat label="Target at the date" value={formatMoney(v.targetNominal, ccy, { decimals: 0 })} sub={g.targetIsReal ? `in future money at ${formatPercent(g.inflation, { decimals: 1 })} assumed inflation` : "as written"} />
          </dl>
          <div className="mt-5 h-2 overflow-hidden rounded-full bg-surface-2" role="progressbar" aria-valuenow={Math.round(progress * 100)} aria-valuemin={0} aria-valuemax={100} aria-label="Progress towards the goal">
            <div className="h-full rounded-full bg-[var(--series-1)]" style={{ width: `${progress * 100}%` }} />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[3fr_2fr]">
        <Card>
          <CardHeader><div><CardTitle>Projected value</CardTitle><CardDescription>In future {ccy}. Reaches the target in {meets} of {v.scenarios.length} scenarios with your current plan.</CardDescription></div></CardHeader>
          <CardContent><ScenarioChart series={v.scenarios.map((s) => ({ label: `${s.label} (${formatPercent(s.annualReturn, { decimals: 1 })})`, path: s.path }))} currency={ccy} target={Number(v.targetNominal)} /></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>By scenario</CardTitle></CardHeader>
          <CardContent>
            <ul className="flex flex-col gap-4 text-[13px]">
              {v.scenarios.map((s) => (
                <li key={s.label} className="rounded-xl border border-border p-3">
                  <p className="flex items-center gap-2 font-medium">
                    {s.meetsTarget ? <CircleCheck className="size-4 text-positive" aria-hidden /> : <CircleDashed className="size-4 text-warning" aria-hidden />}
                    {s.label} · {formatPercent(s.annualReturn, { decimals: 1 })} a year {s.meetsTarget ? <span className="sr-only">(reaches the target)</span> : <span className="sr-only">(falls short)</span>}
                  </p>
                  <p className="mt-1 text-text-2">Projected {formatMoney(s.finalNominal, ccy, { decimals: 0 })} (≈ {formatMoney(s.finalReal, ccy, { decimals: 0 })} in today&apos;s money)</p>
                  <p className="text-text-2">Level monthly amount that would reach the target: <span className="num font-medium text-text">{formatMoney(s.requiredMonthly, ccy, { decimals: 0 })}</span> (you plan {formatMoney(g.monthlyContribution, ccy, { decimals: 0 })})</p>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      {v.currencySensitivity ? (
        <Card className="mt-6">
          <CardHeader><div><CardTitle>If you save in naira</CardTitle><CardDescription>Your goal is in {ccy}. At today&apos;s rate ({v.currencySensitivity.fxRate} NGN per {ccy}) the target at the date is about {formatMoney(v.currencySensitivity.ngnToday, "NGN", { decimals: 0 })}.</CardDescription></div></CardHeader>
          <CardContent>
            <ul className="grid gap-3 text-[13px] sm:grid-cols-3">
              {v.currencySensitivity.rows.map((r) => <li key={r.label} className="rounded-lg bg-surface-2 p-3"><p className="text-text-3">{r.label}</p><p className="num text-base font-semibold">{formatMoney(r.ngn, "NGN", { decimals: 0 })}</p></li>)}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      <Card className="mt-6">
        <CardHeader><CardTitle>Assumptions</CardTitle></CardHeader>
        <CardContent><ul className="list-disc space-y-1 pl-4 text-[13px] text-text-2">{v.disclosures.map((x) => <li key={x}>{x}</li>)}</ul><p className="mt-3 text-[12px] text-text-3">{DISCLOSURES.hypothetical} {DISCLOSURES.not_advice}</p></CardContent>
      </Card>
    </>
  );
}
