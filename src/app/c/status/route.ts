import { getCheckout, isToken } from "@/lib/checkout";

/** Public status poll for the checkout page. */
export async function GET(req: Request) {
  const t = new URL(req.url).searchParams.get("t");
  if (!isToken(t)) return Response.json({ status: null }, { status: 404 });
  try {
    const c = await getCheckout(t);
    return Response.json({ status: c?.transaction.status ?? null, hasSlip: c?.hasSlip ?? false }, { headers: { "cache-control": "no-store" } });
  } catch {
    return Response.json({ status: null }, { status: 502 });
  }
}
