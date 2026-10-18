import type { Metadata } from "next";
import Link from "next/link";
import { API_BASE, CURL_EXAMPLES, LIVE_RUN, NEXT_HELPER, SIGNATURE_ERRORS, SLIP_RETRY_HELPER } from "@/lib/api-curl-examples";
import { MERCHANT_PERMISSIONS } from "@/lib/merchant-perms";
import { portalCall, requirePortal } from "@/lib/portal";
import { LOGIN, SECTIONS, SLIP_COMPARE, SLIP_SAME_SHAPE, type Ep } from "../../../api-docs/docs";
import { PortalShell } from "../../PortalShell";
import { CodeBlock } from "../CodeBlock";
import { ValidationReportSection } from "./ValidationReportDocs";
import { SignatureMatchExplained } from "./SignatureMatchExplained";
import { CALLBACK_DEMO_PATH, CALLBACK_DEMO_SECRET, CALLBACK_EXAMPLES } from "@/lib/callback-examples";
import { nextjsCallbackVerifier } from "@/lib/callback-nextjs-example";
import { DocLayout, Note, Section, Table } from "../DocLayout";

export const metadata: Metadata = { title: "คู่มือ API v1 — Merchant Portal" };

const SITE = "https://optionpay.co";
const fill = (s?: string) => (s ?? "").replaceAll("{BASE}", API_BASE).replaceAll("{SITE}", SITE);
const METHOD: Record<Ep["m"], string> = {
  GET: "bg-[rgba(16,185,129,0.15)] text-[#6ee7b7]", POST: "bg-[rgba(59,130,246,0.18)] text-[#93c5fd]",
  PATCH: "bg-[rgba(245,158,11,0.18)] text-[#fcd34d]", DELETE: "bg-[rgba(239,68,68,0.18)] text-[#fca5a5]",
};
const permLabel = (code: string) => MERCHANT_PERMISSIONS.find((p) => p.code === code)?.label ?? code;
const GROUPS = [{ id: "auth", title: "การยืนยันตัวตน (Authentication)", sub: `ทุก request ใต้ <code>/api/v1/</code> ต้องส่ง <code>X-API-Key</code> + <code>X-Timestamp</code> + <code>X-Signature</code> (ดูหัวข้อ “การเซ็นคำขอ”) ยกเว้นหน้า checkout / QR / แนบสลิปของลูกค้า · <code>/auth/login</code> ใช้ได้เฉพาะภายใน Merchant Portal`, eps: [LOGIN] }, ...SECTIONS];
const slug = (e: Ep) => `${e.m}-${e.p}`.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+$/, "");

function Steps3() {
  return (
    <ol className="mt-2 list-decimal space-y-1 pl-5">
      <li><code>X-Timestamp</code> = เวลาปัจจุบันแบบ unix วินาที (คลาดได้ไม่เกิน 5 นาที)</li>
      <li><code>X-Signature</code> = <strong>HMAC-SHA256</strong>(secret, <code>{"<timestamp>.<METHOD>.<path>.<body>"}</code>) แบบ hex ตัวเล็ก — secret = secret key ของผู้ใช้ (<code>sk_live_</code>) หรือ signing secret ของ key ระดับร้าน (<code>ss_live_</code>)</li>
      <li>ส่ง <code>X-API-Key</code> + <code>X-Timestamp</code> + <code>X-Signature</code> และ body เดียวกับที่เซ็น — <strong>ห้ามส่ง secret</strong></li>
    </ol>
  );
}

// Slip results: show the documented full shape (normal / carry-over / invalid / review) instead of one captured case.
const FULL_RES = new Set(["POST /payment/create", "POST /payment/slip/verify", "POST /payment/:ref/slip"]);
const H = "mt-3 mb-1 text-[11px] font-semibold tracking-wider text-soft uppercase";

function Endpoint({ e }: { e: Ep }) {
  const c = CURL_EXAMPLES[`${e.m} ${e.p}`];
  return (
    <div id={slug(e)} className="mb-5 scroll-mt-28 rounded-xl border border-line bg-surface p-4">
      <div className="flex flex-wrap items-center gap-2.5">
        <span className={`w-[64px] rounded-md py-1 text-center font-mono text-[11.5px] font-bold ${METHOD[e.m]}`}>{e.m}</span>
        <span className="font-mono text-[14px] font-semibold break-all">{e.p}</span>
      </div>
      <div className="mt-1 text-[13.5px] text-muted">{e.d}</div>
      <div className="mt-2 flex flex-wrap gap-2 text-[12px]">
        {c?.perm ? <span className="rounded-md bg-primary-50 px-2 py-0.5 text-primary">สิทธิ์: <b>{c.perm}</b> · {permLabel(c.perm)}</span> : <span className="rounded-md bg-surface-alt px-2 py-0.5 text-muted">ไม่ต้องใช้สิทธิ์</span>}
        {e.auth && <span className="text-muted">AUTH: <span dangerouslySetInnerHTML={{ __html: e.auth }} /></span>}
      </div>
      {e.body && <><div className={H}>คำอธิบายฟิลด์</div><CodeBlock code={fill(e.body)} light /></>}
      {c && <>
        <div className={H}>ตัวอย่างจริง — curl {c.live.signature ? "(เซ็นด้วย openssl)" : ""}</div><CodeBlock code={c.cmd} />
        <div className={H}>ตัวอย่างจริง — Next.js (route handler · สร้างลายเซ็น)</div><CodeBlock code={c.next} />
        {c.live.signature && <>
          <div className={H}>ค่าจริงตอนรัน</div>
          <CodeBlock light code={`X-Timestamp : ${c.live.timestamp}\nสตริงที่เซ็น : ${c.live.toSign}\nX-Signature : ${c.live.signature}`} />
        </>}
        {!FULL_RES.has(`${e.m} ${e.p}`) && <><div className={H}>ผลลัพธ์จริง — HTTP {c.live.status}</div><CodeBlock light code={c.live.response} /></>}
      </>}
      {FULL_RES.has(`${e.m} ${e.p}`) && e.res && <><div className={H}>{e.p === "/payment/create" ? "ผลลัพธ์ (HTTP 200) — ตัวอย่างจริง" : "ผลลัพธ์ — ฟิลด์ชุดเดียวกันทุกกรณี (HTTP 200)"}</div><CodeBlock light code={fill(e.res)} /></>}
      {e.note && <div className="mt-3 rounded-lg border-l-[3px] border-primary bg-primary-50 px-3.5 py-2.5 text-[13px] leading-relaxed" dangerouslySetInnerHTML={{ __html: fill(e.note) }} />}
    </div>
  );
}

export default async function ApiGuidePage() {
  const user = await requirePortal("/merchant/docs/api");
  // This shop's own real callbacks (exact curl that was sent, signature-verified) — only its own, never another shop's.
  const real = await portalCall<{ url: string | null; signing: string | null; path: string | null; examples: { event: string; sentAt: string; reply: string | null; cmd: string }[] }>(user, "GET", "/callback-examples");
  const realExamples = real.ok && real.examples ? real.examples : [];
  // Callbacks to this shop signed with its own sk_live_ secret key (Option B, agreed 18 Oct 2026) instead of a whsec_ secret.
  // Every webhook is signed with its shop's own sk_live_ key by default (18 Oct 2026); "whsec" only if set so explicitly.
  const derived = !(real.ok && real.signing === "whsec");
  const cbPath = (real.ok && real.path) || CALLBACK_DEMO_PATH;
  const ownPath = !!(real.ok && real.path);
  const toc = [{ id: "start", label: "เริ่มต้นใช้งาน" }, { id: "secret", label: "Secret key และ API key" }, { id: "sign", label: "การเซ็นคำขอ (X-Signature)" }, { id: "slip", label: "การตรวจสลิป" }, { id: "slip-retry", label: "ส่งสลิป: timeout และการส่งซ้ำ" }, { id: "validation-report", label: "รายงานผลการตรวจสลิป" }, { id: "perms", label: "สิทธิ์และข้อผิดพลาด" }, { id: "callbacks", label: "Callback ที่ระบบส่งถึงร้าน (curl)" }, ...GROUPS.map((g) => ({ id: g.id, label: g.title }))];
  return (
    <PortalShell user={user} path="/merchant/docs">
      <DocLayout title="คู่มือ API v1" subtitle={`ตัวอย่างจริงทุก endpoint: curl + Next.js พร้อมการสร้างลายเซ็น และผลลัพธ์จริง · Base URL: ${API_BASE}`} pdf="api-v1.pdf" toc={toc}>
        <Note>ตัวอย่างทุก endpoint เป็น<strong>ค่าจริงจากการรันกับระบบจริง</strong> เมื่อ {new Date(LIVE_RUN.capturedAt).toLocaleString("th-TH", { timeZone: "Asia/Bangkok", dateStyle: "long", timeStyle: "short" })} (ร้านทดสอบ my-shop) — key ที่ใช้ในตัวอย่าง (<code>{LIVE_RUN.apiKey.slice(0, 14)}…</code>, <code>{LIVE_RUN.secretKey.slice(0, 14)}…</code>) <strong>ถูกยกเลิกแล้ว</strong> ใช้ key ของร้านคุณแทน · ลายเซ็นในตัวอย่างคำนวณซ้ำได้จากค่าที่แสดง · กด <strong>คัดลอก</strong> ที่มุมขวาของแต่ละคำสั่ง</Note>
        <Section id="start" title="เริ่มต้นใช้งาน">
          <ol className="list-decimal space-y-1 pl-5">
            <li><strong>รับ key</strong> — หน้า <Link href="/merchant/settings" className="text-primary hover:underline">ตั้งค่า</Link> → กด <strong>สร้าง secret key</strong> ได้ <strong>API key</strong> (<code>ak_live_…</code>) และ <strong>secret key</strong> (<code>sk_live_…</code>) ทันที</li>
            <li><strong>เซ็นทุกคำขอ</strong> — ส่ง <code>X-API-Key</code>, <code>X-Timestamp</code>, <code>X-Signature</code> (ดูหัวข้อ “การเซ็นคำขอ”)</li>
            <li><strong>สร้างออเดอร์</strong> — <code>POST /payment/create</code> แล้วพาลูกค้าไปที่ <code>checkoutUrl</code></li>
            <li><strong>รับผล</strong> — ตั้ง webhook หรือเช็ค <code>GET /payment/order/:orderId</code></li>
          </ol>
          <div className="mt-3 mb-1 text-[11px] font-semibold tracking-wider text-soft uppercase">ตัวอย่างจริง: สร้างออเดอร์ (curl)</div>
          <CodeBlock code={CURL_EXAMPLES["POST /payment/create"].cmd} />
          <div className="mt-3 mb-1 text-[11px] font-semibold tracking-wider text-soft uppercase">ผลลัพธ์จริง — HTTP {CURL_EXAMPLES["POST /payment/create"].live.status}</div>
          <CodeBlock light code={CURL_EXAMPLES["POST /payment/create"].live.response} />
        </Section>
        <Section id="secret" title="Secret key และ API key">
          <Table head={["", "รูปแบบ", "ส่งไปกับคำขอ?", "ใช้ทำอะไร"]} rows={[
            ["API key", <code key="a">ak_live_…</code>, "ส่ง — header X-API-Key", "บอกว่าใครเรียก (ร้าน + ผู้ใช้)"],
            ["Secret key", <code key="s">sk_live_…</code>, <strong key="n">ห้ามส่ง</strong>, "เซ็นทุกคำขอ (X-Signature) ของ API key ผู้ใช้"],
            ["Signing secret", <code key="ss">ss_live_…</code>, <strong key="n2">ห้ามส่ง</strong>, "เซ็นคำขอของ API key ระดับร้าน (ที่ออกในการ์ด API Keys หรือโดยผู้ดูแล)"],
          ]} />
          <ol className="mt-2 list-decimal space-y-1 pl-5">
            <li>Merchant Portal → <Link href="/merchant/settings" className="text-primary hover:underline">ตั้งค่า</Link> → <strong>Secret key และ API key</strong> → กด <strong>สร้าง secret key</strong> — ได้ทั้งคู่ทันที แสดงแบบเต็มครั้งแรก</li>
            <li>ภายหลังแสดงแบบปิดบางส่วน — กด <strong>ดู</strong> + ยืนยันชื่อผู้ใช้/รหัสผ่าน เพื่อแสดงแบบเต็ม 1 นาที</li>
            <li>กด <strong>สร้างใหม่</strong> เพื่อเปลี่ยนทั้งคู่ (อันเดิมใช้ไม่ได้ทันที) · API key มีสิทธิ์ตามระดับผู้ใช้</li>
            <li>API key ระดับร้าน (การ์ด <strong>API Keys</strong>) ออกพร้อม <strong>signing secret</strong> แสดงครั้งเดียว — ใช้ทั้งคู่แทน API key + secret key ของผู้ใช้</li>
          </ol>
          <Note tone="warn">ขอ key ได้ใน Merchant Portal เท่านั้น (<code>/auth/login</code> เรียกจากภายนอกได้ <code>403 LOGIN_PORTAL_ONLY</code>) · key รูปแบบเดิม (<code>sk_live_</code> เป็น API key, <code>ms_live_</code>) ถูกยกเลิกทั้งหมดแล้ว · เก็บ secret ไว้ในเซิร์ฟเวอร์ของร้านเท่านั้น</Note>
        </Section>
        <Section id="sign" title="การเซ็นคำขอ (X-Timestamp + X-Signature)">
          <p><strong>บังคับทุก endpoint</strong> ที่ใช้ <code>X-API-Key</code> — ไม่มีเปิด/ปิด</p>
          <Steps3 />
          <div className="mt-3 mb-1 text-[11px] font-semibold tracking-wider text-soft uppercase">สตริงที่เซ็น</div>
          <CodeBlock light code={`<timestamp>.<METHOD>.<path รวม query>.<body>

ตัวอย่างจริง:
${CURL_EXAMPLES["POST /payment/create"].live.toSign}
${CURL_EXAMPLES["GET /transactions"].live.toSign}        ← GET ไม่มี body ลงท้ายด้วย "."`} />
          <div className="mt-3 mb-1 text-[11px] font-semibold tracking-wider text-soft uppercase">Next.js — helper ใช้ซ้ำได้ทุก endpoint</div>
          <CodeBlock code={NEXT_HELPER} />
          <div className="mt-3 mb-1 text-[11px] font-semibold tracking-wider text-soft uppercase">ผลลัพธ์จริงเมื่อเซ็นไม่ถูกต้อง</div>
          <Table head={["กรณี", "HTTP", "ผลลัพธ์จริง"]} rows={SIGNATURE_ERRORS.map((x) => [x.label, String(x.status), <code key="r" className="whitespace-pre-wrap">{JSON.parse(x.response).error.code}: {JSON.parse(x.response).error.message}</code>])} />
          <Note tone="warn">ส่ง body ให้ตรงกับสตริงที่เซ็นทุกตัวอักษร (อย่าจัดรูปแบบ JSON ใหม่หลังเซ็น) · timestamp คลาดได้ไม่เกิน 5 นาที · ลายเซ็นใช้ได้ครั้งเดียว · ห้ามเซ็นในหน้าเว็บหรือแอปที่ลูกค้าเห็น</Note>
        </Section>
        <Section id="slip" title="การตรวจสลิป">
          <p>ใช้กับ <code>POST /payment/slip/verify</code>, <code>POST /payment/:ref/slip</code>, <code>POST /payment/slip/create</code> (เมื่อส่ง image) และการแนบสลิปจากหน้าชำระเงินของลูกค้า</p>
          <Table head={["ข้อมูลบนสลิป", "ต้องตรงกับ", "ถ้าไม่ตรง"]} rows={[
            ["ยอดเงิน", "ยอดของรายการ ทุกสตางค์", "INVALID_SLIP"],
            ["บัญชีผู้รับ + ธนาคาร", "บัญชีรับเงินของรายการ", "INVALID_SLIP"],
            ["วันเวลาที่โอน", "หลังสร้างรายการ และไม่เก่าเกินกำหนด — ยกเว้นเงินโอนจากรายการก่อนหน้าของลูกค้าคนเดียวกันที่ยังไม่ได้ชำระ (สร้างก่อนเวลาโอน ≤ 24 ชม. บัญชีผู้รับเดียวกัน — ถ้ายังเปิดอยู่ ยกเลิกอัตโนมัติ) → ผ่าน พร้อม carriedFrom", "INVALID_SLIP"],
            ["ชื่อผู้โอน", <><code key="c">metadata.memberName</code> ตอนสร้างรายการ (ถ้าส่ง)</>, "ไม่ปฏิเสธ — ผู้อื่นโอนแทนได้ · แจ้งใน warnings (และหมายเหตุของรายการ)"],
            ["สลิปเดียวกัน", "ใช้ได้กับรายการเดียว (ตรวจจากไฟล์ และ QR ธนาคาร)", "INVALID_SLIP"],
            ["สลิปตัวอย่างจาก Option Pay", "ใช้แนบไม่ได้", <code key="c">400 SAMPLE_SLIP</code>],
          ]} />
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li><strong>มีผู้ให้บริการตรวจสลิป</strong> (EasySlip / SlipOK): ตรวจกับธนาคารจริง — ผ่านครบได้ <code>PAID</code> อัตโนมัติ</li>
            <li><strong>ไม่มีผู้ให้บริการ</strong>: ระบบอ่านข้อมูลจากภาพสลิป — ไม่ตรงได้ <code>INVALID_SLIP</code> · ตรงครบได้ <code>PENDING_REVIEW</code> รอผู้ดูแลยืนยัน (ไม่อนุมัติอัตโนมัติ)</li>
            <li>ทุกข้อที่ไม่ตรงอยู่ใน <code>mismatches</code> (array) พร้อมข้อความบอกสิ่งที่ต้องแก้ · หน้าชำระเงินแนบได้ครั้งเดียว (<code>409 SLIP_ALREADY_UPLOADED</code>) เว้นแต่สลิปก่อนหน้าไม่ผ่าน</li>
          </ul>
          <h3 className="mt-5 mb-1 text-[15px] font-semibold">โครงสร้าง JSON ของผลตรวจสลิป — กรณีปกติ vs เงินโอนจากออเดอร์ก่อนหน้า</h3>
          <p dangerouslySetInnerHTML={{ __html: SLIP_SAME_SHAPE }} />
          <Table head={["ชื่อฟิลด์ (key)", "ชนิดข้อมูล", "กรณีปกติ ①", "เงินโอนจากออเดอร์ก่อนหน้า ②", "มีทั้งสองกรณี"]} rows={SLIP_COMPARE.map(([k, t, a, b]) => [<code key="k">{k}</code>, <code key="t">{t}</code>, a, b, "✓"])} />
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li><strong>ตัดสินใจด้วย <code>result</code></strong>: <code>PAID</code> ส่งสินค้าได้ · <code>PENDING_REVIEW</code> รอ webhook · <code>INVALID_SLIP</code> แจ้งลูกค้าตาม <code>mismatches</code> — ทุกกรณีตอบ HTTP 200</li>
            <li><strong>อาจเป็น null</strong>: <code>carriedFrom</code> <code>carryOver</code> <code>slip</code> · <strong>อาจเป็น []</strong>: <code>mismatches</code> <code>warnings</code> <code>autoCancelled</code> · <code>checks</code> ไม่ว่างเสมอ</li>
            <li>เช็กกรณีพิเศษด้วย <code>carriedFrom !== null</code> และ <code>autoCancelled.length &gt; 0</code> — ไม่ต้องเช็กว่ามีฟิลด์หรือไม่</li>
            <li><code>message</code> / <code>detail</code> / <code>nextStep</code> เป็นข้อความภาษาไทยสำหรับแสดงผล อย่า parse</li>
            <li><strong>ข้อยกเว้น</strong>: HTTP ไม่ใช่ 2xx = ปฏิเสธก่อนตรวจ → <code>{"{ error: { code, message, details? } }"}</code> · หน้าชำระเงินของลูกค้า (<code>/payment/checkout/:transactionId/slip</code>) ตอบแบบย่อ <code>success verified result message mismatches status</code></li>
          </ul>
          <div className={H}>ตัวอย่างเต็มทั้งสองกรณี — ดู <code>POST /payment/slip/verify</code> ในหัวข้อ Payment</div>
          <Note tone="warn">ส่ง <code>metadata.memberName</code> ให้ตรงกับชื่อบัญชีธนาคารที่ลูกค้าจะใช้โอน (ไม่ต้องมีคำนำหน้า) หรือไม่ต้องส่งถ้าไม่ทราบ</Note>
        </Section>
        <Section id="slip-retry" title="ส่งสลิป: timeout และการส่งซ้ำ">
          <p>การส่งสลิปใช้เวลาประมาณ <strong>3–5 วินาที</strong> (ส่วนใหญ่คือการตรวจกับธนาคารผ่าน EasySlip) — บางครั้งธนาคารตอบช้าจนนานถึง 20 วินาทีขึ้นไป ระบบของร้านจึงควรรับมือกับ “ไม่ได้รับคำตอบ” ได้ถูกต้อง</p>
          <Note tone="warn"><strong>หมดเวลา (timeout) ไม่ได้แปลว่าส่งไม่สำเร็จ</strong> — เซิร์ฟเวอร์อาจตรวจเสร็จและอนุมัติแล้ว แต่คำตอบมาไม่ถึง · ห้ามเดา: ถามสถานะออเดอร์ก่อนทุกครั้ง · ห้ามสร้างออเดอร์ใหม่เพราะ timeout (จะได้ออเดอร์ซ้ำ)</Note>
          <Table head={["สิ่งที่เกิดขึ้น", "ความหมาย", "ระบบของร้านควรทำ"]} rows={[
            [<>HTTP 200 · <code key="c">result: PAID</code></>, "ตรวจผ่าน ออเดอร์ชำระแล้ว", "จบ — ส่งสินค้า/บริการได้"],
            [<>HTTP 200 · <code key="c">result: PENDING_REVIEW</code></>, "รอเจ้าหน้าที่ตรวจ (เช่น ธนาคารไม่ตอบ)", <>รอ webhook <code key="w">payment.approved</code> / <code key="r">payment.rejected</code> — ไม่ต้องส่งซ้ำ</>],
            [<>HTTP 200 · <code key="c">result: INVALID_SLIP</code></>, "สลิปไม่ผ่าน (ยอด / บัญชี / เวลา / ซ้ำ)", <>แจ้งลูกค้าตาม <code key="m">mismatches</code> — <strong key="s">ส่งสลิปเดิมซ้ำไม่ช่วย</strong> ต้องเป็นสลิปที่ถูกต้อง</>],
            ["หมดเวลา / เครือข่ายขัดข้อง / ไม่มีคำตอบ", "ไม่รู้ผล — อาจสำเร็จแล้ว", <>เรียก <code key="g">GET /payment/order/:orderId</code> → <code key="p">PAID</code> = จบ · <code key="q">PENDING</code> = ส่งสลิปเดิมเข้าออเดอร์เดิมอีกครั้ง</>],
            [<>HTTP <code key="c">502 / 503 / 504</code></>, "เซิร์ฟเวอร์ไม่พร้อมชั่วคราว (เช่น ระหว่างอัปเดตระบบ)", "รอแล้วส่งซ้ำ (ดูจังหวะด้านล่าง)"],
            [<>HTTP <code key="c">409 ORDER_NOT_PENDING</code></>, "ออเดอร์ไม่รอชำระแล้ว — มักเพราะครั้งก่อนสำเร็จ", <>เรียก <code key="g">GET /payment/order/:orderId</code> ยืนยัน — <code key="p">PAID</code> = จบ</>],
            [<>HTTP <code key="c">401 SIGNATURE_REUSED · TIMESTAMP_EXPIRED</code></>, "ส่งซ้ำด้วยลายเซ็น/เวลาเดิม", "เซ็นใหม่ทุกครั้งที่ส่ง (timestamp ใหม่) — helper ด้านล่างทำให้อัตโนมัติ"],
            [<>HTTP <code key="c">400</code> อื่น ๆ (<code key="v">validation_error</code>, <code key="i">INVALID_SLIP</code> ไฟล์ไม่ใช่รูป/ใหญ่เกิน 8 MB, <code key="s">SAMPLE_SLIP</code>) · <code key="n">404 ORDER_NOT_FOUND</code></>, "คำขอผิด", <><strong key="x">อย่าส่งซ้ำ</strong> — แก้คำขอ (orderId / ไฟล์ / field)</>],
          ]} />
          <div className={H}>กติกาการส่งซ้ำ</div>
          <ul className="mt-1 list-disc space-y-1 pl-5">
            <li><strong>ตั้ง timeout 60 วินาที</strong> สำหรับการส่งสลิป (สั้นกว่านี้จะตัดรายการที่ธนาคารตอบช้าทิ้งโดยไม่จำเป็น)</li>
            <li><strong>ส่งซ้ำได้อย่างปลอดภัย</strong> — สลิปเดิมเข้าออเดอร์เดิมไม่ทำให้ชำระซ้ำ: เงินโอนหนึ่งรายการชำระได้ออเดอร์เดียวเสมอ และออเดอร์ที่ชำระแล้วตอบ <code>409 ORDER_NOT_PENDING</code></li>
            <li>ส่งซ้ำเฉพาะ <strong>timeout / เครือข่ายขัดข้อง / 502 / 503 / 504</strong> — รอ 2, 5, 15 วินาที ไม่เกิน 3 ครั้ง · ถามสถานะออเดอร์ก่อนส่งซ้ำทุกครั้งหลัง timeout</li>
            <li><strong>เซ็นคำขอใหม่ทุกครั้ง</strong> — ลายเซ็นใช้ได้ครั้งเดียว และ timestamp คลาดได้ไม่เกิน 5 นาที</li>
            <li><strong>ผลสุดท้ายยึด webhook</strong> <code>payment.approved</code> / <code>payment.rejected</code> — แม้คำตอบของการส่งสลิปจะหายไป ร้านยังได้รับผลทาง webhook</li>
            <li>ย่อรูปก่อนส่ง (กว้างประมาณ 1000 px, JPEG คุณภาพ 80%) — ส่งเร็วขึ้น และต้องไม่ครอปจน QR หาย</li>
            <li>หน้าชำระเงินของลูกค้า (<code>/payment/checkout/:transactionId/slip</code>) แนบได้ครั้งเดียว — ส่งซ้ำหลังสำเร็จได้ <code>409 SLIP_ALREADY_UPLOADED</code> ซึ่งแปลว่าได้รับสลิปแล้ว</li>
          </ul>
          <div className={H}>Next.js — ส่งสลิปพร้อมจัดการ timeout และส่งซ้ำ</div>
          <CodeBlock code={SLIP_RETRY_HELPER} />
        </Section>
        <ValidationReportSection />
        <Section id="perms" title="สิทธิ์และข้อผิดพลาด">
          <p>key ของผู้ใช้ร้านค้าใช้ได้เฉพาะสิทธิ์ของระดับผู้ใช้ (รายการสิทธิ์ส่งกลับใน <code>permissions</code> ตอน login) · key ที่ผู้ดูแลออกให้ร้านใช้ได้ทุกเส้น · ค่าเริ่มต้น (ผู้ดูแลระบบปรับได้):</p>
          <Table head={["สิทธิ์", "ความหมาย", "เจ้าของร้าน", "พนักงาน", "ดูอย่างเดียว"]} rows={MERCHANT_PERMISSIONS.filter((p) => p.code !== "manage_api_keys").map((p) => [<code key="c">{p.code}</code>, p.label, "✓", ["view_dashboard", "view_transactions", "create_payment"].includes(p.code) ? "✓" : "—", ["view_dashboard", "view_transactions"].includes(p.code) ? "✓" : "—"])} />
          <Table head={["HTTP", "code", "เมื่อไร"]} rows={[
            ["400", <code key="c">validation_error</code>, "ขาด field / รูปแบบผิด (ดู details)"],
            ["400", <code key="c">INSUFFICIENT_BALANCE · below_min_balance · below_min_amount</code>, "ยอดไม่พอ / ต่ำกว่าขั้นต่ำ"],
            ["400", <code key="c">INVALID_SLIP · SAMPLE_SLIP</code>, "ไฟล์สลิปไม่ใช่รูป/ใหญ่เกิน 8 MB · แนบสลิปตัวอย่าง"],
            ["401", <code key="c">INVALID_API_KEY</code>, "API key ผิด ถูกเพิกถอน หรือเป็นรูปแบบเดิม (ต้องเป็น ak_live_)"],
            ["401", <code key="c">SIGNATURE_REQUIRED · INVALID_SIGNATURE · TIMESTAMP_EXPIRED · SIGNATURE_REUSED</code>, "ไม่ได้เซ็น · ลายเซ็นไม่ตรง · เวลาคลาดเกิน 5 นาที · ส่งลายเซ็นเดิมซ้ำ"],
            ["403", <code key="c">LOGIN_PORTAL_ONLY</code>, "เรียก /auth/login จากภายนอก — ขอ API key ใน Merchant Portal → ตั้งค่า"],
            ["403", <code key="c">PERMISSION_DENIED</code>, "ระดับผู้ใช้ไม่มีสิทธิ์ทำสิ่งนี้"],
            ["404", <code key="c">ORDER_NOT_FOUND · TRANSACTION_NOT_FOUND</code>, "ไม่พบรายการของร้านนี้"],
            ["409", <code key="c">DUPLICATE_ORDER_ID · ORDER_NOT_PENDING · SLIP_ALREADY_UPLOADED</code>, "ซ้ำ / สถานะไม่อนุญาต / หน้าชำระเงินแนบสลิปไปแล้ว"],
            ["429", <code key="c">RATE_LIMITED</code>, "login ถี่เกิน 10 ครั้งต่อนาที"],
          ]} />
          {derived ? (
            <Note>ตรวจลายเซ็น callback ของร้านคุณ: ใช้วิธีเซ็นด้วย secret key ของร้าน (<code>sk_live_…</code>) — ดูสูตรและโค้ดที่หัวข้อ <a href="#callbacks" className="text-primary hover:underline">Callback ที่ระบบส่งถึงร้าน (curl)</a></Note>
          ) : (
            <>
          <div className="mt-3 mb-1 text-[11px] font-semibold tracking-wider text-soft uppercase">ตรวจลายเซ็น Webhook (Node.js)</div>
          <CodeBlock code={`import { createHmac, timingSafeEqual } from "node:crypto";
function verify(rawBody, header, secret) {          // header = X-Signature: t=...,v1=...
  const { t, v1 } = Object.fromEntries(header.split(",").map((p) => p.split("=")));
  if (Math.abs(Date.now() / 1000 - Number(t)) > 300) return false;
  const want = createHmac("sha256", secret).update(\`\${t}.\${rawBody}\`).digest("hex");
  return want.length === v1.length && timingSafeEqual(Buffer.from(want), Buffer.from(v1));
}`} />
            </>
          )}
        </Section>
        <Section id="callbacks" title="Callback ที่ระบบส่งถึงร้าน — รูปแบบคำขอ (curl)">
          <p>เมื่อสถานะรายการเปลี่ยน Option Pay ยิง <code>POST</code> ไปที่ URL webhook ของร้าน (ตั้งที่ <code>POST /webhooks</code>) — คำขอจริงเหมือนคำสั่ง curl ด้านล่าง<strong>ทุกตัวอักษร</strong>: header 4 ตัวนี้เท่านั้น (ชื่อตัวพิมพ์เล็ก) และ body เป็น JSON บรรทัดเดียว เรียงพารามิเตอร์ตามตัวอย่าง</p>
          <Table head={["Header", "ค่า"]} rows={[
            [<code key="h">content-type</code>, <code key="v">application/json</code>],
            [<code key="h">user-agent</code>, <code key="v">OptionPay-Webhook/1.0</code>],
            [<code key="h">x-webhook-event</code>, "ชื่อ event เช่น payment.approved"],
            [<code key="h">x-signature</code>, derived
              ? <><code key="v">{"t=<unix วินาที>,v1=<hex>"}</code> — เซ็นด้วย <strong>secret key ของร้าน</strong> (<code>sk_live_…</code>) 2 ขั้น: ดูกรอบด้านล่าง</>
              : <><code key="v">{"t=<unix วินาที>,v1=<hex>"}</code> — v1 = HMAC-SHA256(webhook secret <code>whsec_…</code>, <code>{"t + \".\" + body"}</code>)</>],
          ]} />
          <Table head={["Event", "ส่งเมื่อ", "พารามิเตอร์ใน body (ตามลำดับ)"]} rows={[
            [<code key="e">payment.approved · payment.rejected</code>, "ออเดอร์อนุมัติ / ปฏิเสธ", <code key="b">event, ref, orderId, amount, status, createdAt, resentAt</code>],
            [<code key="e">payout.completed · payout.failed</code>, "โอน payout แล้ว / payout ถูกปฏิเสธ", <code key="b">event, ref, orderId, merchantRef, amount, status, failureReason, createdAt, completedAt</code>],
          ]} />
          <ul className="mt-2 list-disc space-y-1 pl-5 text-[13px]">
            <li><code>amount</code> เป็นข้อความทศนิยม 2 ตำแหน่ง · เวลาเป็น ISO 8601 (UTC) · payment: <code>resentAt</code> = เวลาที่ส่งครั้งนั้น · payout: <code>orderId</code> = <code>merchantRef</code> ที่ร้านส่งตอนสร้าง, <code>failureReason</code> = เหตุผลเมื่อ failed (ไม่เช่นนั้น <code>null</code>)</li>
            <li><strong>ส่งซ้ำ</strong> (ปลายทางไม่ตอบ 2xx — ลองใหม่สูงสุด 5 ครั้ง หรือเจ้าหน้าที่กดส่งซ้ำ) ใช้คำขอรูปแบบเดิม แต่ <code>t</code> และลายเซ็นใหม่ทุกครั้ง — ร้านควรรองรับ event เดิมซ้ำ (idempotent) และปฏิเสธ <code>t</code> ที่เก่าเกิน 5 นาที</li>
            <li><code>payment.expired</code> / <code>payment.refunded</code> ใช้ body แบบ payment · <code>withdrawal.*</code> ใช้ body แบบ payout — ส่งเฉพาะ event ที่ร้านสมัครและเปิดไว้</li>
            <li>ตอบกลับด้วย HTTP 2xx = รับแล้ว · Option Pay บันทึกทุกการส่งพร้อมคำตอบของร้าน และแจ้งในกลุ่ม Telegram ที่ตกลงกับร้าน (ถ้ามี) <strong>พร้อมคำสั่ง curl ที่ส่งจริง</strong> และคำตอบของร้าน — ใช้รันซ้ำเพื่อตรวจสอบได้</li>
          </ul>
          {derived && (
            <>
              {!ownPath && <Note>ร้านคุณยังไม่ได้ตั้ง webhook — สูตรและโค้ดด้านล่างใช้ path ตัวอย่าง <code>{CALLBACK_DEMO_PATH}</code> · เมื่อตั้ง webhook แล้ว ให้ใช้ path ของ webhook URL ของร้านแทน (หน้านี้จะแสดง path จริงให้อัตโนมัติ)</Note>}
              <Note>ลายเซ็น callback ของร้านคุณ<strong>เซ็นด้วย secret key ของร้าน</strong> (<code>sk_live_…</code> ตัวเดียวกับที่ใช้เซ็นคำขอ API) ไม่ใช้ webhook secret <code>whsec_…</code> — คำนวณ 2 ขั้นต่อ callback (ค่า <code>key</code> เปลี่ยนทุกครั้งตาม <code>t</code> และ body) · ถ้าสร้าง secret key ใหม่ ต้องใช้ตัวใหม่ตรวจลายเซ็นทันที</Note>
              <Note><strong>ทำไมลายเซ็นที่ร้านคำนวณจะตรงกับของ Option Pay:</strong> HMAC-SHA256 ให้ผลเดิมทุกครั้งเมื่อ input เหมือนกัน — และทั้งสองฝั่งใช้ input ชุดเดียวกันครบทุกตัว: (1) <strong>secret key เดียวกัน</strong> — <code>sk_live_…</code> ของร้านบังหนุ่ม (ร้านย่อยใช้ของร้านแม่) · (2) <strong>body เดียวกันทุกตัวอักษร</strong> — ร้านใช้ body ดิบที่ได้รับ ไม่แปลง JSON ก่อน · (3) <strong><code>t</code> เดียวกัน</strong> — อ่านจาก header <code>x-signature</code> · (4) <strong>path และสูตรเดียวกัน</strong> — <code>{cbPath}</code> และ 2 ขั้นด้านล่าง → จึงได้ <code>v1</code> เท่ากับที่ Option Pay ส่งมา · ถ้าต่างแม้แต่ตัวเดียว แปลว่า body ถูกแก้ระหว่างทาง ใช้ key ไม่ตรงกัน หรือคำขอไม่ได้มาจาก Option Pay — ให้ปฏิเสธ (401)</Note>
              <SignatureMatchExplained path={cbPath} />
              <Table head={["ขั้น", "สูตร"]} rows={[
                ["1. key", <code key="k">{`key = HMAC-SHA256(sk_live_…, t + ".POST.${cbPath}." + body)`}</code>],
                ["2. v1", <code key="v">{"v1 = HMAC-SHA256(key, t + \".\" + body)"}</code>],
                ["header", <code key="x">{"x-signature: t=<t>,v1=<v1>"}</code>],
              ]} />
              <div className="mt-3 mb-1 text-[11px] font-semibold tracking-wider text-soft uppercase">คำนวณ v1 ด้วย openssl</div>
              <CodeBlock code={`KEY=$(printf '%s' "$T.POST.${cbPath}.$BODY" | openssl dgst -sha256 -hmac "$SECRET" | awk '{print $NF}')   # SECRET = sk_live_… ของร้าน
V1=$(printf '%s' "$T.$BODY" | openssl dgst -sha256 -hmac "$KEY" | awk '{print $NF}')
# เทียบกับ v1 ใน header x-signature: t=$T,v1=...`} />
              <div className="mt-4 mb-1 text-[11px] font-semibold tracking-wider text-soft uppercase">โค้ดจริง Next.js (App Router) — รับ callback และตรวจลายเซ็น</div>
              <p className="mb-2 text-[13px] text-muted">วางเป็นไฟล์ <code>{`app${cbPath}/route.ts`}</code> แล้วตั้ง <code>OPTIONPAY_SECRET_KEY</code> = secret key (<code>sk_live_…</code>) ของร้านบังหนุ่ม ใน <code>.env</code> — key ตัวเดียวกับที่ Option Pay ใช้เซ็น callback นี้ (ร้านย่อยใช้ key ของร้านแม่) · ทดสอบกับลายเซ็นจริงแล้ว: callback จริงได้ 200 · แก้ body / ลายเซ็นเก่าเกิน 5 นาที / ไม่มี header ได้ 401</p>
              <CodeBlock code={nextjsCallbackVerifier(cbPath)} />
              <div className="mt-3 mb-1 text-[11px] font-semibold tracking-wider text-soft uppercase">ตรวจลายเซ็น callback (Node.js)</div>
              <CodeBlock code={`import { createHmac, timingSafeEqual } from "node:crypto";
function verifyCallback(rawBody, header, skLive) {     // header = x-signature: t=...,v1=...
  const { t, v1 } = Object.fromEntries(header.split(",").map((p) => p.split("=")));
  if (Math.abs(Date.now() / 1000 - Number(t)) > 300) return false;
  const key = createHmac("sha256", skLive).update(\`\${t}.POST.${cbPath}.\${rawBody}\`).digest("hex");
  const want = createHmac("sha256", key).update(\`\${t}.\${rawBody}\`).digest("hex");
  return want.length === v1.length && timingSafeEqual(Buffer.from(want), Buffer.from(v1));
}`} />
            </>
          )}
          {realExamples.length > 0 && (
            <>
              <Note>ด้านล่างคือ<strong>คำขอจริงที่ Option Pay ส่งถึงร้านคุณล่าสุด</strong> แยกตาม event — คำสั่ง curl ตรงกับที่ส่งจริงทุกตัวอักษร (ตรวจแล้วว่าลายเซ็นตรงกับ body) ยกเว้น URL ปลายทางที่แสดงเป็น <code>{"<webhook-url goes here>"}</code> — แทนด้วย URL webhook ของร้านคุณ (ลายเซ็นไม่ได้รวม URL จึงยังใช้ได้) · ลายเซ็นยังใช้ได้จริง เก็บเป็นความลับ อย่าแชร์นอกทีม</Note>
              {realExamples.map((x) => (
                <div key={x.event}>
                  <div className="mt-4 mb-1 text-[11px] font-semibold tracking-wider text-soft uppercase">
                    ตัวอย่างจริง: {x.event} — ส่งเมื่อ {new Date(x.sentAt).toLocaleString("th-TH", { timeZone: "Asia/Bangkok", dateStyle: "medium", timeStyle: "medium" })}
                  </div>
                  <CodeBlock code={x.cmd} />
                  {x.reply && <div className="mt-1 text-[12px] text-muted">ปลายทางตอบ: <code>{x.reply}</code></div>}
                </div>
              ))}

            </>
          )}
          {realExamples.length === 0 && (
            <>
          {CALLBACK_EXAMPLES.map((x) => (
            <div key={x.event}>
              <div className="mt-4 mb-1 text-[11px] font-semibold tracking-wider text-soft uppercase">{x.event} — {x.when}</div>
              <CodeBlock code={x.cmd} />
            </div>
          ))}
          <Note>ตัวอย่างใช้ค่าสมมติ (URL ร้าน, เลขรายการ) แต่<strong>ลายเซ็นคำนวณจริง</strong>ด้วยวิธีเดียวกับของจริง — secret key ทดสอบ <code>{CALLBACK_DEMO_SECRET}</code> และ path <code>{CALLBACK_DEMO_PATH}</code> — ใช้ทดสอบโค้ดตรวจลายเซ็นของร้านได้ทันที (ตอนทดสอบให้ข้ามการเช็คเวลา 5 นาทีชั่วคราว เพราะ <code>t</code> ในตัวอย่างเป็นเวลาในอดีต) · ของจริงใช้ <code>sk_live_…</code> ของร้านคุณ และ path ของ webhook URL ของร้านคุณ</Note>
            </>
          )}
        </Section>
        {GROUPS.map((g) => (
          <Section key={g.id} id={g.id} title={g.title}>
            {g.sub && <p className="mb-3 text-muted" dangerouslySetInnerHTML={{ __html: fill(g.sub) }} />}
            {g.eps.map((e) => <Endpoint key={e.m + e.p} e={e} />)}
          </Section>
        ))}
      </DocLayout>
    </PortalShell>
  );
}
