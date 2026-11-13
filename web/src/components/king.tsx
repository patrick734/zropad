import Link from "next/link";
import type { Coin } from "@/lib/api";
import { natSym, pct, short } from "@/lib/format";
import { CoinImage } from "./coin-image";
import { Progress } from "./coin-card";
import { Countdown } from "./countdown";

/** The coin closest to graduating gets the spotlight. */
export function KingOfTheHill({ coin }: { coin: Coin | null }) {
  if (!coin)
    return (
      <div className="panel p-6 text-center text-muted">
        👑 <b className="text-white">King of the Hill</b> is empty. The coin closest to graduating takes the crown.
      </div>
    );
  return (
    <Link href={`/coin/${coin.address}`} className="panel glow block border-lime/40 p-5">
      <div className="mb-3 text-xs font-bold tracking-widest text-lime">👑 KING OF THE HILL</div>
      <div className="flex flex-wrap items-center gap-4">
        <CoinImage src={coin.image} symbol={coin.symbol} size={84} />
        <div className="min-w-0 flex-1">
          <div className="text-2xl font-black">
            {coin.name} <span className="text-lg text-muted">${coin.symbol}</span>
          </div>
          <div className="num text-lime">MC {natSym(coin.mcap, 2)} · raised {natSym(coin.raised, 3)}</div>
          <div className="text-sm text-muted">by {short(coin.creator)} · creator fee {pct(coin.creator_fee_bps)}</div>
        </div>
        {coin.jackpot_deadline ? (
          <div className="rounded-xl bg-gold/10 px-4 py-3 text-center">
            <div className="text-xs font-bold text-gold">JACKPOT</div>
            <div className="num text-xl font-bold text-gold">{natSym(coin.jackpot_pot ?? 0, 3)}</div>
            <Countdown to={coin.jackpot_deadline} className="text-sm" />
          </div>
        ) : null}
      </div>
      <div className="mt-4">
        <Progress value={coin.progress} graduated={false} />
        <div className="mt-1 text-xs text-muted">{Math.floor(coin.progress * 100)}% of the way to graduation</div>
      </div>
    </Link>
  );
}
