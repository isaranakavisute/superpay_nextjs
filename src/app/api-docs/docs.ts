// Spec of the merchant REST API v1 as implemented by the backend (src/merchant-api).
export type Ep = { m: "GET" | "POST" | "PATCH" | "DELETE"; p: string; d: string; auth?: string; body?: string; res?: string; note?: string };
export type Section = { id: string; nav: string; title: string; sub?: string; eps: Ep[] };

const KEY = "<code>X-API-Key</code> + <code>X-Timestamp</code> + <code>X-Signature</code>";
const TXN = `{
  "id": "d4dab18fc0540c9a11654ce9af78a434",   // transaction id — ใช้กับ checkout / QR / cancel (ความลับของลูกค้า)
  "ref": "TXN100018",               // เลขที่รายการของ Option Pay
  "merchantId": "6",
  "orderId": "ORD-001",             // เลขออเดอร์ของร้าน (ไม่ส่ง = Option Pay สร้างให้ "OP-…")
  "amount": 350,                    // ยอดที่ลูกค้าต้องโอน — แสดงยอดนี้ให้ลูกค้าเสมอ
  "fee": 5.25, "netAmount": 344.75, // ค่าธรรมเนียม และยอดสุทธิที่ร้านได้เมื่อชำระแล้ว
  "status": "PENDING",              // PENDING | PAID | EXPIRED | CANCELLED | REFUNDED
  "source": "API",
  "paymentMethod": "BANK_TRANSFER", // หรือ PROMPTPAY ถ้าบัญชีรับเงินมี PromptPay
  "description": "ข้าวมันไก่ 2 จาน", // null ถ้าไม่ส่ง
  "qrCode": null, "qrCodeUrl": null, // URL รูป QR PromptPay — null ถ้าบัญชีไม่มี PromptPay
  "qrExpiry": "2026-10-15T01:37:41.237Z",
  "checkoutUrl": "{SITE}/c?t={id}",
  "createdAt": "2026-10-15T01:22:41.237Z",
  "paidAt": null,
  "copy": { "amount": "350.00" }
}`;
const LIST = (item: string) => `{
  "success": true,
  "data": [ ${item} ],
  "pagination": { "total": 120, "limit": 50, "offset": 0 }
}`;
const QS = "Query: <code>limit</code> (1–200, ค่าเริ่มต้น 50) · <code>offset</code> · <code>status</code> (คั่นด้วย , ได้) · <code>from</code> / <code>to</code> (ISO 8601 พร้อม timezone)";
const PAYOUT = `{ "id": "OUT10151", "merchantRef": "PO-001", "amount": 500,
  "fee": 10, "totalDebit": 510,   // ค่าธรรมเนียมเงินออก (บวกเพิ่ม) · หักจากยอดร้าน = amount + fee · ผู้รับได้ amount เต็ม
  "status": "COMPLETED",          // อนุมัติแล้ว — อนุมัติอัตโนมัติทันที และหักยอดร้านแล้ว
  "bankCode": "SCB", "accountNumber": "1234567890", "accountName": "นาย ก",
  "description": "...", "createdAt": "2026-10-15T04:29:00.000Z",
  "completedAt": "2026-10-15T04:29:00.000Z",   // อนุมัติทันทีตอนสร้าง (payout ผ่าน API)
  "failureReason": null }`;
const WDR = `{ "requestRef": "WDR90031", "merchantRef": "W-001", "amount": 1000,
  "fee": 20, "totalDebit": 1020,  // ค่าธรรมเนียมเงินออก (บวกเพิ่ม) · หักจากยอดร้าน = amount + fee
  "status": "PENDING",
  "bankCode": "KBANK", "accountNumber": "9876543210", "accountName": "นาย ก",
  "note": null, "rejectReason": null, "createdAt": "...", "decidedAt": null }`;

/** Normal vs carry-over slip result: the same keys, only the values differ (shown in both API docs). */
export const SLIP_SAME_SHAPE = "ใช่ — โครงสร้างเหมือนกัน · ทุก response ของการตรวจสลิปจาก API (<code>POST /payment/:ref/slip</code>, <code>POST /payment/slip/verify</code>, <code>POST /payment/slip/create</code> ที่ส่ง image) ตอบฟิลด์ (key) ชุดเดียวกันเสมอ ไม่ว่าจะเกิดอะไรขึ้น · ในกรณีปกติ ฟิลด์ที่มีความหมายเฉพาะกรณีพิเศษ <strong>ยังอยู่ครบ แต่เป็นค่าว่าง: <code>null</code> หรือ <code>[]</code></strong> — parse ด้วยโค้ดชุดเดียวได้ทุกกรณี";
export const SLIP_COMPARE: [string, string, string, string][] = [
  ["success", "boolean", "true", "true"],
  ["verified", "boolean", "true", "true"],
  ["result", "string", "\"PAID\"", "\"PAID\""],
  ["message", "string", "\"ตรวจสลิปผ่าน — ออเดอร์ชำระแล้ว (อนุมัติอัตโนมัติ)\"", "ข้อความเดียวกัน + อธิบายเงินโอนจาก TXN100016 และการยกเลิกอัตโนมัติ"],
  ["mismatches", "string[]", "[]", "[]"],
  ["warnings", "string[]", "[]", "[]"],
  ["carriedFrom", "string | null", "null", "\"TXN100016\""],
  ["carryOver", "object | null", "null", "{ fromRef, fromOrderId, fromAmount, fromStatus, transferAmount, transferredAt, reason }"],
  ["autoCancelled", "object[]", "[]", "[ { ref, orderId, amount, reason } ]"],
  ["checks", "object[]", "7 ข้อ ทุกข้อ PASS", "7 ข้อ ทุกข้อ PASS (TRANSFER_TIME อธิบายว่าใช้เงินโอนของออเดอร์ก่อนหน้า)"],
  ["slip", "object | null", "{ provider, transRef, amount, transferredAt, sender, receiver }", "เหมือนกัน"],
  ["nextStep", "string", "\"ไม่ต้องทำอะไรเพิ่ม — …\"", "ข้อความเดียวกัน + บันทึกความเชื่อมโยง / ปิด TXN100016 ในระบบร้าน"],
  ["transaction", "object", "{ … status: \"PAID\" }", "{ … status: \"PAID\" }"],
];
const SLIP_COMPARE_HTML = `<strong>โครงสร้าง JSON: กรณีปกติ vs เงินโอนจากออเดอร์ก่อนหน้า</strong><br>${SLIP_SAME_SHAPE}<table style="margin-top:8px;width:100%;border-collapse:collapse;font-size:12px"><tr><th align=left>ชื่อฟิลด์ (key)</th><th align=left>ชนิดข้อมูล</th><th align=left>กรณีปกติ ①</th><th align=left>เงินโอนจากออเดอร์ก่อนหน้า ②</th><th>มีทั้งสองกรณี</th></tr>${SLIP_COMPARE.map(([k, t, a, b]) => `<tr style="border-top:1px solid rgba(127,127,127,.25)"><td><code>${k}</code></td><td>${t}</td><td>${a}</td><td>${b}</td><td align=center>✓</td></tr>`).join("")}</table>`;
/** /payment/create response, field by field (shown in both API docs). */
const PAYMENT_CREATE_FIELDS: [string, string, string][] = [
  ["success", "boolean", "true เมื่อสร้างสำเร็จ (ไม่สำเร็จ = HTTP 4xx พร้อม <code>{error:{code,message,details}}</code>)"],
  ["orderIdGenerated", "boolean", "true = ร้านไม่ได้ส่ง <code>orderId</code> มา Option Pay สร้างให้ (<code>OP-…</code>) — เก็บ <code>transaction.orderId</code> ไว้ใช้อ้างอิง"],
  ["transaction.id", "string (32)", "transaction id — ใช้กับ <code>/payment/checkout/:id</code>, <code>/payment/qr/:id.png</code>, <code>/transactions/:id</code>, ยกเลิก · ถือเป็นความลับของลูกค้า (อยู่ใน checkoutUrl)"],
  ["transaction.ref", "string", "เลขที่รายการของ Option Pay (<code>TXN…</code>) — ใช้กับ <code>/payment/:ref/slip</code> และ <code>/transactions/:ref</code>"],
  ["transaction.merchantId", "string", "รหัสร้านเจ้าของรายการ"],
  ["transaction.orderId", "string", "เลขออเดอร์ของร้าน (ที่ส่งมา หรือที่ระบบสร้างให้) — ไม่ซ้ำภายในร้าน · ใช้กับ <code>/payment/order/:orderId</code> และ <code>/payment/slip/verify</code>"],
  ["transaction.amount", "number", "<strong>ยอดที่ลูกค้าต้องโอน</strong> — เท่ากับที่ร้านส่งมา (เว้นแต่ผู้ดูแลเปิด “ยอดไม่ซ้ำ” ซึ่งอาจเติมสตางค์) · แสดงยอดนี้ให้ลูกค้าเสมอ"],
  ["transaction.fee", "number", "ค่าธรรมเนียมขาเข้า = amount × % + ค่าคงที่ (ตามที่ตั้งให้ร้าน) ปัดเป็น 2 ตำแหน่ง — คิดเมื่อรายการชำระแล้วเท่านั้น"],
  ["transaction.netAmount", "number", "amount − fee = ยอดที่เข้ายอดคงเหลือของร้านเมื่อ PAID"],
  ["transaction.status", "string", "<code>PENDING</code> รอชำระ · <code>PAID</code> ชำระแล้ว · <code>EXPIRED</code> หมดอายุ (ยังแนบสลิปได้) · <code>CANCELLED</code> ยกเลิก · <code>REFUNDED</code> คืนเงิน"],
  ["transaction.source", "string", "ช่องทางที่สร้าง: <code>API</code> · <code>PORTAL</code> · <code>SLIP</code> · <code>COLLECT</code>"],
  ["transaction.paymentMethod", "string", "<code>PROMPTPAY</code> (บัญชีรับเงินมี PromptPay → มี QR) หรือ <code>BANK_TRANSFER</code> (โอนเข้าเลขบัญชี)"],
  ["transaction.description", "string | null", "รายละเอียดที่ร้านส่งมา"],
  ["transaction.qrCode / qrCodeUrl", "string | null", "URL รูป QR PromptPay (PNG) พร้อมยอด — <code>null</code> เมื่อ paymentMethod = BANK_TRANSFER"],
  ["transaction.qrExpiry", "ISO datetime | null", "เวลาหมดอายุของรายการ (สร้าง + อายุออเดอร์ที่ตั้งไว้ ปกติ 15 นาที) · null = ไม่หมดอายุ"],
  ["transaction.checkoutUrl", "string", "หน้าชำระเงินสำเร็จรูปของ Option Pay — ส่งให้ลูกค้าเปิดได้เลย (แสดงยอด บัญชี/QR นับถอยหลัง แนบสลิป)"],
  ["transaction.createdAt", "ISO datetime", "เวลาสร้างรายการ (UTC)"],
  ["transaction.paidAt", "ISO datetime | null", "เวลาที่ชำระ/อนุมัติ — null จนกว่าจะ PAID"],
  ["transaction.copy.amount", "string", "ยอดเป็นข้อความ 2 ตำแหน่ง (เช่น \"350.00\") สำหรับปุ่มคัดลอกยอดในแอป"],
  ["selectedAccount.id", "string", "รหัสบัญชีรับเงินที่ระบบเลือกให้รายการนี้"],
  ["selectedAccount.type", "string", "<code>PROMPTPAY</code> หรือ <code>BANK</code>"],
  ["selectedAccount.accountNumber", "string", "เบอร์/เลข PromptPay (type = PROMPTPAY) หรือเลขบัญชีธนาคาร (type = BANK) — ลูกค้าโอนเข้าเลขนี้"],
  ["selectedAccount.accountName", "string", "ชื่อบัญชีรับเงิน — แสดงให้ลูกค้าตรวจก่อนโอน"],
  ["selectedAccount.bankCode / bankName", "string", "รหัสและชื่อธนาคารของบัญชีรับเงิน (เช่น SCB · ธนาคารไทยพาณิชย์)"],
];
const PAYMENT_CREATE_FIELDS_HTML = `<strong>คำอธิบายผลลัพธ์ทีละฟิลด์</strong><table style="margin-top:6px;width:100%;border-collapse:collapse;font-size:12px"><tr><th align=left>ฟิลด์</th><th align=left>ชนิด</th><th align=left>ความหมาย</th></tr>${PAYMENT_CREATE_FIELDS.map(([k, t, d]) => `<tr style="border-top:1px solid rgba(127,127,127,.25)"><td><code>${k}</code></td><td>${t}</td><td>${d}</td></tr>`).join("")}</table><br>`;

/** For developers: the slip-result shape is fixed — every key, every case. */
const SLIP_PARSE = "<strong>สำหรับนักพัฒนา — อ่านผลอย่างไร</strong> · <strong>HTTP 200 = ตรวจแล้ว</strong> (ทั้งผ่าน ไม่ผ่าน และรอตรวจ) มีฟิลด์ครบชุดเดียวกันทุกกรณี: <code>success</code> <code>verified</code> <code>result</code> <code>message</code> <code>mismatches</code> <code>warnings</code> <code>carriedFrom</code> <code>carryOver</code> <code>autoCancelled</code> <code>checks</code> <code>slip</code> <code>nextStep</code> <code>transaction</code> — ไม่มีฟิลด์ที่หายไปหรือเพิ่มขึ้นตามกรณี · <strong>อาจเป็น null</strong>: <code>carriedFrom</code> <code>carryOver</code> <code>slip</code> · <strong>อาจเป็น array ว่าง</strong>: <code>mismatches</code> <code>warnings</code> <code>autoCancelled</code> · <code>checks</code> ไม่ว่างเสมอ — แต่ละตัวคือ <code>{check, status, detail}</code>, check: BANK_VERIFICATION · AMOUNT · TRANSFER_TIME · RECEIVER_ACCOUNT · SENDER_NAME · IMAGE_READ · SLIP_AGE · DUPLICATE · APPROVAL (อาจเพิ่มในอนาคต — ข้ามตัวที่ไม่รู้จัก) · status: PASS · FAIL · WARN · UNKNOWN · SKIPPED · <strong>ตัดสินใจด้วย <code>result</code> ตัวเดียว</strong>: <code>PAID</code> → ส่งสินค้าได้ · <code>PENDING_REVIEW</code> → รอ webhook · <code>INVALID_SLIP</code> → แจ้งลูกค้าตาม <code>mismatches</code> · ถ้า <code>carriedFrom</code> ไม่ใช่ null ให้บันทึกความเชื่อมโยง และปิดออเดอร์ใน <code>autoCancelled</code> ในระบบของร้าน (จะได้ webhook <code>payment.rejected</code> ด้วย) · <code>message</code> / <code>detail</code> / <code>nextStep</code> เป็นข้อความภาษาไทยสำหรับแสดงผล อย่า parse · <strong>HTTP ไม่ใช่ 2xx</strong> = ปฏิเสธก่อนตรวจ ใช้รูปแบบ error ปกติ <code>{error:{code,message,details?}}</code> · หน้าชำระเงินของลูกค้า (<code>/payment/checkout/:transactionId/slip</code>) ตอบแบบย่อ: <code>success verified result message mismatches status</code> · <strong>Timeout / เครือข่ายขัดข้อง</strong>: ไม่ได้แปลว่าส่งไม่สำเร็จ — เรียก <code>GET /payment/order/:orderId</code> ก่อน (PAID = จบ · PENDING = ส่งสลิปเดิมเข้าออเดอร์เดิมซ้ำได้อย่างปลอดภัย) · ตั้ง timeout 60 วินาที · ส่งซ้ำเฉพาะ timeout / 502 / 503 / 504 (รอ 2, 5, 15 วินาที) และเซ็นใหม่ทุกครั้ง · <code>409 ORDER_NOT_PENDING</code> หลังส่งซ้ำ = ครั้งก่อนสำเร็จแล้ว · ผลสุดท้ายยึด webhook";
/** How every slip upload is checked (slip/verify, :ref/slip, checkout slip). */
const SLIP_RULES = "<strong>การตรวจสลิป</strong> — (1) <strong>สลิปตัวอย่าง</strong>จาก Option Pay → <code>400 SAMPLE_SLIP</code> · (2) <strong>สลิปซ้ำ</strong>: สลิปเดียวกัน (ไฟล์เดียวกัน หรือ QR ธนาคารเดียวกัน) ที่อยู่กับรายการอื่นแล้ว → <code>INVALID_SLIP</code> · (3) <strong>เทียบข้อมูลในสลิปกับรายการ</strong>: ยอดเงินตรงทุกสตางค์ · บัญชีผู้รับ + ธนาคารเป็นบัญชีของรายการ · เวลาโอนหลังสร้างรายการและไม่เก่าเกินกำหนด — ทุกข้อที่ไม่ตรงอยู่ใน <code>mismatches</code> · <strong>เงินโอนจากรายการก่อนหน้า</strong>: สลิปที่โอนก่อนสร้างรายการ ผ่านได้เมื่อร้านเดียวกันมีรายการที่ยังไม่ได้ชำระ (หมดอายุ / ยกเลิก / ยังเปิดอยู่ — รายการที่ยังเปิดจะถูกยกเลิกอัตโนมัติ + webhook <code>payment.rejected</code>) บนบัญชีผู้รับเดียวกัน สร้างก่อนเวลาโอนไม่เกิน 24 ชม. และผู้โอนเป็นลูกค้าคนเดียวกับรายการนั้น (ชื่อ หรือเลขบัญชีผู้โอน) — ผลมี <code>carriedFrom</code> = เลขรายการก่อนหน้า, <code>carryOver</code> = รายละเอียด (fromRef, fromOrderId, fromAmount, fromStatus: EXPIRED / CANCELLED / CANCELLED_AUTOMATICALLY, transferAmount, transferredAt, reason) และ <code>message</code> อธิบายเป็นภาษาไทย · <code>autoCancelled</code> = รายการที่ถูกยกเลิกอัตโนมัติพร้อมเหตุผล (ว่าง = ไม่มี) · <strong>ทุกผลลัพธ์ของการแนบสลิป</strong>มี <code>checks</code> = ผลการตรวจทีละข้อ (BANK_VERIFICATION, AMOUNT, TRANSFER_TIME, RECEIVER_ACCOUNT, SENDER_NAME, SLIP_AGE, DUPLICATE · status: PASS / FAIL / WARN / UNKNOWN / SKIPPED พร้อมคำอธิบาย), <code>slip</code> = ข้อมูลจากธนาคาร (ยอด เวลาโอน เลขอ้างอิง ผู้โอน ผู้รับ — null ถ้าตรวจกับธนาคารไม่ได้) และ <code>nextStep</code> = สิ่งที่ร้านควรทำต่อ · <strong>สลิปเดียวกันที่เคยไม่ผ่าน</strong>ในรายการอื่นของร้านที่ยังเปิดอยู่ (เช่น โอน ฿500 ให้รายการ ฿250 แล้วผ่านในรายการใหม่ ฿500): รายการนั้นถูกยกเลิกอัตโนมัติ + webhook <code>payment.rejected</code> · <strong>ชื่อผู้โอน</strong>ไม่ตรงกับ <code>metadata.memberName</code> (เช่น สามีโอนแทนภรรยา) <strong>ไม่ปฏิเสธ</strong> — แจ้งใน <code>warnings</code> และยังอนุมัติได้ · <strong>มีผู้ให้บริการตรวจสลิป</strong> (EasySlip / SlipOK ในตั้งค่าระบบ): ตรวจกับธนาคารจริง ผ่านครบ → <code>PAID</code> อัตโนมัติ (เว้นแต่ตั้ง “ต้องให้ผู้ดูแลยืนยันก่อน”) · <strong>ไม่มีผู้ให้บริการ / ผู้ให้บริการไม่ตอบ</strong>: ระบบอ่านข้อมูลจากภาพสลิป (OCR ไทย+อังกฤษ) — ยอด บัญชีผู้รับ หรือเวลาไม่ตรง → <code>INVALID_SLIP</code> · ตรงครบ หรืออ่านไม่ได้ → <code>PENDING_REVIEW</code> ให้ผู้ดูแลยืนยัน (<strong>ไม่อนุมัติอัตโนมัติ</strong> เพราะภาพแก้ไขได้) · ชื่อผู้โอน/ธนาคารที่ยืนยันจากภาพไม่ได้ จะแจ้งผู้ดูแลแทนการปฏิเสธ · <strong>Errors</strong>: ไฟล์ไม่ใช่รูป/ใหญ่เกิน → <code>400 INVALID_SLIP</code> · ออเดอร์ไม่ PENDING → <code>409 ORDER_NOT_PENDING</code> · ไม่พบ orderId → <code>404 ORDER_NOT_FOUND</code>";

export const SECTIONS: Section[] = [
  {
    id: "payment", nav: "Payment", title: "Payment",
    sub: "สร้าง Payment + QR สำหรับลูกค้า scan จ่าย — ระบบตรวจเงินเข้าผ่าน slip/SMS/Telegram แล้วยิง webhook กลับ · สถานะ: <code>PENDING | PAID | EXPIRED | CANCELLED | REFUNDED</code>",
    eps: [
      {
        m: "POST", p: "/payment/create", d: "สร้าง Payment (QR PromptPay)", auth: KEY,
        body: `{
  "amount": 100.00,            // required, > 0 (ทศนิยมไม่เกิน 2 ตำแหน่ง)
  "orderId": "ORD-001",        // optional — เลขออเดอร์ของร้าน ต้องไม่ซ้ำภายในร้าน (ซ้ำ = 409 DUPLICATE_ORDER_ID)
                               //            ไม่ส่ง = Option Pay สร้างให้ (OP-…) ไม่ซ้ำแน่นอน → ดูใน transaction.orderId และ orderIdGenerated: true
  "description": "สินค้า A",    // optional
  "metadata": {                                // optional ทั้ง block
    "senderAccountNumber": "1234567890",       // เลขบัญชีผู้โอน (≥8 หลักถ้าส่ง)
    "senderBankCode": "SCB",                   // ธนาคารผู้โอน
    "memberName": "สมชาย ใจดี",                // ชื่อลูกค้า (ชื่อผู้โอนในสลิปไม่ตรง = แจ้งใน warnings ไม่ปฏิเสธ)
    "memberNameEn": "Mr. A",                   // optional
    "customerId": "CUST-9"                     // id ลูกค้าฝั่งร้าน, optional
  },
  "bankAccountId": 12          // optional — ต้องเป็นบัญชีของร้าน หรือบัญชีกลาง
}`,
        res: `{
  "success": true,
  "orderIdGenerated": false,   // true = ไม่ได้ส่ง orderId มา Option Pay สร้างให้ (เช่น "OP-MGQ3K7ZB-9F1C2A7D4E") — เก็บ transaction.orderId ไว้
  "transaction": ${TXN.replace(/\n/g, "\n  ")},
  "selectedAccount": { "id": "8", "type": "BANK", "accountNumber": "1234567890",
                       "accountName": "บริษัท ตัวอย่าง จำกัด", "bankCode": "SCB", "bankName": "ธนาคารไทยพาณิชย์" }
}

// บัญชีรับเงินที่มี PromptPay: "paymentMethod": "PROMPTPAY", "qrCode": "{BASE}/payment/qr/{id}.png",
// "selectedAccount": { "type": "PROMPTPAY", "accountNumber": "0812345678", ... }`,
        note: PAYMENT_CREATE_FIELDS_HTML + "<strong>แสดงยอดจาก response เสมอ</strong> — ถ้าเปิด “ยอดไม่ซ้ำ” ในตั้งค่าระบบ <code>amount</code> จะถูกบวกสตางค์เพื่อจับคู่เงินเข้าอัตโนมัติ (ถ้าลูกค้าโอนยอดที่ร้านส่งมาโดยไม่รวมสตางค์ ระบบยังยอมรับเมื่อธนาคารยืนยันสลิป และปรับ <code>amount</code> เป็นยอดที่ได้รับจริง) · บัญชีรับเงิน: บัญชีของร้านก่อน ถ้าไม่มีใช้บัญชีกลางตามการกระจายที่ตั้งไว้ · อายุออเดอร์ตาม “อายุออเดอร์ (นาที)” · <strong>Errors</strong>: orderId ซ้ำ → <code>409 DUPLICATE_ORDER_ID</code> · ช่องสตางค์เต็ม → <code>400 DUPLICATE_PENDING_AMOUNT</code> · ยอดต่ำกว่ายอดฝากขั้นต่ำ → <code>400 PAYMENT_CONTRACT_POLICY_VIOLATION</code> (<code>details.error: below_min_amount</code> + <code>minAmount</code>) · ไม่มีบัญชีรับเงิน → <code>400 NO_PAYMENT_ACCOUNT</code> · ขาด field → <code>400 validation_error</code>",
      },
      {
        m: "POST", p: "/payment/slip/create", d: "สร้าง Payment (สลิป) — เปิดออเดอร์รอแนบสลิป", auth: `${KEY} + <code>Content-Type: application/json</code>`,
        body: `{
  "amount": 250.00,           // required
  "orderId": "ORD-002",       // optional, unique ต่อ merchant — ไม่ส่ง = Option Pay สร้างให้ (OP-…)
  "description": "สินค้า B",   // optional
  "image": "<base64>",        // optional — แนบสลิปมาเลย = create + verify ในคำขอเดียว
  "mime": "image/jpeg"        // image/png | image/jpeg | image/webp
}`,
        res: `{ "success": true, "transaction": { ... เหมือน /payment/create ... }, "selectedAccount": { ... } }`,
        note: "<strong>ไม่บวกสตางค์</strong> — <code>amount</code> ที่ตอบกลับเท่ากับที่ส่งมาเสมอ · ถ้าส่ง <code>image</code> มาด้วย response จะเป็นแบบ /payment/slip/verify · Errors เหมือน /payment/create",
      },
      {
        m: "POST", p: "/payment/slip/verify", d: "ยืนยันสลิป (Slip Verification) — ตรวจแล้ว mark PAID", auth: KEY,
        body: `{
  "orderId": "ORD-002",     // required
  "image": "<base64>",      // required, ไม่เกิน 8 MB
  "mime": "image/jpeg"      // required: image/png | image/jpeg | image/webp
}`,
        res: `// ทุกผลลัพธ์ของการตรวจสลิปตอบ HTTP 200 และมีฟิลด์ครบชุดเดียวกันเสมอ (กรณีปกติ / เงินโอนจากออเดอร์ก่อนหน้า / ไม่ผ่าน / รอตรวจ)
// HTTP ไม่ใช่ 2xx = ถูกปฏิเสธก่อนตรวจ → { "error": { "code", "message", "details"? } }

// ① กรณีปกติ — ผ่าน อนุมัติอัตโนมัติ
{
  "success": true,                 // false เฉพาะ INVALID_SLIP
  "verified": true,                // true เฉพาะ PAID
  "result": "PAID",                // PAID | PENDING_REVIEW | INVALID_SLIP  ← ใช้ตัวนี้ตัดสินใจ
  "message": "ตรวจสลิปผ่าน — ออเดอร์ชำระแล้ว (อนุมัติอัตโนมัติ)",
  "mismatches": [],                // string[] — ข้อที่ไม่ผ่าน (มีค่าเมื่อ INVALID_SLIP)
  "warnings": [],                  // string[] — คำเตือนที่ไม่ทำให้ไม่ผ่าน (เช่น ชื่อผู้โอนไม่ตรง)
  "carriedFrom": null,             // string | null — ref ออเดอร์ก่อนหน้าที่เงินโอนนี้มาจาก
  "carryOver": null,               // object | null — รายละเอียดของ carriedFrom
  "autoCancelled": [],             // object[] — ออเดอร์อื่นที่ถูกยกเลิกอัตโนมัติ
  "checks": [                      // object[] — ไม่ว่างเสมอ · ผลการตรวจทีละข้อ
    { "check": "BANK_VERIFICATION", "status": "PASS", "detail": "ธนาคารยืนยันว่ามีการโอนจริง (easyslip) · เลขอ้างอิง 016287100512BTF04211" },
    { "check": "AMOUNT",            "status": "PASS", "detail": "ยอดในสลิป ฿250.00 ตรงกับยอดออเดอร์" },
    { "check": "TRANSFER_TIME",     "status": "PASS", "detail": "โอนเมื่อ 14 ต.ค. 2569 10:05 — หลังสร้างออเดอร์ (14 ต.ค. 2569 10:01)" },
    { "check": "RECEIVER_ACCOUNT",  "status": "PASS", "detail": "โอนเข้า SCB xxx-x-x6378-x — ตรงกับบัญชีของออเดอร์ (SCB 1234567890 (บจก. ตัวอย่าง))" },
    { "check": "SENDER_NAME",       "status": "PASS", "detail": "ผู้โอน นาย สมชาย ใจดี ตรงกับชื่อลูกค้า" },
    { "check": "SLIP_AGE",          "status": "PASS", "detail": "ไม่เก่าเกิน 6 ชั่วโมง" },
    { "check": "DUPLICATE",         "status": "PASS", "detail": "สลิปและเงินโอนนี้ยังไม่เคยใช้ชำระรายการอื่น" }
  ],
  "slip": {                        // object | null — ข้อมูลจากธนาคาร (null = ตรวจกับธนาคารไม่ได้)
    "provider": "easyslip", "transRef": "016287100512BTF04211", "amount": 250,
    "transferredAt": "2026-10-14T03:05:00.000Z",
    "sender":   { "name": "นาย สมชาย ใจดี", "bank": "KBANK", "account": "xxx-x-x1234-x" },
    "receiver": { "name": "บจก. ตัวอย่าง",  "bank": "SCB",   "account": "xxx-x-x6378-x" }
  },
  "nextStep": "ไม่ต้องทำอะไรเพิ่ม — ออเดอร์ชำระแล้ว ส่งสินค้า/บริการได้",
  "transaction": { ... "ref": "TXN100017", "orderId": "ORD-002", "status": "PAID", "paidAt": "2026-10-14T03:05:20.000Z" ... }
}

// ② เงินโอนจากออเดอร์ก่อนหน้า (ฟิลด์เหมือน ① ทุกตัว — ต่างกันแค่ค่า)
//    ลูกค้าเปิด TXN100016 ยอด ฿250 โอนมา ฿200 → ร้านเปิด TXN100017 ยอด ฿200 แล้วแนบสลิปเดิม
{
  "success": true, "verified": true, "result": "PAID",
  "message": "ตรวจสลิปผ่าน — ออเดอร์ชำระแล้ว (อนุมัติอัตโนมัติ) · ใช้เงินโอน 200.00 บาท (โอนเมื่อ 14 ต.ค. 2569 10:05) จากออเดอร์ก่อนหน้า TXN100016 (ORD-001) ยอด 250.00 บาท ที่ยังไม่ได้ชำระ — ลูกค้าคนเดียวกัน บัญชีผู้รับเดียวกัน · ยกเลิก TXN100016 (ORD-001) อัตโนมัติ — ลูกค้าชำระผ่าน TXN100017 แทน (ใช้เงินโอนเดียวกัน)",
  "mismatches": [],
  "warnings": [],
  "carriedFrom": "TXN100016",
  "carryOver": {
    "fromRef": "TXN100016", "fromOrderId": "ORD-001", "fromAmount": 250,
    "fromStatus": "CANCELLED_AUTOMATICALLY",   // EXPIRED | CANCELLED | CANCELLED_AUTOMATICALLY (ยังเปิดอยู่ → ถูกปิดตอนนี้)
    "transferAmount": 200, "transferredAt": "2026-10-14T03:05:00.000Z",
    "reason": "เงินโอนนี้เกิดขึ้นหลังสร้างออเดอร์ก่อนหน้าของลูกค้าคนเดียวกัน (บัญชีผู้รับเดียวกัน) ซึ่งยังไม่ได้ชำระ และยังไม่เคยใช้ชำระออเดอร์ใด จึงใช้ชำระออเดอร์นี้แทน"
  },
  "autoCancelled": [
    { "ref": "TXN100016", "orderId": "ORD-001", "amount": 250, "reason": "ลูกค้าชำระผ่าน TXN100017 แทน (ใช้เงินโอนเดียวกัน)" }
  ],
  "checks": [
    { "check": "BANK_VERIFICATION", "status": "PASS", "detail": "..." },
    { "check": "AMOUNT",            "status": "PASS", "detail": "ยอดในสลิป ฿200.00 ตรงกับยอดออเดอร์" },
    { "check": "TRANSFER_TIME",     "status": "PASS", "detail": "โอนเมื่อ 14 ต.ค. 2569 10:05 — ก่อนสร้างออเดอร์ (14 ต.ค. 2569 10:20) — แต่เป็นเงินโอนของออเดอร์ก่อนหน้า TXN100016 ที่ยังไม่ได้ชำระ (ลูกค้าคนเดียวกัน) จึงใช้แทนได้" },
    { "check": "RECEIVER_ACCOUNT",  "status": "PASS", "detail": "..." },
    { "check": "SENDER_NAME",       "status": "PASS", "detail": "..." },
    { "check": "SLIP_AGE",          "status": "PASS", "detail": "อยู่ในช่วง 24 ชั่วโมงของเงินโอนจากออเดอร์ก่อนหน้า" },
    { "check": "DUPLICATE",         "status": "PASS", "detail": "สลิปและเงินโอนนี้ยังไม่เคยใช้ชำระรายการอื่น" }
  ],
  "slip": { ... เหมือน ① ... },
  "nextStep": "ไม่ต้องทำอะไรเพิ่ม — ออเดอร์ชำระแล้ว ส่งสินค้า/บริการได้ · บันทึกว่าออเดอร์นี้ชำระด้วยเงินโอนของ TXN100016 · อัปเดตออเดอร์ TXN100016 เป็นยกเลิกในระบบของร้าน",
  "transaction": { ... "ref": "TXN100017", "status": "PAID" ... }
}

// ③ สลิปไม่ผ่าน (HTTP 200 เช่นกัน · ออเดอร์ยัง PENDING แนบใหม่ได้)
{
  "success": false, "verified": false, "result": "INVALID_SLIP",
  "message": "ยอดเงินในสลิป ฿200.00 ไม่ตรงกับยอดที่ต้องชำระ ฿250.00 — ต้องโอนตรงยอดทุกสตางค์",
  "mismatches": [ "ยอดเงินในสลิป ฿200.00 ไม่ตรงกับยอดที่ต้องชำระ ฿250.00 — ต้องโอนตรงยอดทุกสตางค์" ],
  "warnings": [],
  "carriedFrom": null, "carryOver": null, "autoCancelled": [],
  "checks": [
    { "check": "BANK_VERIFICATION", "status": "PASS", "detail": "..." },
    { "check": "AMOUNT",            "status": "FAIL", "detail": "ยอดในสลิป ฿200.00 แต่ออเดอร์ต้องชำระ ฿250.00 (โอนขาด ฿50.00)" },
    ...
  ],
  "slip": { ... },
  "nextStep": "สลิปไม่ผ่าน — แจ้งลูกค้าตามข้อที่ FAIL ใน checks แล้วแนบสลิปที่ถูกต้องใหม่ (ออเดอร์ยังรอชำระ) · ถ้าลูกค้าโอนยอดไม่ตรง สร้างออเดอร์ใหม่ตามยอดที่โอนจริงแล้วแนบสลิปเดิมได้",
  "transaction": { ... "status": "PENDING" ... }
}

// ④ PENDING_REVIEW (ตรวจกับธนาคารไม่ได้ / ตั้งให้เจ้าหน้าที่ยืนยัน): success true, verified false,
//    slip = null ได้, BANK_VERIFICATION = UNKNOWN · รอ webhook payment.approved / payment.rejected`,
        note: `${SLIP_COMPARE_HTML}<br>${SLIP_PARSE}<br><br>${SLIP_RULES}`,
      },
      { m: "POST", p: "/payment/:ref/slip", d: "แนบสลิปเข้าออเดอร์ตาม ref หรือ transaction id — shape เดิม", auth: KEY, body: `{ "image": "<base64>", "mime": "image/png" }`, res: "เหมือน /payment/slip/verify", note: "ตรวจสลิปตามกฎเดียวกับ /payment/slip/verify · แนบทับสลิปเดิมได้ (หน้าชำระเงินของลูกค้าแนบได้ครั้งเดียว)" },
      {
        m: "GET", p: "/payment/validation-report", d: "รายงานผลการตรวจ (อนุมัติ / ไม่อนุมัติ) พร้อมเหตุผลและข้อมูลจากธนาคาร", auth: KEY,
        body: `// Query — อย่างน้อย 1 ใน refs / batch / date / start_time (ใช้ร่วมกันได้ = ต้องตรงทุกเงื่อนไข) · ไม่เกิน 100 รายการต่อครั้ง
refs=TXN100015%2CTXN100030%2CORD-001   // เลขที่ TXN… หรือ orderId คั่นด้วย , — ส่ง , เป็น %2C (ลายเซ็นใช้ URL ตามที่ส่ง)
batch=shop-2026-10-14               // ป้ายกลุ่มรายการที่ Option Pay ตั้งให้ (เช่น ชุดที่ตรวจซ้ำพร้อมกัน)
date=2026-10-14                        // รายการที่สร้างวันนั้น (เวลาไทย)
source=API                             // ช่องทางที่สร้าง: API (/payment/create) · SLIP (/payment/slip/create) · COLLECT · PORTAL
start_time=16%3A52%3A49                // สร้างตั้งแต่ (HH:MM[:SS] คู่กับ date หรือ ISO เช่น 2026-10-14T16%3A52%3A00%2B07%3A00) — ส่ง : เป็น %3A
end_time=17%3A04%3A10                  // สร้างถึง (รวมทั้งวินาที/นาทีนั้น)`,
        res: `{
  "success": true,
  "report": "payment validation — Sub Shop A", "generatedAt": "2026-10-15T09:10:00+07:00",
  "summary": { "total": 39, "approved": 34, "notApproved": 5, "notApprovedWithSlip": 1, "noSlipSent": 4 },   // + "notFound": [...] ถ้ามี ref ที่ไม่พบ
  "howVerified": "...",
  "orders": [                                   // อนุมัติก่อน แล้วตามด้วยไม่อนุมัติ
    {
      "ref": "TXN100015", "orderId": "PD-01a139…", "customer": "คชาภรณ์ หันจันทร์",
      "decision": "APPROVED",                   // APPROVED | NOT_APPROVED
      "currentStatus": "PAID",                  // PAID | PENDING | EXPIRED | CANCELLED | REFUNDED
      "amounts": { "orderAmount": 500, "fee": 8, "netAmount": 492 },
      "receivingAccount": "SCB 1234567890 (บริษัท ตัวอย่าง จำกัด)",
      "timeline": { "orderCreated": "…+07:00", "slipUploaded": "…", "approvedAt": "…", "approvedBy": "system" },
      "bankVerification": {                     // null = ยังไม่มีสลิป · { verified:false|null, message } = ธนาคารยืนยันไม่ได้
        "source": "EasySlip (bank) — slip image", "verified": true,
        "bankReference": "016287165305BOR04572", "transferredAt": "2026-10-14T16:53:05+07:00", "amount": 500,
        "sender":   { "name": "น.ส. คชาภรณ์ ห", "bank": "KBANK", "account": "xxx-x-x5004-x" },
        "receiver": { "name": "บริษัท มิดทาวน์ไลท์ จ", "bank": "SCB", "account": "xxx-x-x8637-x" }
      },
      "checks": [ { "check": "BANK_VERIFICATION", "status": "PASS", "detail": "…" },
                  { "check": "AMOUNT", "status": "PASS", "detail": "…" }, … ],   // PASS | FAIL | WARN | UNKNOWN | SKIPPED
      "reason": "The bank confirmed a real transfer of ฿500.00 …",
      "reason_th": "ธนาคารยืนยันการโอนจริง ฿500.00 … ผ่านทุกข้อ จึงอนุมัติ"
    }
  ]
}`,
        note: "<strong>คู่มือเต็ม พร้อมวิธีได้มาของทุก parameter และตัวอย่างที่ใช้งานได้จริง:</strong> Merchant Portal → คู่มือ API → <a href=\"/merchant/docs/api#validation-report\">รายงานผลการตรวจสลิป</a> · ข้อมูลธนาคารดึงใหม่จากผู้ให้บริการตรวจสลิปทุกครั้งที่เรียก — <strong>ใช้โควตา 1 ครั้งต่อสลิป</strong> และใช้เวลาประมาณ 10–20 วินาทีต่อ 40 รายการ (ตั้ง timeout 180 วินาที) · เฉพาะรายการของร้านนี้ (ร้านแม่ใช้ <code>X-Sub-Merchant</code> ดูร้านย่อยได้) · สิทธิ์ <code>view_transactions</code> · Errors: ไม่ระบุ refs/date → <code>400 validation_error</code> · เกิน 100 รายการ → <code>400 TOO_MANY_ORDERS</code>",
      },
      { m: "GET", p: "/payment/order/:orderId", d: "ตรวจสอบ Payment ตาม Order ID", auth: KEY, res: `{ "success": true, "transaction": { ... } }`, note: "404 <code>ORDER_NOT_FOUND</code> ถ้าไม่พบ" },
      {
        m: "GET", p: "/payment/checkout/:transactionId", d: "Checkout Page Data (ไม่ต้องส่ง API Key)", auth: "ไม่ต้องมี key — transaction id เป็นความลับของลูกค้าคนนั้น",
        res: `{
  "success": true,
  "transaction": { "id": "...", "orderId": "ORD-001", "amount": 100.07, "status": "PENDING",
                   "qrExpiry": "...", "paymentMethod": "PROMPTPAY", "copy": { "amount": "100.07" } },
  "merchant": { "name": "ร้าน ABC" },
  "account": { "bankCode": "KBANK", "bankName": "...", "accountName": "...", "accountNumber": "...", "promptPayId": "0812345678" },
  "qrPayload": "00020101021229370016A000000677010111...",   // EMVCo PromptPay (null เมื่อไม่ PENDING)
  "customerName": "สมชาย ใจดี",   // ชื่อผู้โอนที่คาด (ไม่ตรง = warnings ไม่ปฏิเสธ · null = ไม่ตรวจ)
  "hasSlip": false,               // เคยแนบสลิปแล้วหรือยัง
  "slipLocked": false,            // true = มีสลิปที่รับแล้ว/รอตรวจ — แนบเพิ่มไม่ได้
  "slipProblems": null            // สลิปล่าสุดไม่ผ่าน: รายการเหตุผล (แนบใหม่ได้)
}`,
        note: "หน้าชำระเงินสำเร็จรูปสำหรับลูกค้า: <code>{SITE}/c?t={transactionId}</code> — แสดงยอด บัญชีรับเงิน นับถอยหลัง แนบสลิป แนวทางการแนบสลิป ปุ่มดาวน์โหลดตัวอย่างสลิป (JPG) และอัปเดตสถานะอัตโนมัติ",
      },
      {
        m: "POST", p: "/payment/checkout/:transactionId/slip", d: "ลูกค้าแนบสลิปจากหน้าชำระเงิน (ไม่ต้องส่ง API Key)", auth: "ไม่ต้องมี key — transaction id เป็นความลับของลูกค้าคนนั้น",
        body: `{ "image": "<base64>", "mime": "image/jpeg" }   // png | jpeg | webp, ไม่เกิน 8 MB`,
        res: `{ "success": true, "verified": false, "result": "PENDING_REVIEW", "message": "...", "mismatches": [], "status": "PENDING" }   // แบบย่อ — ฟิลด์ชุดนี้เสมอ`,
        note: "ตรวจตามกฎเดียวกับ /payment/slip/verify · <strong>แนบได้ครั้งเดียวต่อรายการ</strong> — มีสลิปที่รับแล้ว/รอตรวจอยู่ → <code>409 SLIP_ALREADY_UPLOADED</code> (แนบใหม่ได้เฉพาะเมื่อสลิปก่อนหน้าไม่ผ่าน) · สลิปตัวอย่าง → <code>400 SAMPLE_SLIP</code>",
      },
      { m: "GET", p: "/payment/qr/:token.png", d: "รูป QR ของออเดอร์ (PNG, ไม่ต้องส่ง API Key)", auth: "ไม่ต้องมี key", res: "image/png (480×480)", note: "ตอบ <code>410</code> เมื่อออเดอร์ไม่ PENDING แล้ว หรือบัญชีรับเงินไม่มี PromptPay" },
      {
        m: "POST", p: "/collect", d: "สร้าง Payment (ชื่อเดิม) — เหมือน /payment/create", auth: KEY,
        body: `{ "amount": 150, "orderId": "ORD-004" }   // ไม่มีฟิลด์ key ใน body แล้ว`, res: "เหมือน /payment/create",
        note: "ใช้ header และลายเซ็นเหมือนทุก endpoint (<code>X-API-Key</code> + <code>X-Timestamp</code> + <code>X-Signature</code>) · ส่ง <code>key</code> ใน body ไม่ได้แล้ว · ระบบใหม่ใช้ <code>/payment/create</code> แทนได้เลย",
      },
    ],
  },
  {
    id: "transactions", nav: "Transactions", title: "Transactions (ประวัติ)",
    eps: [
      { m: "GET", p: "/transactions", d: "รายการ Transactions ทั้งหมด", auth: KEY, res: LIST("{ ...transaction }"), note: QS },
      { m: "GET", p: "/transactions/:id", d: "ดู Transaction ตาม transaction id (หรือ ref TXN…)", auth: KEY, res: `{ "success": true, "transaction": { ... } }` },
      { m: "PATCH", p: "/transactions/:id/cancel", d: "ยกเลิก Transaction", auth: KEY, res: `{ "success": true, "transaction": { ... "status": "CANCELLED" } }`, note: "ยกเลิกได้เฉพาะ PENDING / EXPIRED — อื่น ๆ ได้ <code>409 ORDER_NOT_PENDING</code> · ยิง webhook <code>payment.rejected</code>" },
    ],
  },
  {
    id: "payout", nav: "Payout", title: "Payout (โอนเงินออก)",
    sub: "สั่งโอนเงินออกจากยอดของร้าน — <strong>อนุมัติอัตโนมัติทันทีที่สร้าง</strong>: ตอบ <code>status: COMPLETED</code> (อนุมัติแล้ว) พร้อม <code>completedAt</code> และ<strong>หักยอด amount + fee จากร้านทันที</strong> · ทีม Option Pay โอนเงินให้ผู้รับต่อจากนั้น (ติดตามที่หน้ารายการเงินออกของผู้ดูแล) · สถานะไม่เปลี่ยนอีก — ไม่มีการคืนยอดอัตโนมัติ · <code>/payout/create</code> และ <code>/payout/bulk</code> ทำงานแบบเดียวกัน · ร้านดูรายการได้ที่ Merchant Portal → <strong>รายการโอนออก</strong> และ <code>GET /payout/:id</code> / <code>GET /payout/ref/:merchantRef</code> · ไม่มี webhook สำหรับ payout",
    eps: [
      {
        m: "POST", p: "/payout/create", d: "สร้าง Payout — รองรับ Idempotency-Key header", auth: `${KEY} + <code>Idempotency-Key</code> (optional)`,
        body: `{
  "amount": 500.00,             // required
  "bankCode": "SCB",            // required — รหัสธนาคาร (31 ธนาคาร): SCB BAY KKP KTB UOB HSBC GHB TISCO BBL KBANK CIMB GSB BAAC LHBANK MHCB TTB CITI SCBT ISBT ACL TCRB ANZ SMTB SMEB ABN TRUEMONEY ICBC SMBC BOC DB IOB
  "accountNumber": "1234567890",// required, 6–20 หลัก — ใส่ขีด/เว้นวรรคได้ (เช่น "123-4-56789-0") ระบบตัดออกให้
  "accountName": "นาย ก",        // required
  "merchantRef": "PO-001",      // optional, unique ต่อ merchant
  "description": "ค่าสินค้า"      // optional
}`,
        res: `{ "success": true, "payout": ${PAYOUT} }`,
        note: "ส่ง Idempotency-Key เดิมซ้ำ = ได้ payout เดิมกลับมา (<code>idempotent: true</code>) ไม่สร้างซ้ำ · <strong>Errors</strong>: ยอดใช้ได้ไม่พอ → <code>400 INSUFFICIENT_BALANCE</code> · ทำให้เหลือต่ำกว่ายอดคงเหลือขั้นต่ำ → <code>400 below_min_balance</code> · ต่ำกว่ายอดถอนขั้นต่ำ → <code>400 below_min_amount</code> · merchantRef ซ้ำ → <code>409 DUPLICATE_MERCHANT_REF</code>",
      },
      { m: "GET", p: "/payout/:id", d: "ดู Payout ตาม id (OUT…)", auth: KEY, res: `{ "success": true, "payout": { ... } }` },
      { m: "GET", p: "/payout/ref/:merchantRef", d: "ดู Payout ตาม merchantRef", auth: KEY, res: `{ "success": true, "payout": { ... } }` },
      { m: "GET", p: "/payouts", d: "รายการ Payouts", auth: KEY, res: LIST("{ ...payout }"), note: QS },
      { m: "POST", p: "/payout/bulk", d: "Bulk Payout — สูงสุด 100 รายการ/ครั้ง", auth: KEY, body: `{ "payouts": [ { ...เหมือน /payout/create... }, ... ] }`, res: `{ "success": false, "created": 99, "failed": 1,
  "results": [ { "index": 0, "success": true, "payout": { ... } },
               { "index": 7, "success": false, "error": { "code": "INSUFFICIENT_BALANCE", "message": "..." } } ] }`, note: "แต่ละรายการทำแยกกัน — รายการที่ผ่านไม่ถูกยกเลิกเพราะรายการอื่นล้ม" },
    ],
  },
  {
    id: "withdrawal", nav: "Withdrawal", title: "Withdrawal Request (คำขอถอน)",
    sub: "คำขอถอนเงินเข้าบัญชีของร้าน — ผู้ดูแลอนุมัติที่หน้า <strong>คำขอถอนเงิน</strong> · สถานะ: <code>PENDING | APPROVED | REJECTED</code>",
    eps: [
      { m: "POST", p: "/withdrawal/request/create", d: "สร้างคำขอถอนเงิน", auth: KEY, body: `{ "amount": 1000, "bankCode": "KBANK", "accountNumber": "9876543210", "accountName": "นาย ก",
  // bankCode: รหัสธนาคารชุดเดียวกับ /payout/create (31 ธนาคาร) · accountNumber 6–20 หลัก ใส่ขีด/เว้นวรรคได้
  "merchantRef": "W-001",   // optional, unique ต่อ merchant
  "note": "ถอนประจำวัน" }`, res: `{ "success": true, "request": ${WDR} }`, note: "ตรวจยอดใช้ได้ / ยอดคงเหลือขั้นต่ำ / ยอดถอนขั้นต่ำ เหมือน payout" },
      { m: "GET", p: "/withdrawal/requests", d: "รายการคำขอถอนเงิน", auth: KEY, res: LIST("{ ...request }"), note: QS },
      { m: "GET", p: "/withdrawal/request/:ref", d: "ดูคำขอตาม requestRef หรือ merchantRef — shape เดิม", auth: KEY, res: `{ "success": true, "request": { ... } }` },
    ],
  },
  {
    id: "accounts", nav: "Payment Accounts", title: "Payment Accounts (บัญชีรับเงิน)",
    sub: "บัญชีรับเงินของร้าน — 1 บัญชีใช้ร่วมได้หลายร้าน (ผู้ดูแลระบบเป็นผู้ผูก): <code>shared: true</code> = บัญชีนี้ร้านอื่นใช้ด้วย · การใช้บัญชีร่วม<strong>ไม่เปลี่ยนยอด</strong> — <code>amount</code> เท่ากับที่ส่งมา (บวกสตางค์เฉพาะเมื่อผู้ดูแลเปิด “ยอดไม่ซ้ำ” ในตั้งค่าระบบ — แสดง <code>copy.amount</code> จาก response ให้ลูกค้าเสมอ) · ร้านย่อยที่ไม่มีบัญชีของตัวเองใช้บัญชีของร้านแม่ · ถ้าร้านไม่มีบัญชีของตัวเอง ออเดอร์จะใช้บัญชีกลางของระบบ (เมื่อเปิดโหมดบัญชีรับเงินกลาง)",
    eps: [
      { m: "GET", p: "/payment/accounts", d: "รายการบัญชีรับเงิน", auth: KEY, res: `{ "success": true, "data": [ { "id": "7", "type": "PROMPTPAY", "accountNumber": "0812345678", "shared": false, "bankCode": "KBANK", "status": "ACTIVE" } ],
  "centralReceiving": true, "note": null }` },
      { m: "POST", p: "/payment/accounts", d: "เพิ่มบัญชีรับเงิน — ถ้าบัญชีนี้ผูกกับร้านนี้อยู่แล้ว จะคืนบัญชีเดิม · ถ้าเป็นบัญชีของร้านอื่น / บัญชีกลาง ได้ 409 ACCOUNT_EXISTS (ให้ผู้ดูแลระบบผูกให้ — ใช้ร่วมกันได้)", auth: KEY, body: `{
  "type": "BANK",                 // BANK | PROMPTPAY
  "bankCode": "SCB",              // required สำหรับ BANK
  "accountNumber": "1234567890",  // required สำหรับ BANK
  "accountName": "บจก. เอบีซี",
  "promptPayId": "0812345678"     // required สำหรับ PROMPTPAY (มือถือ 10 หลัก / เลขประจำตัว 13 หลัก)
}`, res: `{ "success": true, "account": { ... } }` },
      { m: "DELETE", p: "/payment/accounts/:id", d: "ลบบัญชีรับเงิน (soft delete → inactive) · บัญชีที่ใช้ร่วมกับร้านอื่น: เลิกผูกเฉพาะร้านนี้ (บัญชียังใช้งานกับร้านอื่น) — ทำไม่ได้ถ้าร้านนี้ยังมีออเดอร์รอชำระบนบัญชีนั้น (409 ACCOUNT_HAS_PENDING_ORDERS) — ยกเว้นบัญชีที่ปิดใช้งานแล้ว", auth: KEY, res: `{ "success": true }                     // บัญชีของร้านนี้ร้านเดียว
{ "success": true, "unlinked": true }   // บัญชีที่ใช้ร่วม — เลิกผูกเฉพาะร้านนี้` },
    ],
  },
  {
    id: "webhooks", nav: "Webhooks", title: "Webhooks",
    sub: "ระบบยิง <code>POST</code> JSON ไปที่ URL ของร้านเมื่อสถานะเปลี่ยน — header 4 ตัวเท่านั้น (ชื่อตัวพิมพ์เล็ก): <code>content-type: application/json</code>, <code>user-agent: OptionPay-Webhook/1.0</code>, <code>x-webhook-event: &lt;event&gt;</code>, <code>x-signature</code> (คำสั่ง curl ของแต่ละ event ดูหัวข้อ “Callback ที่ระบบส่งถึงร้าน” ในคู่มือ API ของ Merchant Portal) พร้อม header <code>X-Signature: t=&lt;unix&gt;,v1=&lt;hex&gt;</code> — เซ็นด้วย <strong>secret key ของร้านที่เป็นเจ้าของรายการ</strong> (<code>sk_live_…</code>) 2 ขั้น: <code>key = HMAC-SHA256(sk_live, t + \".POST.\" + path ของ webhook URL + \".\" + body)</code> แล้ว <code>v1 = HMAC-SHA256(key, t + \".\" + body)</code> (กฎของทุกร้านตั้งแต่ 19 ต.ค. 2569 — รายการของร้านย่อยเซ็นด้วย secret key ของร้านย่อยนั้น แม้ส่งผ่าน webhook ของร้านแม่ · ร้านย่อยที่ยังไม่มี secret key ใช้ของร้านแม่แทน · ไม่มี key เลย = webhook secret <code>whsec_…</code>), <code>X-Webhook-Event: &lt;event&gt;</code> และ <code>User-Agent: OptionPay-Webhook/1.0</code> · ตอบ 2xx = สำเร็จ, ไม่สำเร็จจะลองใหม่ได้สูงสุด 5 ครั้ง (<code>payout.completed</code> / <code>payout.failed</code> ลองใหม่อัตโนมัติ ห่างกัน 5, 10, 15, 20 นาที)",
    eps: [
      { m: "GET", p: "/webhooks", d: "รายการ Webhooks", auth: KEY, res: `{ "success": true, "data": [ { "id": "3", "url": "https://...", "events": ["payment.approved"], "status": "ACTIVE", "secretPrefix": "whsec_AbCdEf…" } ] }` },
      { m: "POST", p: "/webhooks", d: "เพิ่ม Webhook", auth: KEY, body: `{ "url": "https://your-site.com/cb",   // https เท่านั้น
  "events": ["payment.approved", "payment.rejected"] }   // ทั้งหมด: payment.approved · payment.rejected · payment.expired · payment.refunded · payout.completed · payout.failed · withdrawal.approved · withdrawal.completed · withdrawal.rejected`, res: `{ "success": true, "webhook": { "id": "3", "url": "...", "events": [...], "status": "ACTIVE",
  "secret": "whsec_..." } }    // แสดงครั้งเดียว — เก็บไว้ตรวจลายเซ็น`, note: `Payload: <code>{ "event": "payment.approved", "ref": "TXN…", "orderId": "ORD-001", "amount": "100.07", "status": "approved", "createdAt": "…", "resentAt": "…" }</code> (<code>resentAt</code> = เวลาที่ส่ง) · สูงสุด 5 ปลายทางต่อร้าน · ไม่ยิงไปที่อยู่ภายใน (private IP) · <strong>payment.expired / payment.refunded</strong> ใช้ payload เดียวกับ payment.approved (status <code>expired</code> / <code>refunded</code>) · <strong>withdrawal.approved / withdrawal.completed / withdrawal.rejected</strong> ใช้รูปแบบเดียวกับ payout (<code>ref</code> = WDR…, status <code>approved</code> / <code>completed</code> / <code>failed</code>, <code>failureReason</code> = เหตุผลที่ปฏิเสธ) · ผู้ดูแลระบบเปิด/ปิดแต่ละ event ต่อปลายทางได้ · <strong><code>payout.completed</code></strong> — ทีม Option Pay โอนเงิน payout ที่สร้างผ่าน <code>POST /payout/create</code> ให้ผู้รับแล้ว (สถานะในหน้าร้าน: ถอนสำเร็จ) ส่งครั้งเดียวต่อรายการ: <code>{ "event": "payout.completed", "ref": "OUT10153", "orderId": "WD-…", "merchantRef": "WD-…", "amount": "450.00", "status": "completed", "failureReason": null, "createdAt": "2026-10-15T09:29:45.872Z", "completedAt": "2026-10-15T09:40:11.245Z" }</code> — <code>completedAt</code> = เวลาที่โอนเสร็จ · <strong><code>payout.failed</code></strong> — ผู้ดูแลระบบปฏิเสธ payout ที่สร้างผ่าน <code>POST /payout/create</code> (คืนยอด amount + fee เข้ายอดคงเหลือแล้ว): <code>{ "event": "payout.failed", "ref": "OUT10152", "orderId": "WD-…", "merchantRef": "WD-…", "amount": "550.00", "status": "failed", "failureReason": "ยกเลิกโดยผู้ดูแลระบบ", "createdAt": "2026-10-15T02:14:08.819Z", "completedAt": "2026-10-15T06:09:44.502Z" }</code> — <code>orderId</code> = <code>merchantRef</code> ที่ร้านส่งตอนสร้าง · <code>completedAt</code> = เวลาที่ปฏิเสธ · ตรงกับ <code>GET /payout/:id</code> (status <code>FAILED</code>) · payout ของร้านย่อยที่สร้างด้วย key ของร้านแม่ (<code>X-Sub-Merchant</code>) ส่งไปที่ webhook ของร้านที่ใกล้ที่สุดในสายที่สมัคร event นี้ไว้` },
    ],
  },
  {
    id: "misc", nav: "Balance & Profile", title: "Balance & Profile",
    eps: [
      { m: "GET", p: "/balance", d: "ดูยอดเงินคงเหลือ", auth: KEY, res: `{ "success": true, "balance": 80616.01, "availableBalance": 31871.13,
  "reserved": 48744.88,          // ยอดที่กันไว้ของคำขอถอนที่ยังรออนุมัติ (payout ผ่าน API หักยอดทันที จึงไม่อยู่ในนี้)
  "currency": "THB", "minBalance": 50000,
  "minDepositAmount": 100, "minWithdrawAmount": 100 }` },
      { m: "GET", p: "/balance/line-summary", d: "ดูยอดรวม Line (Parent+Children)", auth: KEY, res: `{ "success": true, "parent": { "id": "28", "name": "Siam Holding", "balance": 1234.5 },
  "children": [ { "id": "29", "name": "ตัวแทนภาคเหนือ", "slug": "demo-north", "parentId": "28", "depth": 1, "status": "ACTIVE", "balance": 512.3 }, ... ],
  "total": 98765.43, "currency": "THB" }`, note: "children = ร้านย่อยทุกชั้นใต้ร้านนี้ (depth 1 = ชั้นถัดไป) · total = ยอดคงเหลือของร้านนี้ + ร้านย่อยทั้งหมด · ร้านที่ไม่มีร้านย่อยได้ <code>children: []</code>" },
      { m: "GET", p: "/profile", d: "ดูข้อมูล Merchant", auth: KEY, res: `{ "success": true, "merchant": { "id": "1", "name": "...", "slug": "...", "status": "ACTIVE", "kycStatus": "verified",
  "feePercent": 1.5, "feeFlat": 0,          // ค่าธรรมเนียมเงินเข้า (หักจากยอดที่ลูกค้าโอน)
  "outFeePercent": 1, "outFeeFlat": 10,      // ค่าธรรมเนียมเงินออก (บวกเพิ่มจากยอดถอน / payout)
  "parentId": null,                          // ร้านแม่ (null = ร้านระดับบนสุด)
  "contactEmail": "...", "contactPhone": "...", "createdAt": "..." } }` },
      { m: "GET", p: "/dashboard", d: "Dashboard Stats", auth: KEY, res: `{ "success": true,
  "today": { "paidCount": 12, "paidAmount": 15400, "fee": 231, "createdCount": 15, "payoutAmount": 2000 },
  "pending": { "payments": 3, "payouts": 1 },
  "balance": 80616.01, "availableBalance": 31871.13 }`, note: "“วันนี้” นับตามเวลาไทย (Asia/Bangkok)" },
    ],
  },
  {
    id: "sub-merchants", nav: "Sub-merchants", title: "Sub-merchants (ร้านย่อย)",
    sub: "ร้านสร้างร้านย่อยได้ไม่จำกัด และร้านย่อยสร้างร้านย่อยต่อได้ (เป็นต้นไม้) · ร้านย่อยใหม่มีสถานะ <code>PENDING</code> จนกว่าผู้ดูแลระบบอนุมัติ · อัตราค่าธรรมเนียมของร้านย่อยต้องไม่ต่ำกว่าของร้านแม่ — ร้านแม่ได้ส่วนต่างจากทุกรายการ (ดูคู่มือร้านค้า หัวข้อ ร้านย่อย) · อ่านข้อมูลได้ทุกชั้นใต้ร้าน แก้ไขได้เฉพาะร้านย่อยชั้นถัดไป · <b>X-Sub-Merchant</b>: ส่ง header <code>X-Sub-Merchant: &lt;id&gt;</code> พร้อม key ของร้านแม่ เพื่อเรียก endpoint ใดก็ได้ในนามร้านย่อยนั้น (ลายเซ็นเหมือนเดิม)",
    eps: [
      { m: "GET", p: "/sub-merchants", d: "รายชื่อร้านย่อยทุกชั้นใต้ร้านนี้ พร้อมยอดคงเหลือ ยอดขายสะสม และค่าคอมที่ร้านนี้ได้จากแต่ละร้าน", auth: KEY,
        res: `{ "success": true, "total": 9, "subMerchants": [ { "id": "29", "name": "ตัวแทนภาคเหนือ", "parentId": "28", "depth": 1, "status": "ACTIVE",
  "feePercent": 2, "outFeePercent": 0.8, "balance": 512.3, "paidTotal": 9800, "commissionToMe": 49, "childCount": 2, "owner": { ... } }, ... ] }` },
      { m: "GET", p: "/sub-merchants/overview", d: "ภาพรวมร้านย่อยทั้งหมด (หรือร้านเดียวด้วย ?shop=<id>) — ยอดรวม แนวโน้มรายวัน และตัวเลขรายร้าน · ?days=7|30|90 (ค่าเริ่มต้น 30)", auth: KEY,
        res: `{ "success": true, "days": 30, "shop": null,
  "totals": { "shops": 9, "active": 8, "pending": 1, "paidAmount": 123456, "paidCount": 98, "feesPaid": 3141.2, "outAmount": 5000, "outFees": 70,
              "commissionToMe": 1234.5, "balance": 117000.12, "pendingPayments": 1, "pendingWithdrawals": 3000 },
  "trend": [ { "day": "2026-10-13", "incoming": 15000, "outgoing": 5000, "commission": 160, "count": 3 }, ... ],
  "shops": [ { "id": "29", "name": "ตัวแทนภาคเหนือ", "depth": 1, "paidAmount": 9800, "commissionToMe": 49, "balance": 512.3, ... } ] }`,
        note: "ยอดในช่วง (paid / out / commission) นับรายการที่อนุมัติใน N วันล่าสุดตามเวลาไทย · balance และ pending เป็นข้อมูลตอนนี้" },
      { m: "GET", p: "/sub-merchants/:id", d: "ร้านย่อยร้านเดียว (ชั้นใดก็ได้ใต้ร้านนี้) พร้อมยอดรวมและแนวโน้มของร้านนั้น · ?days=7|30|90", auth: KEY,
        res: `{ "success": true, "subMerchant": { "id": "33", "name": "ร้านนิมมาน", "depth": 3, ... }, "overview": { "days": 30, "totals": { ... }, "trend": [ ... ] } }` },
      { m: "POST", p: "/sub-merchants", d: "สร้างร้านย่อยใต้ร้านนี้ พร้อมผู้ใช้เจ้าของร้าน (เข้าสู่ระบบ Merchant Portal ด้วยอีเมล + รหัสผ่านชั่วคราว)", auth: KEY,
        body: `{
  "name": "ร้านนิมมาน",                    // required
  "slug": "nimman",                        // required — a–z 0–9 และ - (แก้ภายหลังไม่ได้)
  "feePercent": 3, "feeFlat": 0,           // ค่าธรรมเนียมเงินเข้า — ต้องไม่ต่ำกว่าของร้านนี้
  "outFeePercent": 1.2, "outFeeFlat": 10,  // ค่าธรรมเนียมเงินออก — ต้องไม่ต่ำกว่าของร้านนี้
  "allowSubMerchants": true,               // ร้านนี้สร้างร้านย่อยต่อได้ไหม (ค่าเริ่มต้น true)
  "contactPhone": "053-000-000",           // optional
  "owner": { "fullName": "คุณเจ้าของ", "email": "owner@nimman.example", "password": "รหัสชั่วคราว ≥ 8 ตัว" }
}`, res: `{ "success": true, "id": "33", "owner": { "username": "nimman", "email": "owner@nimman.example" }, "status": "PENDING" }`,
        note: "Errors: <code>400 RATE_BELOW_PARENT</code> อัตราต่ำกว่าร้านแม่ · <code>409 SLUG_TAKEN</code> · <code>409 EMAIL_TAKEN</code> (1 อีเมลใช้ได้กับร้านเดียว) · <code>403 SUB_MERCHANTS_NOT_ALLOWED</code> · <code>403 SHOP_NOT_ACTIVE</code> ร้านนี้ยังรออนุมัติ · <code>400 TOO_DEEP</code> ลึกเกิน 10 ชั้น" },
      { m: "POST", p: "/sub-merchants/:id", d: "แก้ร้านย่อยชั้นถัดไป: ชื่อ อัตราค่าธรรมเนียม สถานะ (ACTIVE / SUSPENDED) และสิทธิ์สร้างร้านย่อยต่อ", auth: KEY,
        body: `{ "name": "ร้านนิมมาน", "feePercent": 3, "feeFlat": 0, "outFeePercent": 1.2, "outFeeFlat": 10, "allowSubMerchants": true, "status": "suspended" }`,
        res: `{ "success": true, "status": "suspended" }`,
        note: "ระงับร้าน = ร้านย่อยทุกชั้นใต้ร้านนั้นใช้งานไม่ได้ด้วย · ร้านที่ยังรออนุมัติเปิดใช้งานเองไม่ได้ (<code>403 AWAITING_APPROVAL</code>) · อัตราต้องไม่สูงกว่าร้านย่อยของร้านนั้น (<code>400 RATE_ABOVE_CHILD</code>) · แก้ร้านในชั้นลึกกว่าได้ไม่ได้ (<code>404 SUB_MERCHANT_NOT_FOUND</code>)" },
      { m: "POST", p: "/sub-merchants/:id/owner-password", d: "ตั้งรหัสผ่านชั่วคราวใหม่ให้เจ้าของร้านย่อยชั้นถัดไป (ต้องเปลี่ยนเมื่อเข้าสู่ระบบครั้งถัดไป)", auth: KEY,
        body: `{ "password": "รหัสชั่วคราว ≥ 8 ตัว" }`, res: `{ "success": true, "owner": { "username": "nimman", "email": "owner@nimman.example" } }` },
      { m: "GET", p: "/balance (X-Sub-Merchant)", d: "ตัวอย่าง X-Sub-Merchant: key ของร้านแม่ + header X-Sub-Merchant เรียก /balance ของร้านย่อย", auth: `${KEY} + <code>X-Sub-Merchant</code>`,
        res: `{ "success": true, "balance": 9700, "availableBalance": 9700, ... }`,
        note: "ใช้ได้กับทุก endpoint · ร้านต้องอยู่ใต้ร้านของ key (<code>403 SUB_MERCHANT_NOT_FOUND</code>) และเปิดใช้งาน (<code>403 SUB_MERCHANT_NOT_ACTIVE</code>) · สิทธิ์ตามระดับผู้ใช้ของ key เดิม" },
    ],
  },
];

export const LOGIN: Ep = {
  m: "POST", p: "/auth/login", d: "ออก API Key ใหม่ด้วย secret key — ใช้ได้เฉพาะภายใน Merchant Portal",
  auth: "เฉพาะ Merchant Portal (เซิร์ฟเวอร์ของระบบ) — เรียกจากภายนอกได้ <code>403 LOGIN_PORTAL_ONLY</code>",
  body: `{
  "secretKey": "ms_live_<secret-key>"   // Merchant Portal ส่งให้เอง
}`,
  res: `// เรียกจากภายนอก
{ "error": { "code": "LOGIN_PORTAL_ONLY",
             "message": "เรียก /auth/login จากภายนอกไม่ได้ — รับ API key ได้ที่ Merchant Portal → ตั้งค่า → Secret key และ API key (สร้าง secret key แล้วได้ API key ทันที)" } }`,
  note: "<strong>ระบบของร้านไม่ต้องเรียกเส้นนี้</strong> — รับ API key ที่ Merchant Portal → ตั้งค่า → <strong>Secret key และ API key</strong>: กด <strong>สร้าง secret key</strong> ได้ API key ทันที (แสดงในหน้าตั้งค่า) · กด <strong>สร้างใหม่</strong> เมื่อต้องการเปลี่ยน key — ได้ทั้ง secret key และ API key ใหม่ อันเดิมใช้ไม่ได้ทันที · กด <strong>ดู</strong> + ยืนยันชื่อผู้ใช้/รหัสผ่าน เพื่อแสดง key แบบเต็ม · <strong>สิทธิ์ของ API key = ระดับของผู้ใช้</strong> (owner / staff / viewer — กำหนดในหน้าตั้งค่าระบบ) เรียกเส้นที่ไม่มีสิทธิ์ได้ <code>403 PERMISSION_DENIED</code> · key ที่ผู้ดูแลออกให้ร้านใช้ได้ทุกเส้น · ทุกการออก/ดู key มี audit log",
};
