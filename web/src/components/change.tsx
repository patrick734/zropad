import { ArrowDown, ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";

/** A % change with an arrow: green up, coral down. */
export function Change({ value, className }: { value: number | null; className?: string }) {
  if (value == null) return <span className={cn("num text-muted-foreground", className)}>—</span>;
  const up = value >= 0;
  return (
    <span className={cn("num inline-flex items-center gap-0.5", up ? "text-up" : "text-down", className)}>
      {up ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />}
      {Math.abs(value) >= 1000 ? `${(Math.abs(value) / 1000).toFixed(1)}K` : Math.abs(value).toFixed(1)}%
    </span>
  );
}
