import { viewerHeaders } from "@/lib/api";
import { getSessionUser } from "@/lib/session";

const BASE = process.env.BACKEND_URL ?? "http://localhost:3001";

/** Every slip ever attached to a payment (history, newest first) — signed-in operators only (2 Nov 2026). */
export async function GET(_req: Request, ctx: RouteContext<"/payments/[ref]/slips">) {
  if (!(await getSessionUser())) return Response.json({ ok: false }, { status: 401 });
  const { ref } = await ctx.params;
  if (!/^TXN\d{1,12}$/.test(ref)) return Response.json({ ok: false }, { status: 400 });
  const res = await fetch(`${BASE}/api/console/payments/${ref}/slips`, { headers: await viewerHeaders(), cache: "no-store", signal: AbortSignal.timeout(10_000) });
  return new Response(await res.text(), { status: res.status, headers: { "content-type": "application/json", "cache-control": "private, no-store" } });
}
