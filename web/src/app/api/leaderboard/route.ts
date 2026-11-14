import { asWindow, earners, traders } from "@/lib/queries";
const json = (data: unknown, status = 200) => Response.json(data, { status, headers: { "Cache-Control": "no-store" } });

export const dynamic = "force-dynamic";

export function GET(req: Request) {
  const u = new URL(req.url);
  const w = asWindow(u.searchParams.get("w"));
  const limit = Math.min(Number(u.searchParams.get("limit") ?? 50) || 50, 200);
  return json(u.searchParams.get("tab") === "earners" ? { earners: earners(w, limit) } : { traders: traders(w, limit) });
}
