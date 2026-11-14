"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ArrowLeft, Award, BookOpen, ChevronsLeft, ChevronsRight, Compass, Flame, Gift, House, Plus, Search, Trophy, Timer } from "lucide-react";
import { CHAIN_NAME } from "@/lib/config";
import { cn } from "@/lib/utils";
import { Logo, Wordmark } from "./logo";
import { Ticker } from "./ticker";
import { SearchPalette } from "./search-palette";
import { ConnectButton } from "./connect";
import { SoundToggle } from "./sound-toggle";
import { Toasts } from "./hype";
import { Onboarding } from "./onboarding";
import { buttonClass } from "./ui/button";

const NAV = [
  { href: "/", label: "Home", icon: House },
  { href: "/explore", label: "Explore", icon: Compass },
  { href: "/jackpots", label: "Jackpots", icon: Timer },
  { href: "/leaderboard", label: "Leaderboard", icon: Trophy },
  { href: "/points", label: "Points", icon: Award },
  { href: "/me", label: "My rewards", icon: Gift },
  { href: "/stake", label: "$ZRPD", icon: Flame },
];
export const MOBILE_NAV = [NAV[0], NAV[1], { href: "/create", label: "Create", icon: Plus }, NAV[3], NAV[5]];

const active = (path: string, href: string) => (href === "/" ? path === "/" : path.startsWith(href));
const TESTNET = /sepolia|testnet|anvil/i.test(CHAIN_NAME);

export function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const [wide, setWide] = useState(false);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    try {
      setWide(localStorage.getItem("zropad-rail") === "wide");
    } catch {}
  }, []);
  const toggle = () =>
    setWide((w) => {
      try {
        localStorage.setItem("zropad-rail", w ? "narrow" : "wide");
      } catch {}
      return !w;
    });

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearching(true);
      }
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, []);

  const railItem = (n: { href: string; label: string; icon: typeof House }) => (
    <Link
      key={n.href}
      href={n.href}
      title={n.label}
      className={cn("flex h-9 items-center gap-3 rounded-lg px-2.5 text-muted-foreground transition hover:bg-secondary hover:text-foreground", active(path, n.href) && "bg-secondary text-foreground")}
    >
      <n.icon className="size-[18px] shrink-0" />
      {wide && <span className="truncate text-[13px] font-medium">{n.label}</span>}
    </Link>
  );

  return (
    <div className={cn("min-h-dvh", wide ? "lg:pl-52" : "lg:pl-14")}>
      <aside className={cn("fixed inset-y-0 left-0 z-40 hidden flex-col gap-1 border-r border-border bg-background px-2 py-3 lg:flex", wide ? "w-52" : "w-14")}>
        <div className="mb-2 flex items-center gap-2 px-1">
          <Link href="/" className="flex items-center gap-2">
            <Logo className="size-7" />
            {wide && <Wordmark />}
          </Link>
          {wide && (
            <button onClick={toggle} className="ml-auto text-muted-foreground hover:text-foreground" aria-label="Collapse sidebar">
              <ChevronsLeft className="size-4" />
            </button>
          )}
        </div>
        {!wide && (
          <button onClick={toggle} className="mb-1 flex h-6 items-center justify-center text-muted-foreground hover:text-foreground" aria-label="Expand sidebar">
            <ChevronsRight className="size-4" />
          </button>
        )}
        {NAV.map(railItem)}
        <Link href="/create" title="Create a coin" className={cn("mt-2 flex h-9 items-center justify-center gap-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90", wide && "px-3")}>
          <Plus className="size-[18px]" />
          {wide && <span className="text-[13px] font-semibold">Create coin</span>}
        </Link>
        <div className="mt-auto space-y-1">
          {railItem({ href: "/docs", label: "How it works", icon: BookOpen })}
          {wide && (
            <p className="flex gap-3 px-2.5 text-[11px] text-muted-foreground">
              <Link href="/terms" className="hover:text-foreground">Terms</Link>
              <Link href="/privacy" className="hover:text-foreground">Privacy</Link>
            </p>
          )}
          {wide && <p className="px-2.5 text-[11px] leading-snug text-muted-foreground">Community-built on Zero. Not affiliated with LayerZero Labs.</p>}
          {wide && TESTNET && <p className="px-2.5 text-[11px] text-gold">{CHAIN_NAME} testnet</p>}
        </div>
      </aside>

      <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur">
        <div className="flex h-14 items-center gap-2 px-3 lg:h-12 lg:px-4">
          <Link href="/" className="flex items-center gap-2 lg:hidden">
            <Logo className="size-9" />
          </Link>
          <button onClick={() => router.back()} className="hidden text-muted-foreground hover:text-foreground lg:block" aria-label="Back">
            <ArrowLeft className="size-4" />
          </button>
          <button onClick={() => setSearching(true)} className="hidden h-8 w-full max-w-sm items-center gap-2 rounded-lg border border-input bg-card px-2.5 text-xs text-muted-foreground hover:border-muted-foreground/40 sm:flex">
            <Search className="size-3.5" />
            <span>Search for coins…</span>
            <kbd className="ml-auto hidden rounded border border-input px-1 text-[10px] sm:block">⌘K</kbd>
          </button>
          {TESTNET && <span className="chip hidden bg-gold/10 text-gold md:inline-flex">Testnet</span>}
          <div className="ml-auto flex items-center gap-1.5">
            <SoundToggle />
            <button onClick={() => setSearching(true)} className="grid size-9 place-items-center text-foreground/80 sm:hidden" aria-label="Search">
              <Search className="size-5" />
            </button>
            <Link href="/create" aria-label="Create a coin" className={buttonClass({ variant: "secondary", size: "icon-sm", className: "hidden lg:inline-flex" })}>
              <Plus />
            </Link>
            <ConnectButton />
          </div>
        </div>
        <Ticker />
      </header>

      <main className="w-full px-3 pb-24 pt-3 lg:px-4 lg:pb-8">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
        {MOBILE_NAV.map((n) => (
          <Link key={n.href} href={n.href} className={cn("flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium", n.href === "/create" ? "text-primary" : active(path, n.href) ? "text-foreground" : "text-muted-foreground")}>
            {n.href === "/create" ? (
              <span className="grid size-8 place-items-center rounded-full bg-primary text-primary-foreground"><Plus className="size-5" /></span>
            ) : (
              <n.icon className="size-5" />
            )}
            {n.href !== "/create" && n.label}
          </Link>
        ))}
      </nav>

      {searching && <SearchPalette onClose={() => setSearching(false)} />}
      <Toasts />
      <Onboarding />
    </div>
  );
}
