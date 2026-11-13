"use client";

import { useState } from "react";
import { formatEther, parseEther, type Address } from "viem";
import { useAccount, useBalance, usePublicClient, useReadContract, useWriteContract } from "wagmi";
import { useQueryClient } from "@tanstack/react-query";
import { coinAbi, marketAbi } from "@/lib/abi";
import { NATIVE, chain } from "@/lib/config";
import { compact, nat, pct } from "@/lib/format";
import { ConnectButton } from "./connect";

const SLIPPAGES = [5, 10, 20];

export function TradePanel({ coin, market, symbol, creatorFeeBps }: { coin: Address; market: Address; symbol: string; creatorFeeBps: number }) {
  const { address, isConnected, chainId } = useAccount();
  const pc = usePublicClient({ chainId: chain.id });
  const qc = useQueryClient();
  const { writeContractAsync } = useWriteContract();
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [amount, setAmount] = useState("");
  const [slippage, setSlippage] = useState(10);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const { data: nativeBal, refetch: refetchNative } = useBalance({ address, chainId: chain.id, query: { refetchInterval: 4000 } });
  const { data: coinBal, refetch: refetchCoin } = useReadContract({ address: coin, abi: coinAbi, functionName: "balanceOf", args: [address!], chainId: chain.id, query: { enabled: !!address, refetchInterval: 4000 } });
  const { data: feeBps } = useReadContract({ address: market, abi: marketAbi, functionName: "currentFeeBps", chainId: chain.id, query: { refetchInterval: 1000 } });

  let wei = 0n;
  try {
    wei = amount ? parseEther(amount) : 0n;
  } catch {}
  const { data: quoteBuy } = useReadContract({ address: market, abi: marketAbi, functionName: "quoteBuy", args: [wei], chainId: chain.id, query: { enabled: side === "buy" && wei > 0n, refetchInterval: 2000 } });
  const { data: quoteSell } = useReadContract({ address: market, abi: marketAbi, functionName: "quoteSell", args: [wei], chainId: chain.id, query: { enabled: side === "sell" && wei > 0n, refetchInterval: 2000 } });

  const out = side === "buy" ? (quoteBuy?.[0] ?? 0n) : (quoteSell?.[0] ?? 0n);
  const fee = side === "buy" ? (quoteBuy?.[1] ?? 0n) : (quoteSell?.[1] ?? 0n);
  const refund = side === "buy" ? (quoteBuy?.[2] ?? 0n) : 0n;
  const sniping = Number(feeBps ?? 0) >= 9900;

  async function trade() {
    if (!pc || wei === 0n) return;
    setMsg(null);
    try {
      const min = (out * BigInt(100 - slippage)) / 100n;
      const deadline = BigInt(Math.floor(Date.now() / 1000) + 300);
      setBusy("Confirm in your wallet…");
      const hash =
        side === "buy"
          ? await writeContractAsync({ address: market, abi: marketAbi, functionName: "buy", args: [min, deadline], value: wei, chainId: chain.id })
          : await writeContractAsync({ address: market, abi: marketAbi, functionName: "sell", args: [wei, min, deadline], chainId: chain.id });
      setBusy(side === "buy" ? "Buying…" : "Selling…");
      const r = await pc.waitForTransactionReceipt({ hash });
      if (r.status !== "success") throw new Error("The transaction failed.");
      setMsg({ ok: true, text: side === "buy" ? `Bought ${compact(Number(formatEther(out)))} $${symbol}` : `Sold for ${nat(Number(formatEther(out)))} ${NATIVE}` });
      setAmount("");
      refetchNative();
      refetchCoin();
      qc.invalidateQueries();
    } catch (e) {
      setMsg({ ok: false, text: (e as { shortMessage?: string }).shortMessage ?? (e as Error).message });
    } finally {
      setBusy(null);
    }
  }

  const setPart = (p: number) => {
    if (side === "sell" && coinBal) setAmount(formatEther((coinBal * BigInt(p)) / 100n));
    if (side === "buy" && nativeBal) setAmount(formatEther((nativeBal.value * BigInt(p)) / 100n));
  };

  return (
    <div className="panel space-y-4 p-5">
      <div className="grid grid-cols-2 gap-1 rounded-xl bg-white/5 p-1">
        {(["buy", "sell"] as const).map((s) => (
          <button key={s} onClick={() => (setSide(s), setAmount(""))} className={`rounded-lg py-2 font-bold capitalize ${side === s ? (s === "buy" ? "bg-buy text-ink" : "bg-sell text-white") : "text-muted"}`}>
            {s}
          </button>
        ))}
      </div>

      <div className={`rounded-xl p-3 text-sm ${sniping ? "bg-sell/15 text-sell" : Number(feeBps ?? 0) > 1100 ? "bg-gold/10 text-gold" : "bg-white/5 text-muted"}`}>
        {sniping ? (
          <b>⛔ Sniper tax: 99% for the first 2 seconds after launch. Wait a moment.</b>
        ) : (
          <>
            Fee on this trade: <b className="num">{pct(Number(feeBps ?? 100 + creatorFeeBps))}</b> (1% Zropad + {pct(creatorFeeBps)} creator)
          </>
        )}
      </div>

      <div>
        <div className="mb-1 flex justify-between text-xs text-muted">
          <span>{side === "buy" ? `Pay (${NATIVE})` : `Sell ($${symbol})`}</span>
          <span className="num">
            Balance: {side === "buy" ? `${nat(Number(nativeBal?.formatted ?? 0))} ${NATIVE}` : `${compact(Number(formatEther(coinBal ?? 0n)))} $${symbol}`}
          </span>
        </div>
        <input className="input num text-xl" inputMode="decimal" placeholder="0.0" value={amount} onChange={(e) => setAmount(e.target.value.replace(",", "."))} />
        <div className="mt-2 flex gap-1.5">
          {(side === "buy" ? [["0.01", null], ["0.1", null], ["0.5", null], ["1", null]] : [["25%", 25], ["50%", 50], ["75%", 75], ["Max", 100]]).map(([label, p]) => (
            <button key={String(label)} className="flex-1 rounded-lg bg-white/5 py-1.5 text-xs font-semibold" onClick={() => (p ? setPart(p as number) : setAmount(String(label)))}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {wei > 0n && (
        <div className="space-y-1 rounded-xl bg-white/5 p-3 text-sm">
          <div className="flex justify-between">
            <span className="text-muted">You get about</span>
            <span className="num font-bold">{side === "buy" ? `${compact(Number(formatEther(out)))} $${symbol}` : `${nat(Number(formatEther(out)))} ${NATIVE}`}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted">Fees</span>
            <span className="num">{nat(Number(formatEther(fee)))} {NATIVE}</span>
          </div>
          {refund > 0n && (
            <div className="flex justify-between text-lime">
              <span>Completes the curve, refunded</span>
              <span className="num">{nat(Number(formatEther(refund)))} {NATIVE}</span>
            </div>
          )}
        </div>
      )}

      <div className="flex items-center gap-2 text-xs text-muted">
        Slippage
        {SLIPPAGES.map((s) => (
          <button key={s} onClick={() => setSlippage(s)} className={`rounded-md px-2 py-1 ${slippage === s ? "bg-white text-ink" : "bg-white/5"}`}>
            {s}%
          </button>
        ))}
      </div>

      {!isConnected ? (
        <ConnectButton />
      ) : (
        <button className={`btn w-full py-3 text-lg ${side === "buy" ? "bg-buy text-ink" : "bg-sell text-white"}`} disabled={!!busy || wei === 0n || out === 0n || chainId !== chain.id} onClick={trade}>
          {busy ?? (side === "buy" ? `Buy $${symbol}` : `Sell $${symbol}`)}
        </button>
      )}
      {msg && <div className={`text-sm ${msg.ok ? "text-buy" : "text-sell"}`}>{msg.text}</div>}
    </div>
  );
}
