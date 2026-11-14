"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Crown, GraduationCap, Rocket, Timer } from "lucide-react";
import { useFeed, type FeedItem } from "@/lib/api";
import { WHALE } from "@/lib/config";
import { compact, natSym, short } from "@/lib/format";
import { sounds } from "@/lib/sound";
import { CoinImage } from "./coin-image";

const key = (f: FeedItem) => `${f.kind}:${f.tx}:${f.coin}:${f.who ?? ""}:${f.time}`;

/** One line about something that happened. */
export function FeedLine({ f }: { f: FeedItem }) {
  const sym = <span className="font-semibold text-foreground">${f.symbol}</span>;
  if (f.kind === "launch") return <>{short(f.who)} launched {sym}</>;
  if (f.kind === "graduated") return <>{sym} graduated with {natSym(f.native, 3)}</>;
  if (f.kind === "jackpot") return <>{short(f.who)} won the {sym} jackpot: <span className="text-gold">{natSym(f.native, 3)}</span></>;
  return (
    <>
      {short(f.who)} <span className={f.is_buy ? "text-up" : "text-down"}>{f.is_buy ? "bought" : "sold"}</span> {compact(f.tokens ?? 0)} {sym} for {natSym(f.native, 3)}
    </>
  );
}

const TITLE: Record<string, [string, typeof Rocket, string]> = {
  trade: ["Whale buy", Crown, "text-gold"],
  launch: ["New launch", Rocket, "text-primary"],
  jackpot: ["Jackpot won", Timer, "text-gold"],
  graduated: ["Graduated", GraduationCap, "text-primary"],
};

/** Pop-ups for whales, launches, graduations and jackpot wins, with sounds if they're on. */
export function Toasts() {
  const { data } = useFeed();
  const seen = useRef<Set<string> | null>(null);
  const [toasts, setToasts] = useState<(FeedItem & { id: string })[]>([]);

  useEffect(() => {
    if (!data) return;
    const items = data.feed;
    if (!seen.current) {
      seen.current = new Set(items.map(key));
      return;
    }
    const fresh = items.filter((f) => !seen.current!.has(key(f))).reverse();
    for (const f of fresh) {
      seen.current.add(key(f));
      const whale = f.kind === "trade" && f.is_buy && (f.native ?? 0) >= WHALE;
      if (f.kind === "trade") (whale ? sounds.whale : f.is_buy ? sounds.buy : sounds.sell)();
      if (f.kind === "launch") sounds.launch();
      if (f.kind === "jackpot") sounds.win();
      if (whale || f.kind !== "trade") {
        const id = key(f);
        setToasts((t) => [...t.slice(-2), { ...f, id }]);
        setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 6000);
      }
    }
  }, [data]);

  return (
    <div className="pointer-events-none fixed bottom-20 right-3 z-50 flex w-80 max-w-[calc(100vw-1.5rem)] flex-col gap-2 lg:bottom-4">
      {toasts.map((t) => {
        const [title, Icon, color] = TITLE[t.kind];
        return (
          <Link key={t.id} href={`/coin/${t.coin}`} className="pop-in pointer-events-auto flex items-center gap-3 rounded-xl border border-border bg-popover p-3 text-xs shadow-2xl">
            <CoinImage src={t.image} symbol={t.symbol} address={t.coin} className="size-9" />
            <div className="min-w-0">
              <p className={`flex items-center gap-1 text-[13px] font-semibold ${color}`}><Icon className="size-3.5" /> {title}</p>
              <p className="truncate text-muted-foreground"><FeedLine f={t} /></p>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
