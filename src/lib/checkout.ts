import "server-only";
import { errorText } from "./api-error";

const BASE = process.env.BACKEND_URL ?? "http://localhost:3001";

export type Checkout = {
  transaction: { id: string; orderId: string; amount: number; status: "PENDING" | "PAID" | "EXPIRED" | "CANCELLED" | "REFUNDED"; description: string | null; qrExpiry: string | null; createdAt: string; paidAt: string | null; paymentMethod: string };
  merchant: { name: string };
  account: { bankCode: string; bankName: string; accountName: string | null; accountNumber: string | null; promptPayId: string | null };
  qrPayload: string | null;
  /** The payer's name the shop entered; the slip's sender must match it. */
  customerName?: string | null;
  hasSlip: boolean;
  /** Why the last slip was refused (null when none was). */
  slipProblems?: string[] | null;
  /** An accepted / in-review slip is attached: the customer can't send another. */
  slipLocked?: boolean;
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
  if (!r.ok) return { ok: false as const, error: errorText(j, `HTTP ${r.status}`), code: j?.error?.code as string | undefined };
  return { ok: true as const, result: j.result as string, message: j.message as string | null, mismatches: (j.mismatches as string[] | undefined) ?? [], status: j.status as string };
}
