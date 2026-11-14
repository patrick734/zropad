import type { Metadata, Viewport } from "next";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import { Providers } from "@/components/providers";
import { Shell } from "@/components/shell";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Zropad · launch coins on Zero", template: "%s · Zropad" },
  description: "Launch a coin on Zero in one transaction. Bonding curve, locked liquidity, creator fees up to 50%, and a countdown jackpot on every coin.",
};

export const viewport: Viewport = { themeColor: "#050506" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`dark ${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="min-h-dvh font-sans text-sm">
        <Providers>
          <Shell>{children}</Shell>
        </Providers>
      </body>
    </html>
  );
}
