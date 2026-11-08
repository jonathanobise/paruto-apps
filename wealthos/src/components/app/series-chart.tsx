"use client";
import { useId } from "react";
import { Area, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis, type TooltipContentProps } from "recharts";
import { formatNumber, formatPercent } from "@/lib/format";

export interface SeriesDef {
  key: string;
  label: string;
}

type Row = { month: string } & Record<string, number | null | string>;

const COLORS = ["var(--series-1)", "var(--series-2)", "var(--series-3)"];
// Fixed names, not Intl: server (Node) and browser ICU abbreviate some months differently ("Sept"/"Sep"), which breaks hydration.
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const monthLabel = (m: string) => `${MONTHS[Number(m.slice(5, 7)) - 1]} ${m.slice(0, 4)}`;

/** Short axis labels for large values (1.2k, 3.4m, 5bn); deterministic, unlike Intl's compact notation. */
function compact(v: number): string {
  const a = Math.abs(v);
  const [div, suffix] = a >= 1e9 ? [1e9, "bn"] : a >= 1e6 ? [1e6, "m"] : a >= 1e4 ? [1e3, "k"] : [1, ""];
  const x = v / div;
  return `${div === 1 ? Math.round(x) : Number(x.toFixed(Math.abs(x) < 10 ? 1 : 0))}${suffix}`.replace(/^-/, "\u2212");
}

/**
 * Monthly line chart for up to three series (the validated palette has three hues). A legend with
 * text labels names each line; the data is also available as a table.
 */
export function SeriesChart({ rows, series, unit, label, step = false }: { rows: Row[]; series: SeriesDef[]; unit: "percent" | "number"; label: string; step?: boolean }) {
  const fillId = `fill-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const defs = series.slice(0, 3);
  const used = rows.filter((r) => defs.some((s) => typeof r[s.key] === "number"));
  if (used.length < 2) return <p className="text-sm text-text-3">Not enough history to chart yet.</p>;
  const fmt = (v: number | null | undefined) => (v === null || v === undefined ? "—" : unit === "percent" ? formatPercent(v, { decimals: 2 }) : formatNumber(String(v), 2));
  const axis = (v: number) => (unit === "percent" ? formatPercent(v, { decimals: 0 }) : compact(v));
  return (
    <div>
      <ul className="mb-2 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-text-2" aria-hidden>
        {defs.map((s, i) => (
          <li key={s.key} className="inline-flex items-center gap-1.5">
            <span className="inline-block h-0.5 w-4 rounded-full" style={{ background: COLORS[i] }} />
            {s.label}
          </li>
        ))}
      </ul>
      <div className="h-64 w-full" role="img" aria-label={`${label}: ${defs.map((s) => s.label).join(", ")}, ${monthLabel(used[0]!.month)} to ${monthLabel(used[used.length - 1]!.month)}`}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={used} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="var(--series-1)" stopOpacity="0.24" />
                <stop offset="1" stopColor="var(--series-1)" stopOpacity="0" />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="var(--grid)" />
            <XAxis dataKey="month" tickFormatter={(m: string) => m.slice(0, 4)} tick={{ fill: "var(--text-3)", fontSize: 12 }} axisLine={false} tickLine={false} minTickGap={40} />
            <YAxis domain={["auto", "auto"]} tickFormatter={axis} tick={{ fill: "var(--text-3)", fontSize: 12 }} axisLine={false} tickLine={false} width={56} />
            <Tooltip
              cursor={{ stroke: "var(--border-strong)" }}
              content={(p) => {
                const { active, payload } = p as TooltipContentProps<number, string>;
                if (!active || !payload?.length) return null;
                const row = payload[0]!.payload as Row;
                return (
                  <div className="glass rounded-[14px] px-3 py-2 text-[13px]">
                    <p className="font-medium">{monthLabel(row.month)}</p>
                    {defs.map((s, i) => (
                      <p key={s.key} className="flex items-center justify-between gap-4 text-text-2">
                        <span className="inline-flex items-center gap-1.5"><span className="inline-block size-2 rounded-full" style={{ background: COLORS[i] }} />{s.label}</span>
                        <span className="num text-text">{fmt(row[s.key] as number | null)}</span>
                      </p>
                    ))}
                  </div>
                );
              }}
            />
            {defs.map((s, i) => (
              // One series: a soft violet area under the line. Several: lines only, so fills never overlap.
              defs.length === 1 ? (
                <Area key={s.key} type={step ? "stepAfter" : "monotone"} dataKey={s.key} name={s.label} stroke={COLORS[i]} strokeWidth={2} fill={`url(#${fillId})`} dot={false} connectNulls={false} activeDot={{ r: 4, stroke: "var(--surface)", strokeWidth: 2 }} isAnimationActive={false} />
              ) : (
                <Line key={s.key} type={step ? "stepAfter" : "monotone"} dataKey={s.key} name={s.label} stroke={COLORS[i]} strokeWidth={2} dot={false} connectNulls={false} activeDot={{ r: 4, stroke: "var(--surface)", strokeWidth: 2 }} isAnimationActive={false} />
              )
            ))}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <details className="mt-2 text-[13px]">
        <summary className="cursor-pointer text-text-3 hover:text-text">Show as table (monthly)</summary>
        <div className="mt-2 max-h-64 overflow-auto rounded-[var(--radius-inner)] border border-border">
          <table className="w-full">
            <thead className="text-left text-text-3 text-[12px]">
              <tr className="border-b border-border">
                <th className="px-3 py-1.5 font-medium">Month</th>
                {defs.map((s) => <th key={s.key} className="px-3 py-1.5 text-right font-medium">{s.label}</th>)}
              </tr>
            </thead>
            <tbody>
              {[...used].reverse().map((r) => (
                <tr key={r.month} className="border-t border-border">
                  <td className="px-3 py-1.5">{monthLabel(r.month)}</td>
                  {defs.map((s) => <td key={s.key} className="num px-3 py-1.5 text-right">{fmt(r[s.key] as number | null)}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}

/** Growth of 100 (single series), for an instrument's long-run total-return history. */
export function GrowthChart({ data, label }: { data: Array<{ date: string; value: number }>; label: string }) {
  return <SeriesChart rows={data.map((p) => ({ month: p.date.slice(0, 7), value: p.value }))} series={[{ key: "value", label }]} unit="number" label={`Growth of 100: ${label}`} />;
}
