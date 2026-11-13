import { listCoins, type Sort } from "@/lib/queries";
const json = (data: unknown, status = 200) => Response.json(data, { status, headers: { "Cache-Control": "no-store" } });

export const dynamic = "force-dynamic";

export function GET(req: Request) {
  const u = new URL(req.url);
  const sort = (u.searchParams.get("sort") ?? "trending") as Sort;
  return json(listCoins(sort, Math.min(Number(u.searchParams.get("limit") ?? 60), 200), u.searchParams.get("q") ?? ""));
}
