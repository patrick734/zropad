"use client";

import Link from "next/link";
import { useFeed, type FeedItem } from "@/lib/api";
import { compact, nat, short } from "@/lib/format";
import { NATIVE } from "@/lib/config";
import { CoinImage } from "./coin-image";

function Item({ f }: { f: FeedItem }) {
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
      {f.early ? <span className="chip bg-up/10 px-1 text-[10px] text-up">early</span> : null}
    </Link>
  );
}

/** The strip under the top bar: every buy, sell, launch, graduation and jackpot win, live. */
export function Ticker() {
  const { data } = useFeed();
  const items = data?.feed ?? [];
  return (
    <div className="h-8 overflow-hidden border-b border-border">
      {items.length > 0 ? (
        <div className="tape flex h-8 w-max items-center">
          <div className="flex">{items.map((f, i) => <Item key={i} f={f} />)}</div>
          <div className="flex" aria-hidden>{items.map((f, i) => <Item key={i} f={f} />)}</div>
        </div>
      ) : (
        <p className="flex h-8 items-center px-3 text-xs text-muted-foreground">Quiet so far. Launch the first coin and it shows up here.</p>
      )}
    </div>
  );
}
