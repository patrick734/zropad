"use client";

import Link from "next/link";
import { useFeed, useTraders, type FeedItem } from "@/lib/api";
import { compact, nat, pnl, short } from "@/lib/format";
import { NATIVE } from "@/lib/config";
import { Avatar } from "./avatar";
import { CoinImage } from "./coin-image";
import { useMoney } from "./money";

function Trade({ f }: { f: FeedItem }) {
  const kind = f.kind === "trade" ? (f.is_buy ? "buy" : "sell") : f.kind === "launch" ? "new" : f.kind === "graduated" ? "graduated" : "jackpot";
  return (
    <Link href={`/coin/${f.coin}`} className="inline-flex shrink-0 items-center gap-1.5 px-3 text-xs">
      <span className={kind === "buy" || kind === "graduated" ? "text-up" : kind === "sell" ? "text-down" : "text-gold"}>{kind}</span>
      {f.who && <span className="text-muted-foreground">{short(f.who)}</span>}
      {f.kind === "trade" && <span className="num">{nat(f.native, 3)} {NATIVE}</span>}
      {f.kind === "jackpot" && <span className="num text-gold">won {nat(f.native, 3)} {NATIVE}</span>}
      {f.kind === "trade" && f.tokens ? <span className="num text-muted-foreground">{compact(f.tokens)}</span> : null}
      <CoinImage src={f.image} symbol={f.symbol} address={f.coin} className="size-4 rounded" />
      <span className="font-medium">${f.symbol}</span>
    </Link>
  );
}

/** The strip under the top bar: today's best traders and their profit, or the latest trades before anyone's up. */
export function Ticker() {
  const traders = useTraders("1d", 30).data?.traders;
  const m = useMoney();
  const winners = (traders ?? []).filter((t) => t.pnl > 0);
  const feed = useFeed().data?.feed ?? [];

  const items = winners.length
    ? winners.map((t) => (
        <Link key={t.wallet} href="/leaderboard" className="inline-flex shrink-0 items-center gap-1.5 px-3 text-xs hover:text-foreground">
          <Avatar seed={t.wallet} className="size-4" />
          <span className="text-muted-foreground">@{short(t.wallet)}</span>
          <span className="num font-medium text-up">{m.pnl(t.pnl)}</span>
        </Link>
      ))
    : feed.map((f, i) => <Trade key={i} f={f} />);

  return (
    <div className="h-8 overflow-hidden border-b border-border">
      {items.length > 0 ? (
        <div className="tape flex h-8 w-max items-center">
          <div className="flex">{items}</div>
          <div className="flex" aria-hidden>{items}</div>
        </div>
      ) : (
        <p className="flex h-8 items-center px-3 text-xs text-muted-foreground">Quiet so far. Launch the first coin and it shows up here.</p>
      )}
    </div>
  );
}
