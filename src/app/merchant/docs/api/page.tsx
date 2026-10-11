import type { Metadata } from "next";
import Link from "next/link";
import { API_BASE, CURL_EXAMPLES } from "@/lib/api-curl-examples";
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
const GROUPS = [{ id: "auth", title: "การยืนยันตัวตน (Authentication)", sub: `ทุก request ใต้ <code>/api/v1/</code> ต้องส่ง header <code>X-API-Key</code> ยกเว้น login, <code>/collect</code> (ส่ง key ใน body) และหน้า checkout/QR ของลูกค้า`, eps: [LOGIN] }, ...SECTIONS];
const slug = (e: Ep) => `${e.m}-${e.p}`.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+$/, "");

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
      {c && <><div className="mt-3 mb-1 text-[11px] font-semibold tracking-wider text-soft uppercase">ตัวอย่างคำสั่ง</div><CodeBlock code={c.cmd} /></>}
      {c?.also && <><div className="mt-3 mb-1 text-[11px] font-semibold tracking-wider text-soft uppercase">{c.also.label}</div><CodeBlock code={c.also.cmd} /></>}
      {e.body && <><div className="mt-3 mb-1 text-[11px] font-semibold tracking-wider text-soft uppercase">คำอธิบายฟิลด์</div><CodeBlock code={fill(e.body)} light /></>}
      {e.res && <><div className="mt-3 mb-1 text-[11px] font-semibold tracking-wider text-soft uppercase">ตัวอย่าง Response</div><CodeBlock code={fill(e.res)} light /></>}
      {e.note && <div className="mt-3 rounded-lg border-l-[3px] border-primary bg-primary-50 px-3.5 py-2.5 text-[13px] leading-relaxed" dangerouslySetInnerHTML={{ __html: fill(e.note) }} />}
    </div>
  );
}

export default async function ApiGuidePage() {
  const user = await requirePortal("/merchant/docs/api");
  const toc = [{ id: "start", label: "เริ่มต้นใช้งาน" }, { id: "secret", label: "Secret key" }, { id: "perms", label: "สิทธิ์และข้อผิดพลาด" }, ...GROUPS.map((g) => ({ id: g.id, label: g.title }))];
  return (
    <PortalShell user={user} path="/merchant/docs">
      <DocLayout title="คู่มือ API v1" subtitle={`ตัวอย่างคำสั่ง curl แบบเต็มสำหรับทุก endpoint พร้อมสิทธิ์ที่ต้องใช้ · Base URL: ${API_BASE}`} pdf="api-v1.pdf" toc={toc}>
        <Note>ตัวอย่างใช้ค่าสมมติ (เช่น <code>sk_live_YOUR_API_KEY</code>, <code>ORD-001</code>) — แทนด้วยค่าจริงของร้านก่อนรัน · กด <strong>คัดลอก</strong> ที่มุมขวาของแต่ละคำสั่ง · เก็บ API key เป็นความลับ</Note>
        <Section id="start" title="เริ่มต้นใช้งาน">
          <ol className="list-decimal space-y-1 pl-5">
            <li><strong>ขอ API key</strong> — สร้าง secret key ที่หน้า <Link href="/merchant/settings" className="text-primary hover:underline">ตั้งค่า</Link> แล้ว login ผ่าน <code>POST /auth/login</code> (API ไม่รับรหัสผ่าน) หรือออก key ในหน้า <Link href="/merchant/settings" className="text-primary hover:underline">ตั้งค่า</Link></li>
            <li><strong>สร้างออเดอร์</strong> — <code>POST /payment/create</code></li>
            <li><strong>ให้ลูกค้าจ่าย</strong> — พาไปที่ <code>checkoutUrl</code> หรือแสดงรูป <code>qrCode</code></li>
            <li><strong>รับผล</strong> — ตั้ง webhook หรือเช็ค <code>GET /payment/order/:orderId</code></li>
          </ol>
          <div className="mt-3 mb-1 text-[11px] font-semibold tracking-wider text-soft uppercase">ตัวอย่างเต็ม: login → สร้างออเดอร์ → เช็คสถานะ</div>
          <CodeBlock code={`# 1) login ด้วย secret key เพื่อรับ API key (เก็บไว้ในตัวแปร KEY)
KEY=$(curl -s -X POST "${API_BASE}/auth/login" \\
  -H "Content-Type: application/json" \\
  -d '{"secretKey":"ms_live_YOUR_SECRET_KEY"}' | sed -E 's/.*"apiKey":"([^"]+)".*/\\1/')

# 2) สร้างออเดอร์ 100 บาท
curl -X POST "${API_BASE}/payment/create" \\
  -H "X-API-Key: $KEY" -H "Content-Type: application/json" \\
  -d '{"amount":100,"orderId":"ORD-001"}'

# 3) เช็คสถานะออเดอร์
curl "${API_BASE}/payment/order/ORD-001" -H "X-API-Key: $KEY"`} />
          <Note>ทุก login ออก key ใหม่และเพิกถอน key ที่ได้จาก login ครั้งก่อน — ใช้ key จากการ login ล่าสุดเสมอ · เก็บ secret key ไว้ในเซิร์ฟเวอร์ของร้านเท่านั้น ถ้าหลุดให้กด <strong>สร้างใหม่</strong> ในหน้าตั้งค่าทันที</Note>
        </Section>
        <Section id="secret" title="Secret key (ใช้ login แทนรหัสผ่าน)">
          <p><code>POST /auth/login</code> ไม่รับอีเมล/รหัสผ่าน — ส่ง <code>secretKey</code> ของผู้ใช้ร้านค้าแทน ได้ API key ตามสิทธิ์ระดับของผู้ใช้นั้น (owner / staff / viewer)</p>
          <ol className="mt-2 list-decimal space-y-1 pl-5">
            <li>เข้า Merchant Portal ด้วยอีเมล/username + รหัสผ่าน แล้วไปที่ <Link href="/merchant/settings" className="text-primary hover:underline">ตั้งค่า</Link> → <strong>Secret key (สำหรับ login ผ่าน API)</strong></li>
            <li>กด <strong>สร้าง secret key</strong> แล้วคัดลอก <code>ms_live_...</code> เก็บไว้ทันที — แสดงครั้งเดียว ระบบเก็บเฉพาะ hash</li>
            <li>ระบบของร้านเรียก <code>POST /auth/login</code> ด้วย <code>{"{\"secretKey\": \"ms_live_...\"}"}</code> แล้วใช้ <code>apiKey</code> ที่ได้ใน header <code>X-API-Key</code></li>
          </ol>
          <Note tone="warn">ทุกผู้ใช้ทุกระดับสร้าง secret key ของตัวเองได้ · secret key ใช้แทน <code>X-API-Key</code> ไม่ได้ (ใช้ได้กับ login เท่านั้น) · ถ้าหลุดให้กด <strong>สร้างใหม่</strong> หรือ <strong>ยกเลิก</strong> — อันเดิมและ API key ที่ login ด้วยอันเดิมใช้ไม่ได้ทันที · เก็บไว้ในเซิร์ฟเวอร์ของร้านเท่านั้น</Note>
        </Section>
        <Section id="perms" title="สิทธิ์และข้อผิดพลาด">
          <p>key ของผู้ใช้ร้านค้าใช้ได้เฉพาะสิทธิ์ของระดับผู้ใช้ (รายการสิทธิ์ส่งกลับใน <code>permissions</code> ตอน login) · key ที่ผู้ดูแลออกให้ร้านใช้ได้ทุกเส้น · ค่าเริ่มต้น (ผู้ดูแลระบบปรับได้):</p>
          <Table head={["สิทธิ์", "ความหมาย", "เจ้าของร้าน", "พนักงาน", "ดูอย่างเดียว"]} rows={MERCHANT_PERMISSIONS.filter((p) => p.code !== "manage_api_keys").map((p) => [<code key="c">{p.code}</code>, p.label, "✓", ["view_dashboard", "view_transactions", "create_payment"].includes(p.code) ? "✓" : "—", ["view_dashboard", "view_transactions"].includes(p.code) ? "✓" : "—"])} />
          <Table head={["HTTP", "code", "เมื่อไร"]} rows={[
            ["400", <code key="c">validation_error</code>, "ขาด field / รูปแบบผิด (ดู details)"],
            ["400", <code key="c">INSUFFICIENT_BALANCE · below_min_balance · below_min_amount</code>, "ยอดไม่พอ / ต่ำกว่าขั้นต่ำ"],
            ["400", <code key="c">SECRET_KEY_REQUIRED</code>, "login ด้วยอีเมล/รหัสผ่าน — API รับเฉพาะ secretKey"],
            ["401", <code key="c">INVALID_API_KEY · INVALID_SECRET_KEY</code>, "API key ผิดหรือถูกเพิกถอน · secret key ผิดหรือถูกยกเลิก"],
            ["403", <code key="c">PERMISSION_DENIED</code>, "ระดับผู้ใช้ไม่มีสิทธิ์ทำสิ่งนี้"],
            ["404", <code key="c">ORDER_NOT_FOUND · TRANSACTION_NOT_FOUND</code>, "ไม่พบรายการของร้านนี้"],
            ["409", <code key="c">DUPLICATE_ORDER_ID · ORDER_NOT_PENDING</code>, "ซ้ำ / สถานะไม่อนุญาต"],
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
