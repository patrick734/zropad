"use client";

import { useState } from "react";
import { formatEther, parseEther, type Address } from "viem";
import { useAccount, useBalance, usePublicClient, useReadContract, useWriteContract } from "wagmi";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, ShieldAlert, SlidersHorizontal } from "lucide-react";
import { coinAbi, marketAbi } from "@/lib/abi";
import { NATIVE, chain } from "@/lib/config";
import { compact, nat, pct } from "@/lib/format";
import { cn } from "@/lib/utils";
import { ConnectButton } from "./connect";
import { Button } from "./ui/button";

const SLIPPAGES = [1, 5, 10, 20];
const BUYS = ["0.01", "0.05", "0.1", "0.5"];

export function TradePanel({ coin, market, symbol, creatorFeeBps, graduated }: { coin: Address; market: Address; symbol: string; creatorFeeBps: number; graduated: boolean }) {
  const { address, isConnected, chainId } = useAccount();
  const pc = usePublicClient({ chainId: chain.id });
  const qc = useQueryClient();
  const { writeContractAsync } = useWriteContract();
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [amount, setAmount] = useState("");
  const [slippage, setSlippage] = useState(5);
  const [editSlip, setEditSlip] = useState(false);
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
  const totalFee = Number(feeBps ?? 100 + creatorFeeBps);
  const sniping = totalFee >= 9900;
  const tooMuch = side === "buy" ? !!nativeBal && wei > nativeBal.value : wei > (coinBal ?? 0n);

  async function trade() {
    if (!pc || wei === 0n) return;
    setMsg(null);
    try {
      const min = (out * BigInt(Math.round((100 - slippage) * 100))) / 10000n;
      const deadline = BigInt(Math.floor(Date.now() / 1000) + 300);
      setBusy("Confirm in your wallet…");
      const hash =
        side === "buy"
          ? await writeContractAsync({ address: market, abi: marketAbi, functionName: "buy", args: [min, deadline], value: wei, chainId: chain.id })
          : await writeContractAsync({ address: market, abi: marketAbi, functionName: "sell", args: [wei, min, deadline], chainId: chain.id });
      setBusy(side === "buy" ? "Buying…" : "Selling…");
      const r = await pc.waitForTransactionReceipt({ hash });
      if (r.status !== "success") throw new Error("The transaction failed.");
      setMsg({ ok: true, text: side === "buy" ? `Bought ${compact(Number(formatEther(out)))} $${symbol}.` : `Sold for ${nat(Number(formatEther(out)))} ${NATIVE}.` });
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
  };

  return (
    <div className="panel space-y-3 p-4">
      <div className="grid grid-cols-2 gap-1 rounded-lg bg-secondary p-1">
        {(["buy", "sell"] as const).map((s) => (
          <button
            key={s}
            onClick={() => (setSide(s), setAmount(""), setMsg(null))}
            className={cn("h-8 rounded-md text-[13px] font-semibold capitalize transition", side === s ? (s === "buy" ? "bg-up text-ink" : "bg-down text-ink") : "text-muted-foreground hover:text-foreground")}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{graduated ? "in the Elypad pool" : "on the bonding curve"}</span>
        <button onClick={() => setEditSlip(!editSlip)} className="inline-flex items-center gap-1 hover:text-foreground">
          <SlidersHorizontal className="size-3.5" /> slippage {slippage}%
        </button>
      </div>
      {editSlip && (
        <div className="flex gap-1">
          {SLIPPAGES.map((s) => (
            <button key={s} onClick={() => (setSlippage(s), setEditSlip(false))} className={cn("tab flex-1 border border-input", slippage === s && "tab-on")}>
              {s}%
            </button>
          ))}
        </div>
      )}

      <div className="relative">
        <input className="field num h-14 pr-20 text-lg" inputMode="decimal" placeholder="0.0" value={amount} onChange={(e) => setAmount(e.target.value.replace(",", "."))} />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">{side === "buy" ? NATIVE : symbol}</span>
      </div>
      <div className="flex flex-wrap gap-1">
        <button className="tab border border-input" onClick={() => setAmount("")}>reset</button>
        {side === "buy"
          ? BUYS.map((b) => (
              <button key={b} className="tab border border-input" onClick={() => setAmount(b)}>
                {b} {NATIVE}
              </button>
            ))
          : [25, 50, 75, 100].map((p) => (
              <button key={p} className="tab border border-input" onClick={() => setPart(p)}>
                {p === 100 ? "max" : `${p}%`}
              </button>
            ))}
      </div>
      {isConnected && (
        <p className="num text-[11px] text-muted-foreground">
          Balance: {side === "buy" ? `${nat(Number(nativeBal?.formatted ?? 0))} ${NATIVE}` : `${compact(Number(formatEther(coinBal ?? 0n)))} ${symbol}`}
        </p>
      )}

      {sniping ? (
        <p className="flex items-start gap-1.5 rounded-lg bg-down/10 p-2.5 text-xs text-down">
          <ShieldAlert className="mt-px size-3.5 shrink-0" /> Sniper tax: buys pay 99% for the first 2 seconds after launch. Wait a moment.
        </p>
      ) : (
        <p className={cn("rounded-lg p-2.5 text-xs", totalFee > 1100 ? "bg-gold/10 text-gold" : "bg-secondary text-muted-foreground")}>
          Fee on this trade: <span className="num font-semibold text-foreground">{pct(totalFee)}</span> · 1% Elypad + {pct(creatorFeeBps)} creator
        </p>
      )}

      {wei > 0n && (
        <div className="num space-y-1 text-xs">
          <p className="flex justify-between"><span className="text-muted-foreground">You get about</span><span className="font-semibold">{side === "buy" ? `${compact(Number(formatEther(out)))} ${symbol}` : `${nat(Number(formatEther(out)))} ${NATIVE}`}</span></p>
          <p className="flex justify-between"><span className="text-muted-foreground">Fees</span><span>{nat(Number(formatEther(fee)))} {NATIVE}</span></p>
          {refund > 0n && <p className="flex justify-between text-up"><span>Completes the curve, refunded</span><span>{nat(Number(formatEther(refund)))} {NATIVE}</span></p>}
        </div>
      )}

      {!isConnected ? (
        <ConnectButton big />
      ) : (
        <Button
          variant={side === "buy" ? "buy" : "sell"}
          size="lg"
          className="w-full"
          disabled={!!busy || wei === 0n || out === 0n || tooMuch || chainId !== chain.id}
          onClick={trade}
        >
          {busy ? (
            <>
              <Loader2 className="animate-spin" /> {busy}
            </>
          ) : tooMuch ? (
            "Not enough balance"
          ) : side === "buy" ? (
            `Buy ${symbol}`
          ) : (
            `Sell ${symbol}`
          )}
        </Button>
      )}
      {msg && <p className={cn("text-xs", msg.ok ? "text-up" : "text-down")}>{msg.text}</p>}
    </div>
  );
}
