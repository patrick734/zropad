"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { Address } from "viem";
import { useAccount } from "wagmi";
import { useCoin } from "@/lib/api";
import { GRADUATION, NATIVE, explorerAddress, explorerTx } from "@/lib/config";
import { ago, compact, nat, natSym, pct, short } from "@/lib/format";
import { CoinImage } from "@/components/coin-image";
import { Progress } from "@/components/coin-card";
import { Chart } from "@/components/chart";
import { TradePanel } from "@/components/trade-panel";
import { JackpotCard } from "@/components/jackpot-card";

const INTERVALS: [string, number][] = [["1m", 60], ["5m", 300], ["15m", 900], ["1h", 3600]];

export default function CoinPage({ params }: { params: Promise<{ address: string }> }) {
  const { address } = use(params);
  const launched = useSearchParams().get("launched");
  const [interval, setInterval_] = useState(60);
  const [tab, setTab] = useState<"trades" | "holders">("trades");
  const { data, error, isLoading } = useCoin(address.toLowerCase(), interval);
  const { address: me } = useAccount();
  const [copied, setCopied] = useState(false);
  const [showLaunched, setShowLaunched] = useState(!!launched);
  useEffect(() => {
    if (!showLaunched) return;
    const t = setTimeout(() => setShowLaunched(false), 8000);
    return () => clearTimeout(t);
  }, [showLaunched]);

  if (isLoading || (!data && !error)) return <div className="panel p-10 text-center text-muted">{launched ? "Your coin is live. Loading it…" : "Loading…"}</div>;
  if (!data) return <div className="panel p-10 text-center text-muted">{launched ? "Your coin is live. It shows up here in a few seconds…" : "Coin not found."}</div>;

  const { coin, trades, holders, candles } = data;
  const mine = me?.toLowerCase();
  const links = [["Website", coin.website], ["X", coin.twitter], ["Telegram", coin.telegram]].filter(([, v]) => v) as [string, string][];

  return (
    <div className="space-y-5">
      {showLaunched && (
        <div className="pop-in panel border-lime/50 p-4 text-center font-bold text-lime">🚀 ${coin.symbol} is live. Share it: the 2-second sniper tax is already over.</div>
      )}

      <div className="flex flex-wrap items-center gap-4">
        <CoinImage src={coin.image} symbol={coin.symbol} size={72} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-2">
            <h1 className="break-words text-2xl font-black sm:text-3xl">{coin.name}</h1>
            <span className="text-xl text-muted">${coin.symbol}</span>
            {coin.graduated ? <span className="rounded-md bg-violet/20 px-2 py-0.5 text-sm font-bold text-violet">Graduated</span> : null}
          </div>
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
            <span>
              by{" "}
              <a className="hover:text-white" href={explorerAddress(coin.creator)} target="_blank" rel="noreferrer">
                {coin.creator === mine ? "you" : short(coin.creator)}
              </a>
            </span>
            <span>{ago(coin.created_at)} ago</span>
            <button
              className="hover:text-white"
              onClick={() => {
                navigator.clipboard.writeText(coin.address);
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              }}
            >
              {copied ? "Copied ✓" : `CA ${short(coin.address)} ⧉`}
            </button>
            {links.map(([k, v]) => (
              <a key={k} href={v} target="_blank" rel="noreferrer nofollow" className="text-lime hover:underline">
                {k} ↗
              </a>
            ))}
          </div>
        </div>
        <div className="grid w-full grid-cols-2 gap-x-6 gap-y-2 sm:w-auto sm:grid-cols-4 sm:text-right">
          <Stat k="Market cap" v={natSym(coin.mcap, 2)} accent />
          <Stat k="24h" v={coin.change24h == null ? "—" : `${coin.change24h >= 0 ? "+" : ""}${coin.change24h.toFixed(1)}%`} cls={coin.change24h == null ? "" : coin.change24h >= 0 ? "text-buy" : "text-sell"} />
          <Stat k="Volume" v={natSym(coin.volume, 2)} />
          <Stat k="Creator fee" v={pct(coin.creator_fee_bps)} cls={coin.creator_fee_bps >= 1000 ? "text-gold" : ""} />
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
        <div className="min-w-0 space-y-5">
          <div className="panel p-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm text-muted">Market cap ({NATIVE})</span>
              <div className="flex gap-1">
                {INTERVALS.map(([k, v]) => (
                  <button key={k} onClick={() => setInterval_(v)} className={`rounded-md px-2 py-1 text-xs ${interval === v ? "bg-white text-ink" : "bg-white/5 text-muted"}`}>
                    {k}
                  </button>
                ))}
              </div>
            </div>
            {candles.length ? <Chart candles={candles} /> : <div className="grid h-80 place-items-center text-muted">No trades yet. Be first.</div>}
          </div>

          <div className="panel p-4">
            <div className="mb-3 flex gap-1">
              {(["trades", "holders"] as const).map((t) => (
                <button key={t} onClick={() => setTab(t)} className={`rounded-lg px-3 py-1.5 text-sm font-semibold capitalize ${tab === t ? "bg-white text-ink" : "bg-white/5 text-muted"}`}>
                  {t} {t === "holders" ? `(${coin.holders})` : ""}
                </button>
              ))}
            </div>
            {tab === "trades" ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-xs text-muted">
                    <tr>
                      <th className="py-1.5">Trader</th>
                      <th>Side</th>
                      <th className="text-right">{NATIVE}</th>
                      <th className="text-right">${coin.symbol}</th>
                      <th className="text-right">When</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trades.map((t) => (
                      <tr key={t.tx + t.time + t.trader + t.native} className="border-t border-line">
                        <td className="py-1.5">
                          <a href={explorerAddress(t.trader)} target="_blank" rel="noreferrer" className={t.trader === mine ? "text-lime" : "hover:text-white"}>
                            {t.trader === mine ? "you" : short(t.trader)}
                          </a>
                          {t.early ? <span className="ml-1.5 rounded bg-lime/15 px-1 text-[10px] font-bold text-lime">EARLY</span> : null}
                          {t.trader === coin.creator ? <span className="ml-1.5 rounded bg-violet/20 px-1 text-[10px] font-bold text-violet">DEV</span> : null}
                          {t.sniper_tax > 0 ? <span className="ml-1.5 rounded bg-sell/15 px-1 text-[10px] font-bold text-sell">SNIPER TAXED</span> : null}
                        </td>
                        <td className={t.is_buy ? "text-buy" : "text-sell"}>{t.is_buy ? "Buy" : "Sell"}</td>
                        <td className="num text-right">{nat(t.native)}</td>
                        <td className="num text-right">{compact(t.tokens)}</td>
                        <td className="text-right text-muted">
                          <a href={explorerTx(t.tx)} target="_blank" rel="noreferrer" className="hover:text-white">
                            {ago(t.time)}
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!trades.length && <div className="py-6 text-center text-muted">No trades yet.</div>}
              </div>
            ) : (
              <ol className="space-y-1.5 text-sm">
                {holders.map((h, i) => (
                  <li key={h.holder} className="flex justify-between">
                    <span>
                      <span className="mr-2 text-muted">{i + 1}.</span>
                      {h.isMarket ? (coin.graduated ? "🔒 Pool (locked)" : "📈 Bonding curve") : h.holder === mine ? <span className="text-lime">you</span> : short(h.holder)}
                      {h.holder === coin.creator && <span className="ml-1.5 rounded bg-violet/20 px-1 text-[10px] font-bold text-violet">DEV</span>}
                    </span>
                    <span className="num">{(h.share * 100).toFixed(2)}%</span>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>

        <aside className="space-y-5">
          <TradePanel coin={coin.address as Address} market={coin.market as Address} symbol={coin.symbol} creatorFeeBps={coin.creator_fee_bps} />

          {coin.jackpot_deadline != null && (
            <JackpotCard coin={coin.address as Address} pot={coin.jackpot_pot ?? 0} deadline={coin.jackpot_deadline} round={coin.jackpot_round ?? 1} lastBuyer={coin.jackpot_last_buyer} />
          )}

          <div className="panel space-y-2 p-5">
            <div className="flex justify-between text-sm">
              <span className="font-semibold">{coin.graduated ? "Graduated 🎓" : "Bonding curve"}</span>
              <span className="num text-lime">{Math.floor(coin.progress * 100)}%</span>
            </div>
            <Progress value={coin.progress} graduated={!!coin.graduated} />
            <p className="text-xs text-muted">
              {coin.graduated
                ? `Trading in its Zropad pool. The liquidity is locked for good: nobody can pull it.`
                : `${nat(coin.raised)} of ${GRADUATION} ${NATIVE} raised. At ${GRADUATION} ${NATIVE} the coin moves into a pool with its liquidity locked for good.`}
            </p>
          </div>

          {coin.description && <div className="panel whitespace-pre-wrap break-words p-5 text-sm text-muted">{coin.description}</div>}
        </aside>
      </div>
    </div>
  );
}

function Stat({ k, v, cls = "", accent }: { k: string; v: string; cls?: string; accent?: boolean }) {
  return (
    <div>
      <div className="text-xs text-muted">{k}</div>
      <div className={`num font-bold ${accent ? "text-lime" : ""} ${cls}`}>{v}</div>
    </div>
  );
}
