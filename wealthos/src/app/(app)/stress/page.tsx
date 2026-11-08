import { requireApp } from "@/server/auth/context";
import { PreRelease } from "@/components/app/research";
import { featureDecision } from "@/server/compliance/gate";
import { DISCLOSURES } from "@/server/compliance/features";
import { stressTests } from "@/server/planning/stress";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { Delta } from "@/components/ui/money";
import { formatDate, formatMoney } from "@/lib/format";

export const metadata = { title: "Stress tests" };

export default async function StressPage() {
  const app = await requireApp();
  const gate = await featureDecision("STRESS_TESTS", app.org.jurisdiction);
  if (!gate.available) return (<><PageHeader title="Stress tests" /><Alert tone="info" title="Not available yet">{gate.reason}</Alert></>);
  const r = await stressTests(app.ctx, app.baseCurrency);
  const ccy = r.baseCurrency;
  return (
    <>
      <PageHeader title="Stress tests" description={`What would happen to your net worth (${formatMoney(r.results[0]?.netWorthBefore ?? "0", ccy, { decimals: 0 })} on ${formatDate(r.asOf)}) if one of these happened today? Each scenario is a written-down hypothetical, not a prediction.`} />
      {gate.status === "pending_review" ? <PreRelease reason={gate.reason} /> : null}
      {!r.complete ? <Alert tone="warning" className="mb-4">Some holdings couldn&apos;t be valued (missing prices or exchange rates) and are left out.</Alert> : null}
      <div className="grid gap-4 lg:grid-cols-2">
        {r.results.map((s) => (
          <Card key={s.id}>
            <CardHeader className="flex-wrap">
              <div className="min-w-0">
                <CardTitle>{s.name}</CardTitle>
                <CardDescription>{s.description}</CardDescription>
              </div>
              <div className="text-right">
                <p className="text-[18px] font-semibold"><Delta value={s.change} currency={ccy} /></p>
                <p className="text-[12px] text-text-3">{s.changePct !== null ? <Delta value={s.changePct} percent /> : null} of net worth</p>
              </div>
            </CardHeader>
            <CardContent>
              {s.rows.length ? (
                <table className="w-full text-[13px]">
                  <caption className="sr-only">Items affected by {s.name}</caption>
                  <tbody>
                    {s.rows.slice(0, 6).map((x, i) => (
                      <tr key={i} className="border-t border-border first:border-0">
                        <td className="py-1.5">{x.label}{x.kind === "liability" ? <span className="text-text-3"> (debt)</span> : null}<p className="text-[11px] text-text-3">{x.notes.join(" · ")}</p></td>
                        <td className="num whitespace-nowrap py-1.5 pl-3 text-right text-text-2">{formatMoney(x.before, ccy, { compact: true })} → {formatMoney(x.after, ccy, { compact: true })}</td>
                        <td className="whitespace-nowrap py-1.5 pl-4 text-right"><Delta value={x.kind === "liability" ? String(-Number(x.change)) : x.change} currency={ccy} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : <p className="text-sm text-text-3">Nothing you hold is affected by this scenario.</p>}
              {s.rows.length > 6 ? <p className="mt-1 text-[12px] text-text-3">+{s.rows.length - 6} more items</p> : null}
            </CardContent>
          </Card>
        ))}
      </div>
      <p className="mt-6 text-[12px] text-text-3">Shocks are applied instantly to today&apos;s values; for debts, an increase is shown as a loss to you. {DISCLOSURES.hypothetical} {DISCLOSURES.not_advice}</p>
    </>
  );
}
