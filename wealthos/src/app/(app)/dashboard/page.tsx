import Link from "next/link";
import { CalendarClock, Landmark, Plus, Sparkles } from "lucide-react";
import { requireApp } from "@/server/auth/context";
import { buildDashboard, PERIODS, type PeriodKey } from "@/server/analytics/portfolio";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Stat } from "@/components/app/stat";
import { Delta } from "@/components/ui/money";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Alert } from "@/components/ui/alert";
import { NetWorthChart } from "@/components/app/net-worth-chart";
import { KindIcon } from "@/components/app/kind-icon";
import { AllocationBars } from "@/components/app/allocation-bars";
import { DataIssues } from "@/components/app/data-issues";
import { PeriodTabs } from "@/components/app/period-tabs";
import { formatDate, formatMoney, formatPercent } from "@/lib/format";
import { DISCLOSURES } from "@/server/compliance/features";
import { createDemoAction } from "./actions";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ period?: string; welcome?: string }> }) {
  const app = await requireApp();
  const sp = await searchParams;
  const period: PeriodKey = sp.period && sp.period in PERIODS ? (sp.period as PeriodKey) : "1Y";
  const data = await buildDashboard(app.ctx, { baseCurrency: app.baseCurrency, period });
  const ccy = data.baseCurrency;
  const hasDemo = app.orgs.some((o) => o.isDemo);

  if (!data.hasData) {
    return (
      <>
        <PageHeader title={`Welcome, ${app.session.user.displayName.split(" ")[0]}`} description="Start by adding the accounts you hold. Everything else builds from there." />
        {sp.welcome ? <Alert tone="success" className="mb-6">Your email is confirmed. You&apos;re all set.</Alert> : null}
        <div className="grid gap-4 lg:grid-cols-2">
          <EmptyState
            icon={<Landmark />}
            title="Add your first account"
            action={
              <Button asChild>
                <Link href="/accounts/new">
                  <Plus aria-hidden /> Add account
                </Link>
              </Button>
            }
          >
            Bank accounts, brokerage and fund accounts, T-bills, pensions, property, business interests and loans. We never ask for bank passwords.
          </EmptyState>
          <EmptyState
            icon={<Sparkles />}
            title="Explore a demo portfolio first"
            action={
              hasDemo ? (
                <p className="text-sm text-text-3">Your demo portfolio is in the portfolio switcher at the top.</p>
              ) : (
                <form action={createDemoAction}>
                  <Button variant="secondary" type="submit">
                    Create demo portfolio
                  </Button>
                </form>
              )
            }
          >
            A separate, clearly labelled DEMO portfolio with a ₦10m hypothetical balanced mix and synthetic SAMPLE prices, so you can see every feature without entering data.
          </EmptyState>
        </div>
      </>
    );
  }

  const perf = data.performance;
  const nwChange = data.history.length > 1 ? data.history : [];

  return (
    <>
      <PageHeader
        eyebrow={
          <span className="flex items-center gap-2">
            {data.orgName} {data.isDemo ? <Badge tone="demo">Demo · sample data</Badge> : null}
          </span>
        }
        title="Your wealth today"
        description={`Valued as of ${formatDate(data.asOf)} in ${ccy}. Every figure below is calculated from your ledger, declared valuations and the latest available prices.`}
        actions={
          app.canWrite ? (
            <Button asChild variant="secondary">
              <Link href="/transactions/new">
                <Plus aria-hidden /> Record transaction
              </Link>
            </Button>
          ) : null
        }
      />

      {!data.totals.complete ? (
        <Alert tone="warning" title="Some values could not be converted or priced" className="mb-6">
          Totals exclude items with missing FX rates or prices rather than guessing. See Data quality below.
        </Alert>
      ) : null}

      <Card className="mb-6">
        <CardContent className="pt-5">
          <dl className="grid gap-6 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
            <Stat size="lg" label="Net worth" value={formatMoney(data.totals.netWorth, ccy, { decimals: 0 })} sub={<>Assets {formatMoney(data.totals.assets, ccy, { compact: true })} · Liabilities {formatMoney(data.totals.liabilities, ccy, { compact: true })}</>} />
            <Stat label="Invested" value={formatMoney(data.totals.invested, ccy, { decimals: 0 })} sub="Market value in investment accounts" />
            <Stat label="Cash" value={formatMoney(data.totals.cash, ccy, { decimals: 0 })} sub="Across all ledger accounts" />
            <Stat label="Unrealised gain" value={<Delta value={data.totals.unrealized} currency={ccy} decimals={0} />} sub={<>Realised to date <Delta value={data.totals.realized} currency={ccy} decimals={0} /></>} help="Market value minus cost basis, in the display currency at acquisition-date FX (includes currency effects)." />
          </dl>
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Net worth over time</CardTitle>
              <CardDescription>Month-end values. The gap between the lines is growth and income, not new money. Point at the chart to read any month.</CardDescription>
            </div>
          </CardHeader>
          <CardContent>{nwChange.length ? <NetWorthChart data={data.history} currency={ccy} /> : <p className="text-sm text-text-3">History appears after your first month of records.</p>}</CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-wrap">
            <div>
              <CardTitle>Investment performance</CardTitle>
              <CardDescription>Investment accounts · {perf ? `${formatDate(perf.start)} – ${formatDate(perf.end)}` : "no period yet"}</CardDescription>
            </div>
            <PeriodTabs current={period} basePath="/dashboard" />
          </CardHeader>
          <CardContent>
            {perf ? (
              <>
                <dl className="grid grid-cols-2 gap-5">
                  <Stat label="Time-weighted return" value={perf.twr === null ? "—" : <Delta value={perf.twr} percent />} sub={perf.twrAnnualized ? <>Annualised {formatPercent(perf.twrAnnualized, { signed: true, decimals: 2 })}</> : "Not annualised (< 1 year)"} help="Measures how the investments performed, removing the effect of when you added or withdrew money." />
                  <Stat label="Money-weighted (XIRR)" value={perf.xirr === null ? "—" : formatPercent(perf.xirr, { signed: true, decimals: 2 })} sub="Annual rate, your cash-flow timing" help="The annualised internal rate of return of your actual contributions, withdrawals and ending value." />
                </dl>
                <table className="mt-5 w-full text-[13px]">
                  <caption className="sr-only">Change in investment value</caption>
                  <tbody className="[&_td]:py-1.5 [&_th]:py-1.5">
                    <tr>
                      <th className="text-left font-normal text-text-2">Starting value</th>
                      <td className="num text-right">{formatMoney(perf.startValue, ccy, { decimals: 0 })}</td>
                    </tr>
                    <tr>
                      <th className="text-left font-normal text-text-2">Net contributions</th>
                      <td className="text-right">
                        <Delta value={perf.netContributions} currency={ccy} className="text-text" />
                      </td>
                    </tr>
                    <tr className="border-t border-border">
                      <th className="text-left font-medium">Investment gain</th>
                      <td className="text-right font-medium">
                        <Delta value={perf.investmentGain} currency={ccy} />
                      </td>
                    </tr>
                    <tr>
                      <th className="pl-3 text-left font-normal text-text-3">of which income received</th>
                      <td className="num text-right text-text-2">{formatMoney(perf.incomeGross, ccy, { decimals: 0 })}</td>
                    </tr>
                    <tr>
                      <th className="pl-3 text-left font-normal text-text-3">of which currency movements</th>
                      <td className="text-right text-text-2">{perf.fxEffect === null ? "—" : <Delta value={perf.fxEffect} currency={ccy} className="text-text-2" />}</td>
                    </tr>
                    <tr>
                      <th className="pl-3 text-left font-normal text-text-3">fees and withholding tax paid</th>
                      <td className="num text-right text-text-2">{formatMoney(String(-(Number(perf.fees) + Number(perf.withholdingTax))), ccy, { decimals: 0 })}</td>
                    </tr>
                    <tr className="border-t border-border">
                      <th className="text-left font-medium">Ending value</th>
                      <td className="num text-right font-medium">{formatMoney(perf.endValue, ccy, { decimals: 0 })}</td>
                    </tr>
                  </tbody>
                </table>
                {!perf.complete ? <p className="mt-3 text-[13px] text-warning">Returns are not shown because some prices or FX rates are missing for this period.</p> : null}
                <p className="mt-4 text-[12px] leading-relaxed text-text-3">{DISCLOSURES.past_performance}</p>
              </>
            ) : (
              <p className="text-sm text-text-3">Record investment transactions to see performance.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Asset allocation</CardTitle>
          </CardHeader>
          <CardContent>
            <AllocationBars slices={data.allocation.assetClass} currency={ccy} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Currency exposure</CardTitle>
          </CardHeader>
          <CardContent>
            <AllocationBars slices={data.allocation.currency} currency={ccy} />
            {data.concentration ? (
              <p className="mt-4 text-[13px] text-text-2">
                Largest holding: <span className="text-text">{data.concentration.largestName}</span> at <span className="num">{formatPercent(data.concentration.largestWeight)}</span> of investments.
              </p>
            ) : null}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Geography</CardTitle>
          </CardHeader>
          <CardContent>
            <AllocationBars slices={data.allocation.geography} currency={ccy} />
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Recent transactions</CardTitle>
            <Link href="/transactions" className="text-[13px] font-medium text-accent hover:underline">
              View all
            </Link>
          </CardHeader>
          <CardContent>
            <ul className="divide-y divide-border">
              {data.recent.map((t) => (
                <li key={t.id} className="flex items-center gap-3.5 py-3 text-[13px]">
                  <KindIcon event={t.type} />
                  <div className="min-w-0 flex-1">
                    <p className={t.reversed ? "text-text-3 line-through" : "font-medium"}>
                      {t.label}
                      {t.description ? <span className="font-normal text-text-2"> · {t.description}</span> : null}
                    </p>
                    <p className="text-text-3">{t.accountName}</p>
                  </div>
                  <span className="num shrink-0 text-text-3">{formatDate(t.date)}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Upcoming maturities</CardTitle>
            </CardHeader>
            <CardContent>
              {data.maturities.length ? (
                <ul className="flex flex-col gap-3 text-[13px]">
                  {data.maturities.map((m) => (
                    <li key={`${m.instrumentId}-${m.accountName}`} className="flex gap-3">
                      <CalendarClock className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden />
                      <div>
                        <p className="font-medium">{m.name}</p>
                        <p className="text-text-2">
                          {formatDate(m.maturityDate)} · {m.daysToGo >= 0 ? `in ${m.daysToGo} days` : `${-m.daysToGo} days ago`}
                          {m.faceValue ? ` · ${formatMoney(m.faceValue, m.currency, { decimals: 0 })} face` : ""}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-text-3">No fixed-income maturities ahead.</p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Data quality</CardTitle>
            </CardHeader>
            <CardContent>
              <DataIssues issues={data.issues} freshness={data.freshness} />
            </CardContent>
          </Card>
        </div>
      </div>
      <p className="mt-8 text-[12px] leading-relaxed text-text-3">
        {DISCLOSURES.not_advice} {DISCLOSURES.data_freshness}
      </p>
    </>
  );
}
