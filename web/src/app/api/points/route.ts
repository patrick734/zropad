import { points } from "@/lib/queries";
const json = (data: unknown, status = 200) => Response.json(data, { status, headers: { "Cache-Control": "no-store" } });

export const dynamic = "force-dynamic";

export function GET() {
  return json(points(200));
}
