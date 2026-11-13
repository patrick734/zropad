import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/providers";
import { Header } from "@/components/header";
import { HypeLayer } from "@/components/hype";

export const metadata: Metadata = {
  title: "Zropad · The launchpad for Zero",
  description: "Launch a coin on Zero in one transaction. Bonding curve, locked liquidity, creator fees up to 50%, and a countdown jackpot on every coin.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@500;700&family=Space+Grotesk:wght@400;600;700&display=swap" rel="stylesheet" />
      </head>
      <body>
        <Providers>
          <Header />
          <HypeLayer />
          <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
          <footer className="mx-auto max-w-7xl px-4 py-10 text-center text-xs text-muted">
            Zropad · Community-built on Zero. Not affiliated with LayerZero Labs.
          </footer>
        </Providers>
      </body>
    </html>
  );
}
