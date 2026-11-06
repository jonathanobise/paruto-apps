import Link from "next/link";
import { Star, Trash2 } from "lucide-react";
import { requireApp } from "@/server/auth/context";
import { listComparisons, listWatchlists } from "@/server/research/watchlists";
import { instrumentsByIds, searchCatalogue } from "@/server/research/catalogue";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { RateLine, StatusBadge } from "@/components/app/research";
import { formatDate, formatMoney } from "@/lib/format";
import { deleteComparisonAction, unwatchAction } from "../explore/actions";

export const metadata = { title: "Watchlists" };

export default async function WatchlistsPage() {
  const app = await requireApp();
  const [lists, comparisons, catalogue] = await Promise.all([listWatchlists(app.ctx), listComparisons(app.ctx), searchCatalogue(app.ctx, {})]);
  const named = await instrumentsByIds(app.ctx, comparisons.flatMap((c) => c.instrumentIds));
  const info = (id: string) => catalogue.find((c) => c.id === id);
  return (
    <>
      <PageHeader title="Watchlists" description="Products you're keeping an eye on, and comparisons you've saved." actions={<Button asChild variant="secondary"><Link href="/explore">Browse the explorer</Link></Button>} />
      {lists.every((l) => l.items.length === 0) ? (
        <EmptyState icon={<Star />} title="Nothing on your watchlist yet">Open any product in the explorer and choose Watch.</EmptyState>
      ) : (
        lists.filter((l) => l.items.length).map((l) => (
          <Card key={l.id} className="mb-6 overflow-hidden">
            <h2 className="px-5 pt-4 text-[15px] font-semibold">{l.name}</h2>
            <div className="mt-2 overflow-x-auto">
              <table className="w-full min-w-[720px] text-[13px]">
                <tbody>
                  {l.items.map((i) => {
                    const c = info(i.instrumentId);
                    return (
                      <tr key={i.instrumentId} className="border-t border-border align-top">
                        <td className="px-5 py-3"><Link href={`/explore/${i.instrumentId}`} className="font-medium hover:text-accent">{i.name}</Link><p className="text-text-3">{i.symbol} · added {formatDate(i.createdAt.toISOString())}</p></td>
                        <td className="num px-4 py-3 text-right">{c?.latestPrice ? <>{formatMoney(c.latestPrice.price, i.currency, { decimals: 4 })}<p className="text-[11px] text-text-3">{formatDate(c.latestPrice.observedOn)}</p></> : "—"}</td>
                        <td className="px-4 py-3">{c?.rates[0] ? <RateLine r={c.rates[0]} /> : null}</td>
                        <td className="px-4 py-3">{c ? <StatusBadge status={c.priceStatus} /> : null}</td>
                        <td className="px-4 py-3 text-right">
                          {app.canWrite ? (
                            <form action={unwatchAction}>
                              <input type="hidden" name="watchlistId" value={l.id} />
                              <input type="hidden" name="instrumentId" value={i.instrumentId} />
                              <button className="text-text-3 hover:text-negative" aria-label={`Remove ${i.name}`}><Trash2 className="size-4" /></button>
                            </form>
                          ) : null}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        ))
      )}
      <Card>
        <CardHeader><CardTitle>Saved comparisons</CardTitle></CardHeader>
        <CardContent>
          {comparisons.length ? (
            <ul className="divide-y divide-border text-[13px]">
              {comparisons.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-3 py-2.5">
                  <Link href={`/explore/compare?ids=${c.instrumentIds.join(",")}`} className="hover:text-accent">
                    <span className="font-medium">{c.name}</span>
                    <span className="block text-text-3">{c.instrumentIds.map((id) => named.find((n) => n.id === id)?.symbol ?? named.find((n) => n.id === id)?.name ?? "—").join(" vs ")}{c.note ? ` · ${c.note}` : ""}</span>
                  </Link>
                  {app.canWrite ? (
                    <form action={deleteComparisonAction}>
                      <input type="hidden" name="id" value={c.id} />
                      <button className="text-text-3 hover:text-negative" aria-label={`Delete ${c.name}`}><Trash2 className="size-4" /></button>
                    </form>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : <p className="text-sm text-text-3">Save a comparison from the Compare page to come back to it.</p>}
        </CardContent>
      </Card>
    </>
  );
}
