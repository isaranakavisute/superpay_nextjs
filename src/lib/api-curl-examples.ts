/**
 * Complete, runnable curl command per merchant-API endpoint (keyed "METHOD path"
 * as in src/app/api-docs/docs.ts) and the permission it needs. Shown in the
 * Merchant Portal API guide; request bodies are valid against the backend schemas.
 */
export const API_BASE = "https://optionpay.co/api/v1";
const KEY = `-H "X-API-Key: sk_live_YOUR_API_KEY"`;
const JSONH = `-H "Content-Type: application/json"`;
type Opts = { key?: boolean; json?: unknown; extra?: string[]; out?: string };
function curl(method: string, path: string, { key = true, json, extra = [], out }: Opts = {}) {
  const parts = [`curl${method === "GET" ? "" : ` -X ${method}`} "${API_BASE}${path}"`];
  if (key) parts.push(KEY);
  parts.push(...extra);
  if (json !== undefined) parts.push(JSONH, `-d '${JSON.stringify(json, null, 2).replace(/\n/g, "\n  ")}'`);
  if (out) parts.push(`-o ${out}`);
  return parts.join(" \\\n  ");
}
const withSlip = (path: string, fields: string, file = "slip.jpg", mime = "image/jpeg") =>
  `curl -X POST "${API_BASE}${path}" \\\n  ${KEY} \\\n  ${JSONH} \\\n  -d "{${fields}\\"mime\\":\\"${mime}\\",\\"image\\":\\"$(base64 < ${file} | tr -d '\\n')\\"}"`;

export type CurlExample = { perm: string | null; cmd: string; also?: { label: string; cmd: string } };
const TOKEN = "a1b2c3d4e5f60718293a4b5c6d7e8f90";

export const CURL_EXAMPLES: Record<string, CurlExample> = {
  "POST /auth/login": { perm: null, cmd: curl("POST", "/auth/login", { key: false, json: { secretKey: "ms_live_YOUR_SECRET_KEY" } }) },
  "POST /payment/create": { perm: "create_payment", cmd: curl("POST", "/payment/create", { json: { amount: 100, orderId: "ORD-001", description: "สินค้า A", metadata: { senderAccountNumber: "1234567890", senderBankCode: "SCB", memberName: "นาย ก ข ค", customerId: "CUST-9" } } }) },
  "POST /payment/slip/create": { perm: "create_payment", cmd: curl("POST", "/payment/slip/create", { json: { amount: 250, orderId: "ORD-002", description: "สินค้า B" } }),
    also: { label: "สร้าง + แนบสลิปในคำขอเดียว (slip.jpg = รูปสลิป)", cmd: withSlip("/payment/slip/create", `\\"amount\\":250,\\"orderId\\":\\"ORD-003\\",`) } },
  "POST /payment/slip/verify": { perm: "create_payment", cmd: withSlip("/payment/slip/verify", `\\"orderId\\":\\"ORD-002\\",`) },
  "POST /payment/:ref/slip": { perm: "create_payment", cmd: withSlip("/payment/TXN173530/slip", "", "slip.png", "image/png") },
  "GET /payment/order/:orderId": { perm: "view_transactions", cmd: curl("GET", "/payment/order/ORD-001") },
  "GET /payment/checkout/:transactionId": { perm: null, cmd: curl("GET", `/payment/checkout/${TOKEN}`, { key: false }) },
  "GET /payment/qr/:token.png": { perm: null, cmd: curl("GET", `/payment/qr/${TOKEN}.png`, { key: false, out: "qr.png" }) },
  "POST /collect": { perm: "create_payment", cmd: curl("POST", "/collect", { key: false, json: { key: "sk_live_YOUR_API_KEY_FOR_COLLECT", amount: 100, orderId: "ORD-004" } }) },
  "GET /transactions": { perm: "view_transactions", cmd: curl("GET", "/transactions?limit=20&offset=0&status=PAID&from=2026-10-01T00:00:00%2B07:00&to=2026-10-31T23:59:59%2B07:00") },
  "GET /transactions/:id": { perm: "view_transactions", cmd: curl("GET", `/transactions/${TOKEN}`) },
  "PATCH /transactions/:id/cancel": { perm: "cancel_payment", cmd: curl("PATCH", `/transactions/${TOKEN}/cancel`) },
  "POST /payout/create": { perm: "create_payout", cmd: curl("POST", "/payout/create", { extra: [`-H "Idempotency-Key: po-001-20261009"`], json: { amount: 500, bankCode: "SCB", accountNumber: "1234567890", accountName: "นาย ก ข ค", merchantRef: "PO-001", description: "ค่าสินค้า" } }) },
  "GET /payout/:id": { perm: "view_transactions", cmd: curl("GET", "/payout/OUT40160") },
  "GET /payout/ref/:merchantRef": { perm: "view_transactions", cmd: curl("GET", "/payout/ref/PO-001") },
  "GET /payouts": { perm: "view_transactions", cmd: curl("GET", "/payouts?limit=20&offset=0&status=PENDING,COMPLETED") },
  "POST /payout/bulk": { perm: "create_payout", cmd: curl("POST", "/payout/bulk", { json: { payouts: [{ amount: 500, bankCode: "SCB", accountNumber: "1234567890", accountName: "นาย ก", merchantRef: "PO-101" }, { amount: 750, bankCode: "KBANK", accountNumber: "9876543210", accountName: "นาง ข", merchantRef: "PO-102" }] } }) },
  "POST /withdrawal/request/create": { perm: "request_withdrawal", cmd: curl("POST", "/withdrawal/request/create", { json: { amount: 1000, bankCode: "KBANK", accountNumber: "9876543210", accountName: "นาย ก ข ค", merchantRef: "W-001", note: "ถอนประจำวัน" } }) },
  "GET /withdrawal/requests": { perm: "view_transactions", cmd: curl("GET", "/withdrawal/requests?limit=20&offset=0&status=PENDING") },
  "GET /withdrawal/request/:ref": { perm: "view_transactions", cmd: curl("GET", "/withdrawal/request/WDR90031") },
  "GET /payment/accounts": { perm: "manage_accounts", cmd: curl("GET", "/payment/accounts") },
  "POST /payment/accounts": { perm: "manage_accounts", cmd: curl("POST", "/payment/accounts", { json: { type: "BANK", bankCode: "SCB", accountNumber: "1234567890", accountName: "บจก. เอบีซี" } }),
    also: { label: "เพิ่มบัญชี PromptPay", cmd: curl("POST", "/payment/accounts", { json: { type: "PROMPTPAY", promptPayId: "0812345678", accountName: "บจก. เอบีซี" } }) } },
  "DELETE /payment/accounts/:id": { perm: "manage_accounts", cmd: curl("DELETE", "/payment/accounts/7") },
  "GET /webhooks": { perm: "manage_webhooks", cmd: curl("GET", "/webhooks") },
  "POST /webhooks": { perm: "manage_webhooks", cmd: curl("POST", "/webhooks", { json: { url: "https://your-site.com/optionpay/webhook", events: ["payment.approved", "payment.rejected"] } }) },
  "GET /balance": { perm: "view_dashboard", cmd: curl("GET", "/balance") },
  "GET /balance/line-summary": { perm: "view_dashboard", cmd: curl("GET", "/balance/line-summary") },
  "GET /profile": { perm: "view_dashboard", cmd: curl("GET", "/profile") },
  "GET /dashboard": { perm: "view_dashboard", cmd: curl("GET", "/dashboard") },
};
