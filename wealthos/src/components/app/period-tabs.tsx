import Link from "next/link";
import { cn } from "@/lib/utils";

const PERIODS = ["1M", "3M", "6M", "YTD", "1Y", "3Y", "ALL"] as const;

export function PeriodTabs({ current, basePath }: { current: string; basePath: string }) {
  return (
    <nav aria-label="Period" className="glass inline-flex rounded-full p-1">
      {PERIODS.map((p) => (
        <Link
          key={p}
          href={`${basePath}?period=${p}`}
          aria-current={p === current ? "true" : undefined}
          className={cn("num spring rounded-full px-3 py-1 text-[12px] font-medium", p === current ? "bg-brand text-brand-ink shadow-sm" : "text-text-2 hover:text-text")}
          scroll={false}
        >
          {p}
        </Link>
      ))}
    </nav>
  );
}
