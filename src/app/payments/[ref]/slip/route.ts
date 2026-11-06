import { viewerHeaders } from "@/lib/api";
import { getSessionUser } from "@/lib/session";
import { slipUpload } from "@/lib/slip-upload";

const BASE = process.env.BACKEND_URL ?? "http://localhost:3001";

/** Streams a payment's slip image to signed-in operators (the console key stays server-side). */
export async function GET(_req: Request, ctx: RouteContext<"/payments/[ref]/slip">) {
  if (!(await getSessionUser())) return new Response("Unauthorized", { status: 401 });
  const { ref } = await ctx.params;
  if (!/^TXN\d{1,12}$/.test(ref)) return new Response("Bad ref", { status: 400 });
  const res = await fetch(`${BASE}/api/console/payments/${ref}/slip`, { headers: await viewerHeaders(), cache: "no-store" });
  if (!res.ok) return new Response(res.status === 404 ? "No slip" : "Error", { status: res.status });
  return new Response(res.body, {
    headers: { "content-type": res.headers.get("content-type") ?? "image/png", "cache-control": "private, no-store" },
  });
}

/** Admin slip upload (the picture as the body — see lib/slip-upload.ts). */
export async function POST(req: Request, ctx: RouteContext<"/payments/[ref]/slip">) {
  const { ref } = await ctx.params;
  if (!/^TXN\d{1,12}$/.test(ref)) return Response.json({ ok: false, error: "เลขที่รายการไม่ถูกต้อง" }, { status: 400 });
  return slipUpload(req, `/api/console/payments/${ref}/slip`);
}
