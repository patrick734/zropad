import Link from "next/link";
import type { Coin } from "@/lib/api";
import { ago, natSym, pct } from "@/lib/format";
import { CoinImage } from "./coin-image";
import { Countdown } from "./countdown";

export function Progress({ value, graduated }: { value: number; graduated: boolean }) {
  return (
    <div className="h-2 overflow-hidden rounded-full bg-white/10">
      <div className={`h-full rounded-full ${graduated ? "bg-violet" : "bg-lime"}`} style={{ width: `${Math.min(100, value * 100)}%` }} />
    </div>
  );
}

export function CoinCard({ coin, flash }: { coin: Coin; flash?: "buy" | "sell" }) {
  return (
    <Link href={`/coin/${coin.address}`} className={`panel block p-4 transition hover:border-lime/50 ${flash ? `flash-${flash}` : ""}`}>
      <div className="flex gap-3">
        <CoinImage src={coin.image} symbol={coin.symbol} size={56} />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <span className="truncate font-bold">{coin.name}</span>
            <span className="text-sm text-muted">${coin.symbol}</span>
          </div>
          <div className="num text-sm text-lime">MC {natSym(coin.mcap, 2)}</div>
          <div className="mt-1 flex flex-wrap gap-1.5 text-[11px] font-semibold">
            <span className={`rounded-md px-1.5 py-0.5 ${coin.creator_fee_bps >= 1000 ? "bg-gold/15 text-gold" : "bg-white/5 text-muted"}`}>Creator fee {pct(coin.creator_fee_bps)}</span>
            {coin.graduated ? <span className="rounded-md bg-violet/20 px-1.5 py-0.5 text-violet">Graduated</span> : null}
            <span className="rounded-md bg-white/5 px-1.5 py-0.5 text-muted">{ago(coin.created_at)} ago</span>
          </div>
        </div>
      </div>
      <div className="mt-3">
        <Progress value={coin.progress} graduated={!!coin.graduated} />
        <div className="mt-1.5 flex justify-between text-xs text-muted">
          <span>{coin.graduated ? "In the pool" : `${Math.floor(coin.progress * 100)}% to graduation`}</span>
          {coin.jackpot_deadline ? (
            <span>
              🎰 <span className="text-gold">{natSym(coin.jackpot_pot ?? 0, 3)}</span> · <Countdown to={coin.jackpot_deadline} />
            </span>
          ) : null}
        </div>
      </div>
    </Link>
  );
}
