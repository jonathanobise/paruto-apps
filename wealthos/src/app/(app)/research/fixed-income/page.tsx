import Link from "next/link";
import { requireApp } from "@/server/auth/context";
import { featureDecision } from "@/server/compliance/gate";
import { DISCLOSURES } from "@/server/compliance/features";
import { getFixedIncome, type AuctionView } from "@/server/research/markets";
import { METHODOLOGY_HELP } from "@/server/research/facts";
import { PageHeader } from "@/components/app/page-header";
import { ResearchTabs, SourceNotes, methodologyLabel, PreRelease } from "@/components/app/research";
import { SeriesChart } from "@/components/app/series-chart";
import { Stat } from "@/components/app/stat";
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
  if (!gate.available) return (<><PageHeader eyebrow="Research" title="Fixed income" /><Alert tone="info" title="Not available yet">{gate.reason}</Alert></>);
  const f = await getFixedIncome(app.ctx);
  const infl = f.inflation;
  const my = f.marketYields;
  const ng10 = my?.latest.find((y) => y.country === "NG") ?? null;
  const sources = [f.source, my?.source ?? null, infl?.source ?? null].filter((x): x is NonNullable<typeof x> => x !== null).filter((x, i, a) => a.findIndex((y) => y.name === x.name) === i);
  return (
    <>
      <PageHeader eyebrow="Research" title="Nigerian government yields" description="What the Federal Government paid at its latest primary auctions of Treasury bills and FGN bonds, what its 10-year bond yields in the market today, money-market rates, and how they compare with inflation." />
      <ResearchTabs current="/research/fixed-income" jurisdiction={app.org.jurisdiction} />
      {gate.status === "pending_review" ? <PreRelease reason={gate.reason} /> : null}

      {f.ntb.length ? (
        <dl className="rise mb-6 grid gap-4 sm:grid-cols-3">
          {f.ntb.map((a) => (
            <Card key={a.instrumentId} className="p-5">
              <Stat label={`${a.tenorDays}-day bill`} value={formatPercent(a.effectiveAnnual, { decimals: 2 })} sub={<>effective a year · {a.realApprox ? <><Delta value={a.realApprox} percent /> after inflation</> : "no inflation data"}</>} />
              <p className="mt-3 text-[12px] text-text-3">Auction {formatDate(a.asOf)} · stop rate {formatPercent(a.value, { decimals: 2 })} discount</p>
            </Card>
          ))}
        </dl>
      ) : null}

      <Card className="mb-6 overflow-hidden">
        <CardHeader>
          <div>
            <CardTitle>Treasury bills: latest auction stop rates</CardTitle>
            <CardDescription>NTB stop rates are quoted on the bank-discount basis. We convert each one exactly to a true yield and an effective annual yield so tenors can be compared.</CardDescription>
          </div>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-[13px]">
            <thead className="text-left text-text-3 text-[12px]">
              <tr className="border-b border-border">
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

      {my ? (
        <Card className="mb-6">
          <CardHeader>
            <div>
              <CardTitle>10-year government bond yields in the market</CardTitle>
              <CardDescription>What the 10-year benchmark bond yields as it trades between investors, end of day. Auctions are monthly; this moves every trading day, so it shows where FGN bond yields are now.</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <dl className="mb-6 grid gap-5 sm:grid-cols-3">
              {my.latest.map((y) => (
                <Stat
                  key={y.key}
                  label={y.name}
                  value={formatPercent(y.value, { decimals: 2 })}
                  sub={
                    <>
                      {y.asOf ? formatDate(y.asOf) : "—"}
                      {y.yearAgo ? <> · {formatPercent(y.yearAgo, { decimals: 2 })} a year earlier</> : null}
                      {y.realApprox ? <> · <Delta value={y.realApprox} percent /> after inflation*</> : null}
                    </>
                  }
                />
              ))}
            </dl>
            <SeriesChart rows={my.chart} series={[{ key: "ng", label: "Nigeria" }, { key: "us", label: "United States" }, { key: "uk", label: "United Kingdom" }].filter((x) => my.latest.some((y) => y.country === ({ ng: "NG", us: "US", uk: "GB" } as const)[x.key as "ng" | "us" | "uk"]))} unit="percent" label="10-year government bond yields, month end" />
            <p className="mt-3 text-[12px] text-text-3">
              Yields are in each bond&apos;s own currency, so they reflect each country&apos;s inflation and currency risk and aren&apos;t a like-for-like return comparison.
              {ng10?.realApprox ? <> * (1 + yield) ÷ (1 + latest headline inflation{infl?.value ? `, ${formatPercent(infl.value, { decimals: 2 })} in ${monthName(infl.asOf!)}` : ""}) − 1, an approximation.</> : null}
            </p>
          </CardContent>
        </Card>
      ) : null}

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
            <thead className="text-left text-text-3 text-[12px]">
              <tr className="border-b border-border">
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
          {f.lastBondAuction ? <p>The CBN&apos;s published FGN bond results run to {formatDate(f.lastBondAuction)}. Later auctions are run by the Debt Management Office, whose results aren&apos;t a source here, so these auction yields are dated: check the auction date before using any of them.{my ? " For today's level, see the 10-year market yield above." : ""}</p> : null}
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
