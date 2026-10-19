import { consoleHeaders } from "@/lib/api";

const BASE = process.env.BACKEND_URL ?? "http://localhost:3001";

// Public (see proxy.ts): the slip image of an order created on the demo page — only those (backend demo_records).
export async function GET(_req: Request, ctx: { params: Promise<{ ref: string }> }) {
  const { ref } = await ctx.params;
  if (!/^TXN\d+$/.test(ref)) return new Response("not found", { status: 404 });
  const r = await fetch(`${BASE}/api/console/demo/slip/${ref}`, { headers: consoleHeaders("demo-page"), cache: "no-store" });
  if (!r.ok) return new Response("not found", { status: 404 });
  return new Response(r.body, { headers: { "content-type": r.headers.get("content-type") ?? "image/jpeg", "cache-control": "private, max-age=60" } });
}
