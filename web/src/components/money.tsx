"use client";

import { useNativeUsd } from "@/lib/api";
import { usd, usdPnl } from "@/lib/format";

/** Formatters for dollar amounts at the live native price. */
export function useMoney() {
  const price = useNativeUsd();
  return {
    price,
    usd: (v: number | null | undefined, compact = true) => usd(v, price, { compact }),
    pnl: (v: number) => usdPnl(v, price),
  };
}
