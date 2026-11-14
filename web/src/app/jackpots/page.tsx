"use client";

import Link from "next/link";
import { Crown, Timer } from "lucide-react";
import { useCoins, useFeed, useStats } from "@/lib/api";
import { natSym, short } from "@/lib/format";
import { CoinImage } from "@/components/coin-image";
import { Countdown } from "@/components/countdown";
import { Empty, Rows } from "@/components/column";
import { CurveProgress } from "@/components/progress";

/** Every live jackpot, the one about to pay out first, and the King of the Hill. */
export default function Jackpots() {
  const { data } = useCoins("ending", "", 1, 100);
  const stats = useStats().data;
  const king = useFeed().data?.king;
  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-semibold"><Timer className="size-5 text-gold" /> Jackpots</h1>
        <p className="mt-1 text-sm text-muted-foreground">Every coin has a pot and a countdown. Each buy makes you the last buyer and adds 30 seconds. When it hits zero, the last buyer wins 90%.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <Box k="In live pots" v={natSym(stats?.jackpotsLive ?? 0, 3)} gold />
        <Box k="Paid to winners" v={natSym(stats?.jackpotsPaid ?? 0, 3)} />
        <Box k="Live countdowns" v={String(data?.length ?? 0)} />
      </div>
      {king && (
        <Link href={`/coin/${king.address}`} className="glow flex items-center gap-4 rounded-xl border border-gold/40 bg-gold/5 p-4 hover:bg-gold/10">
          <CoinImage src={king.image} symbol={king.symbol} address={king.address} className="size-14 rounded-lg" />
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-gold"><Crown className="size-3.5" /> King of the hill</p>
            <p className="truncate font-semibold">{king.name} <span className="font-normal text-muted-foreground">${king.symbol}</span></p>
            <CurveProgress value={king.progress} className="mt-1.5 h-1.5 max-w-sm" />
          </div>
          <div className="text-right">
            <p className="num font-semibold text-gold">{natSym(king.jackpot_pot ?? 0, 3)}</p>
            {king.jackpot_deadline ? <Countdown to={king.jackpot_deadline} className="text-xs" /> : null}
          </div>
        </Link>
      )}
      {!data ? (
        <div className="panel"><Rows /></div>
      ) : data.length ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((c, i) => (
            <Link key={c.address} href={`/coin/${c.address}`} className={`panel block p-4 transition-colors hover:border-input hover:bg-accent/40 ${i === 0 ? "border-gold/40" : ""}`}>
              <div className="flex items-center gap-2.5">
                <CoinImage src={c.image} symbol={c.symbol} address={c.address} className="size-10" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-semibold">{c.name}</p>
                  <p className="text-[11px] text-muted-foreground">${c.symbol} · round {c.jackpot_round}</p>
                </div>
                {i === 0 && <span className="chip bg-gold/10 text-gold">next</span>}
              </div>
              <div className="mt-3 flex items-end justify-between">
                <p className="num text-xl font-semibold text-gold">{natSym(c.jackpot_pot ?? 0, 4)}</p>
                <Countdown to={c.jackpot_deadline ?? 0} className="text-lg font-semibold" />
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">{c.jackpot_last_buyer ? <>last buyer {short(c.jackpot_last_buyer)}</> : "no buyer this round yet"}</p>
            </Link>
          ))}
        </div>
      ) : (
        <div className="panel"><Empty>No live jackpots right now. Buy any coin to start its countdown.</Empty></div>
      )}
    </div>
  );
}

function Box({ k, v, gold }: { k: string; v: string; gold?: boolean }) {
  return (
    <div className="panel p-4">
      <p className="text-[11px] text-muted-foreground">{k}</p>
      <p className={`num mt-0.5 text-xl font-semibold ${gold ? "text-gold" : ""}`}>{v}</p>
    </div>
  );
}
