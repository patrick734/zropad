/* eslint-disable @next/next/no-img-element */
import { cn } from "@/lib/utils";

const COLORS = ["#7ef29d", "#fde68a", "#a7f3d0", "#f9a8d4", "#c4b5fd", "#fdba74"];

/** A coin's image, or its ticker on a colour picked from its address. */
export function CoinImage({ src, symbol, address = "0x00", className }: { src: string | null; symbol: string; address?: string; className?: string }) {
  if (src) return <img src={src} alt={symbol} loading="lazy" className={cn("size-10 shrink-0 rounded-md bg-secondary object-cover", className)} />;
  const bg = COLORS[parseInt(address.slice(2, 4) || "0", 16) % COLORS.length];
  return (
    <div className={cn("grid size-10 shrink-0 place-items-center rounded-md text-[10px] font-bold text-ink", className)} style={{ background: bg }}>
      {symbol.slice(0, 4)}
    </div>
  );
}
