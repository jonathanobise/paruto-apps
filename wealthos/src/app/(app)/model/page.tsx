import { ChartPie } from "lucide-react";
import { requireApp } from "@/server/auth/context";
import { buildDashboard } from "@/server/analytics/portfolio";
import { listModels, driftAgainstModel, BUCKET_PRESETS } from "@/server/models/service";
import { NewModelForm } from "./new-model-form";
import { deleteModelAction } from "../goals/actions";
import { Button } from "@/components/ui/button";
import { featureDecision } from "@/server/compliance/gate";
import { DISCLOSURES } from "@/server/compliance/features";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { formatMoney, formatPercent } from "@/lib/format";
import { BRAND } from "@/lib/brand";

export const metadata = { title: "Target mix" };

export default async function ModelPage() {
  const app = await requireApp();
  const gate = await featureDecision("MODEL_PORTFOLIO_USER_DEFINED", app.org.jurisdiction);
  if (!gate.available) {
    return (
      <>
        <PageHeader title="Target mix" />
        <Alert tone="info" title="Not available yet">{gate.reason}</Alert>
      </>
    );
  }
  const [models, dash] = await Promise.all([listModels(app.ctx), buildDashboard(app.ctx, { baseCurrency: app.baseCurrency, period: "1M" })]);
  const ccy = dash.baseCurrency;
  return (
    <>
      <PageHeader title="Target mix" description={`Compare your investments with an allocation you defined yourself. ${BRAND} describes the drift; it does not tell you what to buy or sell.`} />
      {gate.status === "pending_review" ? <Alert tone="warning" className="mb-6" title="Pre-release feature">{gate.reason}</Alert> : null}
      {models.length === 0 ? (
        <EmptyState icon={<ChartPie />} title="No target mix yet">Describe the allocation you are aiming for below, and {BRAND} will show how far your holdings are from it.</EmptyState>
      ) : (
        models.map((m) => {
          const drift = driftAgainstModel(m.targets, dash, false);
          return (
            <Card key={m.id} className="mb-6">
              <CardHeader>
                <div>
                  <CardTitle className="flex items-center gap-2">{m.name} {m.isHypothetical ? <Badge tone="demo">Hypothetical</Badge> : null}</CardTitle>
                  {m.description ? <CardDescription>{m.description}</CardDescription> : null}
                </div>
                {app.canWrite ? <form action={deleteModelAction}><input type="hidden" name="id" value={m.id} /><Button variant="ghost" size="sm">Delete</Button></form> : null}
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[640px] text-[13px]">
                    <thead className="text-left text-text-3">
                      <tr>
                        <th className="py-2 font-medium">Bucket</th>
                        <th className="py-2 text-right font-medium">Target</th>
                        <th className="py-2 text-right font-medium">Current</th>
                        <th className="py-2 pl-6 font-medium">Drift</th>
                        <th className="py-2 text-right font-medium">Current value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {drift.rows.map((r) => {
                        const pts = Number(r.drift) * 100;
                        const width = Math.min(50, Math.abs(pts) * 2.5);
                        return (
                          <tr key={r.key} className="border-t border-border">
                            <td className="py-2.5 font-medium">{r.label}</td>
                            <td className="num py-2.5 text-right">{formatPercent(r.targetWeight.toFixed())}</td>
                            <td className="num py-2.5 text-right">{formatPercent(r.currentWeight.toFixed())}</td>
                            <td className="py-2.5 pl-6">
                              <div className="flex items-center gap-2">
                                <div className="relative h-2 w-40 rounded-full bg-surface-2" aria-hidden>
                                  <span className="absolute top-0 left-1/2 h-2 w-px bg-border-strong" />
                                  <span className="absolute top-0 h-2 rounded-full bg-[var(--series-1)]" style={pts >= 0 ? { left: "50%", width: `${width}%` } : { right: "50%", width: `${width}%` }} />
                                </div>
                                <span className="num text-text-2">{pts >= 0 ? "+" : "−"}{Math.abs(pts).toFixed(1)} pts {pts >= 0 ? "over" : "under"}</span>
                              </div>
                            </td>
                            <td className="num py-2.5 text-right">{formatMoney(r.currentValue.toFixed(2), ccy, { decimals: 0 })}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <p className="mt-4 text-[12px] text-text-3">Weights use invested holdings only ({formatMoney(drift.total, ccy, { decimals: 0 })}); cash is excluded. {DISCLOSURES.hypothetical} {DISCLOSURES.not_advice}</p>
              </CardContent>
            </Card>
          );
        })
      )}
      {app.canWrite ? (
        <Card className="mt-6">
          <CardHeader><div><CardTitle>New target mix</CardTitle><CardDescription>Your own hypothetical allocation. {BRAND} only describes how far you are from it; it never tells you what to buy or sell.</CardDescription></div></CardHeader>
          <CardContent><NewModelForm buckets={Object.entries(BUCKET_PRESETS).map(([key, b]) => ({ key, label: b.label }))} /></CardContent>
        </Card>
      ) : null}
    </>
  );
}
