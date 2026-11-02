import Link from "next/link";
import { notFound } from "next/navigation";
import { X } from "lucide-react";
import { requireApp } from "@/server/auth/context";
import { featureDecision } from "@/server/compliance/gate";
import { DISCLOSURES } from "@/server/compliance/features";
import { compareInstruments, searchCatalogue } from "@/server/research/catalogue";
import { METHODOLOGY_HELP } from "@/server/research/facts";
import { PageHeader } from "@/components/app/page-header";
import { Card } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/form";
import { Delta } from "@/components/ui/money";
import { StatusBadge, methodologyLabel } from "@/components/app/research";
import { formatDate, formatMoney, formatPercent } from "@/lib/format";
import { compareWithAction } from "../actions";
import { SaveComparisonForm } from "./save-form";

export const metadata = { title: "Compare · WealthOS" };

export default async function ComparePage({ searchParams }: { searchParams: Promise<{ ids?: string }> }) {
  const app = await requireApp();
  if (!(await featureDecision("INSTRUMENT_EXPLORER", app.org.jurisdiction)).available) notFound();
  const sp = await searchParams;
  const ids = (sp.ids ?? "").split(",").filter((x) => /^[0-9a-f-]{36}$/i.test(x)).slice(0, 4);
  const catalogue = await searchCatalogue(app.ctx, {});
  const picker = (
    <form action={compareWithAction} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="ids" value={ids.join(",")} />
      <label htmlFor="add" className="sr-only">Add instrument</label>
      <Select id="add" name="add" className="h-9 w-72" defaultValue="" required>
        <option value="" disabled>Add an instrument…</option>
        {catalogue.filter((c) => !ids.includes(c.id)).map((c) => <option key={c.id} value={c.id}>{c.symbol ? `${c.symbol} · ` : ""}{c.name}</option>)}
      </Select>
      <Button type="submit" variant="secondary" size="sm" disabled={ids.length >= 4}>Add</Button>
    </form>
  );
  if (ids.length < 2) {
    return (
      <>
        <PageHeader eyebrow={<Link href="/explore" className="hover:text-text">← Explorer</Link>} title="Compare" description="Pick two to four products to see their facts side by side." />
        {picker}
      </>
    );
  }
  const c = await compareInstruments(app.ctx, ids);
  const without = (id: string) => ids.filter((x) => x !== id).join(",");
  const cols = c.instruments;
  return (
    <>
      <PageHeader eyebrow={<Link href="/explore" className="hover:text-text">← Explorer</Link>} title="Compare" description="Facts side by side. Rates are compared only within the same methodology; derived figures show their formula." actions={app.canWrite ? <SaveComparisonForm ids={ids} /> : null} />
      <div className="mb-4">{picker}</div>
      {c.currencies.length > 1 ? <Alert tone="warning" className="mb-4" title="Different currencies">These products are in {c.currencies.join(" and ")}. Prices and returns are shown in each product&apos;s own currency, so they don&apos;t include exchange-rate changes and aren&apos;t directly comparable.</Alert> : null}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-[13px]">
            <thead className="bg-surface-2 text-left">
              <tr>
                <th className="w-48 px-4 py-3 font-medium text-text-3"><span className="sr-only">Attribute</span></th>
                {cols.map((x) => (
                  <th key={x.id} className="px-4 py-3 align-top">
                    <div className="flex items-start justify-between gap-2">
                      <Link href={`/explore/${x.id}`} className="font-semibold hover:text-accent">{x.symbol ?? x.name}</Link>
                      <Link href={`/explore/compare?ids=${without(x.id)}`} aria-label={`Remove ${x.name}`} className="text-text-3 hover:text-negative"><X className="size-4" /></Link>
                    </div>
                    <p className="font-normal text-text-3">{x.name}</p>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="[&_td]:px-4 [&_td]:py-2.5 [&_th]:px-4 [&_th]:py-2.5 [&_tr]:border-t [&_tr]:border-border">
              <tr><th className="text-left font-normal text-text-3">Type · currency</th>{cols.map((x) => <td key={x.id}>{x.assetClassLabel} · {x.currency}</td>)}</tr>
              <tr><th className="text-left font-normal text-text-3">Issuer</th>{cols.map((x) => <td key={x.id}>{x.issuer ?? "—"}</td>)}</tr>
              <tr><th className="text-left font-normal text-text-3">Latest price / NAV</th>{cols.map((x) => <td key={x.id} className="num">{x.latestPrice ? <>{formatMoney(x.latestPrice.price, x.currency, { decimals: 4 })} <span className="text-text-3">{formatDate(x.latestPrice.observedOn)}</span> <StatusBadge status={x.priceStatus} /></> : "—"}</td>)}</tr>
              {(["1M", "3M", "1Y", "3Y"] as const).map((k) => (
                <tr key={k}><th className="text-left font-normal text-text-3">{k} price return{k === "3Y" ? " (a yr)" : ""}</th>{cols.map((x) => { const t = x.trailing.find((y) => y.key === k); const v = k === "3Y" ? t?.annualized : t?.cumulative; return <td key={x.id}>{v ? <Delta value={v} percent /> : <span className="text-text-3">—</span>}</td>; })}</tr>
              ))}
              <tr className="bg-surface-2"><th colSpan={cols.length + 1} className="text-left text-[12px] font-semibold uppercase tracking-wide text-text-3">Published rates (compare across a row only)</th></tr>
              {c.methodologies.map((m) => (
                <tr key={m}>
                  <th className="text-left align-top font-normal"><span className="text-text">{methodologyLabel(m)}</span><p className="text-[11px] leading-snug text-text-3">{METHODOLOGY_HELP[m]}</p></th>
                  {cols.map((x) => {
                    const direct = x.rates.find((r) => r.methodology === m);
                    const derived = x.rates.flatMap((r) => r.derived.map((dv) => ({ ...dv, from: r }))).find((dv) => dv.methodology === m);
                    return (
                      <td key={x.id} className="align-top">
                        {direct ? <><span className="num font-medium">{formatPercent(direct.value, { decimals: 2 })}</span><p className="text-[11px] text-text-3">{direct.tenorDays ? `${direct.tenorDays}d · ` : ""}{formatDate(direct.asOf)}</p></> : derived ? <><span className="num font-medium italic">{formatPercent(derived.value, { decimals: 2 })}</span><p className="text-[11px] text-text-3">derived from the {derived.from.tenorDays}-day discount rate: {derived.formula}</p></> : <span className="text-text-3">—</span>}
                      </td>
                    );
                  })}
                </tr>
              ))}
              <tr className="bg-surface-2"><th colSpan={cols.length + 1} className="text-left text-[12px] font-semibold uppercase tracking-wide text-text-3">Verified facts</th></tr>
              {([["ongoingChargePct", "Ongoing charge"], ["entryFeePct", "Entry fee"], ["exitFeePct", "Exit fee"], ["minimumInvestment", "Minimum investment"], ["liquidity", "Liquidity"], ["distributionPolicy", "Distributions"]] as const).map(([k, label]) => (
                <tr key={k}><th className="text-left font-normal text-text-3">{label}</th>{cols.map((x) => { const v = x.facts?.[k]; return <td key={x.id}>{x.facts === null ? <span className="text-text-3">Not verified</span> : v ? (k.endsWith("Pct") ? `${v}%` : k === "minimumInvestment" ? formatMoney(String(v), x.facts.minimumInvestmentCurrency ?? x.currency, { decimals: 0 }) : String(v)) : "—"}</td>; })}</tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      <p className="mt-4 text-[12px] text-text-3">Why rates are converted before comparing: <Link href="/learn/treasury-bill-yields" className="text-accent hover:underline">T-bill yields</Link>, <Link href="/learn/money-market-fund-yields" className="text-accent hover:underline">fund yields</Link>. {DISCLOSURES.not_advice} {DISCLOSURES.past_performance}</p>
    </>
  );
}
