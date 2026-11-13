"use client";

import { useQuery } from "@tanstack/react-query";
import type { Coin, Trade } from "./queries";

export type { Coin, Trade };
export type FeedItem = { kind: "trade" | "launch" | "graduated" | "jackpot"; tx: string; coin: string; who?: string; is_buy?: number; native?: number; tokens?: number; time: number; early?: number; symbol: string; name: string; image: string | null };
export type Stats = { coins: number; graduated: number; live: number; volume24h: number; creatorFees: number; jackpotsPaid: number; jackpotsLive: number; traders: number };
export type CoinDetail = { coin: Coin; trades: Trade[]; holders: { holder: string; amount: number; share: number; isMarket: boolean }[]; candles: { time: number; open: number; high: number; low: number; close: number; volume: number }[] };

const get = async <T,>(url: string): Promise<T> => {
  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error ?? r.statusText);
  return r.json();
};

/** Live data, refreshed every couple of seconds. */
export const useCoins = (sort: string, q = "") => useQuery({ queryKey: ["coins", sort, q], queryFn: () => get<Coin[]>(`/api/coins?sort=${sort}&q=${encodeURIComponent(q)}`), refetchInterval: 3000 });
export const useFeed = () => useQuery({ queryKey: ["feed"], queryFn: () => get<{ feed: FeedItem[]; king: Coin | null }>("/api/feed"), refetchInterval: 2000 });
export const useStats = () => useQuery({ queryKey: ["stats"], queryFn: () => get<Stats>("/api/stats"), refetchInterval: 5000 });
export const useCoin = (address: string, interval = 60) => useQuery({ queryKey: ["coin", address, interval], queryFn: () => get<CoinDetail>(`/api/coin/${address}?interval=${interval}`), refetchInterval: 2000 });
export const usePoints = () => useQuery({ queryKey: ["points"], queryFn: () => get<{ who: string; points: number }[]>("/api/points"), refetchInterval: 10000 });
export const useWallet = (address?: string) =>
  useQuery({ queryKey: ["wallet", address], enabled: !!address, queryFn: () => get<{ created: Coin[]; holdings: { coin: string; amount: number; symbol: string; name: string; image: string | null; value: number }[]; wins: { coin: string; symbol: string; amount: number; round: number; time: number }[] }>(`/api/wallet/${address}`), refetchInterval: 5000 });
