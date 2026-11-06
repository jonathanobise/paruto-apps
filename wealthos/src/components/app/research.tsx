import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatPercent } from "@/lib/format";
import { RATE_METHODOLOGIES, type RateMethodology } from "@/engine";
import type { DataStatus, RateView } from "@/server/research/catalogue";

export function StatusBadge({ status, observedOn }: { status: DataStatus; observedOn?: string | null }) {
  if (status === "no_data") return <Badge>No data</Badge>;
  if (status === "stale") return <Badge tone="warning" title={observedOn ? `Last observation ${formatDate(observedOn)}` : undefined}>Stale</Badge>;
  return <Badge tone="accent">Current</Badge>;
}

export function VerificationBadge({ state }: { state: string }) {
  if (state === "verified") return <Badge tone="accent">Verified</Badge>;
  if (state === "synthetic") return <Badge tone="demo">Sample</Badge>;
  if (state === "user_provided") return <Badge>Yours</Badge>;
  return <Badge tone="warning">Unverified</Badge>;
}

export function methodologyLabel(m: RateMethodology): string {
  return RATE_METHODOLOGIES[m];
}

/** A rate always shows its methodology, tenor and as-of date next to the number. */
export function RateLine({ r }: { r: RateView }) {
  return (
    <span className="inline-flex flex-wrap items-baseline gap-x-1.5">
      <span className="num font-medium text-text">{formatPercent(r.value, { decimals: 2 })}</span>
      <span className="text-text-3">
        {methodologyLabel(r.methodology)}
        {r.tenorDays ? ` · ${r.tenorDays}d` : ""} · {formatDate(r.asOf)}
      </span>
    </span>
  );
}

const RESEARCH_TABS = [
  { href: "/research", label: "Markets" },
  { href: "/research/screener", label: "Screener" },
  { href: "/research/compare", label: "Compare" },
  { href: "/research/backtest", label: "Backtest" },
  { href: "/research/macro", label: "Macro" },
  { href: "/research/fixed-income", label: "Fixed income" },
];

/** Segmented control between the research pages (a floating control, so Liquid Glass). */
export function ResearchTabs({ current }: { current: string }) {
  return (
    <nav aria-label="Research" className="glass mb-6 inline-flex max-w-full overflow-x-auto rounded-full p-1 [scrollbar-width:none]">
      {RESEARCH_TABS.map((t) => (
        <Link key={t.href} href={t.href} aria-current={t.href === current ? "page" : undefined} className={`spring shrink-0 whitespace-nowrap rounded-full px-3.5 py-1.5 text-[13px] font-medium ${t.href === current ? "bg-brand text-brand-ink shadow-sm" : "text-text-2 hover:text-text"}`}>
          {t.label}
        </Link>
      ))}
    </nav>
  );
}

/** Attribution for every source whose data appears on a page (required by each source's terms). */
export function SourceNotes({ sources }: { sources: Array<{ name: string; url: string | null; license: string }> }) {
  if (!sources.length) return null;
  return (
    <section aria-label="Sources" className="mt-8 border-t border-border pt-4 text-[12px] text-text-3">
      <h2 className="mb-2 font-semibold uppercase tracking-[0.08em]">Sources</h2>
      <ul className="flex flex-col gap-1.5">
        {sources.map((s) => (
          <li key={s.name}>
            {s.url ? <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-text-2 hover:text-accent">{s.name}</a> : <span className="text-text-2">{s.name}</span>}. {s.license}
          </li>
        ))}
      </ul>
    </section>
  );
}
