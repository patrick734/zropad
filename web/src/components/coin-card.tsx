import Link from "next/link";
import { Timer } from "lucide-react";
import type { Coin } from "@/lib/api";
import { ago, natSym, pct, short } from "@/lib/format";
import { Badges } from "./coin-rows";
import { CoinImage } from "./coin-image";
import { CurveProgress } from "./progress";
import { Change } from "./change";
import { Countdown } from "./countdown";

/** A coin as a card: picture, name, market cap, curve progress and its jackpot. */
export function CoinCard({ coin: c, king }: { coin: Coin; king?: boolean }) {
  return (
    <Link href={`/coin/${c.address}`} className="panel flex gap-3 p-3 transition-colors hover:border-input hover:bg-accent/40">
      <CoinImage src={c.image} symbol={c.symbol} address={c.address} className="size-20 rounded-lg" />
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1 truncate text-[13px] font-semibold">
          <span className="truncate">{c.name}</span>
          <span className="font-normal text-muted-foreground">${c.symbol}</span>
          <Badges c={c} king={king} />
        </p>
        <p className="text-[11px] text-muted-foreground">
          by {short(c.creator)} · {ago(c.created_at)} ago · fee <span className={c.creator_fee_bps >= 1000 ? "text-gold" : undefined}>{pct(c.creator_fee_bps)}</span>
        </p>
        <p className="num mt-1 text-[13px]">
          <span className="text-muted-foreground">MC </span>
          <span className="font-semibold">{natSym(c.mcap, 2)}</span> <Change value={c.change24h} className="text-[11px]" />
        </p>
        <CurveProgress value={c.progress} graduated={!!c.graduated} className="mt-1.5 h-1.5" />
        {(c.jackpot_pot ?? 0) > 0 && c.jackpot_deadline ? (
          <p className="num mt-1.5 flex items-center gap-1 text-[11px] text-gold">
            <Timer className="size-3" /> {natSym(c.jackpot_pot, 3)} · <Countdown to={c.jackpot_deadline} />
          </p>
        ) : null}
      </div>
    </Link>
  );
}
