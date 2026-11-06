import Link from "next/link";
import { requireApp } from "@/server/auth/context";
import { featureDecision } from "@/server/compliance/gate";
import { DISCLOSURES } from "@/server/compliance/features";
import { getMacroOverview, getScoreboard } from "@/server/research/markets";
import { LENSES, type Lens, type PerformanceResult } from "@/server/research/performance";
import { PageHeader } from "@/components/app/page-header";
import { ResearchTabs, SourceNotes } from "@/components/app/research";
import { Stat } from "@/components/app/stat";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Delta } from "@/components/ui/money";
import { formatDate, formatMoney, formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";

export const metadata = { title: "Markets" };

const LENS_LABEL: Record<Lens, string> = { local: "Own currency", NGN: "In naira", USD: "In US dollars", GBP: "In pounds" };
const WINDOWS = ["1Y", "3Y", "5Y", "10Y"] as const;
const MARKET_LABEL: Record<string, string> = { ng: "Nigeria", us: "United States", uk: "United Kingdom", global: "Global" };

function windowOf(r: PerformanceResult, key: string, real = false) {
  return (real ? r.realTrailing : r.trailing).find((w) => w.key === key) ?? null;
}

function Annual({ value }: { value: string | null | undefined }) {
  return value === null || value === undefined ? <span className="text-text-3">—</span> : <Delta value={value} percent />;
}

export default async function MarketsPage({ searchParams }: { searchParams: Promise<{ lens?: string }> }) {
  const app = await requireApp();
  const gate = await featureDecision("MARKET_RESEARCH", app.org.jurisdiction);
  if (!gate.available) return (<><PageHeader title="Markets" /><Alert tone="info" title="Not available yet">{gate.reason}</Alert></>);
  const sp = await searchParams;
  const lens: Lens = (LENSES as string[]).includes(sp.lens ?? "") && sp.lens !== "local" ? (sp.lens as Lens) : "NGN";
  const [board, macro] = await Promise.all([getScoreboard(app.ctx, lens), getMacroOverview(app.ctx)]);
  const ngInfl = macro.inflation.latest.find((x) => x.key === "NG.CPI_YOY");
  const mpr = macro.policy.latest.find((x) => x.key === "NG.MPR");
  const usd = macro.fx.latest.find((x) => x.key === "USD/NGN");
  const ngReal = macro.policy.real.find((x) => x.country === "Nigeria");
  const sources = [...macro.sources];
  for (const r of board.rows) for (const s of r.result?.sources ?? []) if (!s.name.includes("exchange rates") && !sources.some((x) => x.name === s.name)) sources.push({ name: s.name, url: null, license: s.license });

  return (
    <>
      <PageHeader title="Markets at a glance" description="How the main asset classes have done over the long run, in the currency you spend, before and after inflation. Every figure comes from an official or licensed source, shown at the foot of the page." />
      <ResearchTabs current="/research" jurisdiction={app.org.jurisdiction} />
      {gate.status === "pending_review" ? <Alert tone="warning" className="mb-4" title="Pre-release feature">{gate.reason}</Alert> : null}

      <dl className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-5"><Stat label="Nigeria inflation (y/y)" value={formatPercent(ngInfl?.value, { decimals: 1 })} sub={ngInfl?.asOf ? <>{monthName(ngInfl.asOf)} · a year earlier {formatPercent(ngInfl.yearAgo, { decimals: 1 })}</> : "No data"} /></Card>
        <Card className="p-5"><Stat label="Monetary Policy Rate" value={formatPercent(mpr?.value, { decimals: 2 })} sub={mpr?.asOf ? <>{monthName(mpr.asOf)} · CBN</> : "No data"} /></Card>
        <Card className="p-5"><Stat label="Real policy rate" help="(1 + policy rate) ÷ (1 + inflation) − 1, for the latest month with both published." value={ngReal?.real ? <Delta value={ngReal.real} percent /> : "—"} sub={ngReal?.asOf ? monthName(ngReal.asOf) : "No data"} /></Card>
        <Card className="p-5"><Stat label="US dollar (official)" value={usd?.value ? formatMoney(usd.value, "NGN", { decimals: 2 }) : "—"} sub={usd?.asOf ? <>{formatDate(usd.asOf)}{usd.change1y ? <> · <Delta value={usd.change1y} percent /> in a year</> : null}</> : "No data"} /></Card>
      </dl>

      <Card className="overflow-hidden">
        <CardHeader className="flex-wrap gap-3">
          <div>
            <CardTitle>Long-run returns by asset class</CardTitle>
            <CardDescription>Returns a year (the 1-year column is the total for the year): total returns (dividends reinvested where recorded) to the latest month end, converted at same-day official exchange rates. “Real” removes the inflation of the chosen currency.</CardDescription>
          </div>
          <nav aria-label="Currency" className="glass inline-flex rounded-full p-1">
            {LENSES.filter((l) => l !== "local").map((l) => (
              <Link key={l} href={`/research?lens=${l}`} scroll={false} aria-current={l === lens ? "true" : undefined} className={cn("spring rounded-full px-3 py-1 text-[12px] font-medium", l === lens ? "bg-brand text-brand-ink shadow-sm" : "text-text-2 hover:text-text")}>{LENS_LABEL[l]}</Link>
            ))}
          </nav>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[880px] text-[13px]">
            <thead className="bg-surface-2 text-left text-text-3">
              <tr>
                <th className="px-4 py-2.5 font-medium">Asset class</th>
                {WINDOWS.map((w) => <th key={w} className="whitespace-nowrap px-4 py-2.5 text-right font-medium">{w === "1Y" ? "1 year" : `${w.slice(0, -1)} years`}</th>)}
                <th className="whitespace-nowrap px-4 py-2.5 text-right font-medium">5 years, real</th>
                <th className="whitespace-nowrap px-4 py-2.5 text-right font-medium">Worst fall</th>
                <th className="px-4 py-2.5 font-medium">Data to</th>
              </tr>
            </thead>
            <tbody>
              {board.rows.map((r) => (
                <tr key={r.key} className="border-t border-border align-top">
                  <td className="px-4 py-3">
                    {r.instrumentId ? <Link href={`/explore/${r.instrumentId}`} className="font-medium hover:text-accent">{r.label}</Link> : <span className="font-medium">{r.label}</span>}
                    <p className="text-text-3">{[MARKET_LABEL[r.market], r.symbol].filter(Boolean).join(" · ")}</p>
                  </td>
                  {r.result ? (
                    <>
                      {WINDOWS.map((w) => {
                        const x = windowOf(r.result!, w);
                        return <td key={w} className="num px-4 py-3 text-right"><Annual value={w === "1Y" ? x?.cumulative : x?.annualized} /></td>;
                      })}
                      <td className="num px-4 py-3 text-right"><Annual value={windowOf(r.result, "5Y", true)?.annualized} /></td>
                      <td className="num px-4 py-3 text-right">{r.result.risk.maxDrawdown ? <Delta value={r.result.risk.maxDrawdown} percent /> : <span className="text-text-3">—</span>}</td>
                      <td className="px-4 py-3 text-text-2">{formatDate(r.result.asOf)}{r.result.totalReturn ? null : <Badge tone="warning" className="ml-1">Price only</Badge>}</td>
                    </>
                  ) : (
                    <td colSpan={WINDOWS.length + 3} className="px-4 py-3 text-text-3">{r.instrumentId ? `No ${lens} history yet (needs overlapping prices and exchange rates).` : "Awaiting data: prices haven't been loaded yet."}</td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <CardContent className="pt-3 text-[12px] text-text-3">
          <p>Listed asset classes are represented by widely held index-tracking ETFs (their names say so); index levels themselves need the index owner&apos;s licence. Nigerian Treasury bills are a computed index of rolling 91-day bills bought at each CBN primary auction&apos;s stop rate. “—” means the period starts before the data does.</p>
          {board.licensedHidden ? <p className="mt-1">Licensed market data isn&apos;t shown in the public demo, so only asset classes computed from official sources appear here.</p> : null}
        </CardContent>
      </Card>

      <p className="mt-6 text-[12px] text-text-3">{DISCLOSURES.past_performance} {DISCLOSURES.not_advice} {DISCLOSURES.data_freshness}</p>
      <SourceNotes sources={sources} />
    </>
  );
}

function monthName(asOf: string) {
  return new Date(`${asOf.slice(0, 7)}-15T00:00:00Z`).toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });
}
