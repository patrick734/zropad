/**
 * The native coin's USD price, for showing market caps in dollars. NATIVE_USD fixes it (testing, or a
 * network without a price feed); otherwise it comes from CoinGecko by NATIVE_COINGECKO_ID (default
 * "ethereum"), cached for a minute. Null when unknown: the site then shows amounts in the native coin.
 */
let cache: { at: number; usd: number | null } | null = null;

export async function nativeUsd(): Promise<number | null> {
  const fixed = Number(process.env.NATIVE_USD);
  if (fixed > 0) return fixed;
  if (cache && Date.now() - cache.at < 60_000) return cache.usd;
  const id = process.env.NATIVE_COINGECKO_ID?.trim() || "ethereum";
  let usd: number | null = cache?.usd ?? null;
  try {
    const r = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(id)}&vs_currencies=usd`, {
      signal: AbortSignal.timeout(5000),
      cache: "no-store",
    });
    const v = Number((await r.json())?.[id]?.usd);
    if (r.ok && v > 0) usd = v;
  } catch {
    // keep the last known price
  }
  cache = { at: Date.now(), usd };
  return usd;
}
