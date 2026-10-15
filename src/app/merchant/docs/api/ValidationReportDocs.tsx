import { API_BASE } from "@/lib/api-curl-examples";
import example from "@/lib/validation-report-example.json";
import { CodeBlock } from "../CodeBlock";
import { Note, Section, Table } from "../DocLayout";

const H = "mt-4 mb-1 text-[11px] font-semibold tracking-wider text-soft uppercase";
const c = (t: string, k?: string) => <code key={k ?? t}>{t}</code>;

const CURL = [
  '# 1) ใส่ key ของคุณ (Merchant Portal → ตั้งค่า → Secret key และ API key)',
  'API_KEY="ak_live_YOUR_API_KEY"',
  'SECRET="sk_live_YOUR_SECRET_KEY"     # key ระดับร้านใช้ ss_live_…',
  '',
  '# 2) เลือกรายการ — ตัวอย่าง: 2 รายการ (, ต้องส่งเป็น %2C)',
  'PATHQ="/api/v1/payment/validation-report?refs=TXN100001%2CTXN100002"',
  '',
  '# 3) เซ็นคำขอ: HMAC-SHA256(secret, "timestamp.GET.path+query.") — GET ไม่มี body จึงลงท้ายด้วย "."',
  'TS=$(date +%s)',
  'SIG=$(printf \'%s\' "${TS}.GET.${PATHQ}." | openssl dgst -sha256 -hmac "${SECRET}" | awk \'{print $NF}\')',
  '',
  '# 4) เรียก API — แสดงผลบนจอและบันทึกเป็นไฟล์',
  'curl -sS --max-time 180 "https://optionpay.co${PATHQ}" \\',
  '  -H "X-API-Key: ${API_KEY}" \\',
  '  -H "X-Timestamp: ${TS}" \\',
  '  -H "X-Signature: ${SIG}" \\',
  '  | tee validation-report.json',
].join("\n");

const VARIANTS = [
  '# ทุกรายการที่สร้างวันที่ 14 ต.ค. 2569 (เวลาไทย) ผ่าน /payment/create',
  'PATHQ="/api/v1/payment/validation-report?date=2026-10-14&source=API"',
  '',
  '# เฉพาะช่วงเวลา 16:52:49–17:04:10 ของวันนั้น (: ต้องส่งเป็น %3A)',
  'PATHQ="/api/v1/payment/validation-report?date=2026-10-14&start_time=16%3A52%3A49&end_time=17%3A04%3A10"',
  '',
  '# กลุ่มรายการที่ Option Pay ติดป้ายไว้ให้ (batch)',
  'PATHQ="/api/v1/payment/validation-report?batch=coffee9-2026-10-14"',
  '',
  '# ร้านแม่ดูรายการของร้านย่อย id 58 — เพิ่ม header นี้ (ไม่ต้องเซ็น header นี้)',
  '  -H "X-Sub-Merchant: 58"',
].join("\n");

const NEXT = [
  '// app/api/validation-report/route.ts — ใช้ optionpay() จาก lib/optionpay.ts (ดูหัวข้อ “การเซ็นคำขอ”)',
  'import { optionpay } from "@/lib/optionpay";',
  '',
  'export async function GET() {',
  '  const refs = ["TXN100001", "TXN100002"].join("%2C");            // , → %2C',
  '  const { status, data } = await optionpay("GET", `/api/v1/payment/validation-report?refs=${refs}`, undefined, 180_000);',
  '  if (status !== 200) return Response.json(data, { status });     // { error: { code, message, details } }',
  '  for (const o of data.orders) console.log(o.ref, o.decision, o.reason_th);',
  '  return Response.json(data);',
  '}',
].join("\n");

/** Full guide for GET /payment/validation-report (API guide page + PDF). */
export function ValidationReportSection() {
  return (
    <Section id="validation-report" title="รายงานผลการตรวจสลิป (GET /payment/validation-report)">
      <p>ดูว่าแต่ละรายการชำระเงิน <strong>อนุมัติ</strong> หรือ <strong>ไม่อนุมัติ</strong> เพราะอะไร — ระบบดึงข้อมูลการโอนจริงจากธนาคาร (ผ่านผู้ให้บริการตรวจสลิป) ใหม่ทุกครั้งที่เรียก แล้วแสดงผลการตรวจทุกข้อ พร้อมเหตุผลภาษาไทยและอังกฤษ · รายการที่อนุมัติแสดงก่อน</p>
      <CodeBlock light code={`GET ${API_BASE.replace(/\/api\/v1$/, "")}/api/v1/payment/validation-report?<query>`} />

      <div className={H}>Header ที่ต้องส่ง และวิธีได้มา</div>
      <Table head={["Header", "จำเป็น", "ค่า", "ได้มาจากไหน"]} rows={[
        [c("X-API-Key"), "✓", <>API key ({c("ak_live_…", "a")})</>, <>Merchant Portal → <strong key="s">ตั้งค่า</strong> → การ์ด <strong key="k">Secret key และ API key</strong> → กด <strong key="c">สร้าง secret key</strong> (ครั้งแรก) หรือ <strong key="v">ดู</strong> แล้วคัดลอก</>],
        [c("X-Timestamp"), "✓", "เวลาปัจจุบัน แบบ unix วินาที", <>สร้างตอนเรียก เช่น {c("date +%s", "d")} · ต้องคลาดจากเวลาจริงไม่เกิน 5 นาที</>],
        [c("X-Signature"), "✓", "HMAC-SHA256 แบบ hex ตัวเล็ก", <>คำนวณจาก secret key ({c("sk_live_…", "s")} หรือ {c("ss_live_…", "t")} ของ key ระดับร้าน) กับข้อความ {c("<timestamp>.GET.<path+query>.", "m")} — เซ็นใหม่ทุกคำขอ</>],
        [c("X-Sub-Merchant"), "—", "id ร้านย่อย (ตัวเลข)", <>เฉพาะร้านแม่ที่ต้องการดูรายการของร้านย่อย · ได้ id จาก {c("GET /sub-merchants", "g")} หรือเมนู <strong key="r">ร้านย่อย</strong> ใน Portal · ไม่ต้องรวมในลายเซ็น</>],
      ]} />

      <div className={H}>Query parameters — ใส่อย่างน้อย 1 ใน refs / batch / date / start_time (ใส่หลายตัว = ต้องตรงทุกเงื่อนไข)</div>
      <Table head={["Parameter", "รูปแบบ", "ตัวอย่าง (ตามที่ส่งใน URL)", "ได้มาจากไหน"]} rows={[
        [c("refs"), "เลขที่รายการ (TXN…) หรือ orderId คั่นด้วย , (ไม่เกิน 100)", c("refs=TXN100001%2CORD-1002", "e"), <>{c("transaction.ref", "r")} / {c("transaction.orderId", "o")} ที่ได้จาก {c("POST /payment/create", "p")} (orderId = เลขที่ร้านส่งมา หรือ OP-… ที่ระบบสร้างให้) · หรือคอลัมน์ <strong key="n">เลขที่</strong> ในหน้า รายการชำระเงิน · หรือจาก {c("GET /transactions", "t")}</>],
        [c("batch"), "ชื่อป้ายกลุ่ม (a-z 0-9 . _ -)", c("batch=coffee9-2026-10-14", "e"), "ทีม Option Pay ติดป้ายให้กลุ่มรายการที่ต้องการดูพร้อมกัน แล้วแจ้งชื่อป้ายให้ร้าน"],
        [c("date"), "YYYY-MM-DD (วันที่สร้างรายการ เวลาไทย)", c("date=2026-10-14", "e"), <>วันที่ที่ต้องการตรวจ · หรือจาก {c("transaction.createdAt", "c")} (เวลา UTC — แปลงเป็นเวลาไทย +7 ชม.)</>],
        [c("source"), c("API · SLIP · COLLECT · PORTAL", "v"), c("source=API", "e"), <>ช่องทางที่สร้างรายการ: API = {c("/payment/create", "a")} · SLIP = {c("/payment/slip/create", "s")} · COLLECT = {c("/collect", "c")} · PORTAL = สร้างใน Portal (ดูได้จาก {c("transaction.source", "t")})</>],
        [c("start_time"), "HH:MM หรือ HH:MM:SS (คู่กับ date) หรือ ISO พร้อมเขตเวลา", c("start_time=16%3A52%3A49", "e"), "เวลาสร้างรายการเริ่มต้นที่ต้องการ (รวมเวลานั้น)"],
        [c("end_time"), "เหมือน start_time", c("end_time=17%3A04%3A10", "e"), "เวลาสร้างรายการสิ้นสุด — รวมทั้งวินาที (หรือทั้งนาที ถ้าระบุแค่ HH:MM) นั้น"],
      ]} />
      <Note tone="warn"><strong>เข้ารหัสอักขระใน URL ก่อนเซ็น</strong> — ลายเซ็นใช้ URL ตามที่ส่งทุกตัวอักษร และเซิร์ฟเวอร์รับ URL แบบเข้ารหัส: <code>,</code> → <code>%2C</code> · <code>:</code> → <code>%3A</code> · <code>+</code> → <code>%2B</code> · ถ้าส่ง <code>,</code> หรือ <code>:</code> ตรง ๆ จะได้ <code>401 INVALID_SIGNATURE</code></Note>

      <div className={H}>ตัวอย่างที่ใช้งานได้จริง — curl (ทดสอบกับระบบจริงแล้ว)</div>
      <CodeBlock code={CURL} />
      <div className={H}>เลือกรายการแบบอื่น</div>
      <CodeBlock code={VARIANTS} />
      <div className={H}>Next.js (route handler)</div>
      <CodeBlock code={NEXT} />

      <div className={H}>ผลลัพธ์จริง — HTTP 200 (ข้อมูลร้าน ลูกค้า และเลขบัญชีเปลี่ยนเป็นตัวอย่าง)</div>
      <CodeBlock light code={JSON.stringify(example, null, 2)} />

      <div className={H}>คำอธิบายผลลัพธ์</div>
      <Table head={["ฟิลด์", "ความหมาย"]} rows={[
        [c("summary"), "จำนวนทั้งหมด · approved · notApproved · notApprovedWithSlip (มีสลิปแต่ไม่ผ่าน) · noSlipSent (ยังไม่ส่งสลิป) · notFound (refs ที่ไม่พบ ถ้ามี)"],
        [c("orders[].decision"), <>{c("APPROVED", "a")} = อนุมัติแล้ว · {c("NOT_APPROVED", "n")} = ยังไม่อนุมัติ (ดู reason)</>],
        [c("orders[].currentStatus"), "PAID · PENDING · EXPIRED · CANCELLED · REFUNDED"],
        [c("orders[].amounts"), "orderAmount (ยอดรายการ) · fee (ค่าธรรมเนียม) · netAmount (ยอดเข้าร้าน)"],
        [c("orders[].timeline"), "orderCreated · slipUploaded · approvedAt · approvedBy (system = อนุมัติอัตโนมัติ) — เวลาไทย"],
        [c("orders[].bankVerification"), "ข้อมูลการโอนจากธนาคาร: bankReference · transferredAt · amount · sender / receiver (ชื่อ ธนาคาร เลขบัญชีแบบปิดบางส่วน) · null = ยังไม่มีสลิป"],
        [c("orders[].checks[]"), "ผลการตรวจทีละข้อ: BANK_VERIFICATION · AMOUNT · TRANSFER_TIME · RECEIVER_ACCOUNT · SENDER_NAME · DUPLICATE — status PASS · FAIL · WARN · UNKNOWN · SKIPPED พร้อมคำอธิบาย"],
        [c("orders[].reason / reason_th"), "เหตุผลที่อนุมัติ / ไม่อนุมัติ (อังกฤษ / ไทย) สำหรับแสดงผล"],
      ]} />

      <div className={H}>ข้อผิดพลาด</div>
      <Table head={["HTTP", "code", "เมื่อไร / แก้อย่างไร"]} rows={[
        ["400", c("validation_error"), "ไม่ได้ระบุ refs / batch / date / start_time หรือรูปแบบผิด — ดู details"],
        ["400", c("TOO_MANY_ORDERS"), "เงื่อนไขตรงเกิน 100 รายการ — แบ่งช่วงวันที่/เวลา หรือระบุ refs"],
        ["401", c("INVALID_SIGNATURE"), "ลายเซ็นไม่ตรง — ตรวจว่าเซ็น URL แบบเข้ารหัส (%2C %3A) ตรงกับที่ส่ง"],
        ["401", c("TIMESTAMP_EXPIRED · SIGNATURE_REUSED"), "เวลาเครื่องคลาดเกิน 5 นาที หรือส่งลายเซ็นเดิมซ้ำ — เซ็นใหม่ทุกครั้ง"],
        ["403", c("PERMISSION_DENIED"), "ผู้ใช้ไม่มีสิทธิ์ ดูรายการ (view_transactions)"],
        ["403", c("SUB_MERCHANT_NOT_FOUND"), "X-Sub-Merchant ไม่ใช่ร้านย่อยของ key นี้"],
      ]} />
      <Note>ผลแต่ละครั้งใช้โควตาตรวจสลิป 1 ครั้งต่อรายการที่มีสลิป และใช้เวลาประมาณ 10–20 วินาทีต่อ 40 รายการ — ตั้ง timeout 180 วินาที · สิทธิ์ที่ต้องมี: {c("view_transactions", "p")} (ทุกระดับผู้ใช้มีโดยค่าเริ่มต้น)</Note>
    </Section>
  );
}
