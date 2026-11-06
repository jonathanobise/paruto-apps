import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink, Scale, Star } from "lucide-react";
import { requireApp } from "@/server/auth/context";
import { featureDecision } from "@/server/compliance/gate";
import { DISCLOSURES } from "@/server/compliance/features";
import { getInstrument } from "@/server/research/catalogue";
import { isWatched } from "@/server/research/watchlists";
import { FACT_LABELS, METHODOLOGY_HELP } from "@/server/research/facts";
import { AppError } from "@/server/platform/errors";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Delta } from "@/components/ui/money";
import { PriceChart } from "@/components/app/price-chart";
import { StatusBadge, VerificationBadge, methodologyLabel } from "@/components/app/research";
import { formatDate, formatMoney, formatPercent } from "@/lib/format";
import { watchAction } from "../actions";
import { getFundamentals, getInstrumentPerformance } from "@/server/research/markets";
import { LENSES, type Lens } from "@/server/research/performance";
import { FundamentalsCard, LongRunPerformance } from "./performance";

export default async function InstrumentPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ lens?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  const app = await requireApp();
  const gate = await featureDecision("INSTRUMENT_EXPLORER", app.org.jurisdiction);
  if (!gate.available) notFound();
  let x;
  try {
    x = await getInstrument(app.ctx, id);
  } catch (err) {
    if (err instanceof AppError && err.code === "NOT_FOUND") notFound();
    throw err;
  }
  const watched = await isWatched(app.ctx, id);
  const research = (await featureDecision("MARKET_RESEARCH", app.org.jurisdiction)).available;
  const lens: Lens = (LENSES as string[]).includes(sp.lens ?? "") ? (sp.lens as Lens) : "local";
  const [perf, fundamentals] = research ? await Promise.all([getInstrumentPerformance(app.ctx, id, lens), getFundamentals(app.ctx, id)]) : [null, null];
  const facts = x.facts;
  return (
    <>
      <PageHeader
        eyebrow={<Link href="/explore" className="hover:text-text">← Explorer</Link>}
        title={x.name}
        description={<span className="flex flex-wrap items-center gap-2">{[x.symbol, x.issuer, x.assetClassLabel, x.currency].filter(Boolean).join(" · ")} <VerificationBadge state={x.isSample ? "synthetic" : x.verification} />{x.isPrivate ? <Badge>Private</Badge> : null}</span>}
        actions={
          <>
            <Button asChild variant="secondary"><Link href={`/explore/compare?ids=${id}`}><Scale aria-hidden /> Compare</Link></Button>
            {research ? <Button asChild variant="secondary"><Link href={`/research/compare?ids=${id}&lens=${lens === "local" ? (x.currency === "NGN" ? "NGN" : x.currency === "GBP" ? "GBP" : "USD") : lens}`}><Scale aria-hidden /> Compare returns</Link></Button> : null}
            {app.canWrite ? (
              <form action={watchAction}>
                <input type="hidden" name="instrumentId" value={id} />
                <Button type="submit" variant="secondary" disabled={watched}><Star aria-hidden /> {watched ? "Watching" : "Watch"}</Button>
              </form>
            ) : null}
          </>
        }
      />
      {x.isSample ? <Alert tone="info" className="mb-6">{DISCLOSURES.demo_data}</Alert> : null}

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>{x.pricingModel === "nav" ? "NAV history" : "Price history"}</CardTitle>
              <CardDescription>
                {x.latestPrice ? <>Latest {formatMoney(x.latestPrice.price, x.currency, { decimals: 4 })} ({x.latestPrice.methodology}) as of {formatDate(x.latestPrice.observedOn)} · source: {x.priceSource?.name}</> : "No prices recorded."}
              </CardDescription>
            </div>
            <StatusBadge status={x.priceStatus} observedOn={x.latestPrice?.observedOn ?? null} />
          </CardHeader>
          <CardContent>
            <PriceChart data={x.chart} currency={x.currency} label={`${x.name} ${x.pricingModel === "nav" ? "NAV" : "price"}`} />
            <h3 className="mt-6 text-[13px] font-semibold">Trailing price returns (in {x.currency})</h3>
            <dl className="mt-2 grid grid-cols-3 gap-3 sm:grid-cols-6">
              {x.trailing.map((t) => (
                <div key={t.key} className="rounded-[var(--radius-inner)] bg-surface-2 px-3 py-2">
                  <dt className="text-[12px] text-text-3">{t.key}</dt>
                  <dd className="text-[14px] font-medium">{t.cumulative === null ? <span className="text-text-3">—</span> : <Delta value={t.cumulative} percent />}</dd>
                  {t.annualized ? <dd className="num text-[11px] text-text-3">{formatPercent(t.annualized, { signed: true, decimals: 2 })} a yr</dd> : null}
                </div>
              ))}
            </dl>
            <p className="mt-2 text-[12px] text-text-3">Price change only: dividends and distributions are excluded unless the NAV accumulates them. “—” means there is no observation close enough to the start or end of the period. {DISCLOSURES.past_performance}</p>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader><div><CardTitle>Published rates</CardTitle><CardDescription>Each figure keeps its own methodology. Different methodologies are not directly comparable.</CardDescription></div></CardHeader>
            <CardContent>
              {x.rates.length ? (
                <ul className="flex flex-col gap-3 text-[13px]">
                  {x.rates.map((r, i) => (
                    <li key={i}>
                      <p className="flex items-baseline justify-between gap-2"><span className="font-medium">{methodologyLabel(r.methodology)}{r.tenorDays ? ` · ${r.tenorDays} days` : ""}</span><span className="num text-[15px] font-semibold">{formatPercent(r.value, { decimals: 2 })}</span></p>
                      <p className="text-text-3">As of {formatDate(r.asOf)}{r.basis ? ` · ${r.basis}` : ""} · {r.sourceUrl ? <a href={r.sourceUrl} className="text-accent hover:underline" rel="noopener noreferrer" target="_blank">{r.sourceName}</a> : r.sourceName}{r.ageDays > 31 ? <Badge tone="warning" className="ml-1">{r.ageDays} days old</Badge> : null}</p>
                      <p className="mt-0.5 text-[12px] text-text-2">{METHODOLOGY_HELP[r.methodology]}</p>
                    </li>
                  ))}
                </ul>
              ) : <p className="text-sm text-text-3">No published rates recorded.</p>}
              <p className="mt-3 text-[12px] text-text-3">Learn: <Link href="/learn/treasury-bill-yields" className="text-accent hover:underline">T-bill yields</Link> · <Link href="/learn/money-market-fund-yields" className="text-accent hover:underline">fund yields</Link></p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Data sources</CardTitle></CardHeader>
            <CardContent className="flex flex-col gap-2 text-[13px] text-text-2">
              {x.priceSource ? <p><span className="text-text">Prices:</span> {x.priceSource.name} ({x.priceSource.kind.replace(/_/g, " ")}). {x.priceSource.licenseNote}</p> : null}
              {x.identifiers.map((i) => <p key={i.scheme}><span className="text-text">{i.scheme}:</span> <span className="num">{i.value}</span> {i.verification !== "verified" ? <Badge tone="warning">Unverified</Badge> : null}</p>)}
              {x.maturityDate ? <p><span className="text-text">Maturity:</span> {formatDate(x.maturityDate)}</p> : null}
              {x.officialUrl ? <p><a href={x.officialUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-accent hover:underline">Official page <ExternalLink className="size-3" aria-hidden /></a></p> : null}
              {x.verifiedAt ? <p className="text-text-3">Identity and facts last verified {formatDate(x.verifiedAt)}.</p> : null}
            </CardContent>
          </Card>
        </div>
      </div>

      {research && (perf || x.chart.length > 1) ? <LongRunPerformance id={id} lens={lens} perf={perf} currency={x.currency} /> : null}
      {fundamentals ? <FundamentalsCard f={fundamentals} currency={x.currency} /> : null}

      <Card className="mt-6">
        <CardHeader><div><CardTitle>Product facts</CardTitle>{facts ? <CardDescription>From the <a href={x.factsSourceUrl!} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">official source</a>, as of {formatDate(x.factsAsOf)}.</CardDescription> : null}</div></CardHeader>
        <CardContent>
          {facts ? (
            <div className="grid gap-6 lg:grid-cols-2">
              <dl className="grid grid-cols-[minmax(0,180px)_1fr] gap-x-4 gap-y-2 text-[13px]">
                {(Object.keys(FACT_LABELS) as Array<keyof typeof FACT_LABELS>).filter((k) => facts[k]).map((k) => (
                  <div key={k} className="contents">
                    <dt className="text-text-3">{FACT_LABELS[k]}</dt>
                    <dd>{k === "minimumInvestment" ? formatMoney(facts[k]!, facts.minimumInvestmentCurrency ?? x.currency, { decimals: 0 }) : k.endsWith("Pct") ? `${facts[k]}%` : facts[k]}</dd>
                  </div>
                ))}
              </dl>
              {facts.riskFactors.length ? (
                <div>
                  <h3 className="text-[13px] font-semibold">Key risks</h3>
                  <ul className="mt-2 list-disc space-y-1 pl-4 text-[13px] text-text-2">{facts.riskFactors.map((r) => <li key={r}>{r}</li>)}</ul>
                </div>
              ) : null}
            </div>
          ) : (
            <p className="text-sm text-text-2">Fees, minimums, liquidity, risks and tax notes are shown only after they have been checked against an official source. They haven&apos;t been verified for this product yet.</p>
          )}
        </CardContent>
      </Card>
      <p className="mt-6 text-[12px] text-text-3">{DISCLOSURES.not_advice} {DISCLOSURES.data_freshness}</p>
    </>
  );
}
