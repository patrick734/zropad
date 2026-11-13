import { candles, coinTrades, getCoin, holders } from "@/lib/queries";
const json = (data: unknown, status = 200) => Response.json(data, { status, headers: { "Cache-Control": "no-store" } });

export const dynamic = "force-dynamic";

export async function GET(req: Request, ctx: { params: Promise<{ address: string }> }) {
  const { address } = await ctx.params;
  const coin = getCoin(address);
  if (!coin) return json({ error: "not found" }, 404);
  const interval = Number(new URL(req.url).searchParams.get("interval") ?? 60);
  return json({ coin, trades: coinTrades(address, 100), holders: holders(address, 30), candles: candles(address, interval) });
}
