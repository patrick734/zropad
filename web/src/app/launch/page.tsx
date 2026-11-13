"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { decodeEventLog, formatEther, parseEther } from "viem";
import { useAccount, usePublicClient, useReadContract, useWriteContract } from "wagmi";
import { hubAbi } from "@/lib/abi";
import { NATIVE, ZROPAD, SUPPLY, chain } from "@/lib/config";
import { compact, nat, pct } from "@/lib/format";
import { ConnectButton } from "@/components/connect";

const FEE_STEPS = [0, 100, 200, 300, 500, 1000, 2000, 3000, 5000];

export default function Launch() {
  const router = useRouter();
  const { address, isConnected, chainId } = useAccount();
  const pc = usePublicClient({ chainId: chain.id });
  const { writeContractAsync } = useWriteContract();
  const { data: config } = useReadContract({ address: ZROPAD, abi: hubAbi, functionName: "config", chainId: chain.id });

  const [name, setName] = useState("");
  const [symbol, setSymbol] = useState("");
  const [description, setDescription] = useState("");
  const [website, setWebsite] = useState("");
  const [twitter, setTwitter] = useState("");
  const [telegram, setTelegram] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [feeBps, setFeeBps] = useState(100);
  const [firstBuy, setFirstBuy] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!image) return setPreview(null);
    const u = URL.createObjectURL(image);
    setPreview(u);
    return () => URL.revokeObjectURL(u);
  }, [image]);

  const launchFee = config ? (config[0] as bigint) : 0n;
  const buyWei = useMemo(() => {
    try {
      return firstBuy ? parseEther(firstBuy) : 0n;
    } catch {
      return 0n;
    }
  }, [firstBuy]);

  /** Coins the first buy gets: 1% protocol fee + creator fee off the top, then the curve. */
  const firstBuyTokens = useMemo(() => {
    if (!config || buyWei === 0n) return 0;
    const vN = config[1] as bigint, vT = config[2] as bigint, curve = config[3] as bigint;
    const net = buyWei - (buyWei * BigInt(100 + feeBps)) / 10000n;
    let out = vT - (vN * vT + vN + net - 1n) / (vN + net);
    if (out > curve) out = curve;
    return Number(formatEther(out));
  }, [config, buyWei, feeBps]);

  const nameBytes = new TextEncoder().encode(name).length;
  const symBytes = new TextEncoder().encode(symbol).length;
  const valid = nameBytes > 0 && nameBytes <= 32 && symBytes > 0 && symBytes <= 10 && !!image;

  async function launch() {
    setError(null);
    if (!ZROPAD || !pc) return setError("Zropad isn't deployed on this network yet.");
    try {
      setBusy("Uploading image…");
      const form = new FormData();
      Object.entries({ name, symbol, description, website, twitter, telegram }).forEach(([k, v]) => form.append(k, v));
      form.append("image", image!);
      const up = await fetch("/api/meta", { method: "POST", body: form });
      const meta = await up.json();
      if (!up.ok) throw new Error(meta.error ?? "Upload failed");

      setBusy("Confirm in your wallet…");
      const hash = await writeContractAsync({
        address: ZROPAD,
        abi: hubAbi,
        functionName: "launch",
        args: [name, symbol.toUpperCase(), meta.uri, feeBps, 0n],
        value: launchFee + buyWei,
        chainId: chain.id,
      });
      setBusy("Launching…");
      const receipt = await pc.waitForTransactionReceipt({ hash });
      for (const log of receipt.logs) {
        try {
          const ev = decodeEventLog({ abi: hubAbi, data: log.data, topics: log.topics });
          if (ev.eventName === "Launched") return router.push(`/coin/${(ev.args as { coin: string }).coin.toLowerCase()}?launched=1`);
        } catch {}
      }
      throw new Error("Launched, but couldn't find the new coin. Check your wallet.");
    } catch (e) {
      setError((e as { shortMessage?: string }).shortMessage ?? (e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-[1fr_320px]">
      <div className="panel space-y-5 p-6">
        <div>
          <h1 className="text-3xl font-black">Launch a coin</h1>
          <p className="text-muted">1,000,000,000 supply, on the curve straight away. Graduates at about 4.2 {NATIVE} into a pool with the liquidity locked for good.</p>
        </div>

        <label className="block">
          <span className="mb-1 block text-sm font-semibold">Image</span>
          <input type="file" accept="image/png,image/jpeg,image/gif,image/webp" onChange={(e) => setImage(e.target.files?.[0] ?? null)} className="input" />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-sm font-semibold">Name <span className="text-muted">({nameBytes}/32)</span></span>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Moon Cat" />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-semibold">Ticker <span className="text-muted">({symBytes}/10)</span></span>
            <input className="input uppercase" value={symbol} onChange={(e) => setSymbol(e.target.value.replace(/\s/g, ""))} placeholder="MCAT" />
          </label>
        </div>
        <label className="block">
          <span className="mb-1 block text-sm font-semibold">Description <span className="text-muted">({description.length}/280)</span></span>
          <textarea className="input min-h-24" maxLength={280} value={description} onChange={(e) => setDescription(e.target.value)} />
        </label>
        <div className="grid gap-4 sm:grid-cols-3">
          <input className="input" placeholder="Website (https://…)" value={website} onChange={(e) => setWebsite(e.target.value)} />
          <input className="input" placeholder="X (https://x.com/…)" value={twitter} onChange={(e) => setTwitter(e.target.value)} />
          <input className="input" placeholder="Telegram (https://t.me/…)" value={telegram} onChange={(e) => setTelegram(e.target.value)} />
        </div>

        <div>
          <div className="mb-1 flex items-baseline justify-between">
            <span className="text-sm font-semibold">Your creator fee</span>
            <span className={`num text-2xl font-black ${feeBps > 1000 ? "text-gold" : "text-lime"}`}>{pct(feeBps)}</span>
          </div>
          <input type="range" min={0} max={5000} step={50} value={feeBps} onChange={(e) => setFeeBps(Number(e.target.value))} className="w-full accent-[#c6ff3d]" />
          <div className="mt-1 flex flex-wrap gap-1.5">
            {FEE_STEPS.map((s) => (
              <button key={s} onClick={() => setFeeBps(s)} className={`rounded-lg px-2 py-1 text-xs font-semibold ${feeBps === s ? "bg-white text-ink" : "bg-white/5 text-muted"}`}>
                {pct(s)}
              </button>
            ))}
          </div>
          <p className="mt-2 text-sm text-muted">
            Every buy and sell pays {pct(feeBps)} to you, plus Zropad&apos;s 1%: {pct(100 + feeBps)} in all, paid in {NATIVE}, fixed for good.
            {feeBps > 1000 && <span className="text-gold"> Traders see this fee before every trade; high fees put many of them off.</span>}
          </p>
        </div>

        <label className="block">
          <span className="mb-1 block text-sm font-semibold">First buy (optional, {NATIVE})</span>
          <input className="input num" inputMode="decimal" placeholder="0.1" value={firstBuy} onChange={(e) => setFirstBuy(e.target.value.replace(",", "."))} />
          <span className="mt-1 block text-xs text-muted">Made in the same transaction, before anyone else can buy, and free of the 2-second sniper tax.</span>
        </label>

        {error && <div className="rounded-xl bg-sell/10 p-3 text-sm text-sell">{error}</div>}
        {!isConnected ? (
          <ConnectButton />
        ) : (
          <button className="btn btn-lime w-full py-3 text-lg" disabled={!valid || !!busy || chainId !== chain.id} onClick={launch}>
            {busy ?? `🚀 Launch $${symbol.toUpperCase() || "COIN"}`}
          </button>
        )}
      </div>

      <aside className="space-y-4">
        <div className="panel p-5">
          <div className="text-xs font-bold tracking-widest text-muted">PREVIEW</div>
          <div className="mt-3 flex items-center gap-3">
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview} alt="" className="h-16 w-16 rounded-xl object-cover" />
            ) : (
              <div className="grid h-16 w-16 place-items-center rounded-xl bg-white/5 text-muted">IMG</div>
            )}
            <div>
              <div className="font-bold">{name || "Coin name"}</div>
              <div className="text-sm text-muted">${symbol.toUpperCase() || "TICKER"}</div>
            </div>
          </div>
        </div>
        <div className="panel space-y-2 p-5 text-sm">
          <Row k="Launch fee" v={`${nat(Number(formatEther(launchFee)))} ${NATIVE}`} />
          <Row k="First buy" v={`${firstBuy || "0"} ${NATIVE}`} />
          <Row k="You get" v={firstBuyTokens ? `${compact(firstBuyTokens)} (${((firstBuyTokens / SUPPLY) * 100).toFixed(2)}%)` : "—"} />
          <Row k="Total to send" v={`${nat(Number(formatEther(launchFee + buyWei)))} ${NATIVE}`} />
          <hr className="border-line" />
          <Row k="Sniper tax" v="99% for 2 seconds" />
          <Row k="Jackpot" v="starts at 1 hour" />
          <Row k="Creator" v={address ? `${address.slice(0, 6)}…` : "—"} />
        </div>
      </aside>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-muted">{k}</span>
      <span className="num text-right">{v}</span>
    </div>
  );
}
