import { cn } from "@/lib/utils";

/** A gradient made from a wallet address. */
export function Avatar({ seed, className }: { seed: string; className?: string }) {
  const h = parseInt(seed.slice(2, 8) || "0", 16) % 360;
  return (
    <span
      aria-hidden
      className={cn("inline-block size-6 shrink-0 rounded-full", className)}
      style={{ background: `linear-gradient(135deg, oklch(0.78 0.15 ${h}), oklch(0.55 0.15 ${(h + 90) % 360}))` }}
    />
  );
}
