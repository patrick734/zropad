"use client";

import { cn } from "@/lib/utils";

/** A full-height panel with a header and its own scroll, like a terminal pane. */
export function Column({ title, icon, actions, tabs, className, children }: { title: string; icon?: React.ReactNode; actions?: React.ReactNode; tabs?: React.ReactNode; className?: string; children: React.ReactNode }) {
  return (
    <section className={cn("flex min-h-0 flex-col overflow-hidden rounded-xl border border-border bg-card", className)}>
      <header className="flex h-10 shrink-0 items-center gap-2 border-b border-border px-3">
        {icon}
        <h2 className="text-[13px] font-semibold">{title}</h2>
        <div className="ml-auto flex items-center gap-1">{actions}</div>
      </header>
      {tabs && <div className="flex shrink-0 items-center gap-1 border-b border-border px-2 py-1.5">{tabs}</div>}
      <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
    </section>
  );
}

/** Small pill tabs. */
export function Tabs<T extends string>({ value, options, onChange, green, className }: { value: T; options: readonly (readonly [T, string])[]; onChange: (v: T) => void; green?: boolean; className?: string }) {
  return (
    <div className={cn("flex items-center gap-0.5", className)}>
      {options.map(([v, label]) => (
        <button key={v} onClick={() => onChange(v)} className={cn("tab", value === v && (green ? "tab-green" : "tab-on"))}>
          {label}
        </button>
      ))}
    </div>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="px-4 py-10 text-center text-xs text-muted-foreground">{children}</p>;
}

export function Rows({ n = 8 }: { n?: number }) {
  return (
    <div className="space-y-px p-2">
      {Array.from({ length: n }).map((_, i) => (
        <div key={i} className="h-12 animate-pulse rounded-md bg-secondary/50" />
      ))}
    </div>
  );
}
