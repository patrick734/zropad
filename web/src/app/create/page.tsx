"use client";

/* eslint-disable @next/next/no-img-element */
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { decodeEventLog, formatEther, parseEther } from "viem";
import { useAccount, usePublicClient, useReadContract, useWriteContract } from "wagmi";
import { ChevronDown, ImagePlus, Loader2, ShieldCheck, Timer, TrendingUp } from "lucide-react";
import { hubAbi } from "@/lib/abi";
import { GRADUATION, NATIVE, SUPPLY, ZROPAD, chain } from "@/lib/config";
import { compact, nat } from "@/lib/format";
import { cn } from "@/lib/utils";
import { ConnectButton } from "@/components/connect";
import { CoinImage } from "@/components/coin-image";
import { CurveProgress } from "@/components/progress";
import { Button } from "@/components/ui/button";

const MAX_FEE = 5000;
const LINKS = [
  ["website", "Website", "https://…"],
  ["twitter", "X", "https://x.com/…"],
  ["telegram", "Telegram", "https://t.me/…"],
] as const;

export default function Create() {
  const router = useRouter();
  const { isConnected, chainId } = useAccount();
  const pc = usePublicClient({ chainId: chain.id });
  const { writeContractAsync } = useWriteContract();
  const { data: config } = useReadContract({ address: ZROPAD, abi: hubAbi, functionName: "config", chainId: chain.id, query: { enabled: !!ZROPAD } });

  const fileRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState("");
  const [symbol, setSymbol] = useState("");
  const [description, setDescription] = useState("");
  const [links, setLinks] = useState({ website: "", twitter: "", telegram: "" });
  const [showLinks, setShowLinks] = useState(false);
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [feeBps, setFeeBps] = useState(100);
  const [firstBuy, setFirstBuy] = useState("");
  const [step, setStep] = useState<string | null>(null);
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

  const ticker = symbol.toUpperCase();
  const nameBytes = new TextEncoder().encode(name).length;
  const symBytes = new TextEncoder().encode(ticker).length;
  const valid = nameBytes > 0 && nameBytes <= 32 && symBytes > 0 && symBytes <= 10 && !!image;
  const total = 100 + feeBps;

  const pick = (f?: File | null) => {
    if (!f) return;
    if (!/^image\/(png|jpeg|gif|webp)$/.test(f.type)) return setError("Use a PNG, JPEG, GIF or WEBP image.");
    if (f.size > 2_000_000) return setError("Images can be up to 2 MB.");
    setError(null);
    setImage(f);
  };

  async function launch() {
    setError(null);
    if (!ZROPAD || !pc) return setError("Zropad isn't deployed on this network yet.");
    try {
      setStep("Uploading image…");
      const form = new FormData();
      Object.entries({ name, symbol: ticker, description, ...links }).forEach(([k, v]) => form.append(k, v));
      form.append("image", image!);
      const up = await fetch("/api/meta", { method: "POST", body: form });
      const meta = await up.json();
      if (!up.ok) throw new Error(meta.error ?? "Upload failed");

      setStep("Confirm in your wallet…");
      const hash = await writeContractAsync({ address: ZROPAD, abi: hubAbi, functionName: "launch", args: [name, ticker, meta.uri, feeBps, 0n], value: launchFee + buyWei, chainId: chain.id });
      setStep("Launching…");
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
      setStep(null);
    }
  }

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-2xl font-semibold">Create a coin</h1>
      <p className="mt-1 text-sm text-muted-foreground">Fair launch on a bonding curve. When it raises {GRADUATION} {NATIVE} it graduates into a pool with the liquidity locked for good.</p>

      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        {([
          [TrendingUp, "Bonding curve", `Everyone buys on the same curve from the first second. Graduates at ${GRADUATION} ${NATIVE}.`],
          [ShieldCheck, "Sniper tax", "Buys in the first 2 seconds pay 99%, straight into the jackpot. Your first buy is exempt."],
          [Timer, "Countdown jackpot", "Every coin gets a pot. The last buyer when the clock hits zero wins it."],
        ] as const).map(([Icon, t, d]) => (
          <div key={t} className="rounded-lg border border-input p-3">
            <p className="flex items-center gap-1.5 text-sm font-semibold"><Icon className="size-4 text-primary" /> {t}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{d}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-[180px_1fr]">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                pick(e.dataTransfer.files[0]);
              }}
              className="grid aspect-square w-full place-items-center overflow-hidden rounded-xl border border-dashed border-input bg-card hover:border-primary/60"
            >
              {preview ? (
                <img src={preview} alt="" className="size-full object-cover" />
              ) : (
                <span className="flex flex-col items-center gap-2 p-4 text-center text-sm font-semibold text-muted-foreground">
                  <ImagePlus className="size-8 text-primary" /> Add a picture
                  <span className="text-xs font-normal">PNG, JPEG, GIF or WEBP, up to 2 MB.</span>
                </span>
              )}
            </button>
            <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/gif,image/webp" hidden onChange={(e) => pick(e.target.files?.[0])} />
            <div className="space-y-3">
              <label className="block">
                <span className="label">Name</span>
                <input className="field mt-1" value={name} onChange={(e) => setName(e.target.value)} maxLength={32} placeholder="Zero Frog" />
              </label>
              <label className="block">
                <span className="label">Ticker</span>
                <div className="relative mt-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-semibold text-primary">$</span>
                  <input className="field pl-7 font-semibold uppercase" value={symbol} onChange={(e) => setSymbol(e.target.value.replace(/\s/g, "").toUpperCase())} maxLength={10} placeholder="ZFROG" />
                </div>
              </label>
              <label className="block">
                <span className="label">Description</span>
                <textarea className="field mt-1 min-h-20" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={280} placeholder="Tell the story" />
              </label>
            </div>
          </div>

          <div className="panel">
            <button type="button" onClick={() => setShowLinks(!showLinks)} className="flex w-full items-center gap-2 p-4 text-left">
              <span className="font-semibold">Socials</span>
              <span className="text-muted-foreground">optional</span>
              <ChevronDown className={cn("ml-auto size-4 transition", showLinks && "rotate-180")} />
            </button>
            {showLinks && (
              <div className="grid gap-3 px-4 pb-4 sm:grid-cols-3">
                {LINKS.map(([k, label, ph]) => (
                  <label key={k} className="block">
                    <span className="label">{label}</span>
                    <input className="field mt-1" value={links[k]} onChange={(e) => setLinks({ ...links, [k]: e.target.value })} placeholder={ph} maxLength={200} />
                  </label>
                ))}
              </div>
            )}
          </div>

          <div className="panel space-y-4 p-4">
            <div className="flex items-baseline justify-between">
              <p className="font-semibold">Your creator fee</p>
              <p className={cn("num text-2xl font-semibold", feeBps > 1000 ? "text-gold" : "text-primary")}>{(feeBps / 100).toFixed(2)}%</p>
            </div>
            <input type="range" min={0} max={MAX_FEE} step={25} value={feeBps} onChange={(e) => setFeeBps(Number(e.target.value))} className="w-full accent-[var(--primary)]" aria-label="Creator fee" />
            <div className="flex justify-between text-xs text-muted-foreground"><span>0%</span><span>50%</span></div>
            <div className="flex flex-wrap gap-1">
              {[0, 100, 200, 500, 1000, 2000, 3000, 5000].map((s) => (
                <button key={s} type="button" onClick={() => setFeeBps(s)} className={cn("tab border border-input", feeBps === s && "tab-on")}>
                  {s / 100}%
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              You take {(feeBps / 100).toFixed(2)}% of every buy and sell, paid in {NATIVE}, plus Zropad&apos;s 1%: {(total / 100).toFixed(2)}% in all. It&apos;s fixed for good and shown to traders before every trade.
              {feeBps > 1000 && <span className="text-gold"> High fees put many traders off.</span>}
            </p>
          </div>

          <label className="block">
            <span className="label">First buy (optional)</span>
            <div className="relative mt-1">
              <input className="field num pr-16" inputMode="decimal" value={firstBuy} onChange={(e) => setFirstBuy(e.target.value.replace(",", "."))} placeholder="0.0" />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">{NATIVE}</span>
            </div>
            <span className="mt-1 block text-xs text-muted-foreground">
              {firstBuyTokens
                ? `You get ${compact(firstBuyTokens)} $${ticker || "COIN"} (${((firstBuyTokens / SUPPLY) * 100).toFixed(2)}% of supply), in the same transaction, before anyone else, with no sniper tax.`
                : "Bought in the launch transaction, so you're first in, with no sniper tax."}
            </span>
          </label>

          {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
          {!isConnected ? (
            <ConnectButton big />
          ) : (
            <Button size="lg" className="w-full" disabled={!valid || !!step || chainId !== chain.id || !ZROPAD} onClick={() => void launch()}>
              {step ? (
                <>
                  <Loader2 className="animate-spin" /> {step}
                </>
              ) : (
                "Create coin"
              )}
            </Button>
          )}
          {!ZROPAD && <p className="text-xs text-destructive">Launching is off: this site has no Zropad address yet.</p>}
        </div>

        <aside className="space-y-4 lg:sticky lg:top-28 lg:self-start">
          <p className="label">Preview</p>
          <div className="panel overflow-hidden">
            {preview ? <img src={preview} alt="" className="aspect-square w-full object-cover" /> : <CoinImage src={null} symbol={ticker || "COIN"} address="0x00" className="aspect-square size-auto w-full rounded-none text-base" />}
            <div className="p-3">
              <p className="truncate font-semibold">{name || "Your coin"}</p>
              <p className="text-sm text-muted-foreground">${ticker || "TICKER"}</p>
              {description && <p className="mt-1 line-clamp-3 text-xs text-muted-foreground">{description}</p>}
              <CurveProgress value={0} className="mt-2" />
            </div>
          </div>
          <div className="panel space-y-1.5 p-4 text-sm">
            <Row k="launch fee" v={config ? `${nat(Number(formatEther(launchFee)))} ${NATIVE}` : "…"} />
            <Row k="trade fee" v={`1% + your ${(feeBps / 100).toFixed(2)}%`} />
            <Row k="supply" v="1,000,000,000" />
            <Row k="graduates at" v={`${GRADUATION} ${NATIVE}`} />
            <Row k="liquidity" v="locked forever" />
            <Row k="sniper tax" v="99% for 2 seconds" />
            <Row k="jackpot" v="starts at 1 hour" />
            <Row k="total to send" v={`${nat(Number(formatEther(launchFee + buyWei)))} ${NATIVE}`} />
          </div>
        </aside>
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <p className="flex justify-between gap-3">
      <span className="text-muted-foreground">{k}</span>
      <span className="num text-right font-medium">{v}</span>
    </p>
  );
}
