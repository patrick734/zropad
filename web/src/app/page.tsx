"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useCoins, useFeed, useStats, type Coin } from "@/lib/api";
import { natSym } from "@/lib/format";
import { CoinCard } from "@/components/coin-card";
import { KingOfTheHill } from "@/components/king";
import { Countdown } from "@/components/countdown";
import { CoinImage } from "@/components/coin-image";

const TABS = [
  ["trending", "🔥 Trending"],
  ["new", "✨ New"],
  ["ignition", "🚀 About to graduate"],
  ["jackpot", "🎰 Biggest jackpots"],
  ["graduated", "🎓 Graduated"],
] as const;

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="panel px-4 py-3">
      <div className="text-xs text-muted">{label}</div>
      <div className="num text-lg font-bold">{value}</div>
    </div>
  );
}

/** Cards flash green or red when their coin trades. */
function useFlashes(coins: Coin[] | undefined) {
  const last = useRef(new Map<string, { trades: number; price: number }>());
  const [flash, setFlash] = useState<Record<string, "buy" | "sell">>({});
  useEffect(() => {
    if (!coins) return;
    const next: Record<string, "buy" | "sell"> = {};
    for (const c of coins) {
      const prev = last.current.get(c.address);
      if (prev && c.trades > prev.trades) next[c.address] = c.price >= prev.price ? "buy" : "sell";
      last.current.set(c.address, { trades: c.trades, price: c.price });
    }
    if (Object.keys(next).length) {
      setFlash(next);
      const t = setTimeout(() => setFlash({}), 1300);
      return () => clearTimeout(t);
    }
  }, [coins]);
  return flash;
}

export default function Home() {
  const [tab, setTab] = useState<(typeof TABS)[number][0]>("trending");
  const [q, setQ] = useState("");
  const { data: coins, isLoading } = useCoins(tab, q);
  const { data: feed } = useFeed();
  const { data: stats } = useStats();
  const { data: ending } = useCoins("jackpot");
  const flash = useFlashes(coins);
  const soon = (ending ?? [])
    .filter((c) => c.jackpot_deadline && c.jackpot_deadline > Date.now() / 1000 && (c.jackpot_pot ?? 0) > 0)
    .sort((a, b) => a.jackpot_deadline! - b.jackpot_deadline!)
    .slice(0, 6);

  return (
    <div className="space-y-6">
      <section className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black leading-tight md:text-5xl">
            Every Zero coin <span className="text-lime">starts here.</span>
          </h1>
          <p className="mt-2 max-w-xl text-muted">Launch in one transaction. Ride the curve to graduation. Be the last buyer when the countdown hits zero and take the jackpot.</p>
        </div>
        <Link href="/launch" className="btn btn-lime px-6 py-3 text-lg">
          🚀 Launch a coin
        </Link>
      </section>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Coins launched" value={String(stats?.coins ?? "—")} />
        <Stat label="Graduated" value={String(stats?.graduated ?? "—")} />
        <Stat label="24h volume" value={stats ? natSym(stats.volume24h, 2) : "—"} />
        <Stat label="Live jackpots" value={stats ? natSym(stats.jackpotsLive, 3) : "—"} />
      </section>

      <KingOfTheHill coin={feed?.king ?? null} />

      {soon.length > 0 && (
        <section>
          <h2 className="mb-2 font-bold">⏳ Jackpots ending soon</h2>
          <div className="flex gap-3 overflow-x-auto pb-1">
            {soon.map((c) => (
              <Link key={c.address} href={`/coin/${c.address}`} className="panel flex min-w-56 items-center gap-3 p-3">
                <CoinImage src={c.image} symbol={c.symbol} size={40} />
                <div>
                  <div className="font-bold">${c.symbol}</div>
                  <div className="num text-sm text-gold">{natSym(c.jackpot_pot, 3)}</div>
                  <Countdown to={c.jackpot_deadline!} className="text-xs text-muted" />
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          {TABS.map(([k, label]) => (
            <button key={k} onClick={() => setTab(k)} className={`rounded-xl px-3 py-2 text-sm font-semibold ${tab === k ? "bg-white text-ink" : "text-muted hover:bg-white/5"}`}>
              {label}
            </button>
          ))}
          <input className="input ml-auto max-w-xs" placeholder="Search name, ticker or address" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        {isLoading ? (
          <div className="text-muted">Loading…</div>
        ) : coins?.length ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {coins.map((c) => (
              <CoinCard key={c.address} coin={c} flash={flash[c.address]} />
            ))}
          </div>
        ) : (
          <div className="panel p-10 text-center text-muted">
            Nothing here yet. <Link href="/launch" className="text-lime">Launch the first coin →</Link>
          </div>
        )}
      </section>
    </div>
  );
}
