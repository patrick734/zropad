import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!/^[0-9a-f]{64}$/.test(id)) return new Response("not found", { status: 404 });
  const row = getDb().prepare("SELECT image, mime FROM meta WHERE id = ? AND image IS NOT NULL").get(id) as { image: Buffer; mime: string } | undefined;
  if (!row) return new Response("not found", { status: 404 });
  return new Response(new Uint8Array(row.image), {
    headers: { "Content-Type": row.mime, "Cache-Control": "public, max-age=31536000, immutable", "Content-Security-Policy": "default-src 'none'", "Access-Control-Allow-Origin": "*" },
  });
}
