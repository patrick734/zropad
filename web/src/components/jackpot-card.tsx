"use client";

import { useState } from "react";
import { type Address } from "viem";
import { useAccount, usePublicClient, useWriteContract } from "wagmi";
import { hubAbi } from "@/lib/abi";
import { ZROPAD, chain } from "@/lib/config";
import { natSym, short } from "@/lib/format";
import { Countdown } from "./countdown";

/** The coin's countdown jackpot: be the last buyer when it hits zero. */
export function JackpotCard({ coin, pot, deadline, round, lastBuyer }: { coin: Address; pot: number; deadline: number; round: number; lastBuyer: string | null }) {
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
    <div className={`panel p-5 ${leading ? "glow border-lime/50" : ""}`}>
      <div className="flex items-center justify-between">
        <div className="text-xs font-bold tracking-widest text-gold">🎰 JACKPOT · ROUND {round}</div>
        <div className="text-xs text-muted">last buyer wins</div>
      </div>
      <div className="num mt-2 text-3xl font-black text-gold">{natSym(pot, 4)}</div>
      <div className="mt-1 text-sm text-muted">
        {over ? "Countdown over" : <>Ends in <Countdown to={deadline} className="text-lg font-bold text-white" /></>}
      </div>
      <div className="mt-3 text-sm">
        {lastBuyer ? (
          <>
            Leading: <b className={leading ? "text-lime" : ""}>{leading ? "you! 🔥" : short(lastBuyer)}</b>
          </>
        ) : (
          <span className="text-muted">No one leads this round yet.</span>
        )}
      </div>
      <p className="mt-3 text-xs text-muted">Every buy of 0.005+ makes you the leader and adds 30 s (up to 24 h). At zero, the leader wins 90%; 10% seeds the next round. Fed by 0.2% of every trade and the sniper tax.</p>
      {over && lastBuyer && (
        <button className="btn btn-lime mt-3 w-full" disabled={busy} onClick={settle}>
          {busy ? "Paying out…" : "Pay out the winner"}
        </button>
      )}
    </div>
  );
}
