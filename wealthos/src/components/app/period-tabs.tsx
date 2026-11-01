import Link from "next/link";
import { cn } from "@/lib/utils";

const PERIODS = ["1M", "3M", "6M", "YTD", "1Y", "3Y", "ALL"] as const;

export function PeriodTabs({ current, basePath }: { current: string; basePath: string }) {
  return (
    <nav aria-label="Period" className="inline-flex rounded-lg border border-border bg-surface-2 p-0.5">
      {PERIODS.map((p) => (
        <Link
          key={p}
          href={`${basePath}?period=${p}`}
          aria-current={p === current ? "true" : undefined}
          className={cn("num rounded-md px-2.5 py-1 text-[12px] font-medium transition-colors", p === current ? "bg-surface text-text shadow-sm" : "text-text-3 hover:text-text")}
          scroll={false}
        >
          {p}
        </Link>
      ))}
    </nav>
  );
}
