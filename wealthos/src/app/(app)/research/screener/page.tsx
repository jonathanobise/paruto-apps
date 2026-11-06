import Link from "next/link";
import { Filter, Scale } from "lucide-react";
import { requireApp } from "@/server/auth/context";
import { featureDecision } from "@/server/compliance/gate";
import { DISCLOSURES } from "@/server/compliance/features";
import { LENSES, type Lens } from "@/server/research/performance";
import { MARKETS, SORTS, runScreener, type ScreenerQuery, type SortKey } from "@/server/research/screener";
import { licensedDataVisible } from "@/server/research/licence";
import { PageHeader } from "@/components/app/page-header";
import { ResearchTabs } from "@/components/app/research";
import { Card, CardContent } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/form";
import { EmptyState } from "@/components/ui/empty-state";
import { Delta } from "@/components/ui/money";
import { ASSET_CLASSES, ASSET_CLASS_LABELS } from "@/engine";
import { formatDate, formatPercent } from "@/lib/format";

export const metadata = { title: "Screener" };

type Params = Partial<Record<"lens" | "market" | "assetClass" | "sector" | "q" | "min5y" | "maxVol" | "minYield" | "maxPe" | "sort" | "dir", string>>;

const COLUMNS: Array<{ key: SortKey; label: string; kind: "pct" | "x" }> = [
  { key: "r1y", label: "1 year", kind: "pct" },
  { key: "r3y", label: "3 yrs", kind: "pct" },
  { key: "r5y", label: "5 yrs", kind: "pct" },
  { key: "r10y", label: "10 yrs", kind: "pct" },
  { key: "real5y", label: "5 yrs real", kind: "pct" },
  { key: "vol", label: "Volatility", kind: "pct" },
  { key: "dd", label: "Worst fall", kind: "pct" },
  { key: "dy", label: "Div. yield", kind: "pct" },
  { key: "pe", label: "P/E", kind: "x" },
];
const LENS_LABEL: Record<Lens, string> = { local: "Own currency", NGN: "Naira", USD: "US dollars", GBP: "Pounds" };

export default async function ScreenerPage({ searchParams }: { searchParams: Promise<Params> }) {
  const app = await requireApp();
  const gate = await featureDecision("MARKET_RESEARCH", app.org.jurisdiction);
  if (!gate.available) return (<><PageHeader title="Screener" /><Alert tone="info" title="Not available yet">{gate.reason}</Alert></>);
  const sp = await searchParams;
  const lens: Lens = (LENSES as string[]).includes(sp.lens ?? "") ? (sp.lens as Lens) : "local";
  const query: ScreenerQuery = { lens, ...Object.fromEntries(Object.entries(sp).filter(([k, v]) => k !== "lens" && typeof v === "string" && v !== "")) };
  const res = await runScreener(app.ctx, query);
  const href = (over: Params) => {
    const p = new URLSearchParams(Object.entries({ ...sp, ...over }).filter(([, v]) => v) as Array<[string, string]>);
    return `/research/screener?${p.toString()}`;
  };
  const compareLens = lens === "local" ? "NGN" : lens;

  return (
    <>
      <PageHeader title="Screen the market" description="Filter real listed instruments, ETFs and computed benchmarks by market, sector, long-run returns and risk. Columns are facts about the past, sorted however you choose; nothing here is ranked as a recommendation." />
      <ResearchTabs current="/research/screener" jurisdiction={app.org.jurisdiction} />
      {gate.status === "pending_review" ? <Alert tone="warning" className="mb-4" title="Pre-release feature">{gate.reason}</Alert> : null}

      <Card className="mb-5">
        <CardContent className="pt-5">
          <form className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" role="search" aria-label="Screener filters">
            <label className="flex flex-col gap-1 text-[12px] text-text-3">Search<Input name="q" defaultValue={sp.q ?? ""} placeholder="Name or ticker" /></label>
            <label className="flex flex-col gap-1 text-[12px] text-text-3">Market
              <Select name="market" defaultValue={sp.market ?? ""}><option value="">All markets</option>{Object.entries(MARKETS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select>
            </label>
            <label className="flex flex-col gap-1 text-[12px] text-text-3">Type
              <Select name="assetClass" defaultValue={sp.assetClass ?? ""}><option value="">All types</option>{ASSET_CLASSES.filter((c) => !["cash", "real_estate", "business", "pension"].includes(c)).map((c) => <option key={c} value={c}>{ASSET_CLASS_LABELS[c]}</option>)}</Select>
            </label>
            <label className="flex flex-col gap-1 text-[12px] text-text-3">Sector
              <Select name="sector" defaultValue={sp.sector ?? ""}><option value="">All sectors</option>{res.sectors.map((s) => <option key={s.key} value={s.key}>{s.name}</option>)}</Select>
            </label>
            <label className="flex flex-col gap-1 text-[12px] text-text-3">Returns in
              <Select name="lens" defaultValue={lens}>{LENSES.map((l) => <option key={l} value={l}>{LENS_LABEL[l]}</option>)}</Select>
            </label>
            <label className="flex flex-col gap-1 text-[12px] text-text-3">5-year return at least (% a year)<Input name="min5y" inputMode="decimal" defaultValue={sp.min5y ?? ""} placeholder="e.g. 8" /></label>
            <label className="flex flex-col gap-1 text-[12px] text-text-3">Volatility at most (%)<Input name="maxVol" inputMode="decimal" defaultValue={sp.maxVol ?? ""} placeholder="e.g. 20" /></label>
            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1 text-[12px] text-text-3">Div. yield ≥ (%)<Input name="minYield" inputMode="decimal" defaultValue={sp.minYield ?? ""} placeholder="e.g. 3" /></label>
              <label className="flex flex-col gap-1 text-[12px] text-text-3">P/E at most<Input name="maxPe" inputMode="decimal" defaultValue={sp.maxPe ?? ""} placeholder="e.g. 20" /></label>
            </div>
            {sp.sort ? <input type="hidden" name="sort" value={sp.sort} /> : null}
            {sp.dir ? <input type="hidden" name="dir" value={sp.dir} /> : null}
            <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-4">
              <Button type="submit" variant="secondary"><Filter aria-hidden /> Apply</Button>
              <Button asChild variant="ghost"><Link href="/research/screener">Clear</Link></Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {res.invalid.length ? <Alert tone="warning" className="mb-4" title="Some filters were ignored">{res.invalid.join(", ")}: enter a number, e.g. 8 for 8%.</Alert> : null}

      <form id="compare-form" action="/research/compare" className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <p className="text-[13px] text-text-2">
          {res.rows.length} of {res.universe} instrument{res.universe === 1 ? "" : "s"}
          {res.withoutHistory ? <> · {res.withoutHistory} without enough history in {lens === "local" ? "their own currency" : lens} left out</> : null}
        </p>
        <span className="flex items-center gap-2">
          <input type="hidden" name="lens" value={compareLens} />
          <span className="text-[12px] text-text-3">Tick up to three rows, then</span>
          <Button type="submit" variant="secondary"><Scale aria-hidden /> Compare in {compareLens}</Button>
        </span>
      </form>

      {res.rows.length === 0 ? (
        <EmptyState icon={<Filter />} title={res.universe ? "Nothing matches these filters" : "No price history loaded yet"}>
          {res.universe ? "Loosen a threshold: an instrument without a figure (for example no 5-year history or no dividends) never passes a filter on that figure." : licensedDataVisible() ? "Listed stocks and ETFs appear here once their prices have been loaded from the licensed data provider." : "Licensed market data isn't shown in the public demo, so only computed official benchmarks can appear."}
        </EmptyState>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] text-[13px]">
              <thead className="bg-surface-2 text-left text-text-3">
                <tr>
                  <th className="w-8 px-3 py-2.5"><span className="sr-only">Select to compare</span></th>
                  <th className="px-3 py-2.5 font-medium"><SortLink col="name" label="Instrument" res={res} href={href} /></th>
                  {COLUMNS.map((c) => <th key={c.key} className="whitespace-nowrap px-3 py-2.5 text-right font-medium"><SortLink col={c.key} label={c.label} res={res} href={href} /></th>)}
                  <th className="px-3 py-2.5 font-medium">Data to</th>
                </tr>
              </thead>
              <tbody>
                {res.rows.map((r) => (
                  <tr key={r.id} className="border-t border-border align-top">
                    <td className="px-3 py-3"><input type="checkbox" name="ids" value={r.id} form="compare-form" aria-label={`Compare ${r.name}`} className="size-4 accent-[var(--accent)]" /></td>
                    <td className="max-w-[280px] px-3 py-3">
                      <Link href={`/explore/${r.id}${lens !== "local" ? `?lens=${lens}` : ""}`} className="font-medium hover:text-accent">{r.name}</Link>
                      <p className="text-text-3">{[r.symbol, r.market ? MARKETS[r.market as keyof typeof MARKETS] : null, r.sector ?? r.assetClassLabel, lens === "local" ? r.currency : null].filter(Boolean).join(" · ")}</p>
                    </td>
                    {COLUMNS.map((c) => {
                      const v = r[c.key];
                      return (
                        <td key={c.key} className="num px-3 py-3 text-right">
                          {v === null ? <span className="text-text-3">—</span> : c.kind === "x" ? `${Number(v).toFixed(1)}×` : c.key === "vol" || c.key === "dy" ? formatPercent(v, { decimals: 1 }) : <Delta value={v} percent />}
                        </td>
                      );
                    })}
                    <td className="whitespace-nowrap px-3 py-3 text-text-2">{formatDate(r.asOf, "short")}{r.totalReturn ? null : <p className="mt-1"><Badge tone="warning" title="No dividends recorded: price return only">Price only</Badge></p>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <CardContent className="pt-3 text-[12px] text-text-3">
            Returns are total returns a year (dividends reinvested where recorded; the 1-year column is the year&apos;s total) to the latest month end{lens === "local" ? ", each in its own currency, so rows in different currencies aren't directly comparable: choose one currency to compare them" : `, converted to ${lens} at same-day official exchange rates`}. Real returns remove that currency&apos;s inflation. Volatility is the annualised standard deviation of monthly returns over three years; worst fall is the largest drop from a peak over the whole history. P/E is the trailing price-to-earnings ratio from the latest fundamentals, shown only when positive. “—” means the figure isn&apos;t available, and unknown figures sort last.
          </CardContent>
        </Card>
      )}

      <p className="mt-6 text-[12px] text-text-3">{DISCLOSURES.past_performance} {DISCLOSURES.not_advice} {DISCLOSURES.data_freshness}</p>
    </>
  );
}

function SortLink({ col, label, res, href }: { col: SortKey; label: string; res: { sort: SortKey; dir: "asc" | "desc" }; href: (p: Params) => string }) {
  const active = res.sort === col;
  const nextDir = active ? (res.dir === "asc" ? "desc" : "asc") : col === "name" || col === "vol" || col === "pe" ? "asc" : "desc";
  return (
    <Link href={href({ sort: col, dir: nextDir })} scroll={false} className={active ? "text-text" : "hover:text-text"} aria-label={`Sort by ${SORTS[col]}${active ? `, currently ${res.dir === "asc" ? "ascending" : "descending"}` : ""}`}>
      {label}{active ? (res.dir === "asc" ? " ↑" : " ↓") : ""}
    </Link>
  );
}
