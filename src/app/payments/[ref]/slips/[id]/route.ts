import { viewerHeaders } from "@/lib/api";
import { getSessionUser } from "@/lib/session";

const BASE = process.env.BACKEND_URL ?? "http://localhost:3001";

/** The image of one entry of a payment's slip history (signed-in operators only). */
export async function GET(_req: Request, ctx: RouteContext<"/payments/[ref]/slips/[id]">) {
  if (!(await getSessionUser())) return new Response("Unauthorized", { status: 401 });
  const { ref, id } = await ctx.params;
  if (!/^TXN\d{1,12}$/.test(ref) || !/^\d{1,15}$/.test(id)) return new Response("Bad request", { status: 400 });
  const res = await fetch(`${BASE}/api/console/payments/${ref}/slips/${id}`, { headers: await viewerHeaders(), cache: "no-store" });
  if (!res.ok) return new Response(res.status === 404 ? "No image" : "Error", { status: res.status });
  return new Response(res.body, { headers: { "content-type": res.headers.get("content-type") ?? "image/jpeg", "cache-control": "private, no-store" } });
}
