import { listCoins, SORTS, type Sort } from "@/lib/queries";
const json = (data: unknown, status = 200) => Response.json(data, { status, headers: { "Cache-Control": "no-store" } });

export const dynamic = "force-dynamic";

export function GET(req: Request) {
  const u = new URL(req.url);
  const s = u.searchParams.get("sort") ?? "trending";
  const sort: Sort = (SORTS as readonly string[]).includes(s) ? (s as Sort) : "trending";
  const hours = Math.min(Math.max(Number(u.searchParams.get("hours") ?? 1) || 1, 0.1), 168);
  return json(listCoins(sort, Math.min(Number(u.searchParams.get("limit") ?? 60) || 60, 200), (u.searchParams.get("q") ?? "").slice(0, 64), hours));
}
