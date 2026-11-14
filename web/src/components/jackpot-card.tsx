"use client";

import { useState } from "react";
import { type Address } from "viem";
import { useAccount, usePublicClient, useWriteContract } from "wagmi";
import { Loader2, Timer } from "lucide-react";
import { hubAbi } from "@/lib/abi";
import { NATIVE, ZROPAD, chain } from "@/lib/config";
import { natSym, short } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Countdown } from "./countdown";
import { Button } from "./ui/button";

/** The coin's countdown jackpot: be the last buyer when it hits zero. */
export function JackpotCard({ coin, pot, deadline, round, lastBuyer, minBuy }: { coin: Address; pot: number; deadline: number; round: number; lastBuyer: string | null; minBuy: string }) {
  const { address } = useAccount();
  const pc = usePublicClient({ chainId: chain.id });
  const { writeContractAsync } = useWriteContract();
  const [busy, setBusy] = useState(false);
  const over = deadline <= Date.now() / 1000;
  const leading = !!address && lastBuyer === address.toLowerCase();

  async function settle() {
    if (!ZROPAD || !pc) return;
    setBusy(true);
    try {
      const hash = await writeContractAsync({ address: ZROPAD, abi: hubAbi, functionName: "settle", args: [coin], chainId: chain.id });
      await pc.waitForTransactionReceipt({ hash });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={cn("panel space-y-2 p-4", leading && "glow border-gold/50")}>
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-1.5 font-semibold text-gold"><Timer className="size-4" /> Jackpot</p>
        <span className="text-xs text-muted-foreground">round {round}</span>
      </div>
      <div className="flex items-end justify-between">
        <p className="num text-2xl font-semibold text-gold">{natSym(pot, 4)}</p>
        <p className="text-right text-xs text-muted-foreground">
          {over ? "countdown over" : <>ends in <Countdown to={deadline} className="text-base font-semibold text-foreground" /></>}
        </p>
      </div>
      <p className="text-xs">
        {lastBuyer ? (
          <>
            <span className="text-muted-foreground">Last buyer: </span>
            <span className={leading ? "font-semibold text-up" : "font-mono"}>{leading ? "you" : short(lastBuyer)}</span>
          </>
        ) : (
          <span className="text-muted-foreground">Nobody leads this round yet.</span>
        )}
      </p>
      <p className="text-xs text-muted-foreground">
        Every buy of {minBuy} {NATIVE} or more makes you the last buyer and adds 30 seconds (up to 24 hours). When it hits zero, the last buyer wins 90%; 10% starts the next round.
      </p>
      {over && lastBuyer && (
        <Button variant="secondary" className="w-full" disabled={busy} onClick={settle}>
          {busy ? <Loader2 className="animate-spin" /> : null} Pay out the winner
        </Button>
      )}
    </div>
  );
}
