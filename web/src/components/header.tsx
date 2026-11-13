import Link from "next/link";
import { ConnectButton } from "./connect";
import { SoundToggle } from "./sound-toggle";

const NAV = [
  ["Coins", "/"],
  ["Launch", "/launch"],
  ["Points", "/points"],
  ["Stake", "/stake"],
  ["How it works", "/docs"],
];

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-ink/80 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3">
        <Link href="/" className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-lime font-black text-ink">Z0</span>
          <span className="hidden text-xl font-black tracking-tight min-[360px]:inline">ZROPAD</span>
        </Link>
        <nav className="hidden gap-1 md:flex">
          {NAV.map(([label, href]) => (
            <Link key={href} href={href} className="rounded-lg px-3 py-2 text-sm font-semibold text-muted hover:bg-white/5 hover:text-white">
              {label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <span className="hidden sm:inline-flex"><SoundToggle /></span>
          <Link href="/launch" className="btn btn-ghost hidden sm:inline-flex">+ Launch</Link>
          <ConnectButton />
        </div>
      </div>
      <nav className="flex gap-1 overflow-x-auto px-4 pb-2 md:hidden">
        {NAV.map(([label, href]) => (
          <Link key={href} href={href} className="whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-semibold text-muted">
            {label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
