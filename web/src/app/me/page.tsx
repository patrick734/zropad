"use client";

import Link from "next/link";
import { useState } from "react";
import { formatEther } from "viem";
import { useAccount, usePublicClient, useReadContract, useWriteContract } from "wagmi";
import { useWallet } from "@/lib/api";
import { hubAbi } from "@/lib/abi";
import { NATIVE, ZROPAD, chain } from "@/lib/config";
import { ago, compact, nat, natSym } from "@/lib/format";
import { ConnectButton } from "@/components/connect";
import { CoinCard } from "@/components/coin-card";
import { CoinImage } from "@/components/coin-image";

export default function Me() {
  const { address, isConnected, chainId } = useAccount();
  const { data } = useWallet(address?.toLowerCase());
  const pc = usePublicClient({ chainId: chain.id });
  const { writeContractAsync } = useWriteContract();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { data: owed, refetch } = useReadContract({ address: ZROPAD, abi: hubAbi, functionName: "owed", args: [address!], chainId: chain.id, query: { enabled: !!address && !!ZROPAD, refetchInterval: 4000 } });

  if (!isConnected)
    return (
      <div className="panel mx-auto max-w-md space-y-4 p-8 text-center">
        <h1 className="text-2xl font-black">My coins &amp; rewards</h1>
        <p className="text-muted">Connect to see your coins, creator fees and jackpot wins.</p>
        <ConnectButton />
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
    <div className="space-y-6">
      <div className="panel flex flex-wrap items-center justify-between gap-4 p-6">
        <div>
          <div className="text-xs font-bold tracking-widest text-muted">READY TO CLAIM</div>
          <div className="num text-4xl font-black text-lime">{nat(Number(formatEther(owed ?? 0n)))} {NATIVE}</div>
          <div className="text-sm text-muted">Creator fees and jackpot wins, in one claim.</div>
        </div>
        <div className="space-y-2 text-right">
          <button className="btn btn-lime px-8 py-3 text-lg" disabled={busy || !owed || chainId !== chain.id} onClick={claim}>
            {busy ? "Claiming…" : "Claim"}
          </button>
          {error && <div className="text-sm text-sell">{error}</div>}
        </div>
      </div>

      <section>
        <h2 className="mb-3 text-xl font-black">Holdings <span className="num text-base font-normal text-muted">≈ {natSym(value, 3)}</span></h2>
        <div className="panel divide-y divide-line">
          {(data?.holdings ?? []).map((h) => (
            <Link key={h.coin} href={`/coin/${h.coin}`} className="flex items-center gap-3 p-3 hover:bg-white/[0.03]">
              <CoinImage src={h.image} symbol={h.symbol} size={36} />
              <div className="flex-1">
                <div className="font-semibold">{h.name}</div>
                <div className="text-xs text-muted">${h.symbol}</div>
              </div>
              <div className="text-right">
                <div className="num">{compact(h.amount)}</div>
                <div className="num text-xs text-muted">{natSym(h.value, 3)}</div>
              </div>
            </Link>
          ))}
          {data && !data.holdings.length && <div className="p-6 text-center text-muted">No coins yet.</div>}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-xl font-black">Coins you launched</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(data?.created ?? []).map((c) => (
            <CoinCard key={c.address} coin={c} />
          ))}
        </div>
        {data && !data.created.length && (
          <div className="panel p-6 text-center text-muted">
            None yet. <Link href="/launch" className="text-lime">Launch one →</Link>
          </div>
        )}
      </section>

      {!!data?.wins.length && (
        <section>
          <h2 className="mb-3 text-xl font-black">Jackpots won 🎰</h2>
          <div className="panel divide-y divide-line">
            {data.wins.map((w) => (
              <Link key={`${w.coin}-${w.round}`} href={`/coin/${w.coin}`} className="flex justify-between p-3 hover:bg-white/[0.03]">
                <span>
                  ${w.symbol} · round {w.round}
                </span>
                <span className="num text-gold">
                  {natSym(w.amount, 4)} <span className="text-muted">· {ago(w.time)} ago</span>
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
