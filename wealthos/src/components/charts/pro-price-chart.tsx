"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import type { IChartApi, ISeriesApi, MouseEventParams, Time } from "lightweight-charts";
import { formatDate, formatMoney } from "@/lib/format";
import { DeltaPill } from "@/components/ui/money";
import { BRAND } from "@/lib/brand";
import { TableToggle } from "./kit";

/**
 * The instrument page's price chart, drawn with TradingView Lightweight Charts™ (Apache-2.0; see
 * the attribution below the chart and on the chart itself). Our own data only: daily closes or NAVs
 * from the instrument's best source, each with its date, and, where the source publishes them, each
 * day's open, high, low and volume, shown as candlesticks over a volume pane.
 *
 * Drag or pinch to pan and zoom, choose a range, switch line or candles and a logarithmic scale; the
 * figure above the chart follows the pointer (with the day's open, high, low and volume on candles)
 * and the change from the start of what's on screen. The weekly table keeps the data readable
 * without the chart. Colours come from the theme tokens and are re-read when the appearance changes;
 * the library is bundled with the app and loaded only on pages that use it.
 */
export type ChartPoint = { date: string; price: number; open?: number | null; high?: number | null; low?: number | null; volume?: number | null };

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
type Style = "line" | "candles";

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
  const up = token("--positive");
  const down = token("--negative");
  return {
    layout: { textColor: rgba(token("--text-3")), fontFamily: getComputedStyle(document.body).fontFamily, fontSize: 11 },
    grid: { vertLines: { visible: false }, horzLines: { color: rgba(token("--grid")) } },
    crosshair: {
      vertLine: { color: rgba(token("--text-3"), 0.45), labelBackgroundColor: rgba(token("--surface-2")) },
      horzLine: { color: rgba(token("--text-3"), 0.35), labelBackgroundColor: rgba(token("--surface-2")) },
    },
    area: { lineColor: rgba(accent), topColor: rgba(accent, 0.3), bottomColor: rgba(accent, 0), crosshairMarkerBorderColor: rgba(token("--surface")), crosshairMarkerBackgroundColor: rgba(accent) },
    candles: { upColor: rgba(up), downColor: rgba(down), wickUpColor: rgba(up, 0.9), wickDownColor: rgba(down, 0.9), borderVisible: false },
    volumeUp: rgba(up, 0.32),
    volumeDown: rgba(down, 0.32),
  };
}

/** 1.2K / 3.4M / 5.6B, the same on server and browser. */
function compact(n: number): string {
  const a = Math.abs(n);
  const [div, s] = a >= 1e9 ? [1e9, "B"] : a >= 1e6 ? [1e6, "M"] : a >= 1e3 ? [1e3, "K"] : [1, ""];
  return `${div === 1 ? Math.round(n).toString() : (n / div).toFixed(n / div < 10 ? 2 : 1)}${s}`;
}

const hasBar = (p: ChartPoint) => p.open != null && p.high != null && p.low != null;

export function ProPriceChart({ daily, weekly, currency, label }: { daily: ChartPoint[]; weekly: ChartPoint[]; currency: string; label: string }) {
  const box = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const areaRef = useRef<ISeriesApi<"Area"> | null>(null);
  const candleRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volumeRef = useRef<ISeriesApi<"Histogram"> | null>(null);
  const [ready, setReady] = useState(false);
  const [range, setRange] = useState<RangeKey>("1Y");
  const [log, setLog] = useState(false);
  const [hover, setHover] = useState<ChartPoint | null>(null);
  const [visibleStart, setVisibleStart] = useState<ChartPoint | null>(null);

  const data = daily.length > 1 ? daily : weekly;
  const last = data.at(-1) ?? null;
  // Candles and volume only where the source gives most days in full; otherwise the line alone.
  const bars = data.length >= 20 && data.filter(hasBar).length >= data.length * 0.5;
  const volumes = data.length >= 20 && data.filter((p) => p.volume != null && p.volume > 0).length >= data.length * 0.5;
  const [style, setStyle] = useState<Style>(bars ? "candles" : "line");
  const decimals = (last?.price ?? 0) < 10 ? 4 : 2;
  const money = (v: number) => formatMoney(String(v), currency, { decimals });
  const spanDays = data.length > 1 ? (Date.parse(last!.date) - Date.parse(data[0]!.date)) / 86_400_000 : 0;
  const ranges = useMemo(() => RANGES.filter((r) => r.days === Infinity || r.days === -1 || spanDays > r.days * 0.9), [spanDays]);

  // Create the chart once per data set.
  useEffect(() => {
    let alive = true;
    let chart: IChartApi | null = null;
    const byDate = new Map(data.map((p) => [p.date, p]));
    const themeWatch = new MutationObserver(() => {
      if (!chartRef.current) return;
      const t = themeOptions();
      chartRef.current.applyOptions({ layout: t.layout, grid: t.grid, crosshair: t.crosshair });
      areaRef.current?.applyOptions(t.area);
      candleRef.current?.applyOptions(t.candles);
      volumeRef.current?.setData(volumeData(t));
    });
    const volumeData = (t: ReturnType<typeof themeOptions>) =>
      data.map((p) => (p.volume != null && p.volume > 0 ? { time: p.date as Time, value: p.volume, color: hasBar(p) && p.price < p.open! ? t.volumeDown : t.volumeUp } : { time: p.date as Time }));
    (async () => {
      const lw = await import("lightweight-charts");
      if (!alive || !box.current || data.length < 2) return;
      const t = themeOptions();
      chart = lw.createChart(box.current, {
        autoSize: true,
        layout: { ...t.layout, background: { type: lw.ColorType.Solid, color: "rgba(0, 0, 0, 0)" }, attributionLogo: true },
        grid: t.grid,
        crosshair: { mode: lw.CrosshairMode.Magnet, ...t.crosshair },
        rightPriceScale: { borderVisible: false, scaleMargins: { top: 0.1, bottom: volumes ? 0.24 : 0.06 } },
        timeScale: { borderVisible: false, fixLeftEdge: true, fixRightEdge: true, rightOffset: 2, lockVisibleTimeRangeOnResize: true },
        localization: { priceFormatter: (v: number) => formatMoney(String(v), currency, { decimals: v < 10 ? 4 : 2 }) },
        handleScale: { axisPressedMouseMove: { time: true, price: false } },
      });
      const area = chart.addSeries(lw.AreaSeries, { ...t.area, lineWidth: 2, priceLineVisible: false, lastValueVisible: true, crosshairMarkerRadius: 5, crosshairMarkerBorderWidth: 2, visible: !bars });
      area.setData(data.map((p) => ({ time: p.date as Time, value: p.price })));
      areaRef.current = area;
      if (bars) {
        const candles = chart.addSeries(lw.CandlestickSeries, { ...t.candles, priceLineVisible: false, lastValueVisible: true });
        // A day without a full bar is left as a gap, never drawn as a flat candle.
        candles.setData(data.map((p) => (hasBar(p) ? { time: p.date as Time, open: p.open!, high: p.high!, low: p.low!, close: p.price } : { time: p.date as Time })));
        candleRef.current = candles;
      }
      if (volumes) {
        const volume = chart.addSeries(lw.HistogramSeries, { priceFormat: { type: "volume" }, priceScaleId: "volume", lastValueVisible: false, priceLineVisible: false });
        volume.priceScale().applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } });
        volume.setData(volumeData(t));
        volumeRef.current = volume;
      }
      chart.subscribeCrosshairMove((param: MouseEventParams<Time>) => {
        setHover(param.time && typeof param.time === "string" ? (byDate.get(param.time) ?? null) : null);
      });
      chart.timeScale().subscribeVisibleTimeRangeChange((r) => {
        const from = r ? String(r.from) : null;
        setVisibleStart(from ? (data.find((p) => p.date >= from) ?? null) : null);
      });
      chartRef.current = chart;
      themeWatch.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme", "data-depth"] });
      setReady(true);
    })();
    return () => {
      alive = false;
      themeWatch.disconnect();
      chart?.remove();
      chartRef.current = null;
      areaRef.current = null;
      candleRef.current = null;
      volumeRef.current = null;
    };
  }, [data, currency, bars, volumes]);

  // Line or candles.
  useEffect(() => {
    areaRef.current?.applyOptions({ visible: style === "line" || !candleRef.current });
    candleRef.current?.applyOptions({ visible: style === "candles" });
  }, [style, ready]);

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
  const seg = "num !h-8 min-w-10 px-2.5 text-[12px] font-semibold";

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div aria-live="polite" className="min-w-0">
          <p className="figure text-[30px] leading-none text-text">{money(shown.price)}</p>
          <p className="mt-2 flex flex-wrap items-center gap-2 text-[12.5px] text-text-3">
            {change !== null ? <DeltaPill percent={change} size="sm" /> : null}
            <span>
              {hover ? formatDate(shown.date) : `as of ${formatDate(shown.date)}`} · from {formatDate(base.date)}
            </span>
          </p>
          {style === "candles" && hasBar(shown) ? (
            <dl className="num mt-1.5 flex flex-wrap gap-x-3 text-[11.5px] text-text-3">
              {(
                [
                  ["O", shown.open!],
                  ["H", shown.high!],
                  ["L", shown.low!],
                  ["C", shown.price],
                ] as const
              ).map(([k, v]) => (
                <div key={k} className="flex gap-1">
                  <dt>{k}</dt>
                  <dd className="text-text-2">{money(v)}</dd>
                </div>
              ))}
              {shown.volume != null ? (
                <div className="flex gap-1">
                  <dt>Vol</dt>
                  <dd className="text-text-2">{compact(shown.volume)}</dd>
                </div>
              ) : null}
            </dl>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div role="radiogroup" aria-label="Range" className="vio-seg" style={{ "--n": ranges.length, "--i": Math.max(0, ranges.findIndex((r) => r.key === range)) } as React.CSSProperties}>
            <span aria-hidden className="vio-seg-thumb" />
            {ranges.map((r) => (
              <button key={r.key} type="button" role="radio" aria-checked={range === r.key} data-no-ink onClick={() => setRange(r.key)} className={seg}>
                {r.key}
              </button>
            ))}
          </div>
          {bars ? (
            <div role="radiogroup" aria-label="Chart style" className="vio-seg" style={{ "--n": 2, "--i": style === "line" ? 0 : 1 } as React.CSSProperties}>
              <span aria-hidden className="vio-seg-thumb" />
              <button type="button" role="radio" aria-checked={style === "line"} data-no-ink onClick={() => setStyle("line")} className={seg}>
                Line
              </button>
              <button type="button" role="radio" aria-checked={style === "candles"} data-no-ink onClick={() => setStyle("candles")} className={seg}>
                Candles
              </button>
            </div>
          ) : null}
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

      <div
        ref={box}
        className="vio-pro-chart mt-4 h-72 w-full sm:h-96"
        role="img"
        aria-label={`${label}, daily${bars ? " candlesticks" : ""}${volumes ? " with volume" : ""}, ${formatDate(data[0]!.date)} to ${formatDate(last!.date)}. Drag or pinch to move and zoom.`}
      />

      <p className="mt-2 text-[11px] text-text-3">
        Drag to move, pinch or scroll to zoom.{bars ? " Candles: green when the day closed above its open, red below; the wicks are the day's high and low." : ""}
        {volumes ? " Bars underneath: shares traded." : ""} Prices are as traded (not adjusted for splits). Chart by{" "}
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
