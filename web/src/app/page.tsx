"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Award, Crown, Flame, Radar, Timer, Trophy } from "lucide-react";
import { useAccount } from "wagmi";
import { useCoins, useFeed, usePoints, useTraders, type Coin } from "@/lib/api";
import { ZROPAD } from "@/lib/config";
import { natSym, pct, pnl, short } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Column, Empty, Rows, Tabs } from "@/components/column";
import { ScreenerRow, Thumb, TrendingRow } from "@/components/coin-rows";
import { Avatar } from "@/components/avatar";
import { CoinImage } from "@/components/coin-image";
import { CurveProgress } from "@/components/progress";
import { useMoney } from "@/components/money";
import { Countdown } from "@/components/countdown";

const PANES = [
  ["trending", "Trending"],
  ["jackpots", "Jackpots"],
  ["leaders", "Leaderboard"],
  ["points", "Points"],
  ["screener", "Screener"],
] as const;
type Pane = (typeof PANES)[number][0];

/** The home terminal: five live panes side by side on desktop, one at a time on phones. */
export default function Home() {
  const [pane, setPane] = useState<Pane>("trending");
  const show = (p: Pane) => cn(pane === p ? "flex" : "hidden", "xl:flex");
  const king = useFeed().data?.king?.address;
  return (
    <div className="space-y-3">
      {!ZROPAD && <div className="rounded-lg border border-gold/30 bg-gold/5 px-3 py-2 text-xs text-gold">Launches open as soon as the contracts are live.</div>}
      <Tabs value={pane} options={PANES} onChange={setPane} className="overflow-x-auto xl:hidden" />
      <div className="grid h-[calc(100dvh-13rem)] gap-3 lg:h-[calc(100dvh-10.5rem)] xl:h-[calc(100dvh-7.5rem)] xl:grid-cols-5">
        <TrendingPane className={show("trending")} king={king} />
        <JackpotPane className={show("jackpots")} />
        <LeaderPane className={show("leaders")} />
        <PointsPane className={show("points")} />
        <ScreenerPane className={show("screener")} king={king} />
      </div>
    </div>
  );
}

/** Flashes a row green or coral when its market cap moves. */
function useFlashes(coins: Coin[] | undefined) {
  const last = useRef(new Map<string, number>());
  const [flash, setFlash] = useState(new Map<string, "up" | "down">());
  useEffect(() => {
    if (!coins) return;
    const next = new Map<string, "up" | "down">();
    for (const c of coins) {
      const before = last.current.get(c.address);
      if (before != null && before !== c.mcap) next.set(c.address, c.mcap > before ? "up" : "down");
      last.current.set(c.address, c.mcap);
    }
    if (next.size) {
      setFlash(next);
      const t = setTimeout(() => setFlash(new Map()), 900);
      return () => clearTimeout(t);
    }
  }, [coins]);
  return flash;
}

const HOURS = [["1", "1h"], ["4", "4h"], ["12", "12h"], ["24", "24h"]] as const;

function TrendingPane({ className, king }: { className: string; king?: string }) {
  const [h, setH] = useState<(typeof HOURS)[number][0]>("1");
  const { data } = useCoins("trending", "", Number(h), 30);
  const flash = useFlashes(data);
  return (
    <Column className={className} title="Trending" icon={<Flame className="size-4 text-down" />} tabs={<Tabs value={h} options={HOURS} onChange={setH} className="ml-auto" />}>
      {!data ? (
        <Rows />
      ) : data.length ? (
        data.map((c, i) => <TrendingRow key={c.address} c={c} king={c.address === king} hot={i < 5 && c.volume_window > 0} flash={flash.get(c.address)} />)
      ) : (
        <Empty>
          No coins yet. <Link href="/create" className="text-primary">Launch the first one.</Link>
        </Empty>
      )}
    </Column>
  );
}

/** King of the Hill on top, then every jackpot about to pay out. */
function JackpotPane({ className }: { className: string }) {
  const king = useFeed().data?.king ?? null;
  const { data } = useCoins("ending", "", 1, 30);
  return (
    <Column className={className} title="Jackpots" icon={<Timer className="size-4 text-gold" />} actions={<Link href="/jackpots" className="text-[11px] text-muted-foreground hover:text-foreground">All</Link>}>
      <KingCard c={king} />
      <p className="label px-3 pb-1 pt-3">Ending soon · last buyer wins</p>
      {!data ? (
        <Rows n={4} />
      ) : data.length ? (
        data.map((c) => <JackpotRow key={c.address} c={c} />)
      ) : (
        <Empty>No live jackpots. Every buy on a coin feeds its pot and resets the countdown.</Empty>
      )}
    </Column>
  );
}

function KingCard({ c }: { c: Coin | null }) {
  const m = useMoney();
  if (!c)
    return (
      <div className="m-2 rounded-lg border border-dashed border-input p-4 text-center text-xs text-muted-foreground">
        <Crown className="mx-auto mb-1 size-5 text-gold" />
        No king yet. The coin closest to graduating takes the crown.
      </div>
    );
  return (
    <Link href={`/coin/${c.address}`} className="glow m-2 block rounded-lg border border-gold/40 bg-gold/5 p-3 hover:bg-gold/10">
      <p className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-gold"><Crown className="size-3.5" /> King of the hill</p>
      <div className="mt-2 flex items-center gap-2.5">
        <CoinImage src={c.image} symbol={c.symbol} address={c.address} className="size-12" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-semibold">{c.name} <span className="font-normal text-muted-foreground">${c.symbol}</span></p>
          <p className="num text-[11px] text-muted-foreground">MC <span className="text-foreground">{m.usd(c.mcap)}</span> · fee {pct(c.creator_fee_bps)}</p>
        </div>
      </div>
      <CurveProgress value={c.progress} className="mt-2.5 h-1.5" />
      <p className="num mt-1 text-[11px] text-muted-foreground">{(c.progress * 100).toFixed(1)}% to graduation</p>
    </Link>
  );
}

function JackpotRow({ c }: { c: Coin }) {
  return (
    <Link href={`/coin/${c.address}`} className="flex items-center gap-2.5 border-b border-border/60 px-3 py-2 hover:bg-secondary/60">
      <Thumb c={c} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-semibold">{c.symbol}</p>
        <p className="truncate text-[11px] text-muted-foreground">{c.jackpot_last_buyer ? <>leader {short(c.jackpot_last_buyer)}</> : "no leader yet"}</p>
      </div>
      <div className="text-right">
        <p className="num text-[13px] font-semibold text-gold">{natSym(c.jackpot_pot ?? 0, 3)}</p>
        <Countdown to={c.jackpot_deadline ?? 0} className="text-[11px]" />
      </div>
    </Link>
  );
}

const WINDOWS = [["1d", "1D"], ["1w", "1W"]] as const;

/** Traders by profit over the day or week, like the leaderboard page. */
function LeaderPane({ className }: { className: string }) {
  const [w, setW] = useState<(typeof WINDOWS)[number][0]>("1d");
  const { data } = useTraders(w, 30);
  const me = useAccount().address?.toLowerCase();
  const m = useMoney();
  return (
    <Column className={className} title="Leaderboard" icon={<Trophy className="size-4 text-gold" />} actions={<Link href="/leaderboard" className="text-[11px] text-muted-foreground hover:text-foreground">All</Link>} tabs={<Tabs value={w} options={WINDOWS} onChange={setW} className="ml-auto" />}>
      {!data ? (
        <Rows />
      ) : data.traders.length ? (
        data.traders.map((t, i) => (
          <Link key={t.wallet} href="/leaderboard" className={cn("flex items-center gap-2.5 border-b border-border/60 px-3 py-2 hover:bg-secondary/60", t.wallet === me && "bg-primary/5")}>
            <span className={cn("num w-5 text-right text-xs", i < 3 ? "text-gold" : "text-muted-foreground")}>{i + 1}</span>
            <Avatar seed={t.wallet} className="size-7" />
            <span className="min-w-0 flex-1 truncate text-[13px] font-medium">{t.wallet === me ? "you" : short(t.wallet)}</span>
            <span className={cn("num text-[13px] font-semibold", t.pnl >= 0 ? "text-up" : "text-down")}>{m.pnl(t.pnl)}</span>
          </Link>
        ))
      ) : (
        <Empty>No trades in this window yet.</Empty>
      )}
    </Column>
  );
}

function PointsPane({ className }: { className: string }) {
  const { data } = usePoints();
  const me = useAccount().address?.toLowerCase();
  return (
    <Column className={className} title="Points" icon={<Award className="size-4 text-gold" />} actions={<Link href="/points" className="text-[11px] text-muted-foreground hover:text-foreground">All</Link>}>
      {!data ? (
        <Rows />
      ) : data.length ? (
        data.slice(0, 50).map((t, i) => (
          <div key={t.who} className={cn("flex items-center gap-2.5 border-b border-border/60 px-3 py-2", t.who === me && "bg-primary/5")}>
            <span className={cn("num w-5 text-right text-xs", i < 3 ? "text-gold" : "text-muted-foreground")}>{i + 1}</span>
            <Avatar seed={t.who} className="size-7" />
            <span className="min-w-0 flex-1 truncate text-[13px] font-medium">{t.who === me ? "you" : short(t.who)}</span>
            <span className="num text-[13px] font-semibold text-up">{t.points.toLocaleString()}</span>
          </div>
        ))
      ) : (
        <Empty>No points yet. Launch or buy a coin to get on the board.</Empty>
      )}
    </Column>
  );
}

const SCREENS = [["new", "New"], ["ignition", "Soon"], ["graduated", "Graduated"], ["movers", "Movers"]] as const;

function ScreenerPane({ className, king }: { className: string; king?: string }) {
  const [s, setS] = useState<(typeof SCREENS)[number][0]>("new");
  const { data } = useCoins(s, "", 1, 30);
  return (
    <Column className={className} title="Pro screener" icon={<Radar className="size-4 text-primary" />} tabs={<Tabs value={s} options={SCREENS} onChange={setS} green />}>
      {!data ? <Rows /> : data.length ? data.map((c) => <ScreenerRow key={c.address} c={c} king={c.address === king} />) : <Empty>Nothing here right now.</Empty>}
    </Column>
  );
}
