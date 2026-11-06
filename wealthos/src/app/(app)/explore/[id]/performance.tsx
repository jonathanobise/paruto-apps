import Link from "next/link";
import type { Fundamentals } from "@/server/ingest/eodhd";
import type { Lens, PerformanceResult } from "@/server/research/performance";
import type { SourceRef } from "@/server/research/markets";
import { GrowthChart } from "@/components/app/series-chart";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Delta } from "@/components/ui/money";
import { formatDate, formatMoney, formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";
import { d } from "@/engine";

const LENS_LABEL: Record<Lens, string> = { local: "Own currency", NGN: "NGN", USD: "USD", GBP: "GBP" };
const pct = (v: string | null | undefined) => (v === null || v === undefined ? <span className="text-text-3">—</span> : <Delta value={v} percent />);

export function LongRunPerformance({ id, lens, perf, currency }: { id: string; lens: Lens; perf: PerformanceResult | null; currency: string }) {
  return (
    <Card className="mt-6">
      <CardHeader className="flex-wrap gap-3">
        <div>
          <CardTitle>Long-run performance</CardTitle>
          <CardDescription>
            {perf ? <>{perf.totalReturn ? "Total return (income reinvested)" : "Price return"} in {perf.currency}, month-end to month-end, {formatDate(perf.firstDate)} to {formatDate(perf.asOf)}.</> : "Not enough history to compute long-run returns."}
          </CardDescription>
        </div>
        <nav aria-label="Currency" className="glass inline-flex rounded-full p-1">
          {(["local", "NGN", "USD", "GBP"] as Lens[]).filter((l) => l === "local" || l !== currency).map((l) => (
            <Link key={l} href={`/explore/${id}?lens=${l}`} scroll={false} aria-current={l === lens ? "true" : undefined} className={cn("spring rounded-full px-3 py-1 text-[12px] font-medium", l === lens ? "bg-brand text-brand-ink shadow-sm" : "text-text-2 hover:text-text")}>
              {l === "local" ? `${currency} (own)` : LENS_LABEL[l]}
            </Link>
          ))}
        </nav>
      </CardHeader>
      {perf ? (
        <CardContent>
          <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
            <div>
              <GrowthChart data={perf.growth} label={`${perf.currency} ${perf.totalReturn ? "total return" : "price"}, start = 100`} />
            </div>
            <div className="flex flex-col gap-4 text-[13px]">
              <table className="w-full">
                <thead className="text-left text-text-3"><tr><th className="py-1.5 font-medium">Period</th><th className="py-1.5 text-right font-medium">Total</th><th className="py-1.5 text-right font-medium">A year</th><th className="py-1.5 text-right font-medium">Real a year</th></tr></thead>
                <tbody>
                  {perf.trailing.map((w) => (
                    <tr key={w.key} className="border-t border-border">
                      <td className="py-1.5">{w.key}</td>
                      <td className="num py-1.5 text-right">{pct(w.cumulative)}</td>
                      <td className="num py-1.5 text-right">{w.key === "1Y" ? <span className="text-text-3">—</span> : pct(w.annualized)}</td>
                      <td className="num py-1.5 text-right">{pct(perf.realTrailing.find((r) => r.key === w.key)?.annualized)}</td>
                    </tr>
                  ))}
                  {perf.sinceStart ? (
                    <tr className="border-t border-border">
                      <td className="py-1.5">Since {perf.firstDate?.slice(0, 4)} ({perf.sinceStart.years} yrs)</td>
                      <td className="num py-1.5 text-right">{pct(perf.sinceStart.cumulative)}</td>
                      <td className="num py-1.5 text-right">{pct(perf.sinceStart.annualized)}</td>
                      <td />
                    </tr>
                  ) : null}
                </tbody>
              </table>
              <dl className="grid grid-cols-2 gap-3">
                <div className="rounded-[var(--radius-inner)] bg-surface-2 px-3 py-2"><dt className="text-[12px] text-text-3">Volatility (3 yrs, a year)</dt><dd className="num font-medium">{formatPercent(perf.risk.volatility3y, { decimals: 1 })}</dd></div>
                <div className="rounded-[var(--radius-inner)] bg-surface-2 px-3 py-2"><dt className="text-[12px] text-text-3">Worst fall</dt><dd className="num font-medium">{pct(perf.risk.maxDrawdown)}</dd>{perf.risk.drawdownPeak ? <dd className="text-[11px] text-text-3">{formatDate(perf.risk.drawdownPeak)} → {formatDate(perf.risk.drawdownTrough)}{perf.risk.drawdownRecovered ? `, recovered ${formatDate(perf.risk.drawdownRecovered)}` : ", not yet recovered"}</dd> : null}</div>
                <div className="rounded-[var(--radius-inner)] bg-surface-2 px-3 py-2"><dt className="text-[12px] text-text-3">Months up</dt><dd className="num font-medium">{formatPercent(perf.risk.positiveMonths, { decimals: 0 })}</dd></div>
                <div className="rounded-[var(--radius-inner)] bg-surface-2 px-3 py-2"><dt className="text-[12px] text-text-3">Dividend yield (12 months)</dt><dd className="num font-medium">{formatPercent(perf.dividendYield12m, { decimals: 2 })}</dd></div>
              </dl>
            </div>
          </div>
          <div className="mt-4 flex flex-col gap-1 text-[12px] text-text-3">
            {perf.realBasis ? <p>Real returns remove inflation ({perf.realBasis}).</p> : null}
            {perf.notes.map((n) => <p key={n}>{n}</p>)}
            <p>Calendar-year returns: {perf.calendar.slice(-6).map((y) => `${y.year}${y.ytd ? " (to date)" : ""} ${formatPercent(y.value, { signed: true, decimals: 1 })}`).join(" · ")}</p>
            <p>Sources: {perf.sources.map((s) => s.name).join("; ")}.</p>
          </div>
        </CardContent>
      ) : null}
    </Card>
  );
}

const SNAPSHOT: Array<[keyof Fundamentals["snapshot"] & string, string, "money" | "pct" | "x" | "num"]> = [
  ["marketCap", "Market value", "money"],
  ["revenueTTM", "Revenue (12 months)", "money"],
  ["profitMargin", "Profit margin", "pct"],
  ["returnOnEquityTTM", "Return on equity", "pct"],
  ["trailingPE", "Price ÷ earnings", "x"],
  ["priceToBook", "Price ÷ book", "x"],
  ["evToEbitda", "EV ÷ EBITDA", "x"],
  ["dividendYield", "Dividend yield", "pct"],
];

export function FundamentalsCard({ f, currency }: { f: { data: Fundamentals; retrievedAt: string; source: SourceRef }; currency: string }) {
  const p = f.data.profile;
  const ccy = f.data.financialsCurrency ?? p.currency ?? currency;
  const fmt = (v: string | null | undefined, kind: "money" | "pct" | "x" | "num", c = ccy) =>
    v === null || v === undefined ? "—" : kind === "money" ? formatMoney(v, c, { compact: true }) : kind === "pct" ? formatPercent(v, { decimals: 1 }) : kind === "x" ? `${Number(v).toFixed(1)}×` : v;
  const years = f.data.yearly.slice(0, 5);
  return (
    <Card className="mt-6">
      <CardHeader><div><CardTitle>Company profile and fundamentals</CardTitle><CardDescription>{[p.sector, p.industry, p.country, p.exchange].filter(Boolean).join(" · ")}. Retrieved {formatDate(f.retrievedAt.slice(0, 10))} from {f.source.name}; figures as reported, in {ccy}.</CardDescription></div></CardHeader>
      <CardContent>
        {p.description ? <p className="mb-4 max-w-3xl text-[13px] leading-relaxed text-text-2">{p.description}</p> : null}
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {SNAPSHOT.map(([k, label, kind]) => (
            <div key={k} className="rounded-[var(--radius-inner)] bg-surface-2 px-3 py-2">
              <dt className="text-[12px] text-text-3">{label}</dt>
              <dd className="num font-medium">{fmt(f.data.snapshot[k], kind, kind === "money" && k === "marketCap" ? (p.currency ?? currency) : ccy)}</dd>
            </div>
          ))}
        </dl>
        {years.length ? (
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[560px] text-[13px]">
              <thead className="text-left text-text-3">
                <tr><th className="py-1.5 font-medium">Year to</th><th className="py-1.5 text-right font-medium">Revenue</th><th className="py-1.5 text-right font-medium">Operating profit</th><th className="py-1.5 text-right font-medium">Net profit</th><th className="py-1.5 text-right font-medium">Free cash flow</th><th className="py-1.5 text-right font-medium">Net debt</th></tr>
              </thead>
              <tbody>
                {years.map((y) => {
                  const netDebt = y.totalDebt !== null && y.cash !== null ? d(y.totalDebt).minus(d(y.cash)).toString() : null;
                  return (
                    <tr key={y.fiscalYearEnd} className="border-t border-border">
                      <td className="py-1.5">{formatDate(y.fiscalYearEnd)}</td>
                      <td className="num py-1.5 text-right">{fmt(y.revenue, "money")}</td>
                      <td className="num py-1.5 text-right">{fmt(y.operatingIncome, "money")}</td>
                      <td className="num py-1.5 text-right">{fmt(y.netIncome, "money")}</td>
                      <td className="num py-1.5 text-right">{fmt(y.freeCashFlow, "money")}</td>
                      <td className="num py-1.5 text-right">{fmt(netDebt, "money")}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : null}
        <p className="mt-3 text-[12px] text-text-3">{f.source.license}</p>
      </CardContent>
    </Card>
  );
}
