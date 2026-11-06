import { AlertTriangle, CircleCheck, FlaskConical } from "lucide-react";
import type { DashboardData } from "@/server/analytics/portfolio";
import { formatDate } from "@/lib/format";

export function DataIssues({ issues, freshness }: { issues: DashboardData["issues"]; freshness: DashboardData["freshness"] }) {
  const serious = issues.filter((i) => ["MISSING_FX", "MISSING_PRICE", "VALUED_AT_COST", "STALE_PRICE", "STALE_FX", "MATURED_NOT_REDEEMED"].includes(i.code));
  const info = issues.filter((i) => !serious.includes(i) && i.code !== "SYNTHETIC_DATA");
  return (
    <div className="flex flex-col gap-3 text-[13px]">
      <p className="text-text-2">
        Latest price: <span className="num text-text">{formatDate(freshness.latestPriceDate)}</span>
        {freshness.oldestPriceDate && freshness.oldestPriceDate !== freshness.latestPriceDate ? (
          <>
            {" "}· oldest in use: <span className="num text-text">{formatDate(freshness.oldestPriceDate)}</span>
          </>
        ) : null}
      </p>
      {freshness.syntheticData ? (
        <p className="flex gap-2 text-demo">
          <FlaskConical className="mt-0.5 size-4 shrink-0" aria-hidden /> Some prices or FX rates are SAMPLE data, not market data.
        </p>
      ) : null}
      {serious.length === 0 && info.length === 0 ? (
        <p className="flex items-center gap-2 text-text-2">
          <CircleCheck className="size-4 text-positive" aria-hidden /> All holdings valued with current data.
        </p>
      ) : null}
      {serious.length ? (
        <ul className="flex flex-col gap-2">
          {serious.slice(0, 6).map((i, n) => (
            <li key={n} className="flex gap-2">
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden />
              <span>
                <span className="font-medium text-text">{i.label}:</span> <span className="text-text-2">{i.message}</span>
              </span>
            </li>
          ))}
          {serious.length > 6 ? <li className="text-text-3">+{serious.length - 6} more</li> : null}
        </ul>
      ) : null}
      {info.length ? (
        <details>
          <summary className="cursor-pointer text-text-3 hover:text-text">{info.length} valuation note{info.length > 1 ? "s" : ""}</summary>
          <ul className="mt-2 flex flex-col gap-1.5 text-text-2">
            {info.map((i, n) => (
              <li key={n}>
                <span className="font-medium text-text">{i.label}:</span> {i.message}
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </div>
  );
}
