import LIVE from "./api-live-examples.json";

/**
 * Per merchant-API endpoint (keyed "METHOD path" as in src/app/api-docs/docs.ts):
 * the permission it needs, and REAL examples — a curl script and a Next.js route
 * handler that derive the request signature, built from an actual run against
 * production (src/lib/api-live-examples.json; the keys used there were revoked
 * right after). Shown in the Merchant Portal API guide and its PDF.
 */
export const API_BASE = "https://optionpay.co/api/v1";

type LiveEntry = {
  method: string; path: string; body: string; signed: boolean; timestamp: string | null; toSign: string | null;
  signature: string | null; headers: Record<string, string>; file: string | null; status: number; response: string;
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
  return `API_KEY="${live.apiKey}"   # ส่งไปกับคำขอ
SECRET="${live.secretKey}"   # ใช้เซ็นเท่านั้น ห้ามส่ง
TS="${e.timestamp}"   # ปกติใช้ TS=$(date +%s)
${bodyLine}SIG=$(printf '%s' "$TS.${e.method}.${e.path}.${hasBody ? "$BODY" : ""}" | openssl dgst -sha256 -hmac "$SECRET" | awk '{print $NF}')
# SIG = ${e.signature}${IMG.test(e.body) ? " (กับรูปที่ใช้ตอนรันจริง)" : ""}

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
  return Response.json(await res.json(), { status: res.status }); // → 403 (ผลจริงด้านล่าง)
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

const API_KEY = process.env.OPTIONPAY_API_KEY!;    // ค่าจริงตอนรัน: "${live.apiKey}"
const SECRET = process.env.OPTIONPAY_SECRET_KEY!;  // ค่าจริงตอนรัน: "${live.secretKey}" — ห้ามส่งไปกับคำขอ

export async function ${handler}() {
  const method = "${e.method}";
  const path = "${e.path}";
  const body = ${bodyExpr === null ? `""; // ${e.method} ไม่มี body — ใช้สตริงว่างตอนเซ็น` : `JSON.stringify(${bodyExpr});`}
  const timestamp = Math.floor(Date.now() / 1000).toString();  // ค่าจริงตอนรัน: "${e.timestamp}"

  // ลายเซ็น = HMAC-SHA256(secret, "timestamp.METHOD.path.body") แบบ hex
  const signature = createHmac("sha256", SECRET)
    .update(\`\${timestamp}.\${method}.\${path}.\${body}\`)
    .digest("hex");                                            // ค่าจริงตอนรัน: "${e.signature}"

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
    live: { timestamp: e.timestamp, toSign: e.toSign, signature: e.signature, status: e.status, response: e.response, file: e.file },
  }]),
);

/** Real error responses (wrong / missing / expired / reused signature, old key). */
export const SIGNATURE_ERRORS = live.errors.map((e) => ({ label: e.label, status: e.status, response: e.response }));

/** Reusable Next.js helper shown in the "signing" section of the guide. */
export const NEXT_HELPER = `// lib/optionpay.ts — ใช้ซ้ำได้ทุก endpoint (ฝั่งเซิร์ฟเวอร์เท่านั้น)
import { createHmac } from "node:crypto";

const API_KEY = process.env.OPTIONPAY_API_KEY!;    // ak_live_…
const SECRET = process.env.OPTIONPAY_SECRET_KEY!;  // sk_live_… (key ระดับร้านใช้ ss_live_…) — ห้ามส่ง

export async function optionpay(method: "GET" | "POST" | "PATCH" | "DELETE", path: string, payload?: unknown) {
  const body = payload === undefined ? "" : JSON.stringify(payload);
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const signature = createHmac("sha256", SECRET).update(\`\${timestamp}.\${method}.\${path}.\${body}\`).digest("hex");
  const res = await fetch(\`${SITE}\${path}\`, {
    method,
    headers: { "X-API-Key": API_KEY, "X-Timestamp": timestamp, "X-Signature": signature, ...(body ? { "Content-Type": "application/json" } : {}) },
    body: body || undefined,
  });
  return { status: res.status, data: await res.json() };
}

// ตัวอย่าง: const { data } = await optionpay("POST", "/api/v1/payment/create", { amount: 100, orderId: "ORD-001" });`;
