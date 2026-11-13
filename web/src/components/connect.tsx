"use client";

import { useAccount, useConnect, useDisconnect, useSwitchChain } from "wagmi";
import { useEffect, useState } from "react";
import { chain } from "@/lib/config";
import { short } from "@/lib/format";

export function ConnectButton() {
  const { address, isConnected, chainId } = useAccount();
  const { connectors, connect, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return <button className="btn btn-lime">Connect</button>;

  if (isConnected && chainId !== chain.id)
    return (
      <button className="btn bg-sell text-white" onClick={() => switchChain({ chainId: chain.id })}>
        Switch to {chain.name}
      </button>
    );
  if (isConnected)
    return (
      <div className="relative">
        <button className="btn btn-ghost num" onClick={() => setOpen(!open)}>
          {short(address)}
        </button>
        {open && (
          <div className="panel absolute right-0 top-12 z-50 w-44 p-2">
            <a href="/me" className="block rounded-lg px-3 py-2 hover:bg-white/5">My coins & rewards</a>
            <button className="w-full rounded-lg px-3 py-2 text-left text-sell hover:bg-white/5" onClick={() => (disconnect(), setOpen(false))}>
              Disconnect
            </button>
          </div>
        )}
      </div>
    );
  return (
    <div className="relative">
      <button className="btn btn-lime" disabled={isPending} onClick={() => setOpen(!open)}>
        {isPending ? "Connecting…" : "Connect"}
      </button>
      {open && (
        <div className="panel absolute right-0 top-12 z-50 w-56 p-2">
          {connectors.map((c) => (
            <button key={c.uid} className="w-full rounded-lg px-3 py-2 text-left hover:bg-white/5" onClick={() => (connect({ connector: c, chainId: chain.id }), setOpen(false))}>
              {c.name === "Injected" ? "Browser wallet" : c.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
