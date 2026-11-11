"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import type { IChartApi, ISeriesApi, MouseEventParams, Time } from "lightweight-charts";
import { formatDate, formatMoney } from "@/lib/format";
import { DeltaPill } from "@/components/ui/money";
import { TableToggle } from "./kit";
import { BRAND } from "@/lib/brand";

/**
 * The instrument page's price chart, drawn with TradingView Lightweight Charts™ (Apache-2.0; see
 * the attribution below the chart and on the chart itself). Our own data only: daily closes or NAVs
 * from the instrument's best source, each with its date. Drag or pinch to pan and zoom, choose a
 * range, switch to a logarithmic scale; the figure above the chart follows the pointer with the
 * change from the start of what's on screen. The weekly table keeps the data readable without it.
 *
 * Colours come from the theme tokens and are re-read when the appearance changes; the library is
 * loaded only on pages that use it (bundled with the app, nothing fetched from elsewhere).
 */
type Point = { date: string; price: number };

const RANGES = [
  { key: "1M", days: 31 },
  { key: "3M", days: 92 },
  { key: "6M", days: 183 },
  { key: "YTD", days: -1 },
  { key: "1Y", days: 366 },
  { key: "5Y", days: 1827 },
  { key: "All", days: Infinity },
] as const;
type RangeKey = (typeof RANGES)[number]["key"];

/** Any CSS colour (tokens use modern syntax) normalised to rgba() for the canvas library. */
function rgba(css: string, alpha?: number): string {
  const ctx = document.createElement("canvas").getContext("2d");
  if (!ctx) return css;
  ctx.fillStyle = "#000";
  ctx.fillStyle = css.trim();
  const v = ctx.fillStyle; // "#rrggbb" or "rgba(r, g, b, a)"
  let r = 0,
    g = 0,
    b = 0,
    a = 1;
  if (v.startsWith("#")) [r, g, b] = [1, 3, 5].map((i) => parseInt(v.slice(i, i + 2), 16)) as [number, number, number];
  else {
    const m = v.match(/[\d.]+/g)?.map(Number) ?? [];
    [r, g, b] = [m[0] ?? 0, m[1] ?? 0, m[2] ?? 0];
    a = m[3] ?? 1;
  }
  return `rgba(${r}, ${g}, ${b}, ${alpha ?? a})`;
}
const token = (name: string) => getComputedStyle(document.documentElement).getPropertyValue(name);

function themeOptions() {
  const accent = token("--series-1");
  return {
    layout: { textColor: rgba(token("--text-3")), fontFamily: getComputedStyle(document.body).fontFamily, fontSize: 11 },
    grid: { vertLines: { visible: false }, horzLines: { color: rgba(token("--grid")) } },
    crosshair: {
      vertLine: { color: rgba(token("--text-3"), 0.45), labelBackgroundColor: rgba(token("--surface-2")) },
      horzLine: { color: rgba(token("--text-3"), 0.35), labelBackgroundColor: rgba(token("--surface-2")) },
    },
    series: { lineColor: rgba(accent), topColor: rgba(accent, 0.3), bottomColor: rgba(accent, 0), crosshairMarkerBorderColor: rgba(token("--surface")), crosshairMarkerBackgroundColor: rgba(accent) },
  };
}

export function ProPriceChart({ daily, weekly, currency, label }: { daily: Point[]; weekly: Point[]; currency: string; label: string }) {
  const box = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Area"> | null>(null);
  const [ready, setReady] = useState(false);
  const [range, setRange] = useState<RangeKey>("1Y");
  const [log, setLog] = useState(false);
  const [hover, setHover] = useState<Point | null>(null);
  const [visibleStart, setVisibleStart] = useState<Point | null>(null);

  const data = daily.length > 1 ? daily : weekly;
  const last = data.at(-1) ?? null;
  const decimals = (last?.price ?? 0) < 10 ? 4 : 2;
  const money = (v: number) => formatMoney(String(v), currency, { decimals });
  const spanDays = data.length > 1 ? (Date.parse(last!.date) - Date.parse(data[0]!.date)) / 86_400_000 : 0;
  const ranges = useMemo(() => RANGES.filter((r) => r.days === Infinity || r.days === -1 || spanDays > r.days * 0.9), [spanDays]);

  // Create the chart once.
  useEffect(() => {
    let alive = true;
    let chart: IChartApi | null = null;
    const themeWatch = new MutationObserver(() => {
      if (!chartRef.current || !seriesRef.current) return;
      const t = themeOptions();
      chartRef.current.applyOptions({ layout: t.layout, grid: t.grid, crosshair: t.crosshair });
      seriesRef.current.applyOptions(t.series);
    });
    (async () => {
      const lw = await import("lightweight-charts");
      if (!alive || !box.current || data.length < 2) return;
      const t = themeOptions();
      chart = lw.createChart(box.current, {
        autoSize: true,
        layout: { ...t.layout, background: { type: lw.ColorType.Solid, color: "rgba(0, 0, 0, 0)" }, attributionLogo: true },
        grid: t.grid,
        crosshair: { mode: lw.CrosshairMode.Magnet, ...t.crosshair },
        rightPriceScale: { borderVisible: false, scaleMargins: { top: 0.12, bottom: 0.06 } },
        timeScale: { borderVisible: false, fixLeftEdge: true, fixRightEdge: true, rightOffset: 2, lockVisibleTimeRangeOnResize: true },
        localization: { priceFormatter: (v: number) => formatMoney(String(v), currency, { decimals: v < 10 ? 4 : 2 }) },
        handleScale: { axisPressedMouseMove: { time: true, price: false } },
      });
      const series = chart.addSeries(lw.AreaSeries, { ...t.series, lineWidth: 2, priceLineVisible: false, lastValueVisible: true, crosshairMarkerRadius: 5, crosshairMarkerBorderWidth: 2 });
      series.setData(data.map((p) => ({ time: p.date as Time, value: p.price })));
      chart.subscribeCrosshairMove((param: MouseEventParams<Time>) => {
        const v = param.time ? (param.seriesData.get(series) as { value?: number } | undefined) : undefined;
        setHover(v?.value !== undefined && typeof param.time === "string" ? { date: param.time, price: v.value } : null);
      });
      chart.timeScale().subscribeVisibleTimeRangeChange((r) => {
        const from = r ? String(r.from) : null;
        setVisibleStart(from ? (data.find((p) => p.date >= from) ?? null) : null);
      });
      chartRef.current = chart;
      seriesRef.current = series;
      themeWatch.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme", "data-depth"] });
      setReady(true);
    })();
    return () => {
      alive = false;
      themeWatch.disconnect();
      chart?.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
    // The chart is built once per data set; ranges and scale are applied below.
  }, [data, currency]);

  // Range.
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart || !last) return;
    const r = RANGES.find((x) => x.key === range)!;
    if (r.days === Infinity) return chart.timeScale().fitContent();
    const from = r.days === -1 ? `${last.date.slice(0, 4)}-01-01` : new Date(Date.parse(last.date) - r.days * 86_400_000).toISOString().slice(0, 10);
    chart.timeScale().setVisibleRange({ from: (from < data[0]!.date ? data[0]!.date : from) as Time, to: last.date as Time });
  }, [range, ready, last, data]);

  // Linear or logarithmic price scale.
  useEffect(() => {
    void import("lightweight-charts").then((lw) => chartRef.current?.priceScale("right").applyOptions({ mode: log ? lw.PriceScaleMode.Logarithmic : lw.PriceScaleMode.Normal }));
  }, [log, ready]);

  if (data.length < 2) return <p className="text-sm text-text-3">Not enough history to chart yet.</p>;
  const shown = hover ?? last!;
  const base = visibleStart ?? data[0]!;
  const change = base.price ? shown.price / base.price - 1 : null;

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div aria-live="polite">
          <p className="figure text-[30px] leading-none text-text">{money(shown.price)}</p>
          <p className="mt-2 flex flex-wrap items-center gap-2 text-[12.5px] text-text-3">
            {change !== null ? <DeltaPill percent={change} size="sm" /> : null}
            <span>
              {hover ? formatDate(shown.date) : `as of ${formatDate(shown.date)}`} · from {formatDate(base.date)}
            </span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div role="radiogroup" aria-label="Range" className="vio-seg" style={{ "--n": ranges.length, "--i": Math.max(0, ranges.findIndex((r) => r.key === range)) } as React.CSSProperties}>
            <span aria-hidden className="vio-seg-thumb" />
            {ranges.map((r) => (
              <button key={r.key} type="button" role="radio" aria-checked={range === r.key} data-no-ink onClick={() => setRange(r.key)} className="num !h-8 min-w-10 px-2.5 text-[12px] font-semibold">
                {r.key}
              </button>
            ))}
          </div>
          <button
            type="button"
            aria-pressed={log}
            onClick={() => setLog((x) => !x)}
            title="A logarithmic scale shows equal percentage moves as equal heights, which suits long histories"
            className="spring h-9 rounded-full border border-border px-3 text-[12px] font-semibold text-text-2 hover:bg-text/5 aria-pressed:border-transparent aria-pressed:bg-accent-soft aria-pressed:text-text"
          >
            Log
          </button>
        </div>
      </div>

      <div ref={box} className="vio-pro-chart mt-4 h-72 w-full sm:h-80" role="img" aria-label={`${label}, daily, ${formatDate(data[0]!.date)} to ${formatDate(last!.date)}. Drag or pinch to move and zoom.`} />

      <p className="mt-2 text-[11px] text-text-3">
        Drag to move, pinch or scroll to zoom. Chart by{" "}
        <a href="https://www.tradingview.com/" target="_blank" rel="noopener noreferrer" className="underline-offset-2 hover:text-text-2 hover:underline">
          TradingView Lightweight Charts™
        </a>
        , Copyright (с) 2025 TradingView, Inc. The data is {BRAND}&apos;s own: daily values from the source named above.
      </p>

      <TableToggle label="Show as table (weekly)">
        <table className="w-full">
          <tbody>
            {[...weekly].reverse().map((r) => (
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
