"use client";

/* eslint-disable @next/next/no-img-element */
import { useEffect, useState } from "react";
import Link from "next/link";
import { CHAIN_NAME } from "@/lib/config";
import { Button } from "./ui/button";

const KEY = "zropad_onboarded";

/** First-visit welcome: a sheet from the bottom on phones, a card on desktop. */
export function Onboarding() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    try {
      if (!localStorage.getItem(KEY)) setOpen(true);
    } catch {
      // storage blocked: skip the welcome
    }
  }, []);
  if (!open) return null;
  const close = () => {
    try {
      localStorage.setItem(KEY, "1");
    } catch {
      // fine
    }
    setOpen(false);
  };
  const chain = /sepolia|testnet|anvil/i.test(CHAIN_NAME) ? "Zero" : CHAIN_NAME;
  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/70 backdrop-blur-[2px] sm:items-center sm:justify-center sm:p-4" role="dialog" aria-modal aria-label="Welcome to Zropad">
      <div className="sheet-up w-full rounded-t-3xl border-t-2 border-primary/70 bg-background px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-5 shadow-[0_-12px_40px_-8px_rgba(126,242,157,0.35)] sm:max-w-md sm:rounded-3xl sm:border-2">
        <Hero />
        <h2 className="mt-6 text-center text-[26px] font-bold tracking-tight">
          Welcome to Zro<span className="text-primary">pad</span>!
        </h2>
        <p className="mx-auto mt-3 max-w-sm text-center text-[15px] leading-relaxed text-muted-foreground">
          Zropad lets anyone launch a coin on {chain}, and everyone buys at the same price from the first second. No presale, no team bag, and a jackpot on every coin.
        </p>
        <Button size="lg" className="mt-6 h-12 w-full rounded-2xl text-base font-semibold" onClick={close}>
          Continue
        </Button>
        <p className="mt-4 text-center text-xs leading-relaxed text-muted-foreground">
          By continuing, you agree to the{" "}
          <Link href="/terms" target="_blank" className="underline underline-offset-2 hover:text-foreground">Terms of Use</Link> and{" "}
          <Link href="/privacy" target="_blank" className="underline underline-offset-2 hover:text-foreground">Privacy Policy</Link>, and confirm you are over 18 years old.
        </p>
      </div>
    </div>
  );
}

/** Night over the pond: the Zropad Z out front, coins floating up behind it. */
function Hero() {
  const coins = [
    { x: "8%", y: "38%", s: 34, d: "0s", t: "Z" },
    { x: "20%", y: "14%", s: 26, d: "1.2s", t: "$" },
    { x: "74%", y: "12%", s: 30, d: "0.6s", t: "0" },
    { x: "86%", y: "40%", s: 36, d: "1.8s", t: "Z" },
    { x: "64%", y: "52%", s: 22, d: "2.4s", t: "$" },
    { x: "30%", y: "56%", s: 20, d: "0.9s", t: "0" },
  ];
  return (
    <div className="relative aspect-[16/9] overflow-hidden rounded-2xl border border-border">
      <svg viewBox="0 0 320 180" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 size-full" aria-hidden>
        <defs>
          <linearGradient id="ob-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#020604" />
            <stop offset=".55" stopColor="#06231a" />
            <stop offset=".85" stopColor="#14583a" />
            <stop offset="1" stopColor="#7ef29d" />
          </linearGradient>
          <radialGradient id="ob-glow" cx=".5" cy=".85" r=".45">
            <stop offset="0" stopColor="#d6ffe1" stopOpacity=".8" />
            <stop offset=".35" stopColor="#7ef29d" stopOpacity=".35" />
            <stop offset="1" stopColor="#7ef29d" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="ob-water" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#0b2a1f" />
            <stop offset="1" stopColor="#030c08" />
          </linearGradient>
          <linearGradient id="ob-pad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#3fbf6e" />
            <stop offset="1" stopColor="#14532e" />
          </linearGradient>
        </defs>
        <rect width="320" height="180" fill="url(#ob-sky)" />
        <rect width="320" height="180" fill="url(#ob-glow)" />
        {[
          [24, 18], [60, 32], [104, 12], [148, 26], [212, 16], [252, 34], [292, 20], [180, 8], [40, 50], [276, 56],
        ].map(([x, y]) => (
          <circle key={`${x}-${y}`} cx={x} cy={y} r=".9" fill="#eafff0" className="twinkle" style={{ animationDelay: `${(x % 7) * 0.4}s` }} />
        ))}
        <path d="M0 138 C 70 128, 120 134, 170 138 S 270 128, 320 134 L 320 180 L 0 180 Z" fill="url(#ob-water)" />
        <path d="M30 156 a26 7 0 1 0 52 0 a26 7 0 1 0 -52 0 Z M56 156 L82 152" fill="url(#ob-pad)" opacity=".7" />
        <path d="M244 150 a20 5.5 0 1 0 40 0 a20 5.5 0 1 0 -40 0 Z" fill="url(#ob-pad)" opacity=".6" />
        <ellipse cx="160" cy="160" rx="58" ry="10" fill="url(#ob-pad)" />
        <path d="M160 160 L214 156" stroke="#04170b" strokeWidth="2" />
      </svg>
      {coins.map((c, i) => (
        <span
          key={i}
          className="float-coin absolute grid place-items-center rounded-full border border-white/40 bg-gradient-to-br from-white/50 via-primary/40 to-primary/10 font-bold text-white shadow-[inset_0_1px_3px_rgba(255,255,255,0.7),0_4px_12px_rgba(0,0,0,0.35)] backdrop-blur-sm"
          style={{ left: c.x, top: c.y, width: c.s, height: c.s, fontSize: c.s * 0.42, animationDelay: c.d }}
        >
          {c.t}
        </span>
      ))}
      <img src="/logo.svg" alt="" className="bob absolute bottom-[12%] left-1/2 w-[32%] -translate-x-1/2 drop-shadow-[0_10px_18px_rgba(0,0,0,0.6)]" />
    </div>
  );
}
