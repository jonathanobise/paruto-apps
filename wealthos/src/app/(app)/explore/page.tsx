import Link from "next/link";
import { Monogram } from "@/components/app/kind-icon";
import { Search } from "lucide-react";
import { requireApp } from "@/server/auth/context";
import { featureDecision } from "@/server/compliance/gate";
import { DISCLOSURES } from "@/server/compliance/features";
import { searchCatalogue } from "@/server/research/catalogue";
import { PageHeader } from "@/components/app/page-header";
import { Card } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/form";
import { EmptyState } from "@/components/ui/empty-state";
import { RateLine, StatusBadge, VerificationBadge, PreRelease } from "@/components/app/research";
import { formatDate, formatMoney } from "@/lib/format";
import { ASSET_CLASSES, ASSET_CLASS_LABELS } from "@/engine";

export const metadata = { title: "Explorer" };

export default async function ExplorePage({ searchParams }: { searchParams: Promise<{ q?: string; assetClass?: string; currency?: string }> }) {
  const app = await requireApp();
  const gate = await featureDecision("INSTRUMENT_EXPLORER", app.org.jurisdiction);
  if (!gate.available) return (<><PageHeader title="Explorer" /><Alert tone="info" title="Not available yet">{gate.reason}</Alert></>);
  const sp = await searchParams;
  const rows = await searchCatalogue(app.ctx, { ...(sp.q ? { q: sp.q } : {}), ...(sp.assetClass ? { assetClass: sp.assetClass } : {}), ...(sp.currency ? { currency: sp.currency } : {}) });
  return (
    <>
      <PageHeader title="Explorer" description="Factual information on investment products: prices, published rates with their methodology, fees and risks — each with its source and as-of date. Information, not recommendations." />
      {gate.status === "pending_review" ? <PreRelease reason={gate.reason} /> : null}
      <form className="mb-5 flex flex-wrap items-end gap-3" role="search">
        <label className="min-w-64 flex-1">
          <span className="sr-only">Search</span>
          <Input name="q" defaultValue={sp.q ?? ""} placeholder="Search by name, ticker or issuer" />
        </label>
        <label>
          <span className="sr-only">Asset class</span>
          <Select name="assetClass" defaultValue={sp.assetClass ?? ""} className="w-52">
            <option value="">All asset classes</option>
            {ASSET_CLASSES.filter((c) => !["cash", "real_estate", "business", "pension"].includes(c)).map((c) => <option key={c} value={c}>{ASSET_CLASS_LABELS[c]}</option>)}
          </Select>
        </label>
        <label>
          <span className="sr-only">Currency</span>
          <Select name="currency" defaultValue={sp.currency ?? ""} className="w-32">
            <option value="">Any currency</option>
            {["NGN", "USD", "GBP", "EUR"].map((c) => <option key={c}>{c}</option>)}
          </Select>
        </label>
        <Button type="submit" variant="secondary"><Search aria-hidden /> Search</Button>
      </form>
      {rows.length === 0 ? (
        <EmptyState icon={<Search />} title="No instruments found">The catalogue only lists products whose data has been sourced and checked. It grows as verified data is added.</EmptyState>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-[13px]">
              <thead className="text-left text-text-3 text-[12px]">
                <tr className="border-b border-border">
                  <th className="px-4 py-2.5 font-medium">Instrument</th>
                  <th className="px-4 py-2.5 font-medium">Type</th>
                  <th className="px-4 py-2.5 text-right font-medium">Latest price / NAV</th>
                  <th className="px-4 py-2.5 font-medium">Published rates</th>
                  <th className="px-4 py-2.5 font-medium">Data</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-t border-border align-top">
                    <td className="px-4 py-3">
                      <div className="flex gap-3">
                        <Monogram text={r.symbol ?? r.name} assetClass={r.assetClassLabel} />
                        <div className="min-w-0">
                          <Link href={`/explore/${r.id}`} className="font-medium hover:text-accent">{r.name}</Link>
                          <p className="text-text-3">{[r.symbol, r.issuer, r.currency].filter(Boolean).join(" · ")}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-text-2">{r.assetClassLabel}{r.isPrivate ? <Badge className="ml-1">Private</Badge> : null}</td>
                    <td className="num px-4 py-3 text-right">
                      {r.latestPrice ? (<>{formatMoney(r.latestPrice.price, r.currency, { decimals: Number(r.latestPrice.price) < 10 ? 4 : 2 })}<p className="text-[11px] text-text-3">{r.latestPrice.methodology} · {formatDate(r.latestPrice.observedOn)}</p></>) : <span className="text-text-3">—</span>}
                    </td>
                    <td className="px-4 py-3">{r.rates.length ? r.rates.slice(0, 2).map((x, i) => <p key={i}><RateLine r={x} /></p>) : <span className="text-text-3">—</span>}</td>
                    <td className="px-4 py-3"><div className="flex flex-wrap gap-1"><StatusBadge status={r.priceStatus} observedOn={r.latestPrice?.observedOn ?? null} /><VerificationBadge state={r.isSample ? "synthetic" : r.verification} /></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
      <p className="mt-4 text-[12px] text-text-3">{DISCLOSURES.not_advice} {DISCLOSURES.data_freshness}</p>
    </>
  );
}
