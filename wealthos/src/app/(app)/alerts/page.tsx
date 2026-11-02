import { Bell } from "lucide-react";
import { requireApp } from "@/server/auth/context";
import { featureDecision } from "@/server/compliance/gate";
import { ALERT_LABELS, listAlerts } from "@/server/alerts/service";
import { listGoals } from "@/server/planning/goals";
import { searchCatalogue } from "@/server/research/catalogue";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDate } from "@/lib/format";
import { CheckNowForm, NewAlertForm } from "./forms";
import { deleteAlertAction, toggleAlertAction } from "./actions";

export const metadata = { title: "Alerts · WealthOS" };

function describe(kind: string, p: Record<string, string | number>, names: Map<string, string>): string {
  switch (kind) {
    case "price_above": return `${names.get(String(p.instrumentId)) ?? "Instrument"} above ${p.level}`;
    case "price_below": return `${names.get(String(p.instrumentId)) ?? "Instrument"} below ${p.level}`;
    case "fx_above": return `${p.base}/${p.quote} above ${p.level}`;
    case "fx_below": return `${p.base}/${p.quote} below ${p.level}`;
    case "maturity_reminder": return `${p.daysBefore} days before a holding matures`;
    case "concentration": return `A holding exceeds ${p.maxWeightPct}% of investments`;
    case "goal_progress": return `Milestones for “${names.get(String(p.goalId)) ?? "a goal"}”`;
    default: return "Prices, rates or FX become stale or missing";
  }
}

export default async function AlertsPage() {
  const app = await requireApp();
  const gate = await featureDecision("ALERTS_USER_DEFINED", app.org.jurisdiction);
  if (!gate.available) return (<><PageHeader title="Alerts" /><Alert tone="info" title="Not available yet">{gate.reason}</Alert></>);
  const [rules, goals, catalogue] = await Promise.all([listAlerts(app.ctx), listGoals(app.ctx), searchCatalogue(app.ctx, {})]);
  const names = new Map<string, string>([...catalogue.map((c) => [c.id, c.symbol ?? c.name] as [string, string]), ...goals.map((g) => [g.id, g.name] as [string, string])]);
  return (
    <>
      <PageHeader title="Alerts" description="Get an in-app notification when something you care about changes. Alerts describe what happened; they never tell you to buy or sell." actions={rules.length ? <CheckNowForm /> : null} />
      <div className="grid gap-6 xl:grid-cols-[3fr_2fr]">
        <Card>
          <CardHeader><CardTitle>Your alerts</CardTitle></CardHeader>
          <CardContent>
            {rules.length === 0 ? (
              <EmptyState icon={<Bell />} title="No alerts yet">Create one on the right: price or exchange-rate levels, maturity reminders, stale data, concentration or goal milestones.</EmptyState>
            ) : (
              <ul className="divide-y divide-border text-[13px]">
                {rules.map((r) => (
                  <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                    <div>
                      <p className="font-medium">{describe(r.kind, r.params, names)} {!r.enabled ? <Badge>Off</Badge> : null} {r.repeat ? <Badge tone="accent">Repeats</Badge> : null}</p>
                      <p className="text-text-3">{r.lastTriggeredAt ? `Last triggered ${formatDate(r.lastTriggeredAt.toISOString())}` : "Not triggered yet"}{r.lastEvaluatedAt ? ` · checked ${formatDate(r.lastEvaluatedAt.toISOString())}` : ""}</p>
                    </div>
                    <div className="flex gap-1">
                      <form action={toggleAlertAction}><input type="hidden" name="id" value={r.id} /><input type="hidden" name="enabled" value={String(!r.enabled)} /><Button size="sm" variant="ghost">{r.enabled ? "Pause" : "Resume"}</Button></form>
                      <form action={deleteAlertAction}><input type="hidden" name="id" value={r.id} /><Button size="sm" variant="ghost">Delete</Button></form>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
        <Card className="self-start">
          <CardHeader><div><CardTitle>New alert</CardTitle><CardDescription>In-app only for now. Price alerts ignore stale prices.</CardDescription></div></CardHeader>
          <CardContent><NewAlertForm kinds={Object.entries(ALERT_LABELS)} instruments={catalogue.map((c) => ({ id: c.id, label: `${c.symbol ? `${c.symbol} · ` : ""}${c.name}` }))} goals={goals.map((g) => ({ id: g.id, name: g.name }))} /></CardContent>
        </Card>
      </div>
    </>
  );
}
