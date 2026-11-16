"use client";

import { useState } from "react";
import { formatEther, maxUint256, parseEther } from "viem";
import { useAccount, usePublicClient, useReadContract, useWriteContract } from "wagmi";
import { stakingAbi, zrpdAbi } from "@/lib/abi";
import { NATIVE, STAKING, TOKEN, ZRPD, chain } from "@/lib/config";
import { compact, nat } from "@/lib/format";
import { Flame } from "lucide-react";
import { ConnectButton } from "@/components/connect";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function Stake() {
  const { address, isConnected, chainId } = useAccount();
  const pc = usePublicClient({ chainId: chain.id });
  const { writeContractAsync } = useWriteContract();
  const [amount, setAmount] = useState("");
  const [mode, setMode] = useState<"stake" | "unstake">("stake");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const on = !!address && !!STAKING && !!ZRPD;
  const q = { enabled: on, refetchInterval: 4000 };

  const { data: total, refetch: r1 } = useReadContract({ address: STAKING, abi: stakingAbi, functionName: "totalStaked", chainId: chain.id, query: { enabled: !!STAKING, refetchInterval: 4000 } });
  const { data: staked, refetch: r2 } = useReadContract({ address: STAKING, abi: stakingAbi, functionName: "staked", args: [address!], chainId: chain.id, query: q });
  const { data: earned, refetch: r3 } = useReadContract({ address: STAKING, abi: stakingAbi, functionName: "earned", args: [address!], chainId: chain.id, query: q });
  const { data: wallet, refetch: r4 } = useReadContract({ address: ZRPD, abi: zrpdAbi, functionName: "balanceOf", args: [address!], chainId: chain.id, query: q });
  const { data: allowance, refetch: r5 } = useReadContract({ address: ZRPD, abi: zrpdAbi, functionName: "allowance", args: [address!, STAKING!], chainId: chain.id, query: q });

  let wei = 0n;
  try {
    wei = amount ? parseEther(amount) : 0n;
  } catch {}

  async function send(label: string, fn: () => Promise<`0x${string}`>) {
    if (!pc) return;
    setError(null);
    setBusy("Confirm in your wallet…");
    try {
      const hash = await fn();
      setBusy(label);
      await pc.waitForTransactionReceipt({ hash });
      [r1, r2, r3, r4, r5].forEach((r) => r());
      return true;
    } catch (e) {
      setError((e as { shortMessage?: string }).shortMessage ?? (e as Error).message);
      return false;
    } finally {
      setBusy(null);
    }
  }

  async function submit() {
    if (!STAKING || !ZRPD) return;
    if (mode === "stake") {
      if ((allowance ?? 0n) < wei && !(await send("Approving…", () => writeContractAsync({ address: ZRPD!, abi: zrpdAbi, functionName: "approve", args: [STAKING!, maxUint256], chainId: chain.id })))) return;
      if (await send("Staking…", () => writeContractAsync({ address: STAKING!, abi: stakingAbi, functionName: "stake", args: [wei], chainId: chain.id }))) setAmount("");
    } else if (await send("Unstaking…", () => writeContractAsync({ address: STAKING!, abi: stakingAbi, functionName: "unstake", args: [wei], chainId: chain.id }))) setAmount("");
  }

  const max = mode === "stake" ? wallet : staked;
  const share = total && staked ? Number((staked * 10000n) / total) / 100 : 0;

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-semibold"><Flame className="size-5 text-primary" /> Stake ${TOKEN}</h1>
        <p className="mt-1 text-sm text-muted-foreground">30% of Elypad&apos;s 1% trading fee goes to ${TOKEN} stakers, paid in {NATIVE}, as every trade happens. No lockup.</p>
      </div>
      {!STAKING ? (
        <div className="panel p-8 text-center text-xs text-muted-foreground">Staking opens when ${TOKEN} launches.</div>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <Box k="Total staked" v={`${compact(Number(formatEther(total ?? 0n)))} ${TOKEN}`} />
            <Box k="Your stake" v={`${compact(Number(formatEther(staked ?? 0n)))} ${TOKEN}`} sub={share ? `${share}% of the pool` : undefined} />
            <Box k="Your rewards" v={`${nat(Number(formatEther(earned ?? 0n)))} ${NATIVE}`} accent />
          </div>
          <div className="panel space-y-4 p-4">
            <div className="grid grid-cols-2 gap-1 rounded-lg bg-secondary p-1">
              {(["stake", "unstake"] as const).map((m) => (
                <button key={m} onClick={() => (setMode(m), setAmount(""))} className={cn("h-8 rounded-md text-[13px] font-semibold capitalize", mode === m ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}>
                  {m}
                </button>
              ))}
            </div>
            <div>
              <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                <span>Amount ({TOKEN})</span>
                <button onClick={() => max && setAmount(formatEther(max))}>Max: {compact(Number(formatEther(max ?? 0n)))}</button>
              </div>
              <input className="field num h-12 text-lg" inputMode="decimal" placeholder="0" value={amount} onChange={(e) => setAmount(e.target.value.replace(",", "."))} />
            </div>
            {error && <div className="rounded-lg bg-down/10 p-3 text-xs text-down">{error}</div>}
            {!isConnected ? (
              <ConnectButton big />
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                <Button size="lg" disabled={!!busy || wei === 0n || wei > (max ?? 0n) || chainId !== chain.id} onClick={submit}>
                  {busy ?? (mode === "stake" ? "Stake" : "Unstake")}
                </Button>
                <Button
                  variant="secondary"
                  size="lg"
                  disabled={!!busy || !earned || chainId !== chain.id}
                  onClick={() => send("Claiming…", () => writeContractAsync({ address: STAKING!, abi: stakingAbi, functionName: "claim", chainId: chain.id }))}
                >
                  Claim {nat(Number(formatEther(earned ?? 0n)))} {NATIVE}
                </Button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function Box({ k, v, sub, accent }: { k: string; v: string; sub?: string; accent?: boolean }) {
  return (
    <div className="panel p-4">
      <div className="text-[11px] text-muted-foreground">{k}</div>
      <div className={`num mt-0.5 text-xl font-semibold ${accent ? "text-primary" : ""}`}>{v}</div>
      {sub && <div className="text-[11px] text-muted-foreground">{sub}</div>}
    </div>
  );
}
