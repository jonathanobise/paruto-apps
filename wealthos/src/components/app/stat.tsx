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
      <dd className={cn("num mt-1 truncate font-semibold tracking-tight text-text", size === "lg" ? "font-display text-[34px] leading-none sm:text-[40px]" : "text-[22px]")}>{value}</dd>
      {sub ? <dd className="mt-1 text-[13px] text-text-2">{sub}</dd> : null}
    </div>
  );
}
