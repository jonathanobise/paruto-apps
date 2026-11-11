"use client";
import { useSyncExternalStore, type ReactNode } from "react";

/**
 * The chart kit: one look for every chart (Paruto design language, Charts: the Stocks/Health
 * pattern). Smooth 2px lines with the brand series glowing softly, gradient washes that fade to
 * nothing, a trailing value axis on the right, hairline gridlines, a ringed end-point that breathes,
 * a glass tooltip, and a draw-in on first paint (none under Reduce Motion). Colours are the
 * validated chart tokens (--series-1..3); text never wears a series colour.
 */
export const SERIES = ["var(--series-1)", "var(--series-2)", "var(--series-3)"] as const;
export const TICK = { fill: "var(--text-3)", fontSize: 11, fontFamily: "var(--font-sans)" } as const;
export const GRID = { vertical: false, stroke: "var(--grid)", strokeWidth: 1 } as const;
export const CURSOR = { stroke: "var(--text-3)", strokeWidth: 1, strokeOpacity: 0.5 } as const;
/** Trailing value axis (right side), as the Stocks app draws it. */
export const valueAxis = { orientation: "right" as const, axisLine: false, tickLine: false, tick: TICK, tickCount: 4, width: 60, tickMargin: 8 };
export const timeAxis = { axisLine: false, tickLine: false, tick: TICK, minTickGap: 44, tickMargin: 10 };

const motion = (l: () => void) => {
  const m = matchMedia("(prefers-reduced-motion: reduce)");
  m.addEventListener("change", l);
  return () => m.removeEventListener("change", l);
};
/** Animate the draw-in unless Reduce Motion is on. */
export function useChartMotion() {
  const reduce = useSyncExternalStore(motion, () => matchMedia("(prefers-reduced-motion: reduce)").matches, () => true);
  return { isAnimationActive: !reduce, animationDuration: 900, animationEasing: "ease-out" as const };
}

/** A soft vertical wash under a line: the hue at the top fading to nothing. */
export function Wash({ id, color = SERIES[0], strength = 0.32 }: { id: string; color?: string; strength?: number }) {
  return (
    <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor={color} stopOpacity={strength} />
      <stop offset="55%" stopColor={color} stopOpacity={strength * 0.35} />
      <stop offset="100%" stopColor={color} stopOpacity={0} />
    </linearGradient>
  );
}

/** Recharts `dot` renderer: nothing on the way, a ringed, breathing dot on the last point. */
export function endDot(color: string, last: number, breathe = true) {
  function EndDot(props: { cx?: number; cy?: number; index?: number; value?: unknown }) {
    const { cx, cy, index, value } = props;
    if (index !== last || cx === undefined || cy === undefined || value === null || value === undefined) return <g key={`d-${index}`} />;
    return (
      <g key={`d-${index}`} className="vio-end-dot">
        {breathe ? <circle cx={cx} cy={cy} r={10} fill={color} className="vio-end-halo" /> : null}
        <circle cx={cx} cy={cy} r={4.5} fill={color} stroke="var(--surface)" strokeWidth={2} />
      </g>
    );
  }
  return EndDot;
}
export const activeDot = (color: string) => ({ r: 5, fill: color, stroke: "var(--surface)", strokeWidth: 2.5 });

/** The glass tooltip every chart shares. */
export function TipBox({ title, children }: { title: ReactNode; children: ReactNode }) {
  return (
    <div className="vio-tip glass min-w-44 rounded-[16px] px-3.5 py-2.5 text-[12.5px]">
      <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-text-3">{title}</p>
      <div className="flex flex-col gap-1">{children}</div>
    </div>
  );
}
export function TipRow({ color, label, value, line = false }: { color: string; label: ReactNode; value: ReactNode; line?: boolean }) {
  return (
    <p className="flex items-center justify-between gap-5 text-text-2">
      <span className="inline-flex items-center gap-2">
        <Key color={color} line={line} />
        {label}
      </span>
      <span className="num font-medium text-text">{value}</span>
    </p>
  );
}

/** The key beside a series name: a short line for a line, a dot for a point. Identity, not text colour. */
export function Key({ color, line = true }: { color: string; line?: boolean }) {
  return line ? <span aria-hidden className="inline-block h-[2.5px] w-3.5 shrink-0 rounded-full" style={{ background: color }} /> : <span aria-hidden className="inline-block size-2 shrink-0 rounded-full" style={{ background: color }} />;
}

/** Legend with each series' latest value beside its name. */
export function Legend({ items }: { items: Array<{ label: string; color: string; value?: ReactNode; dashed?: boolean }> }) {
  return (
    <ul className="flex flex-wrap gap-x-5 gap-y-1.5 text-[12.5px] text-text-2" aria-label="Legend">
      {items.map((s) => (
        <li key={s.label} className="inline-flex items-center gap-2">
          {s.dashed ? <span aria-hidden className="inline-block w-3.5 border-t border-dashed border-text-3" /> : <Key color={s.color} />}
          {s.label}
          {s.value !== undefined ? <span className="num font-medium text-text">{s.value}</span> : null}
        </li>
      ))}
    </ul>
  );
}

/** "Show as table": every chart keeps its data readable without the picture. */
export function TableToggle({ label = "Show as table", children }: { label?: string; children: ReactNode }) {
  return (
    <details className="vio-table-toggle mt-3 text-[13px]">
      <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 rounded-full px-2 py-1 text-[12px] font-medium text-text-3 hover:bg-text/5 hover:text-text-2">{label}</summary>
      <div className="mt-2 max-h-64 overflow-auto rounded-[var(--radius-inner)] border border-border">{children}</div>
    </details>
  );
}
