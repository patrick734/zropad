/* eslint-disable @next/next/no-img-element */
import { cn } from "@/lib/utils";

export function Logo({ className = "size-8" }: { className?: string }) {
  return <img src="/logo.svg" alt="" aria-hidden className={cn("shrink-0 object-contain", className)} />;
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("text-lg font-extrabold tracking-tight", className)}>
      Zro<span className="text-primary">pad</span>
    </span>
  );
}
