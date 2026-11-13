import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!/^[0-9a-f]{64}$/.test(id)) return new Response("not found", { status: 404 });
  const row = getDb().prepare("SELECT json FROM meta WHERE id = ? AND image IS NULL").get(id) as { json: string } | undefined;
  if (!row) return new Response("not found", { status: 404 });
  return new Response(row.json, { headers: { "Content-Type": "application/json", "Cache-Control": "public, max-age=31536000, immutable", "Access-Control-Allow-Origin": "*" } });
}
