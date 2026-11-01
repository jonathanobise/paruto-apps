import Link from "next/link";
import { Layers } from "lucide-react";
import { requireApp } from "@/server/auth/context";
import { buildDashboard } from "@/server/analytics/portfolio";
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

export default async function HoldingsPage() {
  const app = await requireApp();
  const d = await buildDashboard(app.ctx, { baseCurrency: app.baseCurrency, period: "1M" });
  const ccy = d.baseCurrency;
  return (
    <>
      <PageHeader title="Holdings" description={`Positions rebuilt from your ledger with lot-level (FIFO) cost basis. Values in ${ccy} as of ${formatDate(d.asOf)}.`} />
      {d.holdings.length === 0 ? (
        <EmptyState icon={<Layers />} title="No holdings yet" action={<Button asChild><Link href="/transactions/new">Record a purchase</Link></Button>}>Record a purchase or an existing (opening) position.</EmptyState>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[960px] text-[13px]">
              <thead className="bg-surface-2 text-left text-text-3">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Instrument</th>
                  <th className="px-4 py-2.5 font-medium">Account</th>
                  <th className="px-4 py-2.5 text-right font-medium">Units</th>
                  <th className="px-4 py-2.5 text-right font-medium">Price</th>
                  <th className="px-4 py-2.5 text-right font-medium">Cost basis ({ccy})</th>
                  <th className="px-4 py-2.5 text-right font-medium">Value ({ccy})</th>
                  <th className="px-4 py-2.5 text-right font-medium">Unrealised</th>
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
                      <td className="num px-4 py-3 text-right">{formatPercent(h.weight)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
      <p className="mt-4 text-[12px] text-text-3">Cost basis in {ccy} uses the exchange rate on each purchase date, so unrealised gains include currency movements. “Accrued” T-bills are valued by straight-line accretion to face value at maturity when no market price is available.</p>
    </>
  );
}
