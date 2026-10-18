/**
 * Next.js (App Router) route handler a shop on Option B signing (sk_live_-derived, 18 Oct 2026) can paste to verify
 * Option Pay callbacks. The exact text is tested against real signatures before publishing — keep it runnable as-is.
 */
export function nextjsCallbackVerifier(path: string): string {
  return `// app${path}/route.ts  — Next.js (App Router) · รับ callback จาก Option Pay และตรวจ x-signature
import { createHmac, timingSafeEqual } from "node:crypto";

export const runtime = "nodejs";        // ใช้ node:crypto
export const dynamic = "force-dynamic";

// secret key (sk_live_…) ของร้านคุณ — ตัวเดียวกับที่ใช้เซ็นคำขอ API และตัวเดียวกับที่ Option Pay ใช้เซ็น callback นี้
// เก็บใน .env เท่านั้น ห้ามใส่ในโค้ด
const SECRET_KEY = process.env.OPTIONPAY_SECRET_KEY ?? "";
// path ของ webhook URL ที่ตั้งไว้กับ Option Pay — ต้องตรงทุกตัวอักษร (ไม่รวมโดเมนและ query)
const CALLBACK_PATH = "${path}";
const MAX_AGE_SECONDS = 300;            // ปฏิเสธลายเซ็นที่เก่ากว่า 5 นาที (กันการส่งซ้ำ)

const hmacHex = (key: string, message: string) => createHmac("sha256", key).update(message, "utf8").digest("hex");

/** ตรวจลายเซ็น: key = HMAC(sk_live, t.POST.path.body) · v1 = HMAC(key, t.body) */
export function verifyOptionPaySignature(rawBody: string, header: string | null, secretKey = SECRET_KEY, now = Date.now()): boolean {
  if (!header || !secretKey) return false;
  const parts = Object.fromEntries(header.split(",").map((p) => {
    const i = p.indexOf("=");
    return [p.slice(0, i).trim(), p.slice(i + 1).trim()];
  }));
  const t = parts.t ?? "";
  const v1 = parts.v1 ?? "";
  if (!/^\\d+$/.test(t) || !/^[0-9a-f]{64}$/.test(v1)) return false;
  if (Math.abs(now / 1000 - Number(t)) > MAX_AGE_SECONDS) return false;
  const key = hmacHex(secretKey, \`\${t}.POST.\${CALLBACK_PATH}.\${rawBody}\`);
  const expected = hmacHex(key, \`\${t}.\${rawBody}\`);
  return timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(v1, "hex"));
}

type OptionPayCallback = {
  event: "payment.approved" | "payment.rejected" | "payout.completed" | "payout.failed" | string;
  ref: string;
  orderId: string | null;
  amount: string;
  status: string;
  merchantRef?: string | null;
  failureReason?: string | null;
};

export async function POST(req: Request) {
  // อ่าน body ดิบก่อนตรวจ — ห้ามใช้ req.json() แล้วแปลงกลับ เพราะตัวอักษรจะไม่ตรงกับที่เซ็น
  const rawBody = await req.text();
  if (!verifyOptionPaySignature(rawBody, req.headers.get("x-signature"))) {
    return Response.json({ code: 401, message: "invalid signature" }, { status: 401 });
  }
  const cb = JSON.parse(rawBody) as OptionPayCallback;
  switch (cb.event) {
    case "payment.approved": // ออเดอร์ cb.orderId ชำระแล้ว — อัปเดตแบบ idempotent (ได้ event เดิมซ้ำได้)
      break;
    case "payment.rejected": // ออเดอร์ cb.orderId ไม่สำเร็จ / ยกเลิก
      break;
    case "payout.completed": // payout cb.merchantRef โอนสำเร็จ
      break;
    case "payout.failed":    // payout cb.merchantRef ไม่สำเร็จ — cb.failureReason
      break;
  }
  return Response.json({ code: 200, message: "success" });
}
`;
}
