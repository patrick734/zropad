"use client";

import Link from "next/link";
import { useState } from "react";
import { formatEther } from "viem";
import { useAccount, usePublicClient, useReadContract, useWriteContract } from "wagmi";
import { Gift, Loader2, Timer } from "lucide-react";
import { useWallet } from "@/lib/api";
import { hubAbi } from "@/lib/abi";
import { NATIVE, ZROPAD, chain } from "@/lib/config";
import { ago, compact, nat, natSym } from "@/lib/format";
import { ConnectButton } from "@/components/connect";
import { CoinCard } from "@/components/coin-card";
import { CoinImage } from "@/components/coin-image";
import { Empty } from "@/components/column";
import { Button } from "@/components/ui/button";
import { useMoney } from "@/components/money";

export default function Me() {
  const { address, isConnected, chainId } = useAccount();
  const { data } = useWallet(address?.toLowerCase());
  const m = useMoney();
  const pc = usePublicClient({ chainId: chain.id });
  const { writeContractAsync } = useWriteContract();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { data: owed, refetch } = useReadContract({ address: ZROPAD, abi: hubAbi, functionName: "owed", args: [address!], chainId: chain.id, query: { enabled: !!address && !!ZROPAD, refetchInterval: 4000 } });

  if (!isConnected)
    return (
      <div className="panel mx-auto mt-10 max-w-sm space-y-4 p-6 text-center">
        <Gift className="mx-auto size-8 text-primary" />
        <h1 className="text-lg font-semibold">My coins & rewards</h1>
        <p className="text-xs text-muted-foreground">Connect to see your coins, creator fees and jackpot wins.</p>
        <ConnectButton big />
      </div>
    );

  async function claim() {
    if (!ZROPAD || !pc) return;
    setBusy(true);
    setError(null);
    try {
      const hash = await writeContractAsync({ address: ZROPAD, abi: hubAbi, functionName: "claim", chainId: chain.id });
      await pc.waitForTransactionReceipt({ hash });
      refetch();
    } catch (e) {
      setError((e as { shortMessage?: string }).shortMessage ?? (e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const value = data?.holdings.reduce((s, h) => s + h.value, 0) ?? 0;

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <div className="panel flex flex-wrap items-center justify-between gap-4 p-4">
        <div>
          <p className="label">Ready to claim</p>
          <p className="num text-3xl font-semibold text-primary">{nat(Number(formatEther(owed ?? 0n)))} {NATIVE}</p>
          <p className="text-xs text-muted-foreground">Creator fees and jackpot wins, in one claim.</p>
        </div>
        <div className="space-y-1 text-right">
          <Button size="lg" className="px-8" disabled={busy || !owed || chainId !== chain.id} onClick={claim}>
            {busy && <Loader2 className="animate-spin" />} Claim
          </Button>
          {error && <p className="text-xs text-down">{error}</p>}
        </div>
      </div>

      <section className="space-y-2">
        <h2 className="text-[13px] font-semibold">Holdings <span className="num font-normal text-muted-foreground">≈ {m.usd(value)}</span></h2>
        <div className="panel overflow-hidden">
          {(data?.holdings ?? []).map((h) => (
            <Link key={h.coin} href={`/coin/${h.coin}`} className="flex items-center gap-3 border-b border-border/60 px-3 py-2.5 last:border-0 hover:bg-secondary/40">
              <CoinImage src={h.image} symbol={h.symbol} address={h.coin} className="size-9" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-semibold">{h.name}</p>
                <p className="text-[11px] text-muted-foreground">${h.symbol}</p>
              </div>
              <div className="text-right">
                <p className="num text-[13px]">{compact(h.amount)}</p>
                <p className="num text-[11px] text-muted-foreground">{m.usd(h.value)}</p>
              </div>
            </Link>
          ))}
          {data && !data.holdings.length && <Empty>No coins yet.</Empty>}
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-[13px] font-semibold">Coins you launched</h2>
        {data?.created.length ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{data.created.map((c) => <CoinCard key={c.address} coin={c} />)}</div>
        ) : (
          <div className="panel"><Empty>None yet. <Link href="/create" className="text-primary">Launch one.</Link></Empty></div>
        )}
      </section>

      {!!data?.wins.length && (
        <section className="space-y-2">
          <h2 className="flex items-center gap-1.5 text-[13px] font-semibold"><Timer className="size-4 text-gold" /> Jackpots won</h2>
          <div className="panel overflow-hidden">
            {data.wins.map((w) => (
              <Link key={`${w.coin}-${w.round}`} href={`/coin/${w.coin}`} className="flex justify-between border-b border-border/60 px-3 py-2.5 text-[13px] last:border-0 hover:bg-secondary/40">
                <span>${w.symbol} · round {w.round}</span>
                <span className="num text-gold">{natSym(w.amount, 4)} <span className="text-muted-foreground">· {ago(w.time)} ago</span></span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
