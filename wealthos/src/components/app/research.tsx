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
