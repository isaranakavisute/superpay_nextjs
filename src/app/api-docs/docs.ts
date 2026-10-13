// Spec of the merchant REST API v1 as implemented by the backend (src/merchant-api).
export type Ep = { m: "GET" | "POST" | "PATCH" | "DELETE"; p: string; d: string; auth?: string; body?: string; res?: string; note?: string };
export type Section = { id: string; nav: string; title: string; sub?: string; eps: Ep[] };

const KEY = "<code>X-API-Key</code> + <code>X-Timestamp</code> + <code>X-Signature</code>";
const TXN = `{
  "id": "a1b2c3d4e5f6...",          // transaction id (ใช้กับ checkout/cancel)
  "ref": "TXN173530",
  "merchantId": "1",
  "orderId": "ORD-001",
  "amount": 100.07,                 // ยอดที่ลูกค้าต้องจ่ายจริง (อาจบวกสตางค์ — ดู note)
  "fee": 1.50, "netAmount": 98.57,
  "status": "PENDING",              // PENDING | PAID | EXPIRED | CANCELLED | REFUNDED
  "source": "API", "paymentMethod": "PROMPTPAY",   // หรือ BANK_TRANSFER ถ้าบัญชีไม่มี PromptPay
  "qrCode":    "{BASE}/payment/qr/{id}.png",
  "qrCodeUrl": "{BASE}/payment/qr/{id}.png",
  "qrExpiry": "2026-01-01T00:15:00.000Z",
  "checkoutUrl": "{SITE}/c?t={id}",
  "createdAt": "2026-01-01T00:00:00.000Z",
  "paidAt": null,
  "copy": { "amount": "100.07" }
}`;
const LIST = (item: string) => `{
  "success": true,
  "data": [ ${item} ],
  "pagination": { "total": 120, "limit": 50, "offset": 0 }
}`;
const QS = "Query: <code>limit</code> (1–200, ค่าเริ่มต้น 50) · <code>offset</code> · <code>status</code> (คั่นด้วย , ได้) · <code>from</code> / <code>to</code> (ISO 8601 พร้อม timezone)";
const PAYOUT = `{ "id": "OUT40160", "merchantRef": "PO-001", "amount": 500,
  "fee": 10, "totalDebit": 510,   // ค่าธรรมเนียมเงินออก (บวกเพิ่ม) · หักจากยอดร้าน = amount + fee · ผู้รับได้ amount เต็ม
  "status": "PENDING",
  "bankCode": "SCB", "accountNumber": "1234567890", "accountName": "นาย ก",
  "description": "...", "createdAt": "...", "completedAt": null, "failureReason": null }`;
const WDR = `{ "requestRef": "WDR90031", "merchantRef": "W-001", "amount": 1000,
  "fee": 20, "totalDebit": 1020,  // ค่าธรรมเนียมเงินออก (บวกเพิ่ม) · หักจากยอดร้าน = amount + fee
  "status": "PENDING",
  "bankCode": "KBANK", "accountNumber": "9876543210", "accountName": "นาย ก",
  "note": null, "rejectReason": null, "createdAt": "...", "decidedAt": null }`;

/** How every slip upload is checked (slip/verify, :ref/slip, checkout slip). */
const SLIP_RULES = "<strong>การตรวจสลิป</strong> — (1) <strong>สลิปตัวอย่าง</strong>จาก Option Pay → <code>400 SAMPLE_SLIP</code> · (2) <strong>สลิปซ้ำ</strong>: สลิปเดียวกัน (ไฟล์เดียวกัน หรือ QR ธนาคารเดียวกัน) ที่อยู่กับรายการอื่นแล้ว → <code>INVALID_SLIP</code> · (3) <strong>เทียบข้อมูลในสลิปกับรายการ</strong>: ยอดเงินตรงทุกสตางค์ · บัญชีผู้รับ + ธนาคารเป็นบัญชีของรายการ · เวลาโอนหลังสร้างรายการและไม่เก่าเกินกำหนด — ทุกข้อที่ไม่ตรงอยู่ใน <code>mismatches</code> · <strong>ชื่อผู้โอน</strong>ไม่ตรงกับ <code>metadata.memberName</code> (เช่น สามีโอนแทนภรรยา) <strong>ไม่ปฏิเสธ</strong> — แจ้งใน <code>warnings</code> และยังอนุมัติได้ · <strong>มีผู้ให้บริการตรวจสลิป</strong> (EasySlip / SlipOK ในตั้งค่าระบบ): ตรวจกับธนาคารจริง ผ่านครบ → <code>PAID</code> อัตโนมัติ (เว้นแต่ตั้ง “ต้องให้ผู้ดูแลยืนยันก่อน”) · <strong>ไม่มีผู้ให้บริการ / ผู้ให้บริการไม่ตอบ</strong>: ระบบอ่านข้อมูลจากภาพสลิป (OCR ไทย+อังกฤษ) — ยอด บัญชีผู้รับ หรือเวลาไม่ตรง → <code>INVALID_SLIP</code> · ตรงครบ หรืออ่านไม่ได้ → <code>PENDING_REVIEW</code> ให้ผู้ดูแลยืนยัน (<strong>ไม่อนุมัติอัตโนมัติ</strong> เพราะภาพแก้ไขได้) · ชื่อผู้โอน/ธนาคารที่ยืนยันจากภาพไม่ได้ จะแจ้งผู้ดูแลแทนการปฏิเสธ · <strong>Errors</strong>: ไฟล์ไม่ใช่รูป/ใหญ่เกิน → <code>400 INVALID_SLIP</code> · ออเดอร์ไม่ PENDING → <code>409 ORDER_NOT_PENDING</code> · ไม่พบ orderId → <code>404 ORDER_NOT_FOUND</code>";

export const SECTIONS: Section[] = [
  {
    id: "payment", nav: "Payment", title: "Payment",
    sub: "สร้าง Payment + QR สำหรับลูกค้า scan จ่าย — ระบบตรวจเงินเข้าผ่าน slip/SMS/Telegram แล้วยิง webhook กลับ · สถานะ: <code>PENDING | PAID | EXPIRED | CANCELLED | REFUNDED</code>",
    eps: [
      {
        m: "POST", p: "/payment/create", d: "สร้าง Payment (QR PromptPay)", auth: KEY,
        body: `{
  "amount": 100.00,            // required, > 0 (ทศนิยมไม่เกิน 2 ตำแหน่ง)
  "orderId": "ORD-001",        // required, unique ต่อ merchant
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
  "transaction": ${TXN.replace(/\n/g, "\n  ")},
  "selectedAccount": { "id": "1", "type": "PROMPTPAY", "accountNumber": "0812345678",
                       "accountName": "...", "bankCode": "KBANK", "bankName": "ธนาคารกสิกรไทย" }
}`,
        note: "<strong>แสดงยอดจาก response เสมอ</strong> — ถ้าเปิด “ยอดไม่ซ้ำ” ในตั้งค่าระบบ <code>amount</code> จะถูกบวกสตางค์เพื่อจับคู่เงินเข้าอัตโนมัติ · บัญชีรับเงิน: บัญชีของร้านก่อน ถ้าไม่มีใช้บัญชีกลางตามการกระจายที่ตั้งไว้ · อายุออเดอร์ตาม “อายุออเดอร์ (นาที)” · <strong>Errors</strong>: orderId ซ้ำ → <code>409 DUPLICATE_ORDER_ID</code> · ช่องสตางค์เต็ม → <code>400 DUPLICATE_PENDING_AMOUNT</code> · ยอดต่ำกว่ายอดฝากขั้นต่ำ → <code>400 PAYMENT_CONTRACT_POLICY_VIOLATION</code> (<code>details.error: below_min_amount</code> + <code>minAmount</code>) · ไม่มีบัญชีรับเงิน → <code>400 NO_PAYMENT_ACCOUNT</code> · ขาด field → <code>400 validation_error</code>",
      },
      {
        m: "POST", p: "/payment/slip/create", d: "สร้าง Payment (สลิป) — เปิดออเดอร์รอแนบสลิป", auth: `${KEY} + <code>Content-Type: application/json</code>`,
        body: `{
  "amount": 250.00,           // required
  "orderId": "ORD-002",       // required, unique ต่อ merchant
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
        res: `{
  "success": true,
  "verified": false,
  "result": "PENDING_REVIEW",    // PAID | PENDING_REVIEW | INVALID_SLIP
  "message": "ตรงกับรายการ: ยอด ฿250.00, บัญชีผู้รับ 4182186378, เวลาโอน ... — อ่านจากภาพสลิป รอผู้ดูแลยืนยัน",
  "mismatches": [],              // INVALID_SLIP: ทุกข้อที่ไม่ตรง แยกเป็นรายการ
  "transaction": { ... }
}

// ตัวอย่างสลิปไม่ผ่าน
{
  "success": false, "verified": false, "result": "INVALID_SLIP",
  "message": "ยอดเงินในสลิป ฿200.00 ไม่ตรงกับยอดที่ต้องชำระ ฿250.00 — ต้องโอนตรงยอดทุกสตางค์ · บัญชีผู้รับในสลิป (XXX-XXX111-1) ไม่ใช่บัญชีของรายการนี้ — ต้องโอนเข้า SCB 4182186378 (...)",
  "mismatches": [
    "ยอดเงินในสลิป ฿200.00 ไม่ตรงกับยอดที่ต้องชำระ ฿250.00 — ต้องโอนตรงยอดทุกสตางค์",
    "บัญชีผู้รับในสลิป (XXX-XXX111-1) ไม่ใช่บัญชีของรายการนี้ — ต้องโอนเข้า SCB 4182186378 (...)"
  ],
  "transaction": { ... status: "PENDING" ... }
}`,
        note: SLIP_RULES,
      },
      { m: "POST", p: "/payment/:ref/slip", d: "แนบสลิปเข้าออเดอร์ตาม ref หรือ transaction id — shape เดิม", auth: KEY, body: `{ "image": "<base64>", "mime": "image/png" }`, res: "เหมือน /payment/slip/verify", note: "ตรวจสลิปตามกฎเดียวกับ /payment/slip/verify · แนบทับสลิปเดิมได้ (หน้าชำระเงินของลูกค้าแนบได้ครั้งเดียว)" },
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
        res: `{ "success": true, "verified": false, "result": "PENDING_REVIEW", "message": "...", "mismatches": [], "status": "PENDING" }`,
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
    sub: "สั่งโอนเงินออกจากยอดของร้าน — เข้าคิวที่หน้า <strong>รายการเงินออก</strong> ให้ผู้ดูแลโอนและยืนยัน · สถานะ: <code>PENDING | COMPLETED | FAILED</code>",
    eps: [
      {
        m: "POST", p: "/payout/create", d: "สร้าง Payout — รองรับ Idempotency-Key header", auth: `${KEY} + <code>Idempotency-Key</code> (optional)`,
        body: `{
  "amount": 500.00,             // required
  "bankCode": "SCB",            // required — BAY | BBL | KBANK | KTB | SCB | TTB
  "accountNumber": "1234567890",// required, 6–20 หลัก
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
  "merchantRef": "W-001",   // optional, unique ต่อ merchant
  "note": "ถอนประจำวัน" }`, res: `{ "success": true, "request": ${WDR} }`, note: "ตรวจยอดใช้ได้ / ยอดคงเหลือขั้นต่ำ / ยอดถอนขั้นต่ำ เหมือน payout" },
      { m: "GET", p: "/withdrawal/requests", d: "รายการคำขอถอนเงิน", auth: KEY, res: LIST("{ ...request }"), note: QS },
      { m: "GET", p: "/withdrawal/request/:ref", d: "ดูคำขอตาม requestRef หรือ merchantRef — shape เดิม", auth: KEY, res: `{ "success": true, "request": { ... } }` },
    ],
  },
  {
    id: "accounts", nav: "Payment Accounts", title: "Payment Accounts (บัญชีรับเงิน)",
    sub: "บัญชีรับเงินของร้าน — 1 บัญชีใช้ร่วมได้หลายร้าน (ผู้ดูแลระบบเป็นผู้ผูก): <code>shared: true</code> = บัญชีนี้ร้านอื่นใช้ด้วย · ออเดอร์บนบัญชีที่ใช้ร่วมได้ยอดไม่ซ้ำกันเสมอ (บวกสตางค์อัตโนมัติ — ส่ง <code>copy.amount</code> ให้ลูกค้าโอนตรงยอด) · ร้านย่อยที่ไม่มีบัญชีของตัวเองใช้บัญชีของร้านแม่ · ถ้าร้านไม่มีบัญชีของตัวเอง ออเดอร์จะใช้บัญชีกลางของระบบ (เมื่อเปิดโหมดบัญชีรับเงินกลาง)",
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
      { m: "DELETE", p: "/payment/accounts/:id", d: "ลบบัญชีรับเงิน (soft delete → inactive) · บัญชีที่ใช้ร่วมกับร้านอื่น: เลิกผูกเฉพาะร้านนี้ (บัญชียังใช้งานกับร้านอื่น) — ทำไม่ได้ถ้าร้านนี้ยังมีออเดอร์รอชำระบนบัญชีนั้น (409 ACCOUNT_HAS_PENDING_ORDERS)", auth: KEY, res: `{ "success": true }                     // บัญชีของร้านนี้ร้านเดียว
{ "success": true, "unlinked": true }   // บัญชีที่ใช้ร่วม — เลิกผูกเฉพาะร้านนี้` },
    ],
  },
  {
    id: "webhooks", nav: "Webhooks", title: "Webhooks",
    sub: "ระบบยิง <code>POST</code> JSON ไปที่ URL ของร้านเมื่อสถานะเปลี่ยน พร้อม header <code>X-Signature: t=&lt;unix&gt;,v1=&lt;hex&gt;</code> = HMAC-SHA256(secret, <code>t + \".\" + body</code>) · ตอบ 2xx = สำเร็จ, ไม่สำเร็จจะลองใหม่ได้สูงสุด 5 ครั้งจากหน้า Webhook",
    eps: [
      { m: "GET", p: "/webhooks", d: "รายการ Webhooks", auth: KEY, res: `{ "success": true, "data": [ { "id": "3", "url": "https://...", "events": ["payment.approved"], "status": "ACTIVE", "secretPrefix": "whsec_AbCdEf…" } ] }` },
      { m: "POST", p: "/webhooks", d: "เพิ่ม Webhook", auth: KEY, body: `{ "url": "https://your-site.com/cb",   // https เท่านั้น
  "events": ["payment.approved", "payment.rejected"] }   // + "withdrawal.approved"`, res: `{ "success": true, "webhook": { "id": "3", "url": "...", "events": [...], "status": "ACTIVE",
  "secret": "whsec_..." } }    // แสดงครั้งเดียว — เก็บไว้ตรวจลายเซ็น`, note: `Payload: <code>{ "event": "payment.approved", "ref": "TXN…", "orderId": "ORD-001", "amount": "100.07", "status": "approved", "createdAt": "…" }</code> · สูงสุด 5 ปลายทางต่อร้าน · ไม่ยิงไปที่อยู่ภายใน (private IP)` },
    ],
  },
  {
    id: "misc", nav: "Balance & Profile", title: "Balance & Profile",
    eps: [
      { m: "GET", p: "/balance", d: "ดูยอดเงินคงเหลือ", auth: KEY, res: `{ "success": true, "balance": 80616.01, "availableBalance": 31871.13,
  "reserved": 48744.88,          // payout + คำขอถอนที่ยังรอ
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
