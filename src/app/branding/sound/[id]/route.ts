import { fetchAsset } from "@/lib/branding";
import { getSessionUser } from "@/lib/session";

/** Uploaded alert sound (signed-in users only). */
export async function GET(_req: Request, ctx: RouteContext<"/branding/sound/[id]">) {
  if (!(await getSessionUser())) return new Response("Unauthorized", { status: 401 });
  const { id } = await ctx.params;
  if (!/^[a-f0-9]{12}$/.test(id)) return new Response("Not found", { status: 404 });
  const r = await fetchAsset(id);
  if (!r.ok) return new Response("Not found", { status: 404 });
  return new Response(r.body, { headers: { "content-type": r.headers.get("content-type") ?? "audio/mpeg", "cache-control": "private, max-age=300", "x-content-type-options": "nosniff" } });
}
