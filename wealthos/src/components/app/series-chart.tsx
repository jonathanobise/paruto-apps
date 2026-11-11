"use client";
import { useId } from "react";
import { Area, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis, type TooltipContentProps } from "recharts";
import { formatNumber, formatPercent } from "@/lib/format";
import { CURSOR, GRID, Legend, SERIES, TableToggle, TipBox, TipRow, Wash, activeDot, endDot, timeAxis, useChartMotion, valueAxis } from "@/components/charts/kit";

export interface SeriesDef {
  key: string;
  label: string;
}

type Row = { month: string } & Record<string, number | null | string>;

// Fixed names, not Intl: server (Node) and browser ICU abbreviate some months differently ("Sept"/"Sep"), which breaks hydration.
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const monthLabel = (m: string) => `${MONTHS[Number(m.slice(5, 7)) - 1]} ${m.slice(0, 4)}`;

/** Short axis labels for large values (1.2k, 3.4m, 5bn); deterministic, unlike Intl's compact notation. */
function compact(v: number): string {
  const a = Math.abs(v);
  const [div, suffix] = a >= 1e9 ? [1e9, "bn"] : a >= 1e6 ? [1e6, "m"] : a >= 1e4 ? [1e3, "k"] : [1, ""];
  const x = v / div;
  return `${div === 1 ? Math.round(x) : Number(x.toFixed(Math.abs(x) < 10 ? 1 : 0))}${suffix}`.replace(/^-/, "−");
}

/**
 * Monthly chart for up to three series (the validated palette has three hues). The legend names
 * each line with its latest value; the last point of each line is marked; the data is also a table.
 * One series gets a soft wash beneath it.
 */
export function SeriesChart({ rows, series, unit, label, step = false }: { rows: Row[]; series: SeriesDef[]; unit: "percent" | "number"; label: string; step?: boolean }) {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const anim = useChartMotion();
  const defs = series.slice(0, 3);
  const used = rows.filter((r) => defs.some((s) => typeof r[s.key] === "number"));
  if (used.length < 2) return <p className="text-sm text-text-3">Not enough history to chart yet.</p>;
  const fmt = (v: number | null | undefined) => (v === null || v === undefined ? "—" : unit === "percent" ? formatPercent(v, { decimals: 2 }) : formatNumber(String(v), 2));
  const axis = (v: number) => (unit === "percent" ? formatPercent(v, { decimals: 0 }) : compact(v));
  const lastIndex = (key: string) => used.findLastIndex((r) => typeof r[key] === "number");
  const latest = (key: string) => {
    const i = lastIndex(key);
    return i < 0 ? null : (used[i]![key] as number);
  };
  const curve = step ? "stepAfter" : "monotone";
  // Under three years, years would repeat along the axis: label months instead ("Jan 25").
  const months = (Number(used[used.length - 1]!.month.slice(0, 4)) - Number(used[0]!.month.slice(0, 4))) * 12 + Number(used[used.length - 1]!.month.slice(5, 7)) - Number(used[0]!.month.slice(5, 7));
  const tick = (m: string) => (months < 36 ? `${MONTHS[Number(m.slice(5, 7)) - 1]} ${m.slice(2, 4)}` : m.slice(0, 4));
  return (
    <div>
      <Legend items={defs.map((s, i) => ({ label: s.label, color: SERIES[i]!, value: fmt(latest(s.key)) }))} />
      <div className="mt-3 h-64 w-full" role="img" aria-label={`${label}: ${defs.map((s) => s.label).join(", ")}, ${monthLabel(used[0]!.month)} to ${monthLabel(used[used.length - 1]!.month)}`}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={used} margin={{ top: 12, right: 0, bottom: 0, left: 0 }}>
            <defs>
              <Wash id={`w-${id}`} strength={0.28} />
            </defs>
            <CartesianGrid {...GRID} />
            <XAxis dataKey="month" {...timeAxis} tickFormatter={tick} />
            <YAxis {...valueAxis} domain={["auto", "auto"]} tickFormatter={axis} width={52} />
            <Tooltip
              cursor={CURSOR}
              content={(p) => {
                const { active, payload } = p as TooltipContentProps<number, string>;
                if (!active || !payload?.length) return null;
                const row = payload[0]!.payload as Row;
                return (
                  <TipBox title={monthLabel(row.month)}>
                    {defs.map((s, i) => (
                      <TipRow key={s.key} color={SERIES[i]!} label={s.label} value={fmt(row[s.key] as number | null)} />
                    ))}
                  </TipBox>
                );
              }}
            />
            {/* Later series first, so the brand series draws on top. */}
            {[...defs.keys()].reverse().map((i) => {
              const s = defs[i]!;
              const common = { type: curve, dataKey: s.key, name: s.label, stroke: SERIES[i], strokeWidth: i === 0 ? 2.25 : 1.75, connectNulls: false, dot: endDot(SERIES[i]!, lastIndex(s.key), i === 0), activeDot: activeDot(SERIES[i]!), ...anim } as const;
              return defs.length === 1 ? <Area key={s.key} {...common} className="vio-glow" fill={`url(#w-${id})`} /> : <Line key={s.key} {...common} className={i === 0 ? "vio-glow" : undefined} />;
            })}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <TableToggle label="Show as table (monthly)">
        <table className="w-full">
          <thead className="sticky top-0 bg-surface-2 text-left">
            <tr>
              <th className="px-3 py-1.5">Month</th>
              {defs.map((s) => (
                <th key={s.key} className="px-3 py-1.5 text-right">
                  {s.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[...used].reverse().map((r) => (
              <tr key={r.month} className="border-t border-border">
                <td className="px-3 py-1.5">{monthLabel(r.month)}</td>
                {defs.map((s) => (
                  <td key={s.key} className="num px-3 py-1.5 text-right">
                    {fmt(r[s.key] as number | null)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </TableToggle>
    </div>
  );
}

/** Growth of 100 (single series), for an instrument's long-run total-return history. */
export function GrowthChart({ data, label }: { data: Array<{ date: string; value: number }>; label: string }) {
  return <SeriesChart rows={data.map((p) => ({ month: p.date.slice(0, 7), value: p.value }))} series={[{ key: "value", label }]} unit="number" label={`Growth of 100: ${label}`} />;
}
