import { cn } from "@/lib/utils";
import { formatMoney, formatPercent, sign } from "@/lib/format";

/** Signed amount. Direction is shown with a +/− sign and colour, never colour alone. */
export function Delta({ value, currency, percent, className, decimals }: { value: string | null; currency?: string; percent?: boolean; className?: string; decimals?: number }) {
  if (value === null) return <span className={cn("text-text-3", className)}>—</span>;
  const s = sign(value);
  const text = percent ? formatPercent(value, { signed: true, decimals: 2 }) : formatMoney(value, currency ?? "NGN", { signed: true, ...(decimals === undefined ? {} : { decimals }) });
  return <span className={cn("num whitespace-nowrap", s > 0 ? "text-positive" : s < 0 ? "text-negative" : "text-text-2", className)}>{text}</span>;
}

/**
 * A change, as a soft capsule: an arrow, the signed amount and/or percentage. Direction is carried
 * by the arrow and the sign as well as the colour.
 */
export function DeltaPill({ amount, percent, currency, className, size = "md", tone = "auto", suffix }: { amount?: string | null; percent?: string | number | null; currency?: string; className?: string; size?: "sm" | "md"; tone?: "auto" | "neutral"; suffix?: string }) {
  const ref = amount ?? (percent === null || percent === undefined ? null : String(percent));
  if (ref === null) return null;
  const s = sign(ref);
  const parts = [
    amount !== undefined && amount !== null ? formatMoney(amount, currency ?? "NGN", { signed: true, decimals: 0 }) : null,
    percent !== undefined && percent !== null ? formatPercent(percent, { signed: true, decimals: 2 }) : null,
  ].filter(Boolean);
  return (
    <span
      className={cn(
        "num inline-flex items-center gap-1 whitespace-nowrap rounded-full font-semibold",
        size === "sm" ? "px-2 py-0.5 text-[11.5px]" : "px-2.5 py-1 text-[13px]",
        tone === "neutral" ? "bg-text/[0.06] text-text-2" : s > 0 ? "bg-[color-mix(in_srgb,var(--positive)_14%,transparent)] text-positive" : s < 0 ? "bg-[color-mix(in_srgb,var(--negative)_14%,transparent)] text-negative" : "bg-text/5 text-text-2",
        className,
      )}
    >
      <svg viewBox="0 0 10 10" aria-hidden className={cn("size-2.5 shrink-0", s < 0 && "rotate-180", s === 0 && "hidden")}>
        <path d="M5 1.5 9 7.5H1z" fill="currentColor" />
      </svg>
      {parts.join(" · ")}
      {suffix ? <span className="font-medium opacity-80">{suffix}</span> : null}
    </span>
  );
}
