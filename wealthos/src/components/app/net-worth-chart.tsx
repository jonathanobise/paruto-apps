"use client";
import { useId, useMemo, useState } from "react";
import { Area, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatDate, formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import { DeltaPill } from "@/components/ui/money";
import { CURSOR, GRID, Legend, SERIES, TableToggle, Wash, activeDot, endDot, timeAxis, useChartMotion, valueAxis } from "@/components/charts/kit";

export interface HistoryPoint {
  date: string;
  netWorth: number | null;
  contributions: number | null;
}

const RANGES = [
  { key: "6M", months: 6 },
  { key: "1Y", months: 12 },
  { key: "3Y", months: 36 },
  { key: "All", months: Infinity },
] as const;
type RangeKey = (typeof RANGES)[number]["key"];

const monthsBetween = (a: string, b: string) => (Number(b.slice(0, 4)) - Number(a.slice(0, 4))) * 12 + Number(b.slice(5, 7)) - Number(a.slice(5, 7));

/**
 * Net worth over time against cumulative net contributions (money paid in minus money taken out).
 * The gap between the two lines is growth, not savings. One value axis, in the display currency.
 *
 * The Stocks pattern: the headline figure above the chart follows the pointer (value, date and the
 * change since the start of the range), so reading a month needs no tooltip; ranges switch in place.
 */
export function NetWorthChart({ data, currency, className }: { data: HistoryPoint[]; currency: string; className?: string }) {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const anim = useChartMotion();
  const span = data.length > 1 ? monthsBetween(data[0]!.date, data[data.length - 1]!.date) : 0;
  const ranges = RANGES.filter((r) => r.months === Infinity || span > r.months);
  const [range, setRange] = useState<RangeKey>("All");
  const [active, setActive] = useState<number | null>(null);

  const shown = useMemo(() => {
    const r = RANGES.find((x) => x.key === range)!;
    if (r.months === Infinity || !data.length) return data;
    const end = data[data.length - 1]!.date;
    return data.filter((p) => monthsBetween(p.date, end) <= r.months);
  }, [data, range]);

  const values = shown.flatMap((p) => [p.netWorth, p.contributions]).filter((v): v is number => v !== null);
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const pad = (hi - lo || Math.abs(hi) || 1) * 0.12;
  const domain = [Math.max(0, lo - pad), hi + pad * 0.6];

  const last = shown.length - 1;
  const at = shown[active ?? last];
  const first = shown.find((p) => p.netWorth !== null);
  const change = at?.netWorth !== null && at?.netWorth !== undefined && first?.netWorth ? at.netWorth - first.netWorth : null;
  const pct = change !== null && first?.netWorth ? change / first.netWorth : null;
  const money = (v: number | null | undefined) => (v === null || v === undefined ? "—" : formatMoney(String(v), currency, { decimals: 0 }));

  return (
    <div className={className}>
      {/* The headline follows the pointer. */}
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div aria-live="polite" className="min-w-0">
          <p className="figure text-[34px] leading-none text-text sm:text-[40px]">{at?.netWorth === null || at?.netWorth === undefined ? "Incomplete" : money(at.netWorth)}</p>
          <p className="mt-2.5 flex flex-wrap items-center gap-2 text-[13px] text-text-3">
            {change !== null ? <DeltaPill amount={String(Math.round(change))} percent={pct === null ? null : pct} currency={currency} size="sm" /> : null}
            <span>
              {active === null ? "since" : "from"} {formatDate(first?.date)}
              {active !== null ? <> to {formatDate(at?.date)}</> : null}
            </span>
          </p>
        </div>
        {ranges.length > 1 ? (
          <div role="radiogroup" aria-label="Range" className="vio-seg w-auto" style={{ "--n": ranges.length, "--i": ranges.findIndex((r) => r.key === range) } as React.CSSProperties}>
            <span aria-hidden className="vio-seg-thumb" />
            {ranges.map((r) => (
              <button key={r.key} type="button" role="radio" aria-checked={range === r.key} data-no-ink onClick={() => setRange(r.key)} className="num !h-8 min-w-11 px-3 text-[12px] font-semibold">
                {r.key}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <div className="mt-4">
        <Legend
          items={[
            { label: "Net worth", color: SERIES[0] },
            { label: "Net contributions", color: SERIES[1], value: money(at?.contributions) },
          ]}
        />
      </div>

      <div className={cn("mt-3 h-64 w-full sm:h-72")} role="img" aria-label={`Net worth history from ${formatDate(shown[0]?.date)} to ${formatDate(shown[last]?.date)}`}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={shown}
            margin={{ top: 12, right: 0, bottom: 0, left: 0 }}
            onMouseMove={(s) => setActive(typeof s?.activeTooltipIndex === "number" ? s.activeTooltipIndex : s?.activeTooltipIndex != null ? Number(s.activeTooltipIndex) : null)}
            onMouseLeave={() => setActive(null)}
          >
            <defs>
              <Wash id={`nw-${id}`} />
            </defs>
            <CartesianGrid {...GRID} />
            <XAxis dataKey="date" {...timeAxis} tickFormatter={(d: string) => formatDate(d, "short").replace(/^\d+ /, "")} />
            <YAxis {...valueAxis} domain={domain} tickFormatter={(v: number) => formatMoney(String(v), currency, { compact: true })} />
            {/* The headline carries the values; the tooltip is only the scrub line. */}
            <Tooltip cursor={CURSOR} content={() => null} />
            <Line type="stepAfter" dataKey="contributions" stroke={SERIES[1]} strokeWidth={1.75} strokeOpacity={0.9} dot={false} activeDot={activeDot(SERIES[1])} {...anim} />
            <Area type="monotone" dataKey="netWorth" className="vio-glow" stroke={SERIES[0]} strokeWidth={2.25} fill={`url(#nw-${id})`} connectNulls={false} dot={endDot(SERIES[0], last)} activeDot={activeDot(SERIES[0])} {...anim} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <TableToggle>
        <table className="w-full text-left">
          <thead className="sticky top-0 bg-surface-2">
            <tr>
              <th className="px-3 py-2">Date</th>
              <th className="px-3 py-2 text-right">Net worth</th>
              <th className="px-3 py-2 text-right">Net contributions</th>
            </tr>
          </thead>
          <tbody>
            {[...data].reverse().map((r) => (
              <tr key={r.date} className="border-t border-border">
                <td className="px-3 py-1.5">{formatDate(r.date)}</td>
                <td className="num px-3 py-1.5 text-right">{r.netWorth === null ? "Incomplete" : money(r.netWorth)}</td>
                <td className="num px-3 py-1.5 text-right">{money(r.contributions)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableToggle>
    </div>
  );
}
