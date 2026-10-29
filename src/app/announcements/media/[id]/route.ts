import { viewerHeaders } from "@/lib/api";
import { getSessionUser } from "@/lib/session";

const BASE = process.env.BACKEND_URL ?? "http://localhost:3001";

/** Preview of an announcement's picture / video (signed-in operators only). */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!(await getSessionUser())) return new Response("Unauthorized", { status: 401 });
  const id = Number((await ctx.params).id);
  if (!Number.isInteger(id) || id <= 0) return new Response("not found", { status: 404 });
  const r = await fetch(`${BASE}/api/console/support-bot/announcements/media/${id}`, { headers: await viewerHeaders(), cache: "no-store" });
  if (!r.ok) return new Response("not found", { status: 404 });
  return new Response(r.body, { headers: { "content-type": r.headers.get("content-type") ?? "application/octet-stream", "cache-control": "private, max-age=600" } });
}
