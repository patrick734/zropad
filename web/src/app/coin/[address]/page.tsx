"use client";

import { use, useState } from "react";
import { useSearchParams } from "next/navigation";
import { formatEther, type Address } from "viem";
import { useAccount, useReadContract } from "wagmi";
import { Check, Copy, Crown, ExternalLink, Globe, GraduationCap, Rocket, Send } from "lucide-react";
import { useCoin, useFeed } from "@/lib/api";
import { hubAbi } from "@/lib/abi";
import { GRADUATION, NATIVE, ZROPAD, chain, explorerAddress, explorerTx } from "@/lib/config";
import { ago, compact, nat, natSym, pct, short } from "@/lib/format";
import { cn } from "@/lib/utils";
import { CoinImage } from "@/components/coin-image";
import { Avatar } from "@/components/avatar";
import { Change } from "@/components/change";
import { Chart } from "@/components/chart";
import { CurveProgress } from "@/components/progress";
import { TradePanel } from "@/components/trade-panel";
import { JackpotCard } from "@/components/jackpot-card";
import { useMoney } from "@/components/money";

const INTERVALS: [string, number][] = [["1m", 60], ["5m", 300], ["15m", 900], ["1h", 3600], ["4h", 14400], ["1d", 86400]];

export default function CoinPage({ params }: { params: Promise<{ address: string }> }) {
  const { address } = use(params);
  const launched = !!useSearchParams().get("launched");
  const [interval, setInterval_] = useState(60);
  const [tab, setTab] = useState<"trades" | "holders">("trades");
  const { data, isLoading } = useCoin(address.toLowerCase(), interval);
  const kingAddr = useFeed().data?.king?.address;
  const { address: me } = useAccount();
  const m = useMoney();
  const [copied, setCopied] = useState(false);
  const { data: config } = useReadContract({ address: ZROPAD, abi: hubAbi, functionName: "config", chainId: chain.id, query: { enabled: !!ZROPAD, staleTime: 60_000 } });
  const minBuy = config ? nat(Number(formatEther(config[10] as bigint))) : "0.005";

  if (!data)
    return (
      <div className="py-24 text-center text-muted-foreground">
        {isLoading ? "Loading…" : launched ? "Fresh off the press. Give it a few seconds." : "Coin not found."}
      </div>
    );

  const { coin, trades, holders, candles } = data;
  const mine = me?.toLowerCase();
  const king = coin.address === kingAddr;
  const copy = async () => {
    await navigator.clipboard.writeText(coin.address);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  return (
    <div className="mx-auto max-w-[1600px] space-y-3">
      {launched && (
        <div className="pop-in flex items-center gap-2 rounded-lg border border-primary/40 bg-primary/5 px-3 py-2 text-xs text-primary">
          <Rocket className="size-4" /> ${coin.symbol} is live. The 2-second sniper window is already over: share it.
        </div>
      )}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <CoinImage src={coin.image} symbol={coin.symbol} address={coin.address} className="size-12 rounded-lg" />
        <div className="min-w-0">
          <h1 className="flex items-center gap-1.5 truncate text-lg font-semibold">
            {coin.name} <span className="font-normal text-muted-foreground">{coin.symbol}</span>
            {coin.graduated ? <GraduationCap className="size-4 text-primary" /> : null}
            {king && <Crown className="size-3.5 text-gold" />}
          </h1>
          <div className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
            <a href={explorerAddress(coin.creator)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-foreground hover:underline">
              <Avatar seed={coin.creator} className="size-4" /> {coin.creator === mine ? "you" : short(coin.creator)}
            </a>
            <span>· {ago(coin.created_at)} ago</span>
            <button onClick={() => void copy()} className="inline-flex items-center gap-1 font-mono hover:text-foreground">
              {short(coin.address)} {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
            </button>
            {coin.twitter && <SocialLink href={coin.twitter} label="X"><XMark /></SocialLink>}
            {coin.telegram && <SocialLink href={coin.telegram} label="Telegram"><Send className="size-3" /></SocialLink>}
            {coin.website && <SocialLink href={coin.website} label="Website"><Globe className="size-3" /></SocialLink>}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 space-y-3">
          <div className="panel flex flex-wrap items-end gap-x-8 gap-y-3 p-4">
            <div>
              <p className="text-xs text-muted-foreground">Market cap</p>
              <p className="num text-3xl font-semibold">{m.usd(coin.mcap, false)}</p>
              <Change value={coin.change24h} className="text-xs" /> <span className="text-xs text-muted-foreground">24h</span>
            </div>
            <div className="min-w-48 flex-1">
              <div className="flex justify-between text-[11px] text-muted-foreground">
                <span>{coin.graduated ? "Graduated" : "Bonding curve"}</span>
                <span className="num">{coin.graduated ? "locked pool" : `${nat(coin.raised, 3)} / ${nat(coin.graduation ?? GRADUATION, 3)} ${NATIVE}`}</span>
              </div>
              <CurveProgress value={coin.progress} graduated={!!coin.graduated} className="mt-1" />
            </div>
            <Stat label="24h vol" value={m.usd(coin.volume24h)} />
            <Stat label="Holders" value={String(coin.holders)} />
            <Stat label="Creator fee" value={pct(coin.creator_fee_bps)} gold={coin.creator_fee_bps >= 1000} />
          </div>

          <div className="panel overflow-hidden">
            <div className="flex items-center gap-1 border-b border-border px-2 py-1.5">
              {INTERVALS.map(([k, v]) => (
                <button key={k} onClick={() => setInterval_(v)} className={cn("tab", interval === v && "tab-on")}>
                  {k}
                </button>
              ))}
              <span className="ml-auto pr-1 text-xs text-muted-foreground">market cap ({m.price ? "USD" : NATIVE})</span>
            </div>
            {candles.length ? <Chart candles={candles} usd={m.price} /> : <div className="grid h-[380px] place-items-center text-xs text-muted-foreground lg:h-[440px]">No trades yet. Be the first.</div>}
          </div>

          <div className="flex gap-1">
            {(["trades", "holders"] as const).map((t) => (
              <button key={t} onClick={() => setTab(t)} className={cn("tab capitalize", tab === t && "tab-on")}>
                {t === "holders" ? `Holders (${coin.holders})` : "Trades"}
              </button>
            ))}
          </div>
          {tab === "trades" ? (
            trades.length ? (
              <div className="panel overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="text-left text-muted-foreground">
                    <tr className="border-b">
                      <th className="px-3 py-2 font-normal">Account</th>
                      <th className="px-3 py-2 font-normal">Type</th>
                      <th className="px-3 py-2 font-normal">{NATIVE}</th>
                      <th className="px-3 py-2 font-normal">${coin.symbol}</th>
                      <th className="px-3 py-2 font-normal">Date</th>
                      <th className="px-3 py-2 font-normal">Tx</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trades.map((t, i) => (
                      <tr key={`${t.tx}-${i}`} className="border-b last:border-0">
                        <td className="px-3 py-2">
                          <span className="inline-flex items-center gap-1.5">
                            <Avatar seed={t.trader} className="size-4" />
                            <span className={t.trader === mine ? "font-semibold text-up" : "font-mono"}>{t.trader === mine ? "you" : short(t.trader)}</span>
                            {t.trader === coin.creator && <span className="chip bg-primary/15 text-primary">dev</span>}
                            {t.early ? <span className="chip bg-up/10 text-up">early</span> : null}
                            {t.sniper_tax > 0 ? <span className="chip bg-down/10 text-down">sniper taxed</span> : null}
                          </span>
                        </td>
                        <td className={cn("px-3 py-2", t.is_buy ? "text-up" : "text-down")}>{t.is_buy ? "buy" : "sell"}</td>
                        <td className="num px-3 py-2">{nat(t.native, 4)}</td>
                        <td className="num px-3 py-2">{compact(t.tokens)}</td>
                        <td className="px-3 py-2 text-muted-foreground">{ago(t.time)} ago</td>
                        <td className="px-3 py-2">
                          <a href={explorerTx(t.tx)} target="_blank" rel="noreferrer" className="font-mono text-muted-foreground hover:text-foreground">{short(t.tx)}</a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="py-6 text-center text-sm text-muted-foreground">No trades yet.</p>
            )
          ) : (
            <div className="panel p-4">
              <ol className="space-y-1 text-xs">
                {holders.map((h, i) => (
                  <li key={h.holder} className="flex items-center gap-2">
                    <span className="w-5 text-muted-foreground">{i + 1}.</span>
                    {h.isMarket ? <span>{coin.graduated ? "Elypad pool (locked)" : "Bonding curve"}</span> : <span className={h.holder === mine ? "font-semibold text-up" : "font-mono"}>{h.holder === mine ? "you" : short(h.holder)}</span>}
                    {h.holder === coin.creator && <span className="chip bg-primary/15 text-primary">dev</span>}
                    <span className="num ml-auto">{(h.share * 100).toFixed(2)}%</span>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>

        <aside className="min-w-0 space-y-3">
          <TradePanel coin={coin.address as Address} market={coin.market as Address} symbol={coin.symbol} creatorFeeBps={coin.creator_fee_bps} graduated={!!coin.graduated} />

          {coin.jackpot_deadline != null && (
            <JackpotCard coin={coin.address as Address} pot={coin.jackpot_pot ?? 0} deadline={coin.jackpot_deadline} round={coin.jackpot_round ?? 1} lastBuyer={coin.jackpot_last_buyer} minBuy={minBuy} />
          )}

          <div className="panel space-y-2 p-4 text-sm">
            {coin.graduated ? (
              <div className="space-y-1">
                <p className="flex items-center gap-1.5 font-semibold text-gold"><GraduationCap className="size-4" /> Graduated</p>
                <p className="text-xs text-muted-foreground">Trading in its Elypad pool now, right here. The pool&apos;s liquidity is locked for good: nobody can pull it.</p>
                <a href={explorerAddress(coin.market)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                  View pool <ExternalLink className="size-3" />
                </a>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <span className="font-semibold">Bonding curve progress</span>
                  <span className="num font-semibold">{(coin.progress * 100).toFixed(1)}%</span>
                </div>
                <CurveProgress value={coin.progress} />
                <p className="text-xs text-muted-foreground">
                  Graduates at {m.usd((coin.graduation ?? GRADUATION) * 5)} market cap ({nat(coin.graduation ?? GRADUATION, 3)} {NATIVE} raised). {nat(coin.raised, 4)} {NATIVE} in the curve so far. Then the coin moves into a pool with its liquidity locked for good.
                </p>
                {king && <p className="flex items-center gap-1 text-xs font-medium text-gold"><Crown className="size-3.5" /> King of the hill</p>}
              </>
            )}
          </div>

          {coin.description && <div className="panel whitespace-pre-wrap break-words p-4 text-xs text-muted-foreground">{coin.description}</div>}

          <div className="panel p-4 text-sm">
            <p className="mb-2 font-semibold">Top holders <span className="font-normal text-muted-foreground">({coin.holders})</span></p>
            <ol className="space-y-1 text-xs">
              {holders.slice(0, 12).map((h, i) => (
                <li key={h.holder} className="flex items-center gap-2">
                  <span className="w-5 text-muted-foreground">{i + 1}.</span>
                  {h.isMarket ? <span>{coin.graduated ? "Elypad pool (locked)" : "Bonding curve"}</span> : <span className="font-mono">{h.holder === mine ? "you" : short(h.holder)}</span>}
                  {h.holder === coin.creator && <span className="chip bg-primary/15 text-primary">dev</span>}
                  <span className="num ml-auto">{(h.share * 100).toFixed(2)}%</span>
                </li>
              ))}
            </ol>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Stat({ label, value, gold }: { label: string; value: string; gold?: boolean }) {
  return (
    <div>
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className={cn("num text-sm font-semibold", gold && "text-gold")}>{value}</p>
    </div>
  );
}

function SocialLink({ href, label, children }: { href: string; label: string; children: React.ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noreferrer nofollow" aria-label={label} title={label} className="inline-flex size-5 items-center justify-center rounded bg-secondary text-foreground hover:bg-accent">
      {children}
    </a>
  );
}

function XMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-3" fill="currentColor" aria-hidden>
      <path d="M18.9 2H22l-7.6 8.7L23 22h-6.8l-5.3-6.9L4.8 22H1.7l8.1-9.3L1 2h7l4.8 6.3L18.9 2Zm-1.2 18h1.9L7.4 4H5.4l12.3 16Z" />
    </svg>
  );
}
