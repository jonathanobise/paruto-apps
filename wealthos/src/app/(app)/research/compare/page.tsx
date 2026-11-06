import Link from "next/link";
import { Scale } from "lucide-react";
import { requireApp } from "@/server/auth/context";
import { featureDecision } from "@/server/compliance/gate";
import { DISCLOSURES } from "@/server/compliance/features";
import { LENSES, type Lens } from "@/server/research/performance";
import { COMPARE_MAX, MARKETS, compareMarkets } from "@/server/research/screener";
import { PageHeader } from "@/components/app/page-header";
import { ResearchTabs } from "@/components/app/research";
import { SeriesChart } from "@/components/app/series-chart";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/form";
import { EmptyState } from "@/components/ui/empty-state";
import { Delta } from "@/components/ui/money";
import { formatDate, formatPercent } from "@/lib/format";

export const metadata = { title: "Compare" };

const LENS_LABEL: Record<Exclude<Lens, "local">, string> = { NGN: "Naira (NGN)", USD: "US dollars (USD)", GBP: "Pounds (GBP)" };
const WINDOWS = ["1Y", "3Y", "5Y", "10Y"] as const;
const monthName = (m: string) => new Date(`${m}-15T00:00:00Z`).toLocaleDateString("en-GB", { month: "short", year: "numeric", timeZone: "UTC" });
const pct = (v: string | null | undefined) => (v === null || v === undefined ? <span className="text-text-3">—</span> : <Delta value={v} percent />);

export default async function ComparePage({ searchParams }: { searchParams: Promise<{ ids?: string | string[]; lens?: string }> }) {
  const app = await requireApp();
  const gate = await featureDecision("MARKET_RESEARCH", app.org.jurisdiction);
  if (!gate.available) return (<><PageHeader title="Compare" /><Alert tone="info" title="Not available yet">{gate.reason}</Alert></>);
  const sp = await searchParams;
  const rawIds = (Array.isArray(sp.ids) ? sp.ids : (sp.ids ?? "").split(",")).map((s) => s.trim()).filter(Boolean);
  const lens: Exclude<Lens, "local"> = (LENSES as string[]).includes(sp.lens ?? "") && sp.lens !== "local" ? (sp.lens as Exclude<Lens, "local">) : "NGN";
  const cmp = await compareMarkets(app.ctx, rawIds, lens);
  const canBacktest = (await featureDecision("PORTFOLIO_BACKTEST", app.org.jurisdiction)).available;
  const tooMany = new Set(rawIds).size > COMPARE_MAX;
  const label = (i: (typeof cmp.items)[number]) => i.symbol ?? i.name;
  const grouped = Object.entries(MARKETS).map(([k, name]) => ({ name, options: cmp.options.filter((o) => o.market === k) })).filter((g) => g.options.length);
  const other = cmp.options.filter((o) => !o.market || !(o.market in MARKETS));

  return (
    <>
      <PageHeader title="Compare across markets" description="Put up to three instruments or benchmarks side by side in one currency, whatever they're priced in, over the period they all cover. Conversions use same-day official exchange rates; nothing is filled in from another day." />
      <ResearchTabs current="/research/compare" jurisdiction={app.org.jurisdiction} />
      {gate.status === "pending_review" ? <Alert tone="warning" className="mb-4" title="Pre-release feature">{gate.reason}</Alert> : null}

      <Card className="mb-6">
        <CardContent className="pt-5">
          <form className="grid gap-3 md:grid-cols-[repeat(3,minmax(0,1fr))_200px_auto]" aria-label="Choose what to compare">
            {Array.from({ length: COMPARE_MAX }, (_, i) => (
              <label key={i} className="flex min-w-0 flex-col gap-1 text-[12px] text-text-3">
                {i === 0 ? "First" : i === 1 ? "Second" : "Third (optional)"}
                <Select name="ids" defaultValue={cmp.items[i]?.id ?? ""}>
                  <option value="">—</option>
                  {grouped.map((g) => <optgroup key={g.name} label={g.name}>{g.options.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}</optgroup>)}
                  {other.length ? <optgroup label="Other">{other.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}</optgroup> : null}
                </Select>
              </label>
            ))}
            <label className="flex flex-col gap-1 text-[12px] text-text-3">In
              <Select name="lens" defaultValue={lens}>{(Object.keys(LENS_LABEL) as Array<keyof typeof LENS_LABEL>).map((l) => <option key={l} value={l}>{LENS_LABEL[l]}</option>)}</Select>
            </label>
            <div className="flex items-end"><Button type="submit" variant="secondary"><Scale aria-hidden /> Compare</Button></div>
          </form>
          <p className="mt-3 text-[12px] text-text-3">Or tick rows in the <Link href="/research/screener" className="text-accent hover:underline">screener</Link>. {cmp.options.length} instrument{cmp.options.length === 1 ? "" : "s"} have price history.</p>
        </CardContent>
      </Card>

      {tooMany ? <Alert tone="info" className="mb-4">Only the first {COMPARE_MAX} were compared.</Alert> : null}

      {cmp.items.length < 2 ? (
        <EmptyState icon={<Scale />} title="Choose at least two">
          {cmp.options.length < 2 ? "Only one instrument has price history so far. Listed stocks, ETFs and asset-class benchmarks appear once their prices have been loaded." : "Pick two or three instruments above, for example a Nigerian benchmark against a global one, and a currency to see them in."}
        </EmptyState>
      ) : (
        <>
          {cmp.items.filter((i) => !i.result).map((i) => <Alert key={i.id} tone="warning" className="mb-4" title={`${i.name}: no ${lens} history`}>It needs prices and same-day {i.currency}/{lens} exchange rates that overlap.</Alert>)}

          <Card className="mb-6">
            <CardHeader>
              <div>
                <CardTitle>Growth of 100 in {lens}</CardTitle>
                <CardDescription>{cmp.common ? <>Over the {cmp.common.years} years all of them cover: {monthName(cmp.common.startMonth)} to {monthName(cmp.common.endMonth)}, month-end values, start = 100.</> : "They don't share at least a year of month-end history in this currency, so there's no common period to chart."}</CardDescription>
              </div>
            </CardHeader>
            {cmp.common ? (
              <CardContent>
                <SeriesChart rows={cmp.common.chart} series={cmp.items.map((it, i) => ({ key: `s${i}`, label: label(it) }))} unit="number" label={`Growth of 100 in ${lens}`} />
                <div className="mt-5 overflow-x-auto">
                  <table className="w-full min-w-[560px] text-[13px]">
                    <thead className="text-left text-text-3"><tr><th className="py-1.5 font-medium">Over the common period</th><th className="py-1.5 text-right font-medium">Total</th><th className="py-1.5 text-right font-medium">A year</th><th className="py-1.5 text-right font-medium">Volatility</th><th className="py-1.5 text-right font-medium">Worst fall</th></tr></thead>
                    <tbody>
                      {cmp.items.map((it, i) => {
                        const s = cmp.common!.stats[i]!;
                        return (
                          <tr key={it.id} className="border-t border-border">
                            <td className="py-2"><Link href={`/explore/${it.id}?lens=${lens}`} className="font-medium hover:text-accent">{it.name}</Link></td>
                            <td className="num py-2 text-right">{pct(s.cumulative)}</td>
                            <td className="num py-2 text-right">{pct(s.annualized)}</td>
                            <td className="num py-2 text-right">{formatPercent(s.volatility, { decimals: 1 })}</td>
                            <td className="num py-2 text-right">{pct(s.maxDrawdown)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            ) : null}
          </Card>

          <div className="grid gap-6 xl:grid-cols-2">
            <Card className="overflow-hidden">
              <CardHeader><div><CardTitle>Trailing returns a year</CardTitle><CardDescription>To each one&apos;s latest month end; real figures remove {lens} inflation.</CardDescription></div></CardHeader>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[520px] text-[13px]">
                  <thead className="bg-surface-2 text-left text-text-3"><tr><th className="px-4 py-2 font-medium">Period</th>{cmp.items.map((it) => <th key={it.id} className="px-4 py-2 text-right font-medium">{label(it)}</th>)}</tr></thead>
                  <tbody>
                    {WINDOWS.flatMap((w) => [false, true].map((real) => (
                      <tr key={`${w}${real}`} className="border-t border-border">
                        <td className="px-4 py-2">{w === "1Y" ? "1 year" : `${w.slice(0, -1)} years`}{real ? ", real" : ""}</td>
                        {cmp.items.map((it) => {
                          const x = it.result ? (real ? it.result.realTrailing : it.result.trailing).find((t) => t.key === w) : null;
                          return <td key={it.id} className="num px-4 py-2 text-right">{pct(w === "1Y" ? x?.cumulative : x?.annualized)}</td>;
                        })}
                      </tr>
                    )))}
                    <tr className="border-t border-border">
                      <td className="px-4 py-2 text-text-3">Data to</td>
                      {cmp.items.map((it) => <td key={it.id} className="px-4 py-2 text-right text-text-2">{it.result ? formatDate(it.result.asOf) : "—"}</td>)}
                    </tr>
                  </tbody>
                </table>
              </div>
            </Card>

            <Card className="overflow-hidden">
              <CardHeader><div><CardTitle>Calendar years</CardTitle><CardDescription>Total return in {lens} for each year, with the real return beneath.</CardDescription></div></CardHeader>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[520px] text-[13px]">
                  <thead className="bg-surface-2 text-left text-text-3"><tr><th className="px-4 py-2 font-medium">Year</th>{cmp.items.map((it) => <th key={it.id} className="px-4 py-2 text-right font-medium">{label(it)}</th>)}</tr></thead>
                  <tbody>
                    {cmp.calendar.map((y) => (
                      <tr key={y.year} className="border-t border-border align-top">
                        <td className="px-4 py-2">{y.year}{y.values.some((v) => v?.ytd) ? <span className="text-text-3"> (to date)</span> : null}</td>
                        {y.values.map((v, i) => (
                          <td key={i} className="num px-4 py-2 text-right">
                            {pct(v?.value)}
                            {v?.real ? <p className="text-[11px] text-text-3">real {formatPercent(v.real, { signed: true, decimals: 1 })}</p> : null}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>

          <div className="mt-4 flex flex-col gap-1 text-[12px] text-text-3">
            {cmp.items.flatMap((it) => (it.result?.notes ?? []).map((n) => <p key={`${it.id}${n}`}>{label(it)}: {n}</p>))}
            <p>Sources: {[...new Set(cmp.items.flatMap((it) => it.result?.sources.map((s) => s.name) ?? []))].join("; ")}.</p>
            {canBacktest ? <p><Link href={backtestHref(cmp.items.map((i) => i.id), lens)} className="text-accent hover:underline">Backtest a mix of these</Link> (equal weights to start; change them there).</p> : null}
          </div>
        </>
      )}

      <p className="mt-6 text-[12px] text-text-3">{DISCLOSURES.past_performance} {DISCLOSURES.not_advice} {DISCLOSURES.data_freshness}</p>
    </>
  );
}

/** Equal weights in whole percent that add up to exactly 100 (e.g. 34/33/33). */
function backtestHref(ids: string[], lens: string): string {
  const base = Math.floor(100 / ids.length);
  const p = new URLSearchParams({ lens });
  ids.forEach((id, i) => {
    p.set(`h${i}`, id);
    p.set(`w${i}`, String(base + (i < 100 - base * ids.length ? 1 : 0)));
  });
  return `/research/backtest?${p.toString()}`;
}
