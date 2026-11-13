"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useFeed, type FeedItem } from "@/lib/api";
import { WHALE } from "@/lib/config";
import { compact, natSym, short } from "@/lib/format";
import { sounds } from "@/lib/sound";
import { CoinImage } from "./coin-image";

const key = (f: FeedItem) => `${f.kind}:${f.tx}:${f.coin}:${f.who ?? ""}:${f.time}`;

function Line({ f }: { f: FeedItem }) {
  const sym = <b>${f.symbol}</b>;
  if (f.kind === "launch") return <>🚀 {short(f.who)} launched {sym}</>;
  if (f.kind === "graduated") return <>🎓 {sym} graduated with {natSym(f.native, 3)}</>;
  if (f.kind === "jackpot") return <>🎰 {short(f.who)} won the {sym} jackpot: {natSym(f.native, 3)}</>;
  return (
    <>
      <span className={f.is_buy ? "text-buy" : "text-sell"}>{f.is_buy ? "bought" : "sold"}</span> {compact(f.tokens ?? 0)} {sym} for {natSym(f.native, 3)}
      {f.early ? <span className="ml-1 text-lime">⚡early</span> : null}
    </>
  );
}

/** The live layer: a ticker of everything happening, plus pop-ups for whales, launches and jackpot wins. */
export function HypeLayer() {
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
      if (whale || f.kind === "launch" || f.kind === "jackpot" || f.kind === "graduated") {
        const id = key(f);
        setToasts((t) => [...t.slice(-3), { ...f, id }]);
        setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 6000);
      }
    }
  }, [data]);

  const items = data?.feed ?? [];
  return (
    <>
      <div className="overflow-hidden border-b border-line bg-panel/60 py-2 text-sm">
        {items.length ? (
          <div className="ticker flex w-max gap-8 whitespace-nowrap">
            {[...items, ...items].map((f, i) => (
              <Link key={i} href={`/coin/${f.coin}`} className="flex items-center gap-2 text-muted hover:text-white">
                <CoinImage src={f.image} symbol={f.symbol} size={20} />
                <Line f={f} />
              </Link>
            ))}
          </div>
        ) : (
          <div className="px-4 text-muted">The pad is quiet. Launch the first coin and it shows up here.</div>
        )}
      </div>
      <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-80 flex-col gap-2">
        {toasts.map((t) => (
          <Link key={t.id} href={`/coin/${t.coin}`} className="panel pop-in pointer-events-auto flex items-center gap-3 border-lime/40 p-3 text-sm">
            <CoinImage src={t.image} symbol={t.symbol} size={36} />
            <div>
              <div className="font-bold">{t.kind === "trade" ? "🐋 Whale alert" : t.kind === "launch" ? "🚀 New launch" : t.kind === "jackpot" ? "🎰 Jackpot won" : "🎓 Graduated"}</div>
              <div className="text-muted">
                <Line f={t} />
              </div>
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}
