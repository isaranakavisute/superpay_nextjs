import type { Metadata } from "next";
import Link from "next/link";
import { API_BASE, CURL_EXAMPLES, LIVE_RUN, NEXT_HELPER, SIGNATURE_ERRORS } from "@/lib/api-curl-examples";
import { MERCHANT_PERMISSIONS } from "@/lib/merchant-perms";
import { requirePortal } from "@/lib/portal";
import { LOGIN, SECTIONS, type Ep } from "../../../api-docs/docs";
import { PortalShell } from "../../PortalShell";
import { CodeBlock } from "../CodeBlock";
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
        <div className={H}>ผลลัพธ์จริง — HTTP {c.live.status}</div><CodeBlock light code={c.live.response} />
      </>}
      {e.note && <div className="mt-3 rounded-lg border-l-[3px] border-primary bg-primary-50 px-3.5 py-2.5 text-[13px] leading-relaxed" dangerouslySetInnerHTML={{ __html: fill(e.note) }} />}
    </div>
  );
}

export default async function ApiGuidePage() {
  const user = await requirePortal("/merchant/docs/api");
  const toc = [{ id: "start", label: "เริ่มต้นใช้งาน" }, { id: "secret", label: "Secret key และ API key" }, { id: "sign", label: "การเซ็นคำขอ (X-Signature)" }, { id: "slip", label: "การตรวจสลิป" }, { id: "perms", label: "สิทธิ์และข้อผิดพลาด" }, ...GROUPS.map((g) => ({ id: g.id, label: g.title }))];
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
            ["วันเวลาที่โอน", "หลังสร้างรายการ และไม่เก่าเกินกำหนด", "INVALID_SLIP"],
            ["ชื่อผู้โอน", <><code key="c">metadata.memberName</code> ตอนสร้างรายการ (ถ้าส่ง)</>, "ไม่ปฏิเสธ — ผู้อื่นโอนแทนได้ · แจ้งใน warnings (และหมายเหตุของรายการ)"],
            ["สลิปเดียวกัน", "ใช้ได้กับรายการเดียว (ตรวจจากไฟล์ และ QR ธนาคาร)", "INVALID_SLIP"],
            ["สลิปตัวอย่างจาก Option Pay", "ใช้แนบไม่ได้", <code key="c">400 SAMPLE_SLIP</code>],
          ]} />
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li><strong>มีผู้ให้บริการตรวจสลิป</strong> (EasySlip / SlipOK): ตรวจกับธนาคารจริง — ผ่านครบได้ <code>PAID</code> อัตโนมัติ</li>
            <li><strong>ไม่มีผู้ให้บริการ</strong>: ระบบอ่านข้อมูลจากภาพสลิป — ไม่ตรงได้ <code>INVALID_SLIP</code> · ตรงครบได้ <code>PENDING_REVIEW</code> รอผู้ดูแลยืนยัน (ไม่อนุมัติอัตโนมัติ)</li>
            <li>ทุกข้อที่ไม่ตรงอยู่ใน <code>mismatches</code> (array) พร้อมข้อความบอกสิ่งที่ต้องแก้ · หน้าชำระเงินแนบได้ครั้งเดียว (<code>409 SLIP_ALREADY_UPLOADED</code>) เว้นแต่สลิปก่อนหน้าไม่ผ่าน</li>
          </ul>
          <Note tone="warn">ส่ง <code>metadata.memberName</code> ให้ตรงกับชื่อบัญชีธนาคารที่ลูกค้าจะใช้โอน (ไม่ต้องมีคำนำหน้า) หรือไม่ต้องส่งถ้าไม่ทราบ</Note>
        </Section>
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
          <div className="mt-3 mb-1 text-[11px] font-semibold tracking-wider text-soft uppercase">ตรวจลายเซ็น Webhook (Node.js)</div>
          <CodeBlock code={`import { createHmac, timingSafeEqual } from "node:crypto";
function verify(rawBody, header, secret) {          // header = X-Signature: t=...,v1=...
  const { t, v1 } = Object.fromEntries(header.split(",").map((p) => p.split("=")));
  if (Math.abs(Date.now() / 1000 - Number(t)) > 300) return false;
  const want = createHmac("sha256", secret).update(\`\${t}.\${rawBody}\`).digest("hex");
  return want.length === v1.length && timingSafeEqual(Buffer.from(want), Buffer.from(v1));
}`} />
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
