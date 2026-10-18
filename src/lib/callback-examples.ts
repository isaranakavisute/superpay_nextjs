/**
 * Callback requests Option Pay sends to a shop, as curl — Option B signing (the default for every shop since 18 Oct 2026):
 *   key = HMAC-SHA256(sk_live, t + ".POST." + path + "." + body) (hex) · v1 = HMAC-SHA256(key, t + "." + body).
 * Demo values (this page is shown to every shop); the signatures are real, made with CALLBACK_DEMO_SECRET and
 * CALLBACK_DEMO_PATH, so a shop can test its verification against them. Generated 18 Oct 2026 (cross-checked with openssl).
 */
export const CALLBACK_DEMO_SECRET = "sk_live_demo_for_docs_only";
export const CALLBACK_DEMO_PATH = "/optionpay/callback";
export const CALLBACK_EXAMPLES: { event: string; when: string; cmd: string }[] = [
 {
  "event": "payment.approved",
  "when": "ออเดอร์ได้รับการอนุมัติ — ตรวจสลิปผ่านอัตโนมัติ หรือเจ้าหน้าที่อนุมัติ",
  "cmd": "curl -X POST \"https://your-site.com/optionpay/callback\" \\\n  -H \"content-type: application/json\" \\\n  -H \"user-agent: OptionPay-Webhook/1.0\" \\\n  -H \"x-webhook-event: payment.approved\" \\\n  -H \"x-signature: t=1792236293,v1=f64b09e38ec11b730e8cafe131b4a073cfbf082fca0b804b6269f3c7bcdefac3\" \\\n  --data-raw '{\"event\":\"payment.approved\",\"ref\":\"TXN100001\",\"orderId\":\"ORD-1001\",\"amount\":\"1000.00\",\"status\":\"approved\",\"createdAt\":\"2026-10-17T09:21:20.000Z\",\"resentAt\":\"2026-10-17T09:24:53.515Z\"}'"
 },
 {
  "event": "payment.rejected",
  "when": "ออเดอร์ถูกปฏิเสธ / ยกเลิก — เจ้าหน้าที่ปฏิเสธ ร้านยกเลิกผ่าน API หรือระบบยกเลิกอัตโนมัติ",
  "cmd": "curl -X POST \"https://your-site.com/optionpay/callback\" \\\n  -H \"content-type: application/json\" \\\n  -H \"user-agent: OptionPay-Webhook/1.0\" \\\n  -H \"x-webhook-event: payment.rejected\" \\\n  -H \"x-signature: t=1792235865,v1=b1e1ab2c24e954c057868875720c66334a81d5f2d0b9d2ac4e49482966f1a468\" \\\n  --data-raw '{\"event\":\"payment.rejected\",\"ref\":\"TXN100002\",\"orderId\":\"ORD-1002\",\"amount\":\"1400.00\",\"status\":\"rejected\",\"createdAt\":\"2026-10-17T08:49:20.511Z\",\"resentAt\":\"2026-10-17T11:17:45.470Z\"}'"
 },
 {
  "event": "payout.completed",
  "when": "ทีม Option Pay โอนเงิน payout ให้ผู้รับแล้ว",
  "cmd": "curl -X POST \"https://your-site.com/optionpay/callback\" \\\n  -H \"content-type: application/json\" \\\n  -H \"user-agent: OptionPay-Webhook/1.0\" \\\n  -H \"x-webhook-event: payout.completed\" \\\n  -H \"x-signature: t=1792236290,v1=f7b235f7bdd6bc423fa3511de99369165469526fae5bee21e79578a6a9279fb6\" \\\n  --data-raw '{\"event\":\"payout.completed\",\"ref\":\"OUT10155\",\"orderId\":\"WD-1001\",\"merchantRef\":\"WD-1001\",\"amount\":\"2000.00\",\"status\":\"completed\",\"failureReason\":null,\"createdAt\":\"2026-10-17T09:35:04.306Z\",\"completedAt\":\"2026-10-17T09:45:06.509Z\"}'"
 },
 {
  "event": "payout.failed",
  "when": "payout ถูกปฏิเสธ — คืนยอด amount + fee เข้ายอดคงเหลือของร้านแล้ว",
  "cmd": "curl -X POST \"https://your-site.com/optionpay/callback\" \\\n  -H \"content-type: application/json\" \\\n  -H \"user-agent: OptionPay-Webhook/1.0\" \\\n  -H \"x-webhook-event: payout.failed\" \\\n  -H \"x-signature: t=1792234817,v1=c110fcdb3533f672122bc8ac736824ae12f0257e1cce6b5f13fc47b18fe9ee25\" \\\n  --data-raw '{\"event\":\"payout.failed\",\"ref\":\"OUT10156\",\"orderId\":\"WD-1002\",\"merchantRef\":\"WD-1002\",\"amount\":\"302.00\",\"status\":\"failed\",\"failureReason\":\"ยกเลิกโดยผู้ดูแลระบบ\",\"createdAt\":\"2026-10-17T06:47:40.956Z\",\"completedAt\":\"2026-10-17T07:40:30.505Z\"}'"
 }
];
