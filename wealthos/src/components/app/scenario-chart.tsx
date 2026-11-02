"use client";
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis, type TooltipContentProps } from "recharts";
import { formatMoney } from "@/lib/format";

const COLORS = ["var(--series-1)", "var(--series-2)", "var(--series-3)", "var(--text-2)"];

export interface ScenarioSeries {
  label: string;
  path: Array<{ year: number; nominal: number; real: number }>;
}

/** Projected value under each scenario (same axis, same units), with the target as a reference line. */
export function ScenarioChart({ series, currency, target, mode = "nominal" }: { series: ScenarioSeries[]; currency: string; target?: number; mode?: "nominal" | "real" }) {
  const years = [...new Set(series.flatMap((s) => s.path.map((p) => p.year)))].sort((a, b) => a - b);
  const data = years.map((year) => Object.fromEntries([["year", year], ...series.map((s) => [s.label, s.path.find((p) => p.year === year)?.[mode] ?? null])]));
  return (
    <div>
      <ul className="mb-3 flex flex-wrap gap-4 text-[13px] text-text-2" aria-label="Legend">
        {series.map((s, i) => (
          <li key={s.label} className="flex items-center gap-2"><span className="inline-block h-0.5 w-4" style={{ background: COLORS[i] }} aria-hidden /> {s.label}</li>
        ))}
        {target ? <li className="flex items-center gap-2"><span className="inline-block w-4 border-t border-dashed border-text-3" aria-hidden /> Target</li> : null}
      </ul>
      <div className="h-64 w-full" role="img" aria-label={`Projected ${mode} value under ${series.length} scenarios`}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--grid)" />
            <XAxis dataKey="year" type="number" domain={[0, "dataMax"]} tickFormatter={(y: number) => (y === 0 ? "Now" : `${Number.isInteger(y) ? y : y.toFixed(1)}y`)} tick={{ fill: "var(--text-3)", fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={(v: number) => formatMoney(String(v), currency, { compact: true })} tick={{ fill: "var(--text-3)", fontSize: 12 }} axisLine={false} tickLine={false} width={64} />
            {target ? <ReferenceLine y={target} stroke="var(--text-3)" strokeDasharray="4 4" /> : null}
            <Tooltip
              cursor={{ stroke: "var(--border-strong)" }}
              content={(p) => {
                const { active, payload, label } = p as TooltipContentProps<number, string>;
                if (!active || !payload?.length) return null;
                return (
                  <div className="rounded-lg border border-border bg-surface px-3 py-2 text-[13px] shadow-lg">
                    <p className="font-medium">{Number(label) === 0 ? "Now" : `After ${Number(label).toFixed(Number.isInteger(Number(label)) ? 0 : 1)} years`}</p>
                    {payload.map((x, i) => <p key={i} className="flex justify-between gap-4 text-text-2"><span>{String(x.dataKey)}</span><span className="num text-text">{formatMoney(String(x.value), currency, { decimals: 0 })}</span></p>)}
                  </div>
                );
              }}
            />
            {series.map((s, i) => <Line key={s.label} type="monotone" dataKey={s.label} stroke={COLORS[i]} strokeWidth={2} dot={false} isAnimationActive={false} />)}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
