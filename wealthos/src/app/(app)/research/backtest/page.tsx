import Link from "next/link";
import { History } from "lucide-react";
import { requireApp } from "@/server/auth/context";
import { featureDecision } from "@/server/compliance/gate";
import { DISCLOSURES } from "@/server/compliance/features";
import { BACKTEST_MAX_HOLDINGS, backtest, backtestOptions, type BacktestSummary } from "@/server/research/backtest";
import { MARKETS } from "@/server/research/screener";
import { PageHeader } from "@/components/app/page-header";
import { ResearchTabs } from "@/components/app/research";
import { SeriesChart } from "@/components/app/series-chart";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/form";
import { EmptyState } from "@/components/ui/empty-state";
import { Delta } from "@/components/ui/money";
import { REBALANCE_LABELS } from "@/engine";
import { formatMoney, formatPercent } from "@/lib/format";

export const metadata = { title: "Backtest" };

type Params = Record<string, string | undefined>;
const LENSES = ["NGN", "USD", "GBP"] as const;
const monthName = (m: string) => `${["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][Number(m.slice(5, 7)) - 1]} ${m.slice(0, 4)}`;
const pct = (v: string | null | undefined) => (v === null || v === undefined ? <span className="text-text-3">—</span> : <Delta value={v} percent />);

export default async function BacktestPage({ searchParams }: { searchParams: Promise<Params> }) {
  const app = await requireApp();
  const gate = await featureDecision("PORTFOLIO_BACKTEST", app.org.jurisdiction);
  if (!gate.available) return (<><PageHeader title="Backtest" /><Alert tone="info" title="Not available yet">{gate.reason}</Alert></>);
  const sp = await searchParams;
  const lens = (LENSES as readonly string[]).includes(sp.lens ?? "") ? (sp.lens as (typeof LENSES)[number]) : "NGN";
  const slots = Array.from({ length: BACKTEST_MAX_HOLDINGS }, (_, i) => ({ id: sp[`h${i}`] ?? "", weight: sp[`w${i}`] ?? "" }));
  const chosen = slots.filter((s) => s.id);
  const options = await backtestOptions(app.ctx);
  const grouped = Object.entries(MARKETS).map(([k, name]) => ({ name, options: options.filter((o) => o.market === k) })).filter((g) => g.options.length);
  const other = options.filter((o) => !o.market || !(o.market in MARKETS));
  const optionList = (
    <>
      <option value="">—</option>
      {grouped.map((g) => <optgroup key={g.name} label={g.name}>{g.options.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}</optgroup>)}
      {other.length ? <optgroup label="Other">{other.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}</optgroup> : null}
    </>
  );
  const run = chosen.length
    ? await backtest(app.ctx, {
        lens,
        holdings: chosen.map((s) => ({ id: s.id, weight: s.weight || (chosen.length === 1 ? "100" : "") })),
        initial: sp.initial ?? "1000000",
        contribution: sp.contribution || "0",
        rebalance: (["none", "monthly", "quarterly", "annually"].includes(sp.rebalance ?? "") ? sp.rebalance : "annually") as "annually",
        ...(sp.startYear ? { startYear: sp.startYear } : {}),
        ...(sp.benchmark ? { benchmarkId: sp.benchmark } : {}),
      })
    : null;
  const totalWeight = chosen.reduce((a, s) => a + (Number(s.weight) || 0), 0);
  const thisYear = new Date().getUTCFullYear();

  return (
    <>
      <PageHeader title="Backtest a portfolio" description="See how a mix you choose would have behaved in the past, in one currency, with optional monthly contributions and rebalancing. A hypothetical illustration of history, not a forecast or a recommendation." />
      <ResearchTabs current="/research/backtest" jurisdiction={app.org.jurisdiction} />
      {gate.status === "pending_review" ? <Alert tone="warning" className="mb-4" title="Pre-release feature">{gate.reason}</Alert> : null}
      <Alert tone="info" className="mb-6">{DISCLOSURES.hypothetical} {DISCLOSURES.past_performance}</Alert>

      <Card className="mb-6">
        <CardContent className="pt-5">
          <form aria-label="Backtest settings" className="flex flex-col gap-5">
            <fieldset>
              <legend className="mb-2 text-[13px] font-semibold">Holdings and target weights</legend>
              <div className="grid gap-2 lg:grid-cols-2">
                {slots.map((s, i) => (
                  <div key={i} className="grid grid-cols-[minmax(0,1fr)_96px] gap-2">
                    <label className="min-w-0"><span className="sr-only">Holding {i + 1}</span><Select name={`h${i}`} defaultValue={s.id}>{optionList}</Select></label>
                    <label className="relative"><span className="sr-only">Weight of holding {i + 1} (%)</span><Input name={`w${i}`} inputMode="decimal" defaultValue={s.weight} className="pr-7 text-right" /><span aria-hidden className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-[13px] text-text-3">%</span></label>
                  </div>
                ))}
              </div>
              {chosen.length ? <p className={`mt-2 text-[12px] ${Math.abs(totalWeight - 100) > 0.01 ? "text-warning" : "text-text-3"}`}>Weights add up to {totalWeight.toLocaleString("en-GB", { maximumFractionDigits: 2 })}%{Math.abs(totalWeight - 100) > 0.01 ? " (they need to make 100%)" : ""}.</p> : null}
            </fieldset>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
              <label className="flex flex-col gap-1 text-[12px] text-text-3">Currency<Select name="lens" defaultValue={lens}>{LENSES.map((l) => <option key={l}>{l}</option>)}</Select></label>
              <label className="flex flex-col gap-1 text-[12px] text-text-3">Starting amount<Input name="initial" inputMode="decimal" defaultValue={sp.initial ?? "1000000"} /></label>
              <label className="flex flex-col gap-1 text-[12px] text-text-3">Added each month<Input name="contribution" inputMode="decimal" defaultValue={sp.contribution ?? ""} placeholder="0" /></label>
              <label className="flex flex-col gap-1 text-[12px] text-text-3">Rebalance<Select name="rebalance" defaultValue={sp.rebalance ?? "annually"}>{Object.entries(REBALANCE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select></label>
              <label className="flex flex-col gap-1 text-[12px] text-text-3">Start from<Select name="startYear" defaultValue={sp.startYear ?? ""}><option value="">Earliest shared month</option>{Array.from({ length: 30 }, (_, i) => thisYear - 1 - i).map((y) => <option key={y} value={y}>{y}</option>)}</Select></label>
              <label className="flex flex-col gap-1 text-[12px] text-text-3">Benchmark (optional)<Select name="benchmark" defaultValue={sp.benchmark ?? ""}>{optionList}</Select></label>
            </div>
            <div><Button type="submit" variant="secondary"><History aria-hidden /> Run backtest</Button></div>
          </form>
        </CardContent>
      </Card>

      {!run ? (
        <EmptyState icon={<History />} title="Choose a mix">
          {options.length ? "Pick one or more instruments and give each a weight; the weights must add up to 100%." : "No instruments have price history yet. Listed stocks, ETFs and benchmarks appear once their prices have been loaded."}
        </EmptyState>
      ) : !run.ok ? (
        <Alert tone="warning" title="Can't run this backtest">{run.errors.map((e) => <p key={e}>{e}</p>)}</Alert>
      ) : (
        <>
          <Card className="mb-6">
            <CardHeader>
              <div>
                <CardTitle>{monthName(run.startMonth)} to {monthName(run.endMonth)} · {run.years} years in {run.lens}</CardTitle>
                <CardDescription>Rebalanced: {run.rebalanceLabel.toLowerCase()}. Value at each month end{run.benchmark ? `, against ${run.benchmark.name} with the same cash flows` : ""}.</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <dl className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
                <Tile label="Ending value" value={formatMoney(run.portfolio.finalValue, run.lens, { decimals: 0 })} sub={<>from {formatMoney(run.portfolio.totalInvested, run.lens, { decimals: 0 })} put in</>} />
                <Tile label="Return a year (time-weighted)" value={pct(run.portfolio.twrAnnualized)} sub={<>total {formatPercent(run.portfolio.twrCumulative, { signed: true, decimals: 1 })}</>} help="The mix's own return, unaffected by when money was added." />
                <Tile label="After inflation, a year" value={pct(run.portfolio.real?.annualized)} sub={run.portfolio.real ? `${monthName(run.portfolio.real.from)}–${monthName(run.portfolio.real.to)}` : "No inflation data"} help={run.portfolio.real ? `Deflated by ${run.portfolio.real.basis}.` : undefined} />
                <Tile label="Your return a year (money-weighted)" value={run.portfolio.moneyWeighted === null ? "—" : pct(run.portfolio.moneyWeighted)} sub="on the actual cash flows" help="The internal rate of return on the starting amount and each contribution (XIRR)." />
              </dl>
              <SeriesChart
                rows={run.chart}
                series={[{ key: "portfolio", label: "Your mix" }, ...(run.benchmark ? [{ key: "benchmark", label: run.benchmark.name }] : []), { key: "invested", label: "Money put in" }]}
                unit="number"
                label={`Backtest value in ${run.lens}`}
              />
            </CardContent>
          </Card>

          <div className="grid gap-6 xl:grid-cols-2">
            <Card className="overflow-hidden">
              <CardHeader><div><CardTitle>Risk and results</CardTitle><CardDescription>Time-weighted figures, so contributions don&apos;t distort them.</CardDescription></div></CardHeader>
              <table className="w-full text-[13px]">
                <thead className="bg-surface-2 text-left text-text-3"><tr><th className="px-4 py-2 font-medium">Measure</th><th className="px-4 py-2 text-right font-medium">Your mix</th>{run.benchmark ? <th className="px-4 py-2 text-right font-medium">Benchmark</th> : null}</tr></thead>
                <tbody>
                  <Row label="Return a year" a={pct(run.portfolio.twrAnnualized)} b={run.benchmark ? pct(run.benchmark.twrAnnualized) : undefined} />
                  <Row label="After inflation, a year" a={pct(run.portfolio.real?.annualized)} b={run.benchmark ? pct(run.benchmark.real?.annualized) : undefined} />
                  <Row label="Volatility a year" a={formatPercent(run.portfolio.volatility, { decimals: 1 })} b={run.benchmark ? formatPercent(run.benchmark.volatility, { decimals: 1 }) : undefined} />
                  <Row label="Worst fall" a={<>{pct(run.portfolio.maxDrawdown)}{run.portfolio.drawdownPeak ? <p className="text-[11px] text-text-3">{monthName(run.portfolio.drawdownPeak)} → {monthName(run.portfolio.drawdownTrough!)}</p> : null}</>} b={run.benchmark ? pct(run.benchmark.maxDrawdown) : undefined} />
                  <Row label="Best full year" a={yearCell(run.portfolio.bestYear)} b={run.benchmark ? yearCell(run.benchmark.bestYear) : undefined} />
                  <Row label="Worst full year" a={yearCell(run.portfolio.worstYear)} b={run.benchmark ? yearCell(run.benchmark.worstYear) : undefined} />
                  <Row label="Ending value" a={formatMoney(run.portfolio.finalValue, run.lens, { decimals: 0 })} b={run.benchmark ? formatMoney(run.benchmark.finalValue, run.lens, { decimals: 0 }) : undefined} />
                </tbody>
              </table>
            </Card>

            <Card className="overflow-hidden">
              <CardHeader><div><CardTitle>Holdings</CardTitle><CardDescription>Target weights and where they ended{run.rebalanceLabel.startsWith("Never") ? " after drifting" : " (drift since the last rebalance)"}.</CardDescription></div></CardHeader>
              <table className="w-full text-[13px]">
                <thead className="bg-surface-2 text-left text-text-3"><tr><th className="px-4 py-2 font-medium">Instrument</th><th className="px-4 py-2 text-right font-medium">Target</th><th className="px-4 py-2 text-right font-medium">At the end</th></tr></thead>
                <tbody>
                  {run.holdings.map((h) => (
                    <tr key={h.id} className="border-t border-border">
                      <td className="px-4 py-2"><Link href={`/explore/${h.id}?lens=${run.lens}`} className="font-medium hover:text-accent">{h.name}</Link><p className="text-text-3">{[h.symbol, h.currency].filter(Boolean).join(" · ")}</p></td>
                      <td className="num px-4 py-2 text-right">{formatPercent(h.target, { decimals: 1 })}</td>
                      <td className="num px-4 py-2 text-right">{formatPercent(h.end, { decimals: 1 })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </div>

          <Card className="mt-6 overflow-hidden">
            <CardHeader><div><CardTitle>Year by year</CardTitle><CardDescription>Time-weighted return in {run.lens}. Part-years are marked.</CardDescription></div></CardHeader>
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead className="bg-surface-2 text-left text-text-3"><tr><th className="px-4 py-2 font-medium">Year</th><th className="px-4 py-2 text-right font-medium">Your mix</th>{run.benchmark ? <th className="px-4 py-2 text-right font-medium">Benchmark</th> : null}</tr></thead>
                <tbody>
                  {[...run.portfolio.calendar].reverse().map((c) => (
                    <tr key={c.year} className="border-t border-border">
                      <td className="px-4 py-2">{c.year}{c.partial ? <span className="text-text-3"> (part year)</span> : null}</td>
                      <td className="num px-4 py-2 text-right">{pct(c.value)}</td>
                      {run.benchmark ? <td className="num px-4 py-2 text-right">{pct(run.benchmark.calendar.find((x) => x.year === c.year)?.value)}</td> : null}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <div className="mt-4 flex flex-col gap-1 text-[12px] text-text-3">
            {run.notes.map((n) => <p key={n}>{n}</p>)}
            <p>Sources: {run.sources.join("; ")}.</p>
          </div>
        </>
      )}

      <p className="mt-6 text-[12px] text-text-3">{DISCLOSURES.not_advice} {DISCLOSURES.data_freshness}</p>
    </>
  );
}

function Tile({ label, value, sub, help }: { label: string; value: React.ReactNode; sub?: React.ReactNode; help?: string | undefined }) {
  return (
    <div className="rounded-[var(--radius-inner)] bg-surface-2 px-4 py-3">
      <dt className="text-[12px] text-text-3" title={help}>{label}{help ? " ⓘ" : ""}</dt>
      <dd className="num mt-1 text-[20px] font-semibold">{value}</dd>
      {sub ? <dd className="text-[12px] text-text-3">{sub}</dd> : null}
    </div>
  );
}

function Row({ label, a, b }: { label: string; a: React.ReactNode; b?: React.ReactNode }) {
  return (
    <tr className="border-t border-border align-top">
      <td className="px-4 py-2">{label}</td>
      <td className="num px-4 py-2 text-right">{a}</td>
      {b !== undefined ? <td className="num px-4 py-2 text-right">{b}</td> : null}
    </tr>
  );
}

function yearCell(y: BacktestSummary["bestYear"]) {
  if (!y) return <span className="text-text-3">—</span>;
  return <>{y.year}: {formatPercent(y.value, { signed: true, decimals: 1 })}</>;
}
