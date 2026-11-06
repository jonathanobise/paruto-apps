import { formatMoney, formatPercent } from "@/lib/format";
import type { Slice } from "@/server/analytics/portfolio";

/** Ranked horizontal bars (one series, one colour). Values and labels are always written out. */
export function AllocationBars({ slices, currency, empty = "Nothing to show yet." }: { slices: Slice[]; currency: string; empty?: string }) {
  if (!slices.length) return <p className="text-sm text-text-3">{empty}</p>;
  const max = Math.max(...slices.map((s) => Number(s.weight)), 0.0001);
  return (
    <ul className="flex flex-col gap-3">
      {slices.map((s) => (
        <li key={s.key} className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-3 gap-y-1">
          <span className="truncate text-[13px] text-text">{s.label}</span>
          <span className="num text-[13px] text-text-2">
            <span className="font-medium text-text">{formatPercent(s.weight)}</span> · {formatMoney(s.value, currency, { compact: true })}
          </span>
          <span className="col-span-2 h-1.5 overflow-hidden rounded-full bg-surface-2" aria-hidden>
            <span className="block h-full rounded-full bg-[var(--series-1)]" style={{ width: `${Math.max(0, (Number(s.weight) / max) * 100)}%` }} />
          </span>
        </li>
      ))}
    </ul>
  );
}
