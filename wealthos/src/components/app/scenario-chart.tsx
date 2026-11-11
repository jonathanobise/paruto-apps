"use client";
import { Area, CartesianGrid, ComposedChart, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis, type TooltipContentProps } from "recharts";
import { formatMoney } from "@/lib/format";
import { CURSOR, GRID, Legend, SERIES, TipBox, TipRow, activeDot, endDot, timeAxis, useChartMotion, valueAxis } from "@/components/charts/kit";

const COLORS = [...SERIES, "var(--text-2)"];

export interface ScenarioSeries {
  label: string;
  path: Array<{ year: number; nominal: number; real: number }>;
}

/**
 * Projected value under each scenario (same axis, same units), with the target as a reference line.
 * The range between the lowest and highest scenario is a soft fan, so the spread reads at a glance
 * and no single line looks like the answer.
 */
export function ScenarioChart({ series, currency, target, mode = "nominal" }: { series: ScenarioSeries[]; currency: string; target?: number; mode?: "nominal" | "real" }) {
  const anim = useChartMotion();
  const years = [...new Set(series.flatMap((s) => s.path.map((p) => p.year)))].sort((a, b) => a - b);
  const data = years.map((year) => {
    const vals = series.map((s) => s.path.find((p) => p.year === year)?.[mode] ?? null);
    const present = vals.filter((v): v is number => v !== null);
    return Object.fromEntries([["year", year], ["fan", present.length > 1 ? [Math.min(...present), Math.max(...present)] : null], ...series.map((s, i) => [s.label, vals[i]])]);
  });
  const last = data.length - 1;
  const money = (v: unknown) => (typeof v === "number" ? formatMoney(String(v), currency, { decimals: 0 }) : "—");
  return (
    <div>
      <Legend
        items={[
          ...series.map((s, i) => ({ label: s.label, color: COLORS[i]!, value: formatMoney(String(data[last]?.[s.label] ?? ""), currency, { compact: true }) })),
          ...(target ? [{ label: "Target", color: "var(--text-3)", dashed: true }] : []),
        ]}
      />
      <div className="mt-3 h-72 w-full" role="img" aria-label={`Projected ${mode} value under ${series.length} scenarios`}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 12, right: 0, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="fan" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor={SERIES[0]} stopOpacity={0.02} />
                <stop offset="100%" stopColor={SERIES[0]} stopOpacity={0.16} />
              </linearGradient>
            </defs>
            <CartesianGrid {...GRID} />
            <XAxis dataKey="year" type="number" domain={[0, "dataMax"]} {...timeAxis} tickFormatter={(y: number) => (y === 0 ? "Now" : `${Number.isInteger(y) ? y : y.toFixed(1)}y`)} />
            <YAxis {...valueAxis} tickFormatter={(v: number) => formatMoney(String(v), currency, { compact: true })} />
            {target ? <ReferenceLine y={target} stroke="var(--text-3)" strokeDasharray="4 4" /> : null}
            <Tooltip
              cursor={CURSOR}
              content={(p) => {
                const { active, payload, label } = p as TooltipContentProps<number, string>;
                if (!active || !payload?.length) return null;
                const row = payload[0]!.payload as Record<string, unknown>;
                return (
                  <TipBox title={Number(label) === 0 ? "Now" : `After ${Number(label).toFixed(Number.isInteger(Number(label)) ? 0 : 1)} years`}>
                    {series.map((s, i) => (
                      <TipRow key={s.label} color={COLORS[i]!} label={s.label} value={money(row[s.label])} />
                    ))}
                  </TipBox>
                );
              }}
            />
            <Area dataKey="fan" stroke="none" fill="url(#fan)" isAnimationActive={false} activeDot={false} />
            {series.map((s, i) => (
              <Line key={s.label} type="monotone" dataKey={s.label} className={i === 0 ? "vio-glow" : undefined} stroke={COLORS[i]} strokeWidth={i === 1 ? 2.25 : 1.75} dot={endDot(COLORS[i]!, last, false)} activeDot={activeDot(COLORS[i]!)} {...anim} />
            ))}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
