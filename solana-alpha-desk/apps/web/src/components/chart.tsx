'use client';

import { useEffect, useRef } from 'react';
import {
  AreaSeries,
  ColorType,
  createChart,
  LineSeries,
  LineStyle,
  type IChartApi,
  type UTCTimestamp,
} from 'lightweight-charts';

export interface Point {
  at: number; // ms
  value: number;
}

/** Time-series chart (lightweight-charts). Optional horizontal lines mark stops and entries. */
export function TimeChart({
  points,
  height = 240,
  kind = 'area',
  color = '#8a94ff',
  lines = [],
  format = 'price',
}: {
  points: Point[];
  height?: number;
  kind?: 'area' | 'line';
  color?: string;
  lines?: Array<{ value: number; color: string; title: string }>;
  format?: 'price' | 'usd';
}) {
  const el = useRef<HTMLDivElement>(null);
  const chart = useRef<IChartApi | null>(null);
  useEffect(() => {
    if (!el.current) return;
    const c = createChart(el.current, {
      height,
      autoSize: true,
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#6c7486',
        fontFamily: 'var(--font-plex-mono)',
        fontSize: 11,
        attributionLogo: false,
      },
      grid: { vertLines: { color: '#161a22' }, horzLines: { color: '#161a22' } },
      rightPriceScale: { borderColor: '#1f2531' },
      timeScale: { borderColor: '#1f2531', timeVisible: true, secondsVisible: false },
      crosshair: { vertLine: { color: '#2a3140' }, horzLine: { color: '#2a3140' } },
      localization: {
        priceFormatter: (p: number) =>
          format === 'usd'
            ? `$${p.toLocaleString('en-US', { maximumFractionDigits: 2 })}`
            : p < 0.01
              ? p.toPrecision(4)
              : p.toFixed(4),
      },
    });
    chart.current = c;
    const series =
      kind === 'area'
        ? c.addSeries(AreaSeries, {
            lineColor: color,
            topColor: `${color}33`,
            bottomColor: `${color}00`,
            lineWidth: 2,
            priceLineVisible: false,
          })
        : c.addSeries(LineSeries, { color, lineWidth: 2, priceLineVisible: false });
    const seen = new Set<number>();
    const data = [...points]
      .sort((a, b) => a.at - b.at)
      .map((p) => ({ time: Math.floor(p.at / 1000) as UTCTimestamp, value: p.value }))
      .filter((p) => (seen.has(p.time) ? false : (seen.add(p.time), true)));
    series.setData(data);
    for (const l of lines)
      series.createPriceLine({
        price: l.value,
        color: l.color,
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: l.title,
      });
    c.timeScale().fitContent();
    return () => {
      c.remove();
      chart.current = null;
    };
  }, [points, height, kind, color, lines, format]);
  return <div ref={el} style={{ height }} className="w-full" />;
}
