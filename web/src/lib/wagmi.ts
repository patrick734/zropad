"use client";

import { createConfig, http } from "wagmi";
import { injected, walletConnect } from "wagmi/connectors";
import { chain, RPC_URL } from "./config";

const wc = process.env.NEXT_PUBLIC_WC_PROJECT_ID;

export const wagmiConfig = createConfig({
  chains: [chain],
  connectors: [
    injected({ shimDisconnect: true }),
    ...(wc ? [walletConnect({ projectId: wc, metadata: { name: "Zropad", description: "The launchpad for Zero", url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://zropad.fun", icons: [] }, showQrModal: true })] : []),
  ],
  transports: { [chain.id]: http(RPC_URL) },
  ssr: true,
});
