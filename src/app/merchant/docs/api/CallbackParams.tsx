import { CodeBlock } from "../CodeBlock";
import { Table } from "../DocLayout";

/**
 * The exact request each enabled callback event sends (as webhook.service.js payloadFor / payoutPayload build it):
 * the 4 headers and every body parameter in order, with this event's value. Demo values only — no shop data.
 */
type Param = [name: string, type: string, value: React.ReactNode, meaning: React.ReactNode];
type Ev = { id: string; event: string; when: string; params: Param[]; example: Record<string, string | null> };

const c = (x: string) => <code>{x}</code>;
const PAYMENT_COMMON = (status: string): Param[] => [
  ["event", "string", c(status === "approved" ? '"payment.approved"' : '"payment.rejected"'), "ชื่อ event (ตรงกับ header x-webhook-event)"],
  ["ref", "string", c('"TXN…"'), "เลขที่รายการของ Option Pay"],
  ["orderId", "string | null", c('"ORD-1001"'), <>เลขออเดอร์ของร้าน — ค่าที่ร้านส่งตอน <code>POST /payment/create</code> (ไม่ได้ส่ง = null)</>],
  ["amount", "string", c('"1000.00"'), "ยอดของออเดอร์ — ข้อความทศนิยม 2 ตำแหน่ง"],
  ["status", "string", c(`"${status}"`), status === "approved" ? "สถานะ = อนุมัติแล้ว" : "สถานะ = ปฏิเสธ / ยกเลิกแล้ว"],
  ["createdAt", "string (ISO 8601 UTC)", c('"2026-10-17T09:21:20.000Z"'), "เวลาที่สร้างออเดอร์"],
  ["resentAt", "string (ISO 8601 UTC)", c('"2026-10-17T09:24:53.515Z"'), "เวลาที่ส่ง callback ครั้งนี้ (ส่งซ้ำ = เวลาใหม่)"],
];
const PAYOUT_COMMON = (status: "completed" | "failed"): Param[] => [
  ["event", "string", c(`"payout.${status}"`), "ชื่อ event (ตรงกับ header x-webhook-event)"],
  ["ref", "string", c('"OUT…"'), "เลขที่รายการ payout ของ Option Pay"],
  ["orderId", "string | null", c('"PO-1001"'), <>เท่ากับ <code>merchantRef</code> (ให้ใช้ช่องเดียวกับ payment ได้)</>],
  ["merchantRef", "string | null", c('"PO-1001"'), <>เลขอ้างอิงที่ร้านส่งตอน <code>POST /payout/create</code> (ไม่ได้ส่ง = null)</>],
  ["amount", "string", c('"500.00"'), "ยอดที่โอนให้ผู้รับ — ข้อความทศนิยม 2 ตำแหน่ง (ไม่รวมค่าธรรมเนียม)"],
  ["status", "string", c(`"${status}"`), status === "completed" ? "สถานะ = โอนให้ผู้รับแล้ว" : "สถานะ = ไม่สำเร็จ / ถูกปฏิเสธ"],
  ["failureReason", "string | null", status === "failed" ? c('"ข้อมูลบัญชีผู้รับไม่ถูกต้อง"') : c("null"), status === "failed" ? "เหตุผลที่ไม่สำเร็จ" : "null เสมอสำหรับ event นี้"],
  ["createdAt", "string (ISO 8601 UTC)", c('"2026-10-17T10:00:00.000Z"'), "เวลาที่สร้าง payout"],
  ["completedAt", "string | null (ISO 8601 UTC)", c('"2026-10-17T10:20:00.000Z"'), status === "completed" ? "เวลาที่ทีม Option Pay โอนเงินให้ผู้รับเสร็จ" : "เวลาที่ปฏิเสธ"],
];

const EVENTS: Ev[] = [
  { id: "cb-payment-approved", event: "payment.approved", when: "ออเดอร์ได้รับการอนุมัติ — ตรวจสลิปผ่านอัตโนมัติ หรือเจ้าหน้าที่อนุมัติ",
    params: PAYMENT_COMMON("approved"),
    example: { event: "payment.approved", ref: "TXN100001", orderId: "ORD-1001", amount: "1000.00", status: "approved", createdAt: "2026-10-17T09:21:20.000Z", resentAt: "2026-10-17T09:24:53.515Z" } },
  { id: "cb-payment-rejected", event: "payment.rejected", when: "ออเดอร์ถูกปฏิเสธ / ยกเลิก — เจ้าหน้าที่ปฏิเสธ ร้านยกเลิกผ่าน API หรือระบบยกเลิกอัตโนมัติ (เช่น ไม่ได้ดำเนินการภายในเที่ยงคืน)",
    params: PAYMENT_COMMON("rejected"),
    example: { event: "payment.rejected", ref: "TXN100002", orderId: "ORD-1002", amount: "250.00", status: "rejected", createdAt: "2026-10-17T09:30:00.000Z", resentAt: "2026-10-18T00:00:42.000Z" } },
  { id: "cb-payout-completed", event: "payout.completed", when: "ทีม Option Pay โอนเงิน payout ให้ผู้รับแล้ว",
    params: PAYOUT_COMMON("completed"),
    example: { event: "payout.completed", ref: "OUT100001", orderId: "PO-1001", merchantRef: "PO-1001", amount: "500.00", status: "completed", failureReason: null, createdAt: "2026-10-17T10:00:00.000Z", completedAt: "2026-10-17T10:20:00.000Z" } },
  { id: "cb-payout-failed", event: "payout.failed", when: "payout ไม่สำเร็จ / ถูกปฏิเสธ — คืนยอด amount + fee เข้ายอดคงเหลือของร้านแล้ว",
    params: PAYOUT_COMMON("failed"),
    example: { event: "payout.failed", ref: "OUT100002", orderId: "PO-1002", merchantRef: "PO-1002", amount: "300.00", status: "failed", failureReason: "ข้อมูลบัญชีผู้รับไม่ถูกต้อง", createdAt: "2026-10-17T11:00:00.000Z", completedAt: "2026-10-17T11:05:00.000Z" } },
];

export const CALLBACK_EVENT_TOC = EVENTS.map((e) => ({ id: e.id, label: e.event, method: "POST" }));

export function CallbackParams() {
  return (
    <div className="mt-4">
      <p className="mb-2">พารามิเตอร์ที่ส่งในแต่ละ event ที่เปิดใช้งาน — <strong>ลำดับใน body ตามตารางเสมอ</strong> (body เป็น JSON บรรทัดเดียว ไม่มีช่องว่าง):</p>
      {EVENTS.map((e) => (
        <div key={e.id} id={e.id} className="mt-5 scroll-mt-28 rounded-xl border border-line p-4">
          <div className="flex flex-wrap items-baseline gap-2.5">
            <span className="rounded-md bg-[rgba(59,130,246,0.18)] px-2 py-0.5 font-mono text-[11.5px] font-bold text-[#93c5fd]">POST</span>
            <span className="font-mono text-[15px] font-semibold">{e.event}</span>
          </div>
          <div className="mt-1 text-[13.5px] text-muted">ส่งเมื่อ: {e.when}</div>
          <div className="mt-3 mb-1 text-[11px] font-semibold tracking-wider text-soft uppercase">Header</div>
          <Table head={["Header", "ค่า"]} rows={[
            [c("content-type"), c("application/json")],
            [c("user-agent"), c("OptionPay-Webhook/1.0")],
            [c("x-webhook-event"), c(e.event)],
            [c("x-signature"), <>{c("t=<unix วินาที>,v1=<hex 64 ตัว>")} — เซ็นด้วย secret key ของร้านเจ้าของรายการ + body นี้</>],
          ]} />
          <div className="mt-3 mb-1 text-[11px] font-semibold tracking-wider text-soft uppercase">Body — พารามิเตอร์ตามลำดับ</div>
          <Table head={["#", "พารามิเตอร์", "ชนิด", "ค่าใน event นี้", "ความหมาย"]} rows={e.params.map(([n, t, v, m], i) => [String(i + 1), <code key="n">{n}</code>, t, v, m])} />
          <div className="mt-3 mb-1 text-[11px] font-semibold tracking-wider text-soft uppercase">ตัวอย่าง body (ค่าตัวอย่าง)</div>
          <CodeBlock code={JSON.stringify(e.example)} />
        </div>
      ))}
    </div>
  );
}
