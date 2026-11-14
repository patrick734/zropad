"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, Gift, LogOut, Wallet } from "lucide-react";
import { useAccount, useConnect, useDisconnect, useSwitchChain } from "wagmi";
import { chain } from "@/lib/config";
import { short } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Avatar } from "./avatar";
import { Button } from "./ui/button";

/** Connect / the connected wallet, with a menu. */
export function ConnectButton({ className, big }: { className?: string; big?: boolean }) {
  const { address, isConnected, chainId } = useAccount();
  const { connectors, connect, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    window.addEventListener("mousedown", close);
    return () => window.removeEventListener("mousedown", close);
  }, [open]);

  const size = big ? "h-11 w-full rounded-lg text-base" : "h-9 rounded-xl px-4";
  if (!mounted) return <Button className={cn(size, className)}>Connect</Button>;

  if (isConnected && chainId !== chain.id)
    return (
      <Button variant="sell" className={cn(size, className)} onClick={() => switchChain({ chainId: chain.id })}>
        Switch to {chain.name}
      </Button>
    );

  return (
    <div ref={box} className={cn("relative", big && "w-full")}>
      {isConnected && address ? (
        <Button variant="secondary" size="sm" className={cn("h-9 rounded-xl px-3", className)} onClick={() => setOpen(!open)}>
          <Avatar seed={address} className="size-4" />
          <span className="num">{short(address)}</span>
          <ChevronDown className="size-3.5 text-muted-foreground" />
        </Button>
      ) : (
        <Button className={cn(size, className)} disabled={isPending} onClick={() => setOpen(!open)}>
          {isPending ? "Connecting…" : big ? "Connect wallet" : "Connect"}
        </Button>
      )}
      {open && (
        <div className="pop-in absolute right-0 top-11 z-50 w-56 rounded-xl border border-border bg-popover p-1.5 shadow-2xl">
          {isConnected ? (
            <>
              <Link href="/me" onClick={() => setOpen(false)} className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-[13px] hover:bg-secondary">
                <Gift className="size-4 text-primary" /> My coins & rewards
              </Link>
              <button onClick={() => (disconnect(), setOpen(false))} className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[13px] text-down hover:bg-secondary">
                <LogOut className="size-4" /> Disconnect
              </button>
            </>
          ) : (
            connectors.map((c) => (
              <button key={c.uid} onClick={() => (connect({ connector: c, chainId: chain.id }), setOpen(false))} className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[13px] hover:bg-secondary">
                <Wallet className="size-4 text-primary" /> {c.name === "Injected" ? "Browser wallet" : c.name}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
