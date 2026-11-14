"use client";

import Link from "next/link";
import { Crown, GraduationCap, Timer, Users } from "lucide-react";
import type { Coin } from "@/lib/api";
import { ago, nat, natSym, pct } from "@/lib/format";
import { cn } from "@/lib/utils";
import { CoinImage } from "./coin-image";
import { Change } from "./change";
import { Countdown } from "./countdown";

/** Price of one whole coin, in the native coin. */
export const unitPrice = (p: number) => natSym(p, 4);

/** Little marks next to a name: graduated, king of the hill. */
export function Badges({ c, king }: { c: Coin; king?: boolean }) {
  return (
    <>
      {c.graduated ? <GraduationCap className="size-3.5 shrink-0 text-primary" aria-label="Graduated" /> : null}
      {king && <Crown className="size-3 shrink-0 text-gold" aria-label="King of the hill" />}
    </>
  );
}

/** A coin's picture with its curve progress as a bar under it. */
export function Thumb({ c, size = "size-10" }: { c: Coin; size?: string }) {
  return (
    <div className="relative shrink-0">
      <CoinImage src={c.image} symbol={c.symbol} address={c.address} className={size} />
      <div className="absolute inset-x-0.5 -bottom-1 h-1 overflow-hidden rounded-full bg-background">
        <div className={cn("h-full rounded-full", c.graduated ? "bg-gold" : "bg-up")} style={{ width: `${Math.max(4, c.progress * 100)}%` }} />
      </div>
    </div>
  );
}

/** Trending: picture, name, price; market cap and change over the window on the right. */
export function TrendingRow({ c, hot, king, flash }: { c: Coin; hot?: boolean; king?: boolean; flash?: "up" | "down" }) {
  return (
    <Link href={`/coin/${c.address}`} className={cn("flex items-center gap-2.5 border-b border-border/60 px-3 py-2 hover:bg-secondary/60", flash === "up" && "flash", flash === "down" && "flash-down")}>
      <Thumb c={c} />
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1 truncate text-[13px] font-semibold">
          <span className="truncate">{c.symbol}</span>
          <Badges c={c} king={king} />
          {hot && <span className="chip bg-down/15 text-down">HOT</span>}
        </p>
        <p className="num truncate text-[11px] text-muted-foreground">{unitPrice(c.price)}</p>
      </div>
      <div className="text-right">
        <p className="num text-[13px] font-semibold">{natSym(c.mcap, 2)}</p>
        <Change value={c.change_window} className="text-[11px]" />
      </div>
    </Link>
  );
}

/** Dense screener row: age, holders, trades, fee, top-10 and dev shares, volume and market cap. */
export function ScreenerRow({ c, king }: { c: Coin; king?: boolean }) {
  return (
    <Link href={`/coin/${c.address}`} className="flex gap-2.5 border-b border-border/60 px-3 py-2.5 hover:bg-secondary/40">
      <Thumb c={c} size="size-12" />
      <div className="min-w-0 flex-1">
        <p className="flex min-w-0 items-center gap-1 text-[13px]">
          <span className="shrink-0 font-semibold">{c.symbol}</span>
          <span className="min-w-0 truncate text-muted-foreground">{c.name}</span>
          <Badges c={c} king={king} />
        </p>
        <div className="num mt-0.5 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[11px] text-muted-foreground">
          <span className="text-up">{ago(c.created_at)}</span>
          <span className="inline-flex items-center gap-0.5"><Users className="size-3" />{c.holders}</span>
          <span>{c.trades} tx</span>
          <span className={c.creator_fee_bps >= 1000 ? "text-gold" : undefined}>fee {pct(c.creator_fee_bps)}</span>
          {!c.graduated && <span>{Math.floor(c.progress * 100)}%</span>}
        </div>
        <div className="num mt-1 flex gap-1 overflow-hidden whitespace-nowrap text-[10px]">
          <span className={cn("chip", c.top10 > 50 ? "bg-down/10 text-down" : "bg-up/10 text-up")}>top10 {c.top10.toFixed(0)}%</span>
          <span className={cn("chip", c.dev_pct > 10 ? "bg-down/10 text-down" : "bg-up/10 text-up")}>dev {c.dev_pct.toFixed(1)}%</span>
        </div>
      </div>
      <div className="num shrink-0 text-right text-[11px] leading-tight">
        <p><span className="text-muted-foreground">MC </span><span className="font-semibold">{nat(c.mcap, 3)}</span></p>
        <p><span className="text-muted-foreground">V </span>{nat(c.volume24h, 3)}</p>
        {(c.jackpot_pot ?? 0) > 0 && (c.jackpot_deadline ?? 0) > Date.now() / 1000 ? (
          <p className="mt-1 inline-flex items-center gap-0.5 text-gold"><Timer className="size-3" /><Countdown to={c.jackpot_deadline} /></p>
        ) : null}
      </div>
    </Link>
  );
}
