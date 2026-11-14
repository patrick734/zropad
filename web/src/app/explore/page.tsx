"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Clock, Coins, Flame, GraduationCap, LayoutGrid, Rocket, Search, Sparkles, Table2, Timer, TrendingUp } from "lucide-react";
import { useCoins, useFeed } from "@/lib/api";
import { ago, nat, natSym, pct } from "@/lib/format";
import { cn } from "@/lib/utils";
import { CoinCard } from "@/components/coin-card";
import { Badges, Thumb } from "@/components/coin-rows";
import { Change } from "@/components/change";
import { Countdown } from "@/components/countdown";
import { Empty, Rows } from "@/components/column";

const TABS = [
  { id: "movers", label: "Movers", icon: TrendingUp },
  { id: "trending", label: "Trending", icon: Flame },
  { id: "new", label: "New", icon: Sparkles },
  { id: "mcap", label: "Market cap", icon: Coins },
  { id: "last_trade", label: "Last trade", icon: Rocket },
  { id: "ignition", label: "Almost there", icon: Rocket },
  { id: "graduated", label: "Graduated", icon: GraduationCap },
  { id: "jackpot", label: "Biggest jackpots", icon: Timer },
  { id: "oldest", label: "Oldest", icon: Clock },
] as const;
type Tab = (typeof TABS)[number]["id"];

export default function Explore() {
  const [tab, setTab] = useState<Tab>("trending");
  const [view, setView] = useState<"table" | "grid">("table");
  const [q, setQ] = useState("");
  const [query, setQuery] = useState("");
  const { data } = useCoins(tab, query, 24, 100);
  const king = useFeed().data?.king?.address;

  useEffect(() => {
    try {
      const v = localStorage.getItem("zropad-explore-view");
      if (v === "grid" || v === "table") setView(v);
    } catch {}
  }, []);
  useEffect(() => {
    const t = setTimeout(() => setQuery(q.trim()), 250);
    return () => clearTimeout(t);
  }, [q]);
  const pickView = (v: "table" | "grid") => {
    setView(v);
    try {
      localStorage.setItem("zropad-explore-view", v);
    } catch {}
  };

  return (
    <div className="mx-auto max-w-[1600px] space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-semibold">Explore coins</h1>
        <div className="relative ml-auto w-full max-w-xs sm:w-64">
          <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <input className="field h-8 pl-8 text-xs" placeholder="Filter by name, ticker or address" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="flex rounded-lg border border-border p-0.5">
          {([["grid", LayoutGrid, "Grid"], ["table", Table2, "Table"]] as const).map(([v, Icon, label]) => (
            <button key={v} onClick={() => pickView(v)} className={cn("tab inline-flex items-center gap-1", view === v && "tab-on")}>
              <Icon className="size-3.5" /> {label}
            </button>
          ))}
        </div>
      </div>
      <div className="flex gap-1 overflow-x-auto pb-1">
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} className={cn("tab inline-flex items-center gap-1.5", tab === t.id && "tab-green")}>
            <t.icon className="size-3.5" /> {t.label}
          </button>
        ))}
      </div>

      {!data ? (
        <div className="panel"><Rows /></div>
      ) : !data.length ? (
        <div className="panel"><Empty>No coins here yet. <Link href="/create" className="text-primary">Launch one.</Link></Empty></div>
      ) : view === "grid" ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {data.map((c) => <CoinCard key={c.address} coin={c} king={c.address === king} />)}
        </div>
      ) : (
        <div className="panel overflow-x-auto">
          <table className="w-full min-w-[900px] text-xs">
            <thead className="text-left text-muted-foreground">
              <tr className="border-b">
                <th className="px-3 py-2 font-normal">Coin</th>
                <th className="px-3 py-2 text-right font-normal">Market cap</th>
                <th className="px-3 py-2 text-right font-normal">24h</th>
                <th className="px-3 py-2 text-right font-normal">24h vol</th>
                <th className="px-3 py-2 text-right font-normal">Holders</th>
                <th className="px-3 py-2 font-normal">Progress</th>
                <th className="px-3 py-2 text-right font-normal">Jackpot</th>
                <th className="px-3 py-2 text-right font-normal">Fee</th>
                <th className="px-3 py-2 text-right font-normal">Age</th>
              </tr>
            </thead>
            <tbody>
              {data.map((c) => (
                <tr key={c.address} className="border-b last:border-0 hover:bg-secondary/40">
                  <td className="px-3 py-2">
                    <Link href={`/coin/${c.address}`} className="flex items-center gap-2.5">
                      <Thumb c={c} size="size-8" />
                      <span className="min-w-0">
                        <span className="flex items-center gap-1 font-semibold">{c.symbol} <Badges c={c} king={c.address === king} /></span>
                        <span className="block max-w-40 truncate text-muted-foreground">{c.name}</span>
                      </span>
                    </Link>
                  </td>
                  <td className="num px-3 py-2 text-right font-semibold">{natSym(c.mcap, 2)}</td>
                  <td className="px-3 py-2 text-right"><Change value={c.change24h} /></td>
                  <td className="num px-3 py-2 text-right">{nat(c.volume24h, 3)}</td>
                  <td className="num px-3 py-2 text-right">{c.holders}</td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-secondary"><div className={cn("h-full rounded-full", c.graduated ? "bg-gold" : "bg-up")} style={{ width: `${c.progress * 100}%` }} /></div>
                      <span className="num text-muted-foreground">{Math.floor(c.progress * 100)}%</span>
                    </div>
                  </td>
                  <td className="num px-3 py-2 text-right">
                    {(c.jackpot_pot ?? 0) > 0 && (c.jackpot_deadline ?? 0) > Date.now() / 1000 ? (
                      <span className="text-gold">{nat(c.jackpot_pot ?? 0, 3)} · <Countdown to={c.jackpot_deadline ?? 0} /></span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className={cn("num px-3 py-2 text-right", c.creator_fee_bps >= 1000 && "text-gold")}>{pct(c.creator_fee_bps)}</td>
                  <td className="px-3 py-2 text-right text-muted-foreground">{ago(c.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
