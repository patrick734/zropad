"use client";

import Link from "next/link";
import { useState } from "react";
import { Award, Crown, Info } from "lucide-react";
import { useAccount } from "wagmi";
import { useEarners, usePoints, useTraders } from "@/lib/api";
import { explorerAddress } from "@/lib/config";
import { natSym, pnl, short } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/avatar";
import { Empty, Rows, Tabs } from "@/components/column";
import { useMoney } from "@/components/money";

const WINDOWS = [["1d", "1D"], ["1w", "1W"], ["1m", "1M"]] as const;
type W = (typeof WINDOWS)[number][0];
type Person = { wallet: string; value: number; sub: string };

export default function Leaderboard() {
  const [tab, setTab] = useState<"traders" | "earners">("traders");
  const [w, setW] = useState<W>("1d");
  const me = useAccount().address?.toLowerCase();
  const traders = useTraders(w, 100);
  const earners = useEarners(w, 100);
  const points = usePoints();
  const m = useMoney();

  const people: Person[] | undefined =
    tab === "traders"
      ? traders.data?.traders.map((t) => ({ wallet: t.wallet, value: t.pnl, sub: `${t.coins} ${t.coins === 1 ? "coin" : "coins"} · ${natSym(t.volume, 2)} traded` }))
      : earners.data?.earners.map((e) => ({ wallet: e.wallet, value: e.earned, sub: `${e.coins} ${e.coins === 1 ? "coin" : "coins"}` }));
  const fmt = (v: number) => (tab === "traders" ? m.pnl(v) : m.usd(v, false));

  return (
    <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[1fr_340px]">
      <div className="min-w-0 space-y-4">
        <div>
          <h1 className="text-xl font-semibold">Leaderboard</h1>
          <Tabs value={tab} options={[["traders", "Traders"], ["earners", "Creators"]] as const} onChange={setTab} className="mt-2" />
        </div>
        <p className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-xs text-muted-foreground">
          <Info className="size-3.5 shrink-0" />
          {tab === "traders" ? "Profit over the window, counting what you sold and what you still hold at today's price." : "Creator fees earned over the window, paid in the native coin."}
        </p>

        {people && people.length >= 3 && <Podium people={people.slice(0, 3)} fmt={fmt} me={me} />}

        <div className="flex items-center justify-between">
          <Tabs value={w} options={WINDOWS} onChange={setW} />
          <span className="text-xs text-muted-foreground">{tab === "traders" ? "Profit" : "Earned"}</span>
        </div>
        <div className="panel overflow-hidden">
          {!people ? (
            <Rows />
          ) : !people.length ? (
            <Empty>Nobody yet in this window.</Empty>
          ) : (
            people.map((p, i) => (
              <a key={p.wallet} href={explorerAddress(p.wallet)} target="_blank" rel="noreferrer" className={cn("flex items-center gap-3 border-b border-border/60 px-4 py-2.5 last:border-0 hover:bg-secondary/50", p.wallet === me && "bg-primary/5")}>
                <span className={cn("num w-6 text-sm", i < 3 ? "text-gold" : "text-muted-foreground")}>{i + 1}</span>
                <Avatar seed={p.wallet} className="size-8" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{p.wallet === me ? "you" : short(p.wallet)}</p>
                  <p className="text-[11px] text-muted-foreground">{p.sub}</p>
                </div>
                <span className={cn("num font-semibold", tab === "earners" || p.value >= 0 ? "text-up" : "text-down")}>{fmt(p.value)}</span>
              </a>
            ))
          )}
        </div>
      </div>

      <aside className="min-w-0 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-1.5 text-lg font-semibold"><Award className="size-4 text-gold" /> Season points</h2>
          <Link href="/points" className="text-xs text-muted-foreground hover:text-foreground">How to earn</Link>
        </div>
        <div className="panel overflow-hidden">
          {!points.data ? (
            <Rows n={5} />
          ) : points.data.length ? (
            points.data.slice(0, 20).map((r, i) => (
              <div key={r.who} className={cn("flex items-center gap-2.5 border-b border-border/60 px-3 py-2 last:border-0", r.who === me && "bg-primary/5")}>
                <span className={cn("num w-5 text-right text-xs", i < 3 ? "text-gold" : "text-muted-foreground")}>{i + 1}</span>
                <Avatar seed={r.who} className="size-6" />
                <span className="min-w-0 flex-1 truncate text-[13px]">{r.who === me ? "you" : short(r.who)}</span>
                <span className="num text-[13px] font-semibold">{r.points.toLocaleString()}</span>
              </div>
            ))
          ) : (
            <Empty>No points yet.</Empty>
          )}
        </div>
      </aside>
    </div>
  );
}

/** The top three, biggest in the middle. */
function Podium({ people, fmt, me }: { people: Person[]; fmt: (v: number) => string; me?: string }) {
  const [first, second, third] = people;
  const card = (p: Person, rank: number) => (
    <a
      href={explorerAddress(p.wallet)}
      target="_blank"
      rel="noreferrer"
      className={cn("relative flex flex-col items-center gap-2 rounded-xl border bg-card p-4 text-center transition-colors hover:bg-secondary/50", rank === 1 ? "border-gold/50 pb-6 pt-6" : "mt-6 border-border")}
    >
      {rank === 1 && <Crown className="absolute -top-3 size-6 fill-gold text-gold" />}
      <span className={cn("absolute left-3 top-2 text-2xl font-bold", rank === 1 ? "text-gold" : "text-muted-foreground")}>{rank}</span>
      <Avatar seed={p.wallet} className={rank === 1 ? "size-20" : "size-14"} />
      <p className="max-w-full truncate font-semibold">{p.wallet === me ? "you" : short(p.wallet)}</p>
      <p className={cn("num text-sm font-semibold", p.value >= 0 ? "text-up" : "text-down")}>{fmt(p.value)}</p>
    </a>
  );
  return (
    <div className="grid grid-cols-3 items-start gap-3">
      {card(second, 2)}
      {card(first, 1)}
      {card(third, 3)}
    </div>
  );
}
