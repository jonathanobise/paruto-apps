import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Stat({ label, value, sub, help, className, size = "md" }: { label: string; value: ReactNode; sub?: ReactNode; help?: string; className?: string; size?: "md" | "lg" }) {
  return (
    <div className={cn("min-w-0", className)}>
      <dt className="flex items-center gap-1 text-[13px] text-text-3">
        {label}
        {help ? (
          <span className="cursor-help text-text-3" title={help} aria-label={help}>
            ⓘ
          </span>
        ) : null}
      </dt>
      {/* Editorial figure: the display face, tight and tabular, so the number leads the panel. */}
      <dd className={cn("figure mt-2 truncate text-text", size === "lg" ? "text-[38px] sm:text-[46px]" : "text-[28px]")}>{value}</dd>
      {sub ? <dd className="mt-2 text-[13px] leading-snug text-text-3">{sub}</dd> : null}
    </div>
  );
}
