import { createHash } from "node:crypto";
import { getDb } from "@/lib/db";

/**
 * Stores a coin's metadata before launch: image (PNG, JPEG, GIF or WEBP, up to 2 MB), description and
 * links. Returns its id; the coin's on-chain uri is SITE/api/meta/<id>. Content-addressed: the same
 * upload gives the same id.
 */
export const dynamic = "force-dynamic";

const MAX = 2 * 1024 * 1024;
const TYPES = ["image/png", "image/jpeg", "image/gif", "image/webp"];
const cleanUrl = (v: FormDataEntryValue | null) => {
  const s = String(v ?? "").trim().slice(0, 200);
  return /^https:\/\/[^\s<>"]+$/.test(s) ? s : "";
};
const recent = new Map<string, number[]>();

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  const hits = (recent.get(ip) ?? []).filter((t) => Date.now() - t < 60_000);
  if (hits.length >= 20) return Response.json({ error: "Too many uploads, try again in a minute." }, { status: 429 });
  recent.set(ip, [...hits, Date.now()]);

  const form = await req.formData();
  const file = form.get("image");
  if (!(file instanceof File) || !TYPES.includes(file.type) || file.size > MAX || file.size === 0)
    return Response.json({ error: "Add a PNG, JPEG, GIF or WEBP image up to 2 MB." }, { status: 400 });
  const image = Buffer.from(await file.arrayBuffer());
  const imageId = createHash("sha256").update(image).digest("hex");
  const site = (process.env.NEXT_PUBLIC_SITE_URL ?? new URL(req.url).origin).replace(/\/$/, "");
  const meta = {
    name: String(form.get("name") ?? "").slice(0, 32),
    symbol: String(form.get("symbol") ?? "").slice(0, 10),
    description: String(form.get("description") ?? "").slice(0, 280),
    image: `${site}/api/image/${imageId}`,
    website: cleanUrl(form.get("website")),
    twitter: cleanUrl(form.get("twitter")),
    telegram: cleanUrl(form.get("telegram")),
  };
  const json = JSON.stringify(meta);
  const id = createHash("sha256").update(json).digest("hex");
  const db = getDb();
  db.prepare("INSERT OR IGNORE INTO meta (id, json, image, mime, created_at) VALUES (?, ?, NULL, NULL, ?)").run(id, json, Date.now());
  db.prepare("INSERT OR IGNORE INTO meta (id, json, image, mime, created_at) VALUES (?, '{}', ?, ?, ?)").run(imageId, image, file.type, Date.now());
  return Response.json({ id, uri: `${site}/api/meta/${id}`, image: meta.image });
}
