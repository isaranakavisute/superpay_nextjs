import QR from "qrcode";

const BASE = process.env.BACKEND_URL ?? "http://localhost:3001";

/** Public PromptPay QR (PNG) for a pending order: /api/v1/payment/qr/<token>.png */
export async function GET(_req: Request, ctx: RouteContext<"/api/v1/payment/qr/[file]">) {
  const { file } = await ctx.params;
  const token = file.replace(/\.png$/, "");
  if (!/^[a-f0-9]{32}$/.test(token)) return new Response("Not found", { status: 404 });
  const r = await fetch(`${BASE}/api/v1/payment/checkout/${token}`, { cache: "no-store" });
  if (!r.ok) return new Response("Not found", { status: 404 });
  const { qrPayload } = (await r.json()) as { qrPayload: string | null };
  if (!qrPayload) return new Response("QR is not available for this order (paid, expired or no PromptPay account)", { status: 410 });
  const png = await QR.toBuffer(qrPayload, { type: "png", width: 480, margin: 2, errorCorrectionLevel: "M" });
  return new Response(new Uint8Array(png), { headers: { "content-type": "image/png", "cache-control": "no-store" } });
}
