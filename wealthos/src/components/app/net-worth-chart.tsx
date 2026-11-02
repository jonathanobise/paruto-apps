"use client";
import { Area, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis, type TooltipContentProps } from "recharts";
import { formatDate, formatMoney } from "@/lib/format";

export interface HistoryPoint {
  date: string;
  netWorth: number | null;
  contributions: number | null;
}

function TooltipBox({ active, payload, label, currency }: TooltipContentProps<number, string> & { currency: string }) {
  if (!active || !payload?.length) return null;
  const row = payload[0]!.payload as HistoryPoint;
  return (
    <div className="glass rounded-[14px] px-3 py-2 text-[13px]">
      <p className="font-medium text-text">{formatDate(String(label))}</p>
      <p className="mt-1 flex items-center gap-2 text-text-2">
        <span className="inline-block size-2 rounded-full bg-[var(--series-1)]" aria-hidden /> Net worth
        <span className="num ml-auto pl-4 font-medium text-text">{row.netWorth === null ? "Incomplete" : formatMoney(String(row.netWorth), currency, { decimals: 0 })}</span>
      </p>
      <p className="flex items-center gap-2 text-text-2">
        <span className="inline-block h-0.5 w-3 bg-[var(--series-2)]" aria-hidden /> Net contributions
        <span className="num ml-auto pl-4 font-medium text-text">{row.contributions === null ? "—" : formatMoney(String(row.contributions), currency, { decimals: 0 })}</span>
      </p>
    </div>
  );
}

/**
 * Net worth over time against cumulative net contributions (money paid in minus money taken out).
 * The gap between the two lines is growth, not savings. One y-axis, both in the display currency.
 */
export function NetWorthChart({ data, currency }: { data: HistoryPoint[]; currency: string }) {
  return (
    <div>
      <ul className="mb-3 flex flex-wrap gap-4 text-[13px] text-text-2" aria-label="Legend">
        <li className="flex items-center gap-2">
          <span className="inline-block size-2.5 rounded-full bg-[var(--series-1)]" aria-hidden /> Net worth
        </li>
        <li className="flex items-center gap-2">
          <span className="inline-block h-0.5 w-4 bg-[var(--series-2)]" aria-hidden /> Net contributions (ledger accounts)
        </li>
      </ul>
      <div className="h-64 w-full sm:h-72" role="img" aria-label={`Net worth history from ${formatDate(data[0]?.date)} to ${formatDate(data[data.length - 1]?.date)}`}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="nwFill" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="var(--series-1)" stopOpacity={0.18} />
                <stop offset="100%" stopColor="var(--series-1)" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="var(--grid)" strokeWidth={1} />
            <XAxis dataKey="date" tickFormatter={(d: string) => formatDate(d, "short").replace(/^\d+ /, "")} tick={{ fill: "var(--text-3)", fontSize: 12 }} axisLine={false} tickLine={false} minTickGap={32} />
            <YAxis tickFormatter={(v: number) => formatMoney(String(v), currency, { compact: true })} tick={{ fill: "var(--text-3)", fontSize: 12 }} axisLine={false} tickLine={false} width={64} />
            <Tooltip content={(p) => <TooltipBox {...(p as TooltipContentProps<number, string>)} currency={currency} />} cursor={{ stroke: "var(--border-strong)", strokeWidth: 1 }} />
            <Area type="monotone" dataKey="netWorth" stroke="var(--series-1)" strokeWidth={2} fill="url(#nwFill)" connectNulls={false} activeDot={{ r: 4, stroke: "var(--surface)", strokeWidth: 2 }} isAnimationActive={false} />
            <Line type="stepAfter" dataKey="contributions" stroke="var(--series-2)" strokeWidth={2} dot={false} activeDot={{ r: 4, stroke: "var(--surface)", strokeWidth: 2 }} isAnimationActive={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <details className="mt-3 text-[13px]">
        <summary className="cursor-pointer text-text-3 hover:text-text">Show as table</summary>
        <div className="mt-2 max-h-64 overflow-auto rounded-[var(--radius-inner)] border border-border">
          <table className="w-full text-left">
            <thead className="sticky top-0 bg-surface-2 text-text-3">
              <tr>
                <th className="px-3 py-2 font-medium">Date</th>
                <th className="px-3 py-2 text-right font-medium">Net worth</th>
                <th className="px-3 py-2 text-right font-medium">Net contributions</th>
              </tr>
            </thead>
            <tbody>
              {data.map((r) => (
                <tr key={r.date} className="border-t border-border">
                  <td className="px-3 py-1.5">{formatDate(r.date)}</td>
                  <td className="num px-3 py-1.5 text-right">{r.netWorth === null ? "Incomplete" : formatMoney(String(r.netWorth), currency, { decimals: 0 })}</td>
                  <td className="num px-3 py-1.5 text-right">{r.contributions === null ? "—" : formatMoney(String(r.contributions), currency, { decimals: 0 })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
