"use client";

import { useEffect, useRef } from "react";
import { createChart, type IChartApi, type ISeriesApi, type UTCTimestamp } from "lightweight-charts";
import { SUPPLY } from "@/lib/config";

type Candle = { time: number; open: number; high: number; low: number; close: number; volume: number };

const UP = "#7ef29d";
const DOWN = "#f07a63";

/** Market-cap candles (price x 1B supply), in dollars when the native price is known, with volume bars under them. */
export function Chart({ candles, usd }: { candles: Candle[]; usd?: number | null }) {
  const el = useRef<HTMLDivElement>(null);
  const chart = useRef<IChartApi | null>(null);
  const series = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volume = useRef<ISeriesApi<"Histogram"> | null>(null);

  useEffect(() => {
    if (!el.current) return;
    const c = createChart(el.current, {
      layout: { background: { color: "transparent" }, textColor: "#8b9098", fontFamily: "var(--font-geist-mono), monospace", fontSize: 11 },
      grid: { vertLines: { color: "#15161a" }, horzLines: { color: "#15161a" } },
      rightPriceScale: { borderColor: "#1e2023" },
      timeScale: { borderColor: "#1e2023", timeVisible: true, secondsVisible: false },
      crosshair: { mode: 0 },
      autoSize: true,
    });
    series.current = c.addCandlestickSeries({
      upColor: UP,
      downColor: DOWN,
      wickUpColor: UP,
      wickDownColor: DOWN,
      borderVisible: false,
      priceFormat: { type: "price", precision: 4, minMove: 0.0001 },
    });
    volume.current = c.addHistogramSeries({ priceScaleId: "", priceFormat: { type: "volume" } });
    volume.current.priceScale().applyOptions({ scaleMargins: { top: 0.85, bottom: 0 } });
    chart.current = c;
    return () => c.remove();
  }, []);

  useEffect(() => {
    if (!series.current || !volume.current) return;
    const f = SUPPLY * (usd ?? 1);
    series.current.applyOptions({ priceFormat: usd ? { type: "price", precision: 0, minMove: 1 } : { type: "price", precision: 4, minMove: 0.0001 } });
    series.current.setData(candles.map((k) => ({ time: k.time as UTCTimestamp, open: k.open * f, high: k.high * f, low: k.low * f, close: k.close * f })));
    volume.current.setData(candles.map((k) => ({ time: k.time as UTCTimestamp, value: k.volume * (usd ?? 1), color: k.close >= k.open ? `${UP}55` : `${DOWN}55` })));
  }, [candles, usd]);

  return <div ref={el} className="h-[380px] w-full lg:h-[440px]" />;
}
