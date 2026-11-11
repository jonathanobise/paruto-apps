import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { MarketSnapshot, SnapshotTile } from "@/server/research/snapshot";
import { Sparkline } from "@/components/app/sparkline";
import { DeltaPill } from "@/components/ui/money";
import { formatDate, formatMoney, formatPercent, sign } from "@/lib/format";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const monthName = (iso: string) => `${MONTHS[Number(iso.slice(5, 7)) - 1]} ${iso.slice(0, 4)}`;
const asOfText = (t: SnapshotTile) => (!t.asOf ? "No data yet" : t.asOfKind === "month" ? monthName(t.asOf) : formatDate(t.asOf));

export const tileValue = (t: SnapshotTile, compact = false) =>
  t.value === null ? "—" : t.unit === "naira" ? formatMoney(t.value, "NGN", { decimals: compact ? 0 : 2 }) : formatPercent(t.value, { decimals: compact ? 1 : 2 });

/**
 * "Markets today" on the dashboard: the official figures that move a Nigerian portfolio, each with
 * its date and source, a two-year trend and the change over a year. Exchange-rate changes are shown
 * neutrally with words ("naira weaker"), since whether that is good depends on the person.
 */
export function MarketBand({ snapshot }: { snapshot: MarketSnapshot }) {
  if (!snapshot.tiles.length) {
    return snapshot.missing.length ? (
      <p className="mb-6 rounded-[18px] border border-dashed border-border px-4 py-3 text-[13px] text-text-3">Market figures couldn&apos;t be loaded just now ({snapshot.missing.join(", ")}). Your portfolio figures below are unaffected.</p>
    ) : null;
  }
  return (
    <section aria-labelledby="markets-today" className="mb-6">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 id="markets-today" className="kicker">
            Markets today
          </h2>
          <p className="mt-1 text-[12.5px] text-text-3">{snapshot.tiles.some((t) => t.key === "NG.GB10Y") ? "Official figures and the bond market" : "Official figures"}, each with its date. {snapshot.missing.length ? `Not loaded: ${snapshot.missing.join(", ")}.` : null}</p>
        </div>
        <Link href="/research/macro" className="inline-flex items-center gap-1 text-[13px] font-medium text-accent hover:underline">
          Economic backdrop <ArrowRight className="size-3.5" aria-hidden />
        </Link>
      </div>
      <ul className="grid grid-cols-2 gap-3 md:grid-cols-4 2xl:grid-cols-8">
        {snapshot.tiles.map((t) => (
          <li key={t.key}>
            <Link
              href={t.href}
              title={[t.note, t.source ? `Source: ${t.source}` : null].filter(Boolean).join(" ")}
              className="group flex h-full flex-col rounded-[20px] border border-border bg-surface bg-[linear-gradient(180deg,rgb(255_255_255/0.028),transparent_45%)] p-4 shadow-[var(--shadow)] transition-[border-color,translate] duration-300 hover:-translate-y-0.5 hover:border-border-strong"
            >
              <span className="truncate text-[12px] font-medium text-text-3">{t.label}</span>
              <span className="figure mt-2 text-[22px] text-text">{tileValue(t)}</span>
              <span className="mt-2 flex min-h-5 flex-wrap items-center gap-1.5 text-[11.5px] text-text-3">
                {t.unit === "naira" && t.change1y ? (
                  <>
                    <DeltaPill percent={t.change1y} size="sm" tone="neutral" />
                    <span>{sign(t.change1y) > 0 ? "naira weaker" : sign(t.change1y) < 0 ? "naira stronger" : "unchanged"} in a year</span>
                  </>
                ) : t.yearAgo ? (
                  <span>
                    from <span className="num text-text-2">{formatPercent(t.yearAgo, { decimals: 2 })}</span> a year earlier
                  </span>
                ) : null}
              </span>
              <span className="mt-auto pt-3">
                <Sparkline fluid width={180} height={30} values={t.trend} />
              </span>
              <span className="mt-1.5 text-[11px] text-text-3">{asOfText(t)}</span>
            </Link>
          </li>
        ))}
      </ul>
      {snapshot.sources.length ? <p className="mt-2.5 text-[11.5px] leading-relaxed text-text-3">Sources: {snapshot.sources.map((s) => s.name).join(" · ")}. Past movements are not a guide to future ones.</p> : null}
    </section>
  );
}

/** One line for the top bar: the dollar rate, inflation and the policy rate. */
export function MarketTicker({ snapshot }: { snapshot: MarketSnapshot }) {
  const pick = ["USD/NGN", "NG.CPI_YOY", "NG.MPR"].map((k) => snapshot.tiles.find((t) => t.key === k)).filter((t): t is SnapshotTile => Boolean(t && t.value));
  if (!pick.length) return null;
  const short: Record<string, string> = { "USD/NGN": "USD/NGN", "NG.CPI_YOY": "Inflation", "NG.MPR": "MPR" };
  return (
    <Link href="/research/macro" className="hidden items-center gap-3 rounded-full px-3 py-1.5 text-[12.5px] text-text-3 transition-colors hover:bg-text/5 hover:text-text-2 xl:flex" title="Official figures: CBN. Open the economic backdrop.">
      {pick.map((t, i) => (
        <span key={t.key} className="inline-flex items-center gap-1.5 whitespace-nowrap">
          {i ? <span aria-hidden className="mr-1.5 h-3 w-px bg-border-strong" /> : null}
          {short[t.key]}
          <span className="num font-semibold text-text">{tileValue(t, t.unit === "percent")}</span>
        </span>
      ))}
    </Link>
  );
}
