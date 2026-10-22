import "server-only";
import { createHmac } from "node:crypto";
import { headers } from "next/headers";
import { consoleHeaders } from "./api";

// Public demo page (/demo): real, signed merchant API calls for my-shop. The key and its signing secret
// stay on this server (backend GET /api/console/demo/key); the browser only sees the finished curl command.
const BASE = process.env.BACKEND_URL ?? "http://localhost:3001";

type DemoKey = { shop: { name: string; slug: string } | null; apiKey?: string; signingSecret?: string };
let cached: { at: number; key: DemoKey } | null = null;

export async function demoKey(): Promise<DemoKey> {
  if (cached && Date.now() - cached.at < 60_000) return cached.key;
  const r = await fetch(`${BASE}/api/console/demo/key`, { headers: consoleHeaders("demo-page"), cache: "no-store" });
  if (!r.ok) throw new Error(`demo key: HTTP ${r.status}`);
  const key = (await r.json()) as DemoKey;
  cached = { at: Date.now(), key };
  return key;
}

export type DemoCall = {
  ok: boolean;
  curl: string;
  /** Same command with the slip image shortened, for the terminal window. */
  curlShort: string;
  status: number;
  ms: number;
  response: string;
  json: Record<string, unknown> | null;
  /** Admin-side action with no merchant API endpoint (delete, payout reject): no curl to show. */
  admin?: boolean;
};

const q = (s: string) => `'${s.replace(/'/g, `'\\''`)}'`;

/** The public site this page was opened on (optionpay.co), for the curl URL and the links in responses. */
async function site() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "optionpay.co";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return { host, proto, ip: h.get("x-forwarded-for")?.split(",")[0].trim() ?? h.get("x-real-ip") ?? "" };
}

/** Sign and send one merchant API request exactly as the curl shows it, then return both. */
/** `dry`: sign only, don't send — a fresh, unused curl for the visitor to run in their own terminal. */
export async function signedCall(method: "GET" | "POST" | "PATCH", path: string, body?: unknown, extra: Record<string, string> = {}, dry = false): Promise<DemoCall> {
  const key = await demoKey();
  if (!key.apiKey || !key.signingSecret) throw new Error("ยังไม่มีร้านสำหรับ demo");
  const raw = body === undefined ? "" : JSON.stringify(body);
  const t = String(Math.floor(Date.now() / 1000));
  const signature = createHmac("sha256", key.signingSecret).update(`${t}.${method}.${path}.${raw}`).digest("hex");
  const hdr: Record<string, string> = {
    ...(raw ? { "Content-Type": "application/json" } : {}),
    "X-API-Key": key.apiKey,
    "X-Timestamp": t,
    "X-Signature": signature,
    ...extra,
  };
  const { host, proto, ip } = await site();
  const lines = (data: string) =>
    [`curl -X ${method} ${q(`${proto}://${host}${path}`)}`, ...Object.entries(hdr).map(([k, v]) => `-H ${q(`${k}: ${v}`)}`), ...(raw ? [`--data-raw ${q(data)}`] : [])].join(" \\\n  ");
  const short = raw.replace(/"image":"([A-Za-z0-9+/=]{40})[A-Za-z0-9+/=]+"/, (_m, head: string) => `"image":"${head}…(base64 ของรูปสลิป ${Math.round(raw.length / 1024)} KB)"`);

  if (dry) return { ok: true, curl: lines(raw), curlShort: lines(short), status: 0, ms: 0, response: "", json: null };
  const started = Date.now();
  let status = 0;
  let response = "";
  try {
    const r = await fetch(`${BASE}${path}`, {
      method,
      headers: { ...hdr, "user-agent": "curl/8 (optionpay.co/demo)", "x-forwarded-host": host, "x-forwarded-proto": proto, ...(ip ? { "x-forwarded-for": ip } : {}) },
      body: raw || undefined,
      cache: "no-store",
    });
    status = r.status;
    response = await r.text();
  } catch {
    response = JSON.stringify({ error: { code: "UPSTREAM_UNAVAILABLE", message: "ระบบหลังบ้านไม่ตอบสนอง กรุณาลองใหม่" } });
  }
  let json: Record<string, unknown> | null = null;
  try {
    json = JSON.parse(response);
    response = JSON.stringify(json, null, 2);
  } catch {}
  return { ok: status >= 200 && status < 300, curl: lines(raw), curlShort: lines(short), status, ms: Date.now() - started, response, json };
}

/** Bulk create (สร้างหลายรายการ): at most `max` runs per `minutes` per visitor. */
const bulkHits = new Map<string, number[]>();
export async function bulkOverLimit(max = 3, minutes = 10) {
  const { ip } = await site();
  const now = Date.now();
  const recent = (bulkHits.get(ip) ?? []).filter((t) => now - t < minutes * 60_000);
  if (recent.length >= max) return true;
  recent.push(now);
  bulkHits.set(ip, recent);
  if (bulkHits.size > 5000) bulkHits.clear();
  return false;
}

/** Per-visitor limit so the public page can't be used to flood the shop. */
const hits = new Map<string, { minute: number; n: number }>();
export async function overLimit(perMinute = 20) {
  const { ip } = await site();
  const minute = Math.floor(Date.now() / 60_000);
  const h = hits.get(ip);
  const n = h?.minute === minute ? h.n + 1 : 1;
  hits.set(ip, { minute, n });
  if (hits.size > 5000) hits.clear();
  return n > perMinute;
}

export type DemoPayment = {
  ref: string; orderId: string | null; amount: string; fee: string; status: string; customerName: string | null; description: string | null;
  slipAt: string | null; note: string | null; createdAt: string; completedAt: string | null; accountBankCode: string | null; accountNo: string | null; accountName: string | null;
  shopName: string; shopSlug: string;
  slipProvider: string | null; callbacks: DemoCallback[]; deletedAt: string | null; deleteReason: string | null; refundedAmount: string | null;
};
export type DemoCallback = { event: string; statusCode: number | null; state: string | null; attempts: number; response: string | null; error: string | null; at: string | null };
export type DemoPayout = {
  ref: string; merchantRef: string | null; amount: string; fee: string; status: string; receiverName: string | null; receiverBankCode: string;
  receiverAccount: string | null; description: string | null; note: string | null; createdAt: string; completedAt: string | null;
  source: string | null; adminDone: boolean; adminDoneAt: string | null; callbacks: DemoCallback[]; deletedAt: string | null; deleteReason: string | null;
};

/** Only what this page created (backend demo_records); the admin console lists the same records with everything else. */
export async function demoRecords(): Promise<{ payments: DemoPayment[]; payouts: DemoPayout[] }> {
  const r = await fetch(`${BASE}/api/console/demo/records`, { headers: consoleHeaders("demo-page"), cache: "no-store" });
  if (!r.ok) throw new Error(`demo records: HTTP ${r.status}`);
  const j = await r.json();
  return { payments: j.payments ?? [], payouts: j.payouts ?? [] };
}

export async function addDemoRecord(kind: "payment" | "payout", ref: string) {
  await fetch(`${BASE}/api/console/demo/records`, {
    method: "POST",
    headers: { ...consoleHeaders("demo-page"), "content-type": "application/json" },
    body: JSON.stringify({ kind, ref }),
    cache: "no-store",
  }).catch(() => {});
}

/** QR text of a DEMO slip for one demo order (backend demo/demo.service.js checkDemoSlip verifies it). */
export async function demoSlipQr(ref: string, amount: number) {
  const key = await demoKey();
  if (!key.signingSecret) throw new Error("ยังไม่มีร้านสำหรับ demo");
  const a = amount.toFixed(2);
  return `OPTIONPAY-DEMO-SLIP|${ref}|${a}|${createHmac("sha256", key.signingSecret).update(`demo-slip.${ref}.${a}`).digest("hex").slice(0, 32)}`;
}

export type DemoCallbackLog = {
  id: string; event: string; ref: string; url: string; state: string | null; statusCode: number | null; attempts: number; ms: number | null;
  response: string | null; error: string | null; at: string | null; telegramSent: number | null; telegramAt: string | null; exact: boolean; curl: string | null;
};

/** Every callback POSTed for this page's orders (kept permanently in webhook_deliveries), newest first. */
export async function demoCallbackLog(): Promise<DemoCallbackLog[]> {
  const r = await fetch(`${BASE}/api/console/demo/callbacks`, { headers: consoleHeaders("demo-page"), cache: "no-store" });
  if (!r.ok) throw new Error(`demo callbacks: HTTP ${r.status}`);
  return (await r.json()).callbacks ?? [];
}

/**
 * An admin action the merchant API has no endpoint for (reject a payout, delete a record): the same console call the
 * admin pages make. Shown in the terminal as the equivalent curl to the backend, with the console key hidden.
 */
export async function adminCall(method: "POST" | "DELETE", path: string, body: unknown): Promise<DemoCall> {
  const raw = JSON.stringify(body);
  const curl = [
    "# ระบบหลังบ้าน (เหมือนผู้ดูแลกดในหน้า admin) — ไม่มี endpoint นี้ใน API ของร้านค้า",
    [`curl -X ${method} ${q(`<backend>${path}`)}`, `-H ${q("Content-Type: application/json")}`, `-H ${q("x-console-key: ••••••••")}`, `-H ${q("x-console-actor: demo-page")}`, `--data-raw ${q(raw)}`].join(" \\\n  "),
  ].join("\n");
  const started = Date.now();
  let status = 0;
  let response = "";
  try {
    const r = await fetch(`${BASE}${path}`, { method, headers: { ...consoleHeaders("demo-page"), "content-type": "application/json" }, body: raw, cache: "no-store" });
    status = r.status;
    response = await r.text();
  } catch {
    response = JSON.stringify({ error: { message: "ระบบหลังบ้านไม่ตอบสนอง กรุณาลองใหม่" } });
  }
  let json: Record<string, unknown> | null = null;
  try { json = JSON.parse(response); response = JSON.stringify(json, null, 2); } catch {}
  return { ok: status >= 200 && status < 300, curl, curlShort: curl, status, ms: Date.now() - started, response, json, admin: true };
}

export type DemoFees = {
  id: number; feePercent: string; feeFlat: string; outFeePercent: string; outFeeFlat: string;
  paymentFeeTotal: string; paymentCount: number; payoutFeeTotal: string; payoutCount: number;
};

/** The demo shop's fee rates and the fees paid so far (approved payments / payouts). */
export async function demoFees(): Promise<DemoFees | null> {
  const r = await fetch(`${BASE}/api/console/demo/fees`, { headers: consoleHeaders("demo-page"), cache: "no-store" });
  if (!r.ok) throw new Error(`demo fees: HTTP ${r.status}`);
  return (await r.json()).fees ?? null;
}
