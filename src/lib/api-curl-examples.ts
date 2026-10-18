import LIVE from "./api-live-examples.json";

/**
 * Per merchant-API endpoint (keyed "METHOD path" as in src/app/api-docs/docs.ts):
 * the permission it needs, and examples — a curl script and a Next.js route
 * handler that derive the request signature (src/lib/api-live-examples.json: captured
 * from a run against production, then every shop / customer / account value replaced by
 * demo values and re-signed with demo keys, 18 Oct 2026 — no real data in the guide).
 * Shown in the Merchant Portal API guide and its PDF.
 */
export const API_BASE = "https://optionpay.co/api/v1";

type LiveEntry = {
  method: string; path: string; body: string; signed: boolean; timestamp: string | null; toSign: string | null;
  signature: string | null; headers: Record<string, string>; file: string | null; status: number; response: string;
  /** Captured later with its own (revoked) key pair; otherwise the run's keys below. */
  apiKey?: string; secretKey?: string;
};
type Live = { capturedAt: string; site: string; apiKey: string; secretKey: string; entries: Record<string, LiveEntry>; errors: (LiveEntry & { label: string })[] };
const live = LIVE as Live;

export const LIVE_RUN = { capturedAt: live.capturedAt, apiKey: live.apiKey, secretKey: live.secretKey };

export type LiveExample = { timestamp: string | null; toSign: string | null; signature: string | null; status: number; response: string; file: string | null };
export type CurlExample = { perm: string | null; cmd: string; next: string; live: LiveExample };

const PERMS: Record<string, string | null> = {
  "POST /auth/login": null, "POST /payment/create": "create_payment", "POST /payment/slip/create": "create_payment",
  "POST /payment/slip/verify": "create_payment", "POST /payment/:ref/slip": "create_payment", "GET /payment/order/:orderId": "view_transactions",
  "GET /payment/checkout/:transactionId": null, "POST /payment/checkout/:transactionId/slip": null, "GET /payment/qr/:token.png": null,
  "POST /collect": "create_payment", "GET /transactions": "view_transactions", "GET /transactions/:id": "view_transactions",
  "PATCH /transactions/:id/cancel": "cancel_payment", "POST /payout/create": "create_payout", "GET /payout/:id": "view_transactions",
  "GET /payout/ref/:merchantRef": "view_transactions", "GET /payouts": "view_transactions", "POST /payout/bulk": "create_payout",
  "POST /withdrawal/request/create": "request_withdrawal", "GET /withdrawal/requests": "view_transactions", "GET /withdrawal/request/:ref": "view_transactions",
  "GET /payment/accounts": "manage_accounts", "POST /payment/accounts": "manage_accounts", "DELETE /payment/accounts/:id": "manage_accounts",
  "GET /webhooks": "manage_webhooks", "POST /webhooks": "manage_webhooks", "GET /balance": "view_dashboard",
  "GET /balance/line-summary": "view_dashboard", "GET /profile": "view_dashboard", "GET /dashboard": "view_dashboard",
  "GET /sub-merchants": "view_dashboard", "GET /sub-merchants/overview": "view_dashboard", "GET /sub-merchants/:id": "view_dashboard",
  "POST /sub-merchants": "manage_sub_merchants", "POST /sub-merchants/:id": "manage_sub_merchants", "POST /sub-merchants/:id/owner-password": "manage_sub_merchants",
  "GET /balance (X-Sub-Merchant)": "view_dashboard",
};

const IMG = /"image":"[^"]*…\(base64 ของรูปสลิป\)"/;
const SITE = "https://optionpay.co";

/** curl script: real key values, the real timestamp, the signature derived with openssl. */
function curlScript(key: string, e: LiveEntry): string {
  const url = `${SITE}${e.path}`;
  const extra = Object.entries(e.headers).map(([h, v]) => `  -H "${h}: ${v}" \\`);
  if (key === "POST /auth/login") {
    return `# /auth/login ใช้ได้เฉพาะภายใน Merchant Portal — เรียกจากภายนอกได้ 403 เสมอ (ผลจริงด้านล่าง)
curl -X POST "${url}" \\
  -H "Content-Type: application/json" \\
  --data-raw '${e.body}'`;
  }
  const hasBody = e.body !== "";
  const bodyLine = !hasBody ? "" : IMG.test(e.body)
    ? `BODY="${e.body.replace(IMG, '"image":"__IMG__"').replace(/"/g, '\\"').replace("__IMG__", `$(base64 < ${e.file} | tr -d '\\n')`)}"   # ${e.file} = รูปสลิป\n`
    : `BODY='${e.body}'\n`;
  if (!e.signed) {
    const out = key.endsWith(".png") ? ` \\\n  -o qr.png` : "";
    return `# ไม่ต้องมี key / ลายเซ็น — transaction id เป็นความลับของลูกค้าคนนั้น
${bodyLine}curl${e.method === "GET" ? "" : ` -X ${e.method}`} "${url}"${hasBody ? ` \\\n  -H "Content-Type: application/json" \\\n  --data-raw "$BODY"` : ""}${out}`;
  }
  return `API_KEY="${e.apiKey ?? live.apiKey}"   # ส่งไปกับคำขอ
SECRET="${e.secretKey ?? live.secretKey}"   # ใช้เซ็นเท่านั้น ห้ามส่ง
TS="${e.timestamp}"   # ปกติใช้ TS=$(date +%s)
${bodyLine}SIG=$(printf '%s' "$TS.${e.method}.${e.path}.${hasBody ? "$BODY" : ""}" | openssl dgst -sha256 -hmac "$SECRET" | awk '{print $NF}')
# SIG = ${IMG.test(e.body) ? "(ขึ้นกับไฟล์รูปที่แนบ — คำนวณด้วยคำสั่งด้านบน)" : e.signature}

curl${e.method === "GET" ? "" : ` -X ${e.method}`} "${url}" \\
  -H "X-API-Key: $API_KEY" \\
  -H "X-Timestamp: $TS" \\
${extra.join("\n")}${extra.length ? "\n" : ""}  -H "X-Signature: $SIG"${hasBody ? ` \\\n  -H "Content-Type: application/json" \\\n  --data-raw "$BODY"` : ""}`;
}

/** Next.js route handler (server side): builds the body, derives the signature, calls the API. */
function nextHandler(key: string, e: LiveEntry): string {
  const handler = e.method === "GET" ? "GET" : "POST";
  const img = IMG.test(e.body);
  const bodyExpr = e.body === "" ? null
    : JSON.stringify(JSON.parse(e.body.replace(IMG, '"image":"__IMG__"')), null, 2).replace(/\n/g, "\n  ")
      .replace('"__IMG__"', `(await readFile("${e.file}")).toString("base64")`);
  const imports = [`import { createHmac } from "node:crypto";`, ...(img ? [`import { readFile } from "node:fs/promises";`] : [])];
  if (key === "POST /auth/login") {
    return `// /auth/login ใช้ได้เฉพาะภายใน Merchant Portal — เรียกจากระบบของร้านได้ 403 LOGIN_PORTAL_ONLY เสมอ
// รับ API key ที่ Merchant Portal → ตั้งค่า → Secret key และ API key แทน
export async function POST() {
  const res = await fetch("${SITE}${e.path}", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(${e.body}),
  });
  return Response.json(await res.json(), { status: res.status }); // → 403 (ผลลัพธ์ด้านล่าง)
}`;
  }
  if (!e.signed) {
    const isPng = key.endsWith(".png");
    return `// app/api/optionpay/route.ts — Next.js route handler · endpoint สาธารณะ ไม่ต้องมี key / ลายเซ็น
${img ? `import { readFile } from "node:fs/promises";\n\n` : ""}export async function ${handler}() {
  const res = await fetch("${SITE}${e.path}"${e.method === "GET" ? "" : `, {
    method: "${e.method}",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(${bodyExpr}),
  }`});
  ${isPng ? `return new Response(await res.arrayBuffer(), { status: res.status, headers: { "Content-Type": res.headers.get("content-type") ?? "image/png" } });` : `return Response.json(await res.json(), { status: res.status });`}
}`;
  }
  const extraHeaders = Object.entries(e.headers).map(([h, v]) => `      "${h}": "${v}",\n`).join("");
  return `// app/api/optionpay/route.ts — Next.js route handler (ทำงานฝั่งเซิร์ฟเวอร์เท่านั้น ห้ามใช้ในหน้าเว็บของลูกค้า)
${imports.join("\n")}

const API_KEY = process.env.OPTIONPAY_API_KEY!;    // ค่าตัวอย่าง: "${e.apiKey ?? live.apiKey}"
const SECRET = process.env.OPTIONPAY_SECRET_KEY!;  // ค่าตัวอย่าง: "${e.secretKey ?? live.secretKey}" — ห้ามส่งไปกับคำขอ

export async function ${handler}() {
  const method = "${e.method}";
  const path = "${e.path}";
  const body = ${bodyExpr === null ? `""; // ${e.method} ไม่มี body — ใช้สตริงว่างตอนเซ็น` : `JSON.stringify(${bodyExpr});`}
  const timestamp = Math.floor(Date.now() / 1000).toString();  // ค่าตัวอย่าง: "${e.timestamp}"

  // ลายเซ็น = HMAC-SHA256(secret, "timestamp.METHOD.path.body") แบบ hex
  const signature = createHmac("sha256", SECRET)
    .update(\`\${timestamp}.\${method}.\${path}.\${body}\`)
    .digest("hex");                                            // ${IMG.test(e.body) ? "ขึ้นกับไฟล์รูปที่แนบ" : `ค่าตัวอย่าง: "${e.signature}"`}

  const res = await fetch(\`${SITE}\${path}\`, {
    method,
    headers: {
      "X-API-Key": API_KEY,
      "X-Timestamp": timestamp,
      "X-Signature": signature,
${extraHeaders}${bodyExpr === null ? "" : `      "Content-Type": "application/json",\n`}    },${bodyExpr === null ? "" : "\n    body, // ต้องส่งสตริงเดียวกับที่เซ็นทุกตัวอักษร"}
  });
  return Response.json(await res.json(), { status: res.status });
}`;
}

export const CURL_EXAMPLES: Record<string, CurlExample> = Object.fromEntries(
  Object.entries(live.entries).map(([key, e]) => [key, {
    perm: PERMS[key] ?? null,
    cmd: curlScript(key, e),
    next: nextHandler(key, e),
    live: { timestamp: e.timestamp, toSign: e.toSign, signature: IMG.test(e.body) ? null : e.signature, status: e.status, response: e.response, file: e.file },
  }]),
);

/** Real error responses (wrong / missing / expired / reused signature, old key). */
export const SIGNATURE_ERRORS = live.errors.map((e) => ({ label: e.label, status: e.status, response: e.response }));

/** Reusable Next.js helper shown in the "signing" section of the guide. */
export const NEXT_HELPER = `// lib/optionpay.ts — ใช้ซ้ำได้ทุก endpoint (ฝั่งเซิร์ฟเวอร์เท่านั้น)
import { createHmac } from "node:crypto";

const API_KEY = process.env.OPTIONPAY_API_KEY!;    // ak_live_…
const SECRET = process.env.OPTIONPAY_SECRET_KEY!;  // sk_live_… (key ระดับร้านใช้ ss_live_…) — ห้ามส่ง

// เซ็นใหม่ทุกครั้งที่เรียก (timestamp ใหม่) — ส่งซ้ำได้โดยไม่ติด SIGNATURE_REUSED · timeoutMs: รอได้นานสุด (ค่าเริ่มต้น 60 วินาที)
export async function optionpay(method: "GET" | "POST" | "PATCH" | "DELETE", path: string, payload?: unknown, timeoutMs = 60_000) {
  const body = payload === undefined ? "" : JSON.stringify(payload);
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const signature = createHmac("sha256", SECRET).update(\`\${timestamp}.\${method}.\${path}.\${body}\`).digest("hex");
  const res = await fetch(\`${SITE}\${path}\`, {
    method,
    headers: { "X-API-Key": API_KEY, "X-Timestamp": timestamp, "X-Signature": signature, ...(body ? { "Content-Type": "application/json" } : {}) },
    body: body || undefined,
    signal: AbortSignal.timeout(timeoutMs),   // หมดเวลา → throw (ดูหัวข้อ “ส่งสลิป: timeout และการส่งซ้ำ”)
  });
  return { status: res.status, data: await res.json() };
}

// ตัวอย่าง: const { data } = await optionpay("POST", "/api/v1/payment/create", { amount: 100, orderId: "ORD-001" });`;

/** Sending a slip with timeouts / network errors handled — safe to resend (see the merchant API guide, section slip-retry). */
export const SLIP_RETRY_HELPER = `// lib/send-slip.ts — ส่งสลิปพร้อมจัดการ timeout / เครือข่ายขัดข้อง (ใช้ optionpay() จาก lib/optionpay.ts)
import { optionpay } from "./optionpay";

const WAIT_MS = [2_000, 5_000, 15_000];   // รอก่อนส่งซ้ำครั้งที่ 1, 2, 3

const orderStatus = async (orderId: string) =>
  (await optionpay("GET", \`/api/v1/payment/order/\${encodeURIComponent(orderId)}\`, undefined, 15_000)).data;

export async function sendSlip(orderId: string, imageBase64: string, mime = "image/jpeg") {
  for (let attempt = 0; ; attempt++) {
    try {
      const r = await optionpay("POST", "/api/v1/payment/slip/verify", { orderId, image: imageBase64, mime });
      if (r.status === 200) return r.data;                 // ตรวจแล้ว: ดู r.data.result (PAID | PENDING_REVIEW | INVALID_SLIP)
      if (r.status === 409 && r.data.error?.code === "ORDER_NOT_PENDING") return orderStatus(orderId); // ปิดไปแล้ว — ครั้งก่อนอาจสำเร็จ
      if (![502, 503, 504].includes(r.status)) return r.data; // 4xx อื่น: คำขอผิด — แก้ อย่าส่งซ้ำ
      // 502 / 503 / 504: เซิร์ฟเวอร์ไม่พร้อมชั่วคราว → ส่งซ้ำด้านล่าง
    } catch {
      // timeout / เครือข่ายขัดข้อง: ไม่รู้ว่าเซิร์ฟเวอร์ตรวจเสร็จหรือยัง → ถามสถานะก่อน อย่าเดา
      const s = await orderStatus(orderId).catch(() => null);
      if (s?.transaction?.status === "PAID") return s;       // ครั้งก่อนสำเร็จแล้ว — ไม่ต้องส่งซ้ำ
    }
    if (attempt >= WAIT_MS.length) throw new Error("ส่งสลิปไม่สำเร็จ — รอ webhook payment.approved / payment.rejected หรือแจ้งผู้ดูแล");
    await new Promise((ok) => setTimeout(ok, WAIT_MS[attempt]));   // แล้วส่งสลิปเดิมเข้าออเดอร์เดิมอีกครั้ง (ปลอดภัย)
  }
}`;
