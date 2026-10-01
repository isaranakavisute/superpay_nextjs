import "server-only";

const BASE = process.env.BACKEND_URL ?? "http://localhost:3001";
const PASS_REQ = ["content-type", "x-api-key", "idempotency-key", "accept"];

/**
 * Forward a merchant API call to the backend's /api/v1, keeping the public
 * host so URLs in responses (QR, checkout) point at this site.
 */
export async function forward(req: Request, backendPath: string) {
  const url = new URL(req.url);
  const headers = new Headers();
  for (const h of PASS_REQ) {
    const v = req.headers.get(h);
    if (v) headers.set(h, v);
  }
  headers.set("x-forwarded-host", req.headers.get("x-forwarded-host") ?? url.host);
  headers.set("x-forwarded-proto", req.headers.get("x-forwarded-proto") ?? url.protocol.replace(":", ""));
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? req.headers.get("x-real-ip");
  if (ip) headers.set("x-forwarded-for", ip);
  const body = req.method === "GET" || req.method === "HEAD" ? undefined : await req.arrayBuffer();
  try {
    const r = await fetch(`${BASE}${backendPath}${url.search}`, { method: req.method, headers, body, cache: "no-store", redirect: "manual" });
    return new Response(r.body, { status: r.status, headers: { "content-type": r.headers.get("content-type") ?? "application/json", "cache-control": "no-store" } });
  } catch {
    return Response.json({ error: { code: "UPSTREAM_UNAVAILABLE", message: "ระบบหลังบ้านไม่ตอบสนอง กรุณาลองใหม่" } }, { status: 502 });
  }
}
