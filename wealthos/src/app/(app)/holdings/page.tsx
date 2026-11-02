import Link from "next/link";
import { Layers } from "lucide-react";
import { requireApp } from "@/server/auth/context";
import { buildDashboard, PERIODS, type PeriodKey } from "@/server/analytics/portfolio";
import { holdingsPerformance } from "@/server/analytics/performance";
import { PeriodTabs } from "@/components/app/period-tabs";
import { PageHeader } from "@/components/app/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Delta } from "@/components/ui/money";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { formatDate, formatMoney, formatNumber, formatPercent } from "@/lib/format";

export const metadata = { title: "Holdings · WealthOS" };

const METHOD: Record<string, { label: string; tone: "neutral" | "warning" | "accent" }> = {
  market: { label: "Market", tone: "neutral" },
  nav: { label: "NAV", tone: "neutral" },
  accrual: { label: "Accrued", tone: "accent" },
  cost: { label: "At cost", tone: "warning" },
  manual: { label: "Estimate", tone: "warning" },
  none: { label: "Unpriced", tone: "warning" },
};

export default async function HoldingsPage({ searchParams }: { searchParams: Promise<{ period?: string }> }) {
  const app = await requireApp();
  const sp = await searchParams;
  const period: PeriodKey = sp.period && sp.period in PERIODS ? (sp.period as PeriodKey) : "1Y";
  const [d, perf] = await Promise.all([buildDashboard(app.ctx, { baseCurrency: app.baseCurrency, period: "1M" }), holdingsPerformance(app.ctx, { baseCurrency: app.baseCurrency, period })]);
  const ccy = d.baseCurrency;
  const perfOf = (accountId: string, instrumentId: string) => perf.find((p) => p.key === `${accountId}|${instrumentId}`);
  const held = new Set(d.holdings.map((h) => `${h.accountId}|${h.instrumentId}`));
  const closed = perf.filter((p) => !held.has(p.key));
  return (
    <>
      <PageHeader title="Holdings" description={`Positions rebuilt from your ledger with lot-level (FIFO) cost basis. Values in ${ccy} as of ${formatDate(d.asOf)}.`} actions={<PeriodTabs current={period} basePath="/holdings" />} />
      {d.holdings.length === 0 ? (
        <EmptyState icon={<Layers />} title="No holdings yet" action={<Button asChild><Link href="/transactions/new">Record a purchase</Link></Button>}>Record a purchase or an existing (opening) position.</EmptyState>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1080px] text-[13px]">
              <thead className="bg-surface-2 text-left text-text-3">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Instrument</th>
                  <th className="px-4 py-2.5 font-medium">Account</th>
                  <th className="px-4 py-2.5 text-right font-medium">Units</th>
                  <th className="px-4 py-2.5 text-right font-medium">Price</th>
                  <th className="px-4 py-2.5 text-right font-medium">Cost basis ({ccy})</th>
                  <th className="px-4 py-2.5 text-right font-medium">Value ({ccy})</th>
                  <th className="px-4 py-2.5 text-right font-medium">Unrealised</th>
                  <th className="px-4 py-2.5 text-right font-medium">Return · {period}</th>
                  <th className="px-4 py-2.5 text-right font-medium">Weight</th>
                </tr>
              </thead>
              <tbody>
                {d.holdings.map((h) => {
                  const m = METHOD[h.method] ?? METHOD.none!;
                  const pct = h.unrealizedBase && h.costBase && Number(h.costBase) !== 0 ? String(Number(h.unrealizedBase) / Number(h.costBase)) : null;
                  return (
                    <tr key={`${h.accountId}-${h.instrumentId}`} className="border-t border-border align-top">
                      <td className="px-4 py-3">
                        <p className="font-medium">{h.symbol ?? h.name}</p>
                        <p className="text-text-3">{h.symbol ? h.name : h.assetClass}{h.maturityDate ? ` · matures ${formatDate(h.maturityDate)}` : ""}</p>
                      </td>
                      <td className="px-4 py-3 text-text-2">{h.accountName}</td>
                      <td className="num px-4 py-3 text-right">{formatNumber(h.quantity)}</td>
                      <td className="num px-4 py-3 text-right">
                        {h.price ? formatMoney(h.price, h.currency, { decimals: h.method === "accrual" ? 4 : 2 }) : "—"}
                        <div className="mt-1 flex justify-end gap-1">
                          <Badge tone={m.tone}>{m.label}</Badge>
                          {h.synthetic ? <Badge tone="demo">Sample</Badge> : null}
                        </div>
                        {h.priceDate ? <p className="mt-0.5 text-[11px] text-text-3">as of {formatDate(h.priceDate)}</p> : null}
                      </td>
                      <td className="num px-4 py-3 text-right">{formatMoney(h.costBase, ccy, { decimals: 0 })}</td>
                      <td className="num px-4 py-3 text-right font-medium">{formatMoney(h.marketValueBase, ccy, { decimals: 0 })}</td>
                      <td className="px-4 py-3 text-right">
                        <Delta value={h.unrealizedBase} currency={ccy} />
                        {pct ? <p><Delta value={pct} percent className="text-[12px]" /></p> : null}
                      </td>
                      <td className="px-4 py-3 text-right"><ReturnCell p={perfOf(h.accountId, h.instrumentId)} baseCurrency={ccy} /></td>
                      <td className="num px-4 py-3 text-right">{formatPercent(h.weight)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
      {closed.length ? (
        <Card className="mt-6 overflow-hidden">
          <h2 className="px-5 pt-4 text-[15px] font-semibold">Closed during this period</h2>
          <div className="mt-2 overflow-x-auto">
            <table className="w-full min-w-[640px] text-[13px]">
              <thead className="bg-surface-2 text-left text-text-3">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Instrument</th>
                  <th className="px-4 py-2.5 text-right font-medium">Money in</th>
                  <th className="px-4 py-2.5 text-right font-medium">Money out</th>
                  <th className="px-4 py-2.5 text-right font-medium">Gain ({ccy})</th>
                  <th className="px-4 py-2.5 text-right font-medium">Return</th>
                </tr>
              </thead>
              <tbody>
                {closed.map((p) => {
                  const r = p.base ?? p.local;
                  return (
                    <tr key={p.key} className="border-t border-border">
                      <td className="px-4 py-2.5 font-medium">{p.symbol ?? p.name}</td>
                      <td className="num px-4 py-2.5 text-right">{formatMoney(String(Number(r.startValue) + Number(r.invested)), r.currency, { decimals: 0 })}</td>
                      <td className="num px-4 py-2.5 text-right">{formatMoney(r.returned, r.currency, { decimals: 0 })}</td>
                      <td className="px-4 py-2.5 text-right"><Delta value={r.gain} currency={r.currency} /></td>
                      <td className="px-4 py-2.5 text-right"><ReturnCell p={p} baseCurrency={ccy} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      ) : null}
      <p className="mt-4 text-[12px] text-text-3">Cost basis in {ccy} uses the exchange rate on each purchase date, so unrealised gains include currency movements. “Accrued” T-bills are valued by straight-line accretion to face value at maturity when no market price is available. Return is time-weighted over the selected period (purchases and sales are money in and out, not gains); “ex-FX” is the same holding measured in its own currency. Periods under a year are not annualised.</p>
    </>
  );
}

function ReturnCell({ p, baseCurrency }: { p: Awaited<ReturnType<typeof holdingsPerformance>>[number] | undefined; baseCurrency: string }) {
  if (!p) return <span className="text-text-3">—</span>;
  const main = p.base ?? p.local;
  return (
    <div className="flex flex-col items-end gap-0.5">
      {main.twr !== null ? <Delta value={main.twr} percent /> : <span className="text-text-3">—</span>}
      {p.base && p.local.currency !== baseCurrency && p.local.twr !== null ? <span className="num text-[11px] text-text-3">ex-FX {formatPercent(p.local.twr, { signed: true, decimals: 2 })}</span> : null}
      {!p.base ? <span className="text-[11px] text-warning">in {p.local.currency} · FX missing</span> : null}
      {Number(p.incomeGross) > 0 ? <span className="num text-[11px] text-text-3">income {formatMoney(p.incomeGross, p.local.currency, { decimals: 0 })}</span> : null}
    </div>
  );
}

