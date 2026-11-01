import { cn } from "@/lib/utils";
import { formatMoney, formatPercent, sign } from "@/lib/format";

/** Signed amount. Direction is shown with a +/− sign and colour, never colour alone. */
export function Delta({ value, currency, percent, className }: { value: string | null; currency?: string; percent?: boolean; className?: string }) {
  if (value === null) return <span className={cn("text-text-3", className)}>—</span>;
  const s = sign(value);
  const text = percent ? formatPercent(value, { signed: true, decimals: 2 }) : formatMoney(value, currency ?? "NGN", { signed: true });
  return <span className={cn("num whitespace-nowrap", s > 0 ? "text-positive" : s < 0 ? "text-negative" : "text-text-2", className)}>{text}</span>;
}
