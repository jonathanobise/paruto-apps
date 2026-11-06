import Link from "next/link";
import { requireApp } from "@/server/auth/context";
import { featureDecision } from "@/server/compliance/gate";
import { DISCLOSURES } from "@/server/compliance/features";
import { getFixedIncome, type AuctionView } from "@/server/research/markets";
import { METHODOLOGY_HELP } from "@/server/research/facts";
import { PageHeader } from "@/components/app/page-header";
import { ResearchTabs, SourceNotes, methodologyLabel } from "@/components/app/research";
import { SeriesChart } from "@/components/app/series-chart";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Delta } from "@/components/ui/money";
import { daysBetween, type RateMethodology } from "@/engine";
import { formatDate, formatPercent } from "@/lib/format";

export const metadata = { title: "Fixed income" };

const monthName = (asOf: string) => new Date(`${asOf.slice(0, 7)}-15T00:00:00Z`).toLocaleDateString("en-GB", { month: "short", year: "numeric", timeZone: "UTC" });
const shortName = (name: string) => name.replace(/ \(primary auctions\)$/, "");

function Age({ asOf }: { asOf: string }) {
  const age = daysBetween(asOf, new Date().toISOString().slice(0, 10));
  return <>{formatDate(asOf)}{age > 45 ? <Badge tone="warning" className="ml-1">{age} days ago</Badge> : null}</>;
}

function Remaining({ a }: { a: AuctionView }) {
  if (!a.tenorDays) return <>—</>;
  return <>{a.tenorDays >= 365 ? `${(a.tenorDays / 365).toFixed(1)} yrs` : `${a.tenorDays} days`}</>;
}

export default async function FixedIncomePage() {
  const app = await requireApp();
  const gate = await featureDecision("MARKET_RESEARCH", app.org.jurisdiction);
  if (!gate.available) return (<><PageHeader title="Fixed income" /><Alert tone="info" title="Not available yet">{gate.reason}</Alert></>);
  const f = await getFixedIncome(app.ctx);
  const infl = f.inflation;
  const sources = [f.source, infl?.source ?? null].filter((x): x is NonNullable<typeof x> => x !== null).filter((x, i, a) => a.findIndex((y) => y.name === x.name) === i);
  return (
    <>
      <PageHeader title="Nigerian government yields" description="What the Federal Government paid at its latest primary auctions of Treasury bills and FGN bonds, money-market rates, and how they compare with inflation. Results as published by the CBN." />
      <ResearchTabs current="/research/fixed-income" jurisdiction={app.org.jurisdiction} />
      {gate.status === "pending_review" ? <Alert tone="warning" className="mb-4" title="Pre-release feature">{gate.reason}</Alert> : null}

      <Card className="mb-6 overflow-hidden">
        <CardHeader>
          <div>
            <CardTitle>Treasury bills: latest auction stop rates</CardTitle>
            <CardDescription>NTB stop rates are quoted on the bank-discount basis. We convert each one exactly to a true yield and an effective annual yield so tenors can be compared.</CardDescription>
          </div>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-[13px]">
            <thead className="bg-surface-2 text-left text-text-3">
              <tr>
                <th className="px-4 py-2.5 font-medium">Bill</th>
                <th className="px-4 py-2.5 text-right font-medium">Stop rate (discount)</th>
                <th className="px-4 py-2.5 text-right font-medium">True yield</th>
                <th className="px-4 py-2.5 text-right font-medium">Effective annual</th>
                <th className="px-4 py-2.5 text-right font-medium">After inflation*</th>
                <th className="px-4 py-2.5 font-medium">Auction</th>
              </tr>
            </thead>
            <tbody>
              {f.ntb.map((a) => (
                <tr key={a.instrumentId} className="border-t border-border">
                  <td className="px-4 py-3"><Link href={`/explore/${a.instrumentId}`} className="font-medium hover:text-accent">{shortName(a.name)}</Link><p className="text-text-3">{a.tenorDays} days</p></td>
                  <td className="num px-4 py-3 text-right">{formatPercent(a.value, { decimals: 2 })}</td>
                  <td className="num px-4 py-3 text-right">{formatPercent(a.trueYield, { decimals: 2 })}</td>
                  <td className="num px-4 py-3 text-right font-medium">{formatPercent(a.effectiveAnnual, { decimals: 2 })}</td>
                  <td className="num px-4 py-3 text-right">{a.realApprox ? <Delta value={a.realApprox} percent /> : "—"}</td>
                  <td className="px-4 py-3 text-text-2"><Age asOf={a.asOf} /></td>
                </tr>
              ))}
              {!f.ntb.length ? <tr><td colSpan={6} className="px-4 py-3 text-text-3">No auction results loaded yet.</td></tr> : null}
            </tbody>
          </table>
        </div>
        <CardContent className="pt-3 text-[12px] text-text-3">
          <p>{METHODOLOGY_HELP.discount_rate} True yield = d ÷ (1 − d × days/365); effective annual assumes reinvestment at the same rate. Learn more: <Link href="/learn/treasury-bill-yields" className="text-accent hover:underline">T-bill yields</Link>.</p>
          <p className="mt-1">* (1 + effective annual yield) ÷ (1 + latest headline inflation{infl?.value ? `, ${formatPercent(infl.value, { decimals: 2 })} in ${monthName(infl.asOf!)}` : ""}) − 1. Inflation over the life of the bill isn&apos;t known yet, so this is an approximation.</p>
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader><div><CardTitle>Bill yields over time</CardTitle><CardDescription>True yield at the last auction of each month, by tenor.</CardDescription></div></CardHeader>
          <CardContent><SeriesChart rows={f.ntbChart} series={[{ key: "91", label: "91 days" }, { key: "182", label: "182 days" }, { key: "364", label: "364 days" }]} unit="percent" label="Nigerian Treasury bill true yields" /></CardContent>
        </Card>
        <Card>
          <CardHeader><div><CardTitle>FGN bond yields over time</CardTitle><CardDescription>Stop yield to maturity at the last auction of each month, grouped by the bond&apos;s original term (reopenings have less time left to run).</CardDescription></div></CardHeader>
          <CardContent><SeriesChart rows={f.bondChart} series={[{ key: "5Y", label: "5-year" }, { key: "10Y", label: "10-year" }, { key: "20Y", label: "20-year" }]} unit="percent" label="FGN bond auction yields" /></CardContent>
        </Card>
      </div>

      <Card className="mt-6 overflow-hidden">
        <CardHeader><div><CardTitle>FGN bonds: latest auction by original term</CardTitle><CardDescription>{METHODOLOGY_HELP.yield_to_maturity}</CardDescription></div></CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-[13px]">
            <thead className="bg-surface-2 text-left text-text-3">
              <tr>
                <th className="px-4 py-2.5 font-medium">Bond</th>
                <th className="px-4 py-2.5 text-right font-medium">Stop yield</th>
                <th className="px-4 py-2.5 text-right font-medium">Time to maturity</th>
                <th className="px-4 py-2.5 text-right font-medium">After inflation*</th>
                <th className="px-4 py-2.5 font-medium">Auction</th>
              </tr>
            </thead>
            <tbody>
              {f.bonds.map((a) => (
                <tr key={a.instrumentId} className="border-t border-border">
                  <td className="px-4 py-3"><Link href={`/explore/${a.instrumentId}`} className="font-medium hover:text-accent">{shortName(a.name)}</Link><p className="text-text-3">{methodologyLabel(a.methodology as RateMethodology)}</p></td>
                  <td className="num px-4 py-3 text-right font-medium">{formatPercent(a.value, { decimals: 2 })}</td>
                  <td className="num px-4 py-3 text-right"><Remaining a={a} /></td>
                  <td className="num px-4 py-3 text-right">{a.realApprox ? <Delta value={a.realApprox} percent /> : "—"}</td>
                  <td className="px-4 py-3 text-text-2"><Age asOf={a.asOf} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <CardContent className="flex flex-col gap-1 pt-3 text-[12px] text-text-3">
          {f.lastBondAuction ? <p>The CBN&apos;s published FGN bond results run to {formatDate(f.lastBondAuction)}. FGN bond auctions are run by the Debt Management Office, whose later results aren&apos;t a source here yet, so these yields are dated: check the auction date before using any of them.</p> : null}
          {f.excludedBondResults ? <p>{f.excludedBondResults} bond result{f.excludedBondResults === 1 ? "" : "s"} with under six months to maturity were left out as suspected keying errors in the source.</p> : null}
          <p>* As for bills; bond yields are semi-annual-coupon yields, treated here as annual for a rough comparison.</p>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader><div><CardTitle>Money-market and bank rates</CardTitle><CardDescription>Monthly averages as compiled by the CBN. Deposit and lending rates are industry averages, not any one bank&apos;s offer.</CardDescription></div></CardHeader>
        <CardContent>
          <table className="w-full text-[13px]">
            <thead className="text-left text-text-3"><tr><th className="py-1.5 font-medium">Rate</th><th className="py-1.5 text-right font-medium">Latest</th><th className="py-1.5 text-right font-medium">A year earlier</th><th className="py-1.5 text-right font-medium">Month</th></tr></thead>
            <tbody>
              {f.moneyMarket.map((r) => (
                <tr key={r.key} className="border-t border-border">
                  <td className="py-2">{r.name.charAt(0).toUpperCase() + r.name.slice(1)}</td>
                  <td className="num py-2 text-right font-medium">{formatPercent(r.value, { decimals: 2 })}</td>
                  <td className="num py-2 text-right text-text-2">{formatPercent(r.yearAgo, { decimals: 2 })}</td>
                  <td className="py-2 text-right text-text-2">{r.asOf ? monthName(r.asOf) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <p className="mt-6 text-[12px] text-text-3">{DISCLOSURES.not_advice} {DISCLOSURES.data_freshness}</p>
      <SourceNotes sources={sources} />
    </>
  );
}
