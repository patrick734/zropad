"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import type { Coin } from "@/lib/api";
import { natSym, short } from "@/lib/format";
import { CoinImage } from "./coin-image";

/** ⌘K: search coins by name, ticker or contract address. */
export function SearchPalette({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [coins, setCoins] = useState<Coin[]>([]);
  const [sel, setSel] = useState(0);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => input.current?.focus(), []);
  useEffect(() => {
    const t = setTimeout(async () => {
      if (!q.trim()) return setCoins([]);
      const r = await fetch(`/api/coins?sort=mcap&limit=12&q=${encodeURIComponent(q.trim())}`).then((x) => x.json()).catch(() => null);
      if (Array.isArray(r)) setCoins(r);
      setSel(0);
    }, 150);
    return () => clearTimeout(t);
  }, [q]);

  const go = (c: Coin) => {
    onClose();
    router.push(`/coin/${c.address}`);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 p-4 pt-[12vh]" onMouseDown={onClose}>
      <div className="mx-auto max-w-lg overflow-hidden rounded-xl border border-border bg-popover shadow-2xl" onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 border-b border-border px-3">
          <Search className="size-4 text-muted-foreground" />
          <input
            ref={input}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") onClose();
              if (e.key === "ArrowDown") setSel((s) => Math.min(s + 1, coins.length - 1));
              if (e.key === "ArrowUp") setSel((s) => Math.max(s - 1, 0));
              if (e.key === "Enter" && coins[sel]) go(coins[sel]);
            }}
            placeholder="Name, ticker or contract address"
            className="h-12 w-full text-sm outline-none"
          />
          <kbd className="rounded border border-input px-1 text-[10px] text-muted-foreground">esc</kbd>
        </div>
        <div className="max-h-[60vh] overflow-y-auto p-1.5">
          {coins.length > 0 && <p className="label px-2 py-1.5">Coins</p>}
          {coins.map((c, i) => (
            <button key={c.address} onClick={() => go(c)} onMouseEnter={() => setSel(i)} className={`flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left ${sel === i ? "bg-secondary" : ""}`}>
              <CoinImage src={c.image} symbol={c.symbol} address={c.address} className="size-8" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{c.name}</p>
                <p className="text-xs text-muted-foreground">${c.symbol} · {short(c.address)}</p>
              </div>
              <span className="num text-xs">{natSym(c.mcap, 2)}</span>
            </button>
          ))}
          {q.trim() && !coins.length && <p className="px-2 py-6 text-center text-xs text-muted-foreground">Nothing found.</p>}
        </div>
      </div>
    </div>
  );
}
