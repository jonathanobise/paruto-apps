import { useId } from "react";

/**
 * A small trend line (server-rendered SVG, no client code). Decorative context beside a figure:
 * the figure itself carries the information, so the line is hidden from assistive tech unless a
 * label is given. Uses chart series 1 (Vio violet), a soft area fade and an end dot. `fluid`
 * stretches it to the container width (the line keeps its weight; no end dot, which would distort).
 */
export function Sparkline({ values, width = 112, height = 32, label, className, fluid = false }: { values: number[]; width?: number; height?: number; label?: string; className?: string; fluid?: boolean }) {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const pts = values.filter((v) => Number.isFinite(v));
  if (pts.length < 2) return null;
  const min = Math.min(...pts);
  const max = Math.max(...pts);
  const span = max - min || 1;
  const pad = 3;
  const x = (i: number) => pad + (i / (pts.length - 1)) * (width - pad * 2);
  const y = (v: number) => pad + (1 - (v - min) / span) * (height - pad * 2);
  const line = pts.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(" ");
  const area = `${line} L${x(pts.length - 1).toFixed(1)} ${height} L${x(0).toFixed(1)} ${height} Z`;
  const last = pts[pts.length - 1]!;
  return (
    <svg viewBox={`0 0 ${width} ${height}`} width={fluid ? "100%" : width} height={height} preserveAspectRatio={fluid ? "none" : undefined} className={className} role={label ? "img" : undefined} aria-label={label} aria-hidden={label ? undefined : true}>
      <defs>
        <linearGradient id={`sf-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--series-1)" stopOpacity="0.28" />
          <stop offset="1" stopColor="var(--series-1)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#sf-${id})`} />
      <path d={line} fill="none" stroke="var(--series-1)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      {fluid ? null : <circle cx={x(pts.length - 1)} cy={y(last)} r="2.6" fill="var(--series-1)" stroke="var(--surface)" strokeWidth="1.5" />}
    </svg>
  );
}
