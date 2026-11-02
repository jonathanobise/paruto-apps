"use client";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, type TooltipContentProps } from "recharts";
import { formatDate, formatMoney } from "@/lib/format";

/** Single-series weekly price/NAV history. One colour, no legend (the title names the series). */
export function PriceChart({ data, currency, label }: { data: Array<{ date: string; price: number }>; currency: string; label: string }) {
  if (data.length < 2) return <p className="text-sm text-text-3">Not enough history to chart yet.</p>;
  const spanDays = (Date.parse(data[data.length - 1]!.date) - Date.parse(data[0]!.date)) / 86400000;
  const tick = (d: string) => (spanDays < 200 ? formatDate(d, "short").replace(/ \d{2}$/, "") : formatDate(d, "short").replace(/^\d+ /, ""));
  return (
    <div>
      <div className="h-60 w-full" role="img" aria-label={`${label} from ${formatDate(data[0]!.date)} to ${formatDate(data[data.length - 1]!.date)}`}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--grid)" />
            <XAxis dataKey="date" tickFormatter={tick} tick={{ fill: "var(--text-3)", fontSize: 12 }} axisLine={false} tickLine={false} minTickGap={40} />
            <YAxis domain={["auto", "auto"]} tickFormatter={(v: number) => formatMoney(String(v), currency, { compact: true })} tick={{ fill: "var(--text-3)", fontSize: 12 }} axisLine={false} tickLine={false} width={64} />
            <Tooltip
              cursor={{ stroke: "var(--border-strong)" }}
              content={(p) => {
                const { active, payload } = p as TooltipContentProps<number, string>;
                if (!active || !payload?.length) return null;
                const row = payload[0]!.payload as { date: string; price: number };
                return (
                  <div className="rounded-lg border border-border bg-surface px-3 py-2 text-[13px] shadow-lg">
                    <p className="font-medium">{formatDate(row.date)}</p>
                    <p className="num text-text-2">{formatMoney(String(row.price), currency, { decimals: 4 })}</p>
                  </div>
                );
              }}
            />
            <Line type="monotone" dataKey="price" stroke="var(--series-1)" strokeWidth={2} dot={false} activeDot={{ r: 4, stroke: "var(--surface)", strokeWidth: 2 }} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <details className="mt-2 text-[13px]">
        <summary className="cursor-pointer text-text-3 hover:text-text">Show as table (weekly)</summary>
        <div className="mt-2 max-h-56 overflow-auto rounded-lg border border-border">
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
        </div>
      </details>
    </div>
  );
}
