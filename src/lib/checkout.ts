import "server-only";

const BASE = process.env.BACKEND_URL ?? "http://localhost:3001";

export type Checkout = {
  transaction: { id: string; orderId: string; amount: number; status: "PENDING" | "PAID" | "EXPIRED" | "CANCELLED" | "REFUNDED"; description: string | null; qrExpiry: string | null; createdAt: string; paidAt: string | null; paymentMethod: string };
  merchant: { name: string };
  account: { bankCode: string; bankName: string; accountName: string | null; accountNumber: string | null; promptPayId: string | null };
  qrPayload: string | null;
  hasSlip: boolean;
};

export const isToken = (t: unknown): t is string => typeof t === "string" && /^[a-f0-9]{32}$/.test(t);

/** Public checkout data for a token (null = not found). Throws when the backend is unreachable. */
export async function getCheckout(token: string): Promise<Checkout | null> {
  const r = await fetch(`${BASE}/api/v1/payment/checkout/${token}`, { cache: "no-store" });
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(`checkout → HTTP ${r.status}`);
  return (await r.json()) as Checkout;
}

export async function postCheckoutSlip(token: string, body: { image: string; mime: string }) {
  const r = await fetch(`${BASE}/api/v1/payment/checkout/${token}/slip`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body), cache: "no-store" });
  const j = await r.json().catch(() => null);
  if (!r.ok) return { ok: false as const, error: (j?.error?.message as string) ?? `HTTP ${r.status}` };
  return { ok: true as const, result: j.result as string, message: j.message as string | null, status: j.status as string };
}
