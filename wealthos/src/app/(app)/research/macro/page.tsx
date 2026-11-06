import { requireApp } from "@/server/auth/context";
import { featureDecision } from "@/server/compliance/gate";
import { DISCLOSURES } from "@/server/compliance/features";
import { getMacroOverview, type SeriesLatest } from "@/server/research/markets";
import { PageHeader } from "@/components/app/page-header";
import { ResearchTabs, SourceNotes } from "@/components/app/research";
import { SeriesChart } from "@/components/app/series-chart";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { Delta } from "@/components/ui/money";
import { formatDate, formatMoney, formatPercent } from "@/lib/format";

export const metadata = { title: "Macro" };

const monthName = (asOf: string) => new Date(`${asOf.slice(0, 7)}-15T00:00:00Z`).toLocaleDateString("en-GB", { month: "short", year: "numeric", timeZone: "UTC" });
const asOfLabel = (x: SeriesLatest) => (x.asOf ? (x.asOf.length > 7 ? formatDate(x.asOf) : monthName(x.asOf)) : "No data");

function LatestTable({ rows, valueHeader }: { rows: SeriesLatest[]; valueHeader: string }) {
  return (
    <table className="mb-4 w-full text-[13px]">
      <thead className="text-left text-text-3">
        <tr>
          <th className="py-1.5 font-medium">Series</th>
          <th className="py-1.5 text-right font-medium">{valueHeader}</th>
          <th className="py-1.5 text-right font-medium">A year earlier</th>
          <th className="py-1.5 text-right font-medium">As of</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.key} className="border-t border-border">
            <td className="py-2">{r.name}</td>
            <td className="num py-2 text-right font-medium">{formatPercent(r.value, { decimals: 2 })}</td>
            <td className="num py-2 text-right text-text-2">{formatPercent(r.yearAgo, { decimals: 2 })}</td>
            <td className="py-2 text-right text-text-2">{asOfLabel(r)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default async function MacroPage() {
  const app = await requireApp();
  const gate = await featureDecision("MARKET_RESEARCH", app.org.jurisdiction);
  if (!gate.available) return (<><PageHeader title="Macro" /><Alert tone="info" title="Not available yet">{gate.reason}</Alert></>);
  const m = await getMacroOverview(app.ctx);
  return (
    <>
      <PageHeader title="The economic backdrop" description="Inflation, policy rates and the naira's official exchange rates, for Nigeria alongside the United States and the United Kingdom. Monthly, from the official publishers." />
      <ResearchTabs current="/research/macro" jurisdiction={app.org.jurisdiction} />
      {gate.status === "pending_review" ? <Alert tone="warning" className="mb-4" title="Pre-release feature">{gate.reason}</Alert> : null}

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader><div><CardTitle>Inflation, year on year</CardTitle><CardDescription>Consumer prices compared with the same month a year earlier.</CardDescription></div></CardHeader>
          <CardContent>
            <LatestTable rows={m.inflation.latest} valueHeader="Latest" />
            <SeriesChart rows={m.inflation.chart} series={[{ key: "ng", label: "Nigeria" }, { key: "us", label: "United States" }, { key: "uk", label: "United Kingdom" }]} unit="percent" label="Inflation, year on year" />
            {m.inflation.notes.map((n) => <p key={n} className="mt-2 text-[12px] text-text-3">{n}</p>)}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><div><CardTitle>Nigeria: headline, food and core</CardTitle><CardDescription>Core excludes volatile items (farm produce; also energy since the 2025 rebasing). From January 2025 the NBS rebased the CPI (base year 2024), so year-on-year rates either side of that change are not strictly comparable.</CardDescription></div></CardHeader>
          <CardContent>
            <SeriesChart rows={m.inflation.ngBreakdown} series={[{ key: "headline", label: "Headline" }, { key: "food", label: "Food" }, { key: "core", label: "Core" }]} unit="percent" label="Nigeria inflation components" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><div><CardTitle>Policy rates</CardTitle><CardDescription>The CBN&apos;s Monetary Policy Rate, the US effective federal funds rate (month end) and the Bank of England&apos;s Bank Rate.</CardDescription></div></CardHeader>
          <CardContent>
            <LatestTable rows={m.policy.latest} valueHeader="Rate" />
            <SeriesChart rows={m.policy.chart} series={[{ key: "ng", label: "Nigeria MPR" }, { key: "us", label: "US fed funds" }, { key: "uk", label: "UK Bank Rate" }]} unit="percent" label="Policy rates" step />
            <h3 className="mt-5 text-[13px] font-semibold">Real policy rates</h3>
            <table className="mt-2 w-full text-[13px]">
              <thead className="text-left text-text-3"><tr><th className="py-1.5 font-medium">Country</th><th className="py-1.5 text-right font-medium">Policy rate</th><th className="py-1.5 text-right font-medium">Inflation</th><th className="py-1.5 text-right font-medium">Real</th><th className="py-1.5 text-right font-medium">Month</th></tr></thead>
              <tbody>
                {m.policy.real.map((r) => (
                  <tr key={r.country} className="border-t border-border">
                    <td className="py-2">{r.country}</td>
                    <td className="num py-2 text-right">{formatPercent(r.policy, { decimals: 2 })}</td>
                    <td className="num py-2 text-right">{formatPercent(r.inflation, { decimals: 2 })}</td>
                    <td className="num py-2 text-right">{r.real ? <Delta value={r.real} percent /> : "—"}</td>
                    <td className="py-2 text-right text-text-2">{r.asOf ? monthName(r.asOf) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-2 text-[12px] text-text-3">Real rate = (1 + policy rate) ÷ (1 + inflation) − 1, using the rate in force in the latest month with published inflation. Inflation looks backwards, so this is a rough guide, not an expected return.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><div><CardTitle>The naira: official rates</CardTitle><CardDescription>Naira per unit of foreign currency, last official CBN rate of each month.</CardDescription></div></CardHeader>
          <CardContent>
            <table className="mb-4 w-full text-[13px]">
              <thead className="text-left text-text-3"><tr><th className="py-1.5 font-medium">Pair</th><th className="py-1.5 text-right font-medium">Latest</th><th className="py-1.5 text-right font-medium">1-year change</th><th className="py-1.5 text-right font-medium">As of</th></tr></thead>
              <tbody>
                {m.fx.latest.map((r) => (
                  <tr key={r.key} className="border-t border-border">
                    <td className="py-2">{r.name}</td>
                    <td className="num py-2 text-right font-medium">{r.value ? formatMoney(r.value, "NGN", { decimals: 2 }) : "—"}</td>
                    <td className="num py-2 text-right">{r.change1y ? <Delta value={r.change1y} percent /> : "—"}</td>
                    <td className="py-2 text-right text-text-2">{asOfLabel(r)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <SeriesChart rows={m.fx.chart} series={[{ key: "usd", label: "USD/NGN" }, { key: "gbp", label: "GBP/NGN" }, { key: "eur", label: "EUR/NGN" }]} unit="number" label="Official naira exchange rates" />
            <p className="mt-2 text-[12px] text-text-3">A rise means the naira buys less foreign currency. {m.fx.methodology}</p>
          </CardContent>
        </Card>
      </div>

      <p className="mt-6 text-[12px] text-text-3">{DISCLOSURES.data_freshness} {DISCLOSURES.not_advice}</p>
      <SourceNotes sources={m.sources} />
    </>
  );
}
