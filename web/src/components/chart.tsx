"use client";

import { useEffect, useRef } from "react";
import { createChart, type IChartApi, type ISeriesApi, type UTCTimestamp } from "lightweight-charts";
import { SUPPLY } from "@/lib/config";

type Candle = { time: number; open: number; high: number; low: number; close: number; volume: number };

/** Market-cap candles (price x 1B supply), in the native coin. */
export function Chart({ candles }: { candles: Candle[] }) {
  const el = useRef<HTMLDivElement>(null);
  const chart = useRef<IChartApi | null>(null);
  const series = useRef<ISeriesApi<"Candlestick"> | null>(null);

  useEffect(() => {
    if (!el.current) return;
    const c = createChart(el.current, {
      layout: { background: { color: "transparent" }, textColor: "#8a8fa3", fontFamily: "JetBrains Mono, monospace" },
      grid: { vertLines: { color: "#161824" }, horzLines: { color: "#161824" } },
      rightPriceScale: { borderColor: "#1f2230" },
      timeScale: { borderColor: "#1f2230", timeVisible: true, secondsVisible: false },
      autoSize: true,
    });
    series.current = c.addCandlestickSeries({
      upColor: "#2ee59d",
      downColor: "#ff4d6d",
      wickUpColor: "#2ee59d",
      wickDownColor: "#ff4d6d",
      borderVisible: false,
      priceFormat: { type: "price", precision: 4, minMove: 0.0001 },
    });
    chart.current = c;
    return () => c.remove();
  }, []);

  useEffect(() => {
    if (!series.current) return;
    series.current.setData(
      candles.map((k) => ({ time: k.time as UTCTimestamp, open: k.open * SUPPLY, high: k.high * SUPPLY, low: k.low * SUPPLY, close: k.close * SUPPLY })),
    );
  }, [candles]);

  return <div ref={el} className="h-80 w-full" />;
}
