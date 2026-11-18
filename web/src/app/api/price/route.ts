import { nativeUsd } from "@/lib/price";

export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json({ usd: await nativeUsd() }, { headers: { "Cache-Control": "public, max-age=30" } });
}
