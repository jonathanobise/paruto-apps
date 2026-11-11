"use client";
import { useId } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, type TooltipContentProps } from "recharts";
import { formatDate, formatMoney } from "@/lib/format";
import { CURSOR, GRID, SERIES, TableToggle, TipBox, TipRow, Wash, activeDot, endDot, timeAxis, useChartMotion, valueAxis } from "@/components/charts/kit";

/** Single-series weekly price/NAV history. One colour, no legend (the title names the series). */
export function PriceChart({ data, currency, label }: { data: Array<{ date: string; price: number }>; currency: string; label: string }) {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const anim = useChartMotion();
  if (data.length < 2) return <p className="text-sm text-text-3">Not enough history to chart yet.</p>;
  const spanDays = (Date.parse(data[data.length - 1]!.date) - Date.parse(data[0]!.date)) / 86400000;
  const tick = (d: string) => (spanDays < 200 ? formatDate(d, "short").replace(/ \d{2}$/, "") : formatDate(d, "short").replace(/^\d+ /, ""));
  return (
    <div>
      <div className="h-64 w-full" role="img" aria-label={`${label} from ${formatDate(data[0]!.date)} to ${formatDate(data[data.length - 1]!.date)}`}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 12, right: 0, bottom: 0, left: 0 }}>
            <defs>
              <Wash id={`p-${id}`} />
            </defs>
            <CartesianGrid {...GRID} />
            <XAxis dataKey="date" {...timeAxis} tickFormatter={tick} />
            <YAxis {...valueAxis} domain={["auto", "auto"]} tickFormatter={(v: number) => formatMoney(String(v), currency, { compact: true })} />
            <Tooltip
              cursor={CURSOR}
              content={(p) => {
                const { active, payload } = p as TooltipContentProps<number, string>;
                if (!active || !payload?.length) return null;
                const row = payload[0]!.payload as { date: string; price: number };
                return (
                  <TipBox title={formatDate(row.date)}>
                    <TipRow color={SERIES[0]} label="Price" value={formatMoney(String(row.price), currency, { decimals: 4 })} />
                  </TipBox>
                );
              }}
            />
            <Area type="monotone" dataKey="price" className="vio-glow" stroke={SERIES[0]} strokeWidth={2.25} fill={`url(#p-${id})`} dot={endDot(SERIES[0], data.length - 1)} activeDot={activeDot(SERIES[0])} {...anim} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <TableToggle label="Show as table (weekly)">
        <table className="w-full">
          <tbody>
            {[...data].reverse().map((r) => (
              <tr key={r.date} className="border-t border-border first:border-0">
                <td className="px-3 py-1.5">{formatDate(r.date)}</td>
                <td className="num px-3 py-1.5 text-right">{formatMoney(String(r.price), currency, { decimals: 4 })}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableToggle>
    </div>
  );
}
