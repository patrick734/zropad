import { defineChain, type Address } from "viem";

/**
 * Everything chain-specific comes from the environment, so the same code runs on any chain.
 * Each variable is read by its literal name so Next.js can build it into the browser bundle.
 */
const env = (v: string | undefined, d = "") => (v && v.trim() ? v.trim() : d);

export const CHAIN_ID = Number(env(process.env.NEXT_PUBLIC_CHAIN_ID, "31337"));
export const RPC_URL = env(process.env.NEXT_PUBLIC_RPC_URL, "http://127.0.0.1:8545");
export const NATIVE = env(process.env.NEXT_PUBLIC_NATIVE_SYMBOL, "ETH");
export const EXPLORER = env(process.env.NEXT_PUBLIC_EXPLORER, "");
export const CHAIN_NAME = env(process.env.NEXT_PUBLIC_CHAIN_NAME, "Zero");

const addr = (v: string) => (/^0x[0-9a-fA-F]{40}$/.test(v) ? (v as Address) : undefined);
export const ZROPAD = addr(env(process.env.NEXT_PUBLIC_ZROPAD));
export const ZRPD = addr(env(process.env.NEXT_PUBLIC_ZRPD));
export const STAKING = addr(env(process.env.NEXT_PUBLIC_STAKING));

/** Native raised at graduation (display only; the market contract is the source of truth). */
export const GRADUATION = Number(env(process.env.NEXT_PUBLIC_GRADUATION, "4.2"));
/** A trade at least this big (native) shows a whale alert. */
export const WHALE = Number(env(process.env.NEXT_PUBLIC_WHALE, "1"));
export const SUPPLY = 1_000_000_000;
export const EARLY_BUYERS = 50;

export const chain = defineChain({
  id: CHAIN_ID,
  name: CHAIN_NAME,
  nativeCurrency: { name: NATIVE, symbol: NATIVE, decimals: 18 },
  rpcUrls: { default: { http: [RPC_URL] } },
  blockExplorers: EXPLORER ? { default: { name: "Explorer", url: EXPLORER } } : undefined,
});

export const explorerTx = (h: string) => (EXPLORER ? `${EXPLORER}/tx/${h}` : "#");
export const explorerAddress = (a: string) => (EXPLORER ? `${EXPLORER}/address/${a}` : "#");
