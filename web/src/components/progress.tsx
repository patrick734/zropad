import { cn } from "@/lib/utils";

/** The bonding-curve bar, gold once the coin graduates. */
export function CurveProgress({ value, graduated, className }: { value: number; graduated?: boolean; className?: string }) {
  const pct = Math.max(0, Math.min(100, value * 100));
  return (
    <div className={cn("h-2 w-full overflow-hidden rounded-full bg-secondary", className)} role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}>
      <div className={cn("h-full rounded-full transition-[width] duration-700", graduated ? "bg-gold" : "bg-up")} style={{ width: `${pct}%` }} />
    </div>
  );
}
