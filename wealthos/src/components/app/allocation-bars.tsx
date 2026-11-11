import { formatMoney, formatPercent } from "@/lib/format";
import type { Slice } from "@/server/analytics/portfolio";

/**
 * Ranked horizontal bars (one series, one hue). Values and labels are always written out; the bar
 * is a soft violet gradient on a sunk track, scaled to the largest slice.
 */
export function AllocationBars({ slices, currency, empty = "Nothing to show yet." }: { slices: Slice[]; currency: string; empty?: string }) {
  if (!slices.length) return <p className="text-sm text-text-3">{empty}</p>;
  const max = Math.max(...slices.map((s) => Number(s.weight)), 0.0001);
  return (
    <ul className="flex flex-col gap-3.5">
      {slices.map((s) => (
        <li key={s.key} className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-3 gap-y-1.5">
          <span className="truncate text-[13px] text-text">{s.label}</span>
          <span className="num text-[13px] text-text-3">
            <span className="font-semibold text-text">{formatPercent(s.weight)}</span> · {formatMoney(s.value, currency, { compact: true })}
          </span>
          <span className="col-span-2 h-[7px] overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--text)_6%,transparent)] shadow-[inset_0_1px_1px_rgb(0_0_0/0.25)]" aria-hidden>
            <span
              className="block h-full rounded-full bg-[linear-gradient(90deg,color-mix(in_srgb,var(--series-1)_70%,transparent),var(--series-1))] shadow-[0_0_12px_-2px_var(--series-1)]"
              style={{ width: `${Math.max(Number(s.weight) > 0 ? 2 : 0, (Number(s.weight) / max) * 100)}%` }}
            />
          </span>
        </li>
      ))}
    </ul>
  );
}
