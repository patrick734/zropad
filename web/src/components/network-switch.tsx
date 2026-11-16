"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { ELYSIUM_URL } from "@/lib/config";
import { cn } from "@/lib/utils";

/** Elypad runs on two networks; this site is the Zero one. Switching opens the other site. */
const NETWORKS = [
  { id: "elysium", name: "Elysium", color: "#34b7dd", href: ELYSIUM_URL },
  { id: "zero", name: "Zero", color: "#7ef29d", href: null },
] as const;
const CURRENT = "zero";

export function NetworkSwitch() {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    window.addEventListener("mousedown", close);
    return () => window.removeEventListener("mousedown", close);
  }, [open]);
  const current = NETWORKS.find((n) => n.id === CURRENT)!;
  return (
    <div ref={box} className="relative">
      <button onClick={() => setOpen(!open)} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-input bg-card px-2.5 text-xs font-medium hover:border-muted-foreground/40" aria-label="Switch network">
        <span className="size-2 rounded-full" style={{ background: current.color }} />
        {current.name}
        <ChevronDown className="size-3.5 text-muted-foreground" />
      </button>
      {open && (
        <div className="pop-in absolute left-0 top-10 z-50 w-48 rounded-xl border border-border bg-popover p-1.5 shadow-2xl">
          <p className="label px-2.5 pb-1 pt-1.5">Network</p>
          {NETWORKS.map((n) => {
            const on = n.id === CURRENT;
            const inner = (
              <>
                <span className="size-2.5 rounded-full" style={{ background: n.color }} />
                <span className="flex-1">{n.name}</span>
                {on && <Check className="size-4 text-primary" />}
              </>
            );
            const cls = cn("flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[13px] hover:bg-secondary", on && "bg-secondary");
            return on || !n.href ? (
              <button key={n.id} className={cls} onClick={() => setOpen(false)}>{inner}</button>
            ) : (
              <a key={n.id} className={cls} href={n.href}>{inner}</a>
            );
          })}
        </div>
      )}
    </div>
  );
}
