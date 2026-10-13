import Link from "next/link";
import { Note, Section, Shot, Steps, Table } from "../DocLayout";
import EX from "./sub-example.json";

/**
 * Manual sections 9–10: sub-merchants (create / configure / view) and the parent's dashboard + how the money
 * is computed. Every figure in the worked example is real — read from the demo tree "Siam Holding"
 * (src/app/merchant/docs/manual/sub-example.json, captured from production after the run).
 */
type Shop = (typeof EX.shops)[number];
const baht = (v: number | string) => `฿${Number(v).toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const pct = (v: number | string) => `${Number(v)}%`;
const rateIn = (s: Shop) => `${pct(s.fee_percent)}${Number(s.fee_flat) ? ` + ${baht(s.fee_flat)}` : ""}`;
const rateOut = (s: Shop) => `${pct(s.out_fee_percent)} + ${baht(s.out_fee_flat)}`;
const byName = (n: string) => EX.shops.find((s) => s.name === n)!;
const STATUS: Record<string, string> = { active: "ใช้งาน", pending: "รออนุมัติ", suspended: "ระงับ" };
const holding = byName("Siam Holding");
const nimman = byName("ร้านนิมมาน");
const cm = byName("เชียงใหม่ สาขา 1");
const north = byName("ตัวแทนภาคเหนือ");
const commSum = EX.shops.reduce((t, s) => t + Number(s.commission), 0);
const subFees = Number(EX.netTotals.feesPaid) + Number(EX.netTotals.outFees);

/** The demo tree drawn as nested boxes (picture for the manual and its PDF). */
function TreeDiagram() {
  const kids = (id: number | null) => EX.shops.filter((s) => s.parent_id === id);
  const Node = ({ s }: { s: Shop }) => (
    <li className="mt-2">
      <div className={`inline-flex flex-wrap items-center gap-x-3 gap-y-0.5 rounded-lg border px-3 py-1.5 text-[12.5px] ${s.depth === 0 ? "border-primary bg-primary-50" : "border-line bg-surface"}`}>
        <strong>{s.name}</strong>
        <span className="text-muted">ชั้น {s.depth}</span>
        <span>เข้า <b className="text-primary">{rateIn(s)}</b></span>
        <span>ออก <b>{rateOut(s)}</b></span>
        {s.status !== "active" && <span className="rounded bg-amber-400/15 px-1.5 text-amber-200">{STATUS[s.status]}</span>}
      </div>
      {kids(s.id).length > 0 && <ul className="ml-6 border-l border-dashed border-line pl-4">{kids(s.id).map((k) => <Node key={k.id} s={k} />)}</ul>}
    </li>
  );
  return (
    <figure className="my-4 rounded-xl border border-line bg-surface-alt p-4" style={{ breakInside: "avoid" }}>
      <div className="text-[12.5px] text-muted">Option Pay (ระบบ) — กำหนดอัตราให้ร้านระดับบนสุด</div>
      <ul className="ml-2 border-l border-dashed border-line pl-4">{kids(null).map((s) => <Node key={s.id} s={s} />)}</ul>
      <figcaption className="mt-3 text-center text-[12px] text-soft">ภาพที่ 9-1 ต้นไม้ร้านตัวอย่าง “Siam Holding” — ร้านย่อย 3 ชั้น (อัตราของแต่ละร้านกำหนดโดยร้านแม่ และต้องไม่ต่ำกว่าอัตราของร้านแม่)</figcaption>
    </figure>
  );
}

/** One fee drawn as a bar split into who gets what. */
function FeeBar({ title, total, parts }: { title: string; total: number; parts: { who: string; amount: string }[] }) {
  const COLORS = ["#60a5fa", "#d4af37", "#34d399", "#f472b6", "#a78bfa"];
  return (
    <figure className="my-4 rounded-xl border border-line bg-surface-alt p-4" style={{ breakInside: "avoid" }}>
      <div className="mb-2 text-[13px] font-semibold">{title} — ค่าธรรมเนียมรวม {baht(total)}</div>
      <div className="flex h-9 overflow-hidden rounded-lg">
        {parts.map((p, i) => (
          <div key={p.who} className="grid place-items-center text-[11.5px] font-semibold text-[#16120a]" style={{ width: `${(Number(p.amount) / total) * 100}%`, background: COLORS[i % COLORS.length] }}>{baht(p.amount)}</div>
        ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[12px]">
        {parts.map((p, i) => <span key={p.who} className="flex items-center gap-1.5"><span className="inline-block size-2.5 rounded-sm" style={{ background: COLORS[i % COLORS.length] }} />{p.who}</span>)}
      </div>
    </figure>
  );
}

export function SubMerchantSections() {
  return (
    <>
      <Section id="sub-merchants" title="9. ร้านย่อย (Sub-merchant) — สร้างและตั้งค่า">
        <p>ร้านค้าสร้าง<strong>ร้านย่อย</strong>ภายใต้ร้านของตัวเองได้<strong>ไม่จำกัดจำนวน</strong> และร้านย่อยแต่ละร้านก็สร้างร้านย่อยของตัวเองต่อได้อีก (ลึกได้ 10 ชั้น) — เป็น<strong>ต้นไม้</strong> เหมาะกับธุรกิจที่มีตัวแทน สาขา หรือร้านค้าในเครือ · ร้านที่ไม่สร้างร้านย่อยใช้งานได้ตามปกติทุกอย่าง</p>
        <TreeDiagram />
        <h3 className="mt-5 mb-1 font-semibold">กติกาสำคัญ</h3>
        <ul className="list-disc space-y-1 pl-5">
          <li>ร้านย่อยแต่ละร้านเป็น<strong>ร้านเต็มรูปแบบ</strong> — มียอดคงเหลือ ผู้ใช้ API key webhook การถอนเงิน ของตัวเอง และ<strong>เข้าสู่ระบบด้วยอีเมล / รหัสผ่านของตัวเอง</strong> (หน้าเข้าสู่ระบบเดียวกัน)</li>
          <li>ร้านแม่กำหนด<strong>อัตราค่าธรรมเนียม</strong>ของร้านย่อย (เงินเข้า และเงินออก ทั้ง % และคงที่) ได้<strong>ไม่ต่ำกว่าอัตราของร้านแม่เอง</strong> — ส่วนต่างคือรายได้ (ค่าคอม) ของร้านแม่ จากทุกรายการของร้านย่อยทุกชั้นด้านล่าง</li>
          <li>ร้านย่อยใหม่มีสถานะ <strong>รออนุมัติ</strong> จนกว่าผู้ดูแลระบบ Option Pay จะอนุมัติ (ตรวจ KYC) — ระหว่างนี้เข้าสู่ระบบได้ แต่ยังรับชำระ ถอนเงิน ออก API key หรือสร้างร้านย่อยไม่ได้</li>
          <li>ร้านแม่<strong>ดูข้อมูลได้ทุกชั้น</strong>ใต้ร้าน (ดูอย่างเดียว) แต่<strong>แก้ไขได้เฉพาะร้านย่อยชั้นถัดไป</strong> — ร้านชั้นลึกกว่าเป็นหน้าที่ของร้านแม่ของร้านนั้น</li>
          <li>ร้านย่อยที่ยังไม่มีบัญชีรับเงินของตัวเอง ใช้<strong>บัญชีรับเงินของร้านแม่ที่ใกล้ที่สุด</strong> — เงินเข้าบัญชีร้านแม่ แต่รายการและยอดคงเหลือเป็นของร้านย่อย</li>
          <li>ระงับร้านใด = ร้านย่อยทุกชั้นใต้ร้านนั้นใช้งานไม่ได้ไปด้วย (เข้าสู่ระบบ / API ไม่ได้)</li>
        </ul>
        <Table head={["ทำอะไร", "เจ้าของร้านแม่", "ร้านย่อย (ตัวเอง)", "ผู้ดูแลระบบ"]} rows={[
          ["สร้างร้านย่อยชั้นถัดไป", "✓ (ร้านต้องได้รับอนุมัติแล้ว)", "✓ ใต้ร้านตัวเอง", "✓ ใต้ร้านใดก็ได้"],
          ["อนุมัติร้านใหม่ (รออนุมัติ → ใช้งาน)", "—", "—", "✓"],
          ["ตั้งอัตราค่าธรรมเนียม", "✓ ชั้นถัดไป (≥ อัตราตัวเอง)", "✓ ของร้านย่อยตัวเอง", "✓"],
          ["ระงับ / เปิดใช้งานอีกครั้ง", "✓ ชั้นถัดไป", "—", "✓"],
          ["ตั้งรหัสผ่านชั่วคราวให้เจ้าของร้าน", "✓ ชั้นถัดไป", "—", "✓"],
          ["ดูแดชบอร์ด รายการ ยอดเงิน", "✓ ทุกชั้น (ดูอย่างเดียว)", "✓ ร้านตัวเอง + ใต้ร้าน", "✓"],
          ["ยอดเริ่มต้น / ยอดคงเหลือขั้นต่ำ / KYC / ย้ายร้านแม่", "—", "—", "✓"],
        ]} />
        <Note>สิทธิ์ “สร้าง / จัดการร้านย่อย” เปิดให้<strong>เจ้าของร้าน</strong>โดยอัตโนมัติ — ให้พนักงานได้ด้วยที่ผู้ดูแลระบบ (ตั้งค่า → สิทธิ์ผู้ใช้ร้านค้า) · ผู้ดูแลระบบปิดสิทธิ์สร้างร้านย่อยของร้านใดก็ได้</Note>

        <h3 className="mt-6 mb-1 font-semibold">9.1 สร้างร้านย่อย — ทีละขั้นตอน</h3>
        <Steps items={[
          <>เข้าสู่ระบบด้วยบัญชี<strong>เจ้าของร้าน</strong> แล้วกดแท็บ <strong>ร้านย่อย</strong></>,
          <>กด <strong>+ สร้างร้านย่อย</strong> (มุมขวาบน) — ด้านบนตารางแสดงอัตราของร้านคุณ ซึ่งเป็นอัตราต่ำสุดที่ตั้งให้ร้านย่อยได้</>,
          <>กรอก<strong>ข้อมูลร้าน</strong> อัตราค่าธรรมเนียม และ<strong>ข้อมูลเจ้าของร้าน</strong> (ดูตารางด้านล่าง) — ช่องสีทอง “คุณได้จากทุกรายการของร้านนี้” คำนวณส่วนต่างให้ทันที</>,
          <>กด <strong>สร้างร้านย่อย</strong> — ระบบแสดง<strong>อีเมล ชื่อผู้ใช้ และรหัสผ่านชั่วคราว</strong>ครั้งเดียว ส่งให้เจ้าของร้านย่อยทางช่องทางที่ปลอดภัย</>,
          <>ร้านใหม่อยู่ในสถานะ <strong>รออนุมัติ</strong> — ผู้ดูแลระบบตรวจ KYC แล้วเปลี่ยนสถานะเป็น <strong>ใช้งาน</strong></>,
          <>เจ้าของร้านย่อยเข้าสู่ระบบที่ <code>optionpay.co/merchant/login</code> ด้วยอีเมลและรหัสผ่านชั่วคราว → ระบบพาไปหน้า <strong>ตั้งค่า</strong> ให้<strong>เปลี่ยนรหัสผ่าน</strong>ก่อนใช้งาน</>,
        ]} />
        <Shot src="sub-tab.jpg" caption="ภาพที่ 9-2 แท็บ ร้านย่อย และ ภาพรวมร้านย่อย ในเมนูของเจ้าของร้าน" />
        <Shot src="sub-list.jpg" caption="ภาพที่ 9-3 หน้า ร้านย่อย — สรุปจำนวนร้าน ค่าคอมรวม ร้านรออนุมัติ และตารางร้านย่อยทุกชั้น (เยื้องตามชั้น)" />
        <Shot src="sub-create.jpg" caption="ภาพที่ 9-4 ฟอร์ม สร้างร้านย่อย — กรอกครบทุกช่อง (ตัวอย่าง: ร้านขอนแก่น สาขา 1 ใต้ Siam Holding)" />
        <Table head={["ช่อง", "ความหมาย / ข้อกำหนด", "ตัวอย่าง"]} rows={[
          ["ชื่อร้าน *", "ชื่อที่แสดงในระบบ (ภาษาไทยได้) — แก้ภายหลังได้", "ร้านขอนแก่น สาขา 1"],
          ["Slug *", "รหัสร้านภาษาอังกฤษตัวเล็ก ตัวเลข และ - (ระบบเติมให้จากชื่อ) — ต้องไม่ซ้ำ แก้ภายหลังไม่ได้", <code key="s">demo-kk1</code>],
          ["ค่าธรรมเนียมเงินเข้า (%) / คงที่", "หักจากยอดที่ลูกค้าของร้านย่อยโอน — ต่ำสุด = อัตราของร้านคุณ", "2.1% + ฿0"],
          ["ค่าธรรมเนียมเงินออก (%) / คงที่", "บวกเพิ่มเมื่อร้านย่อยถอนเงิน / payout — ต่ำสุด = อัตราของร้านคุณ", "0.7% + ฿5"],
          ["อนุญาตให้ร้านนี้สร้างร้านย่อยต่อ", "ติ๊ก = ร้านนี้สร้างร้านย่อยของตัวเองได้ (เป็นชั้นถัดไปอีก)", "ติ๊ก"],
          ["ชื่อ-นามสกุล * (เจ้าของร้าน)", "ผู้ใช้ระดับ เจ้าของร้าน ของร้านย่อย", "คุณวิไล ขอนแก่น"],
          ["อีเมล *", "ใช้เข้าสู่ระบบ — 1 อีเมลใช้ได้กับร้านเดียว", "owner@demo-kk1.demo"],
          ["รหัสผ่านชั่วคราว *", "อย่างน้อย 8 ตัว (ปุ่ม สุ่มรหัส) — ต้องเปลี่ยนเมื่อเข้าสู่ระบบครั้งแรก", "Temp#KK2026"],
          ["เบอร์ติดต่อ", "ไม่บังคับ", "043-000-111"],
        ]} />
        <Note>ยอดเริ่มต้น ยอดคงเหลือขั้นต่ำ สถานะ KYC และการเลือกร้านแม่ <strong>ไม่อยู่ในฟอร์มของร้านค้า</strong> — ผู้ดูแลระบบเป็นผู้กำหนด (ร้านแม่ของร้านใหม่คือร้านที่สร้างเสมอ)</Note>
        <Shot src="sub-created.jpg" caption="ภาพที่ 9-5 สร้างสำเร็จ — ข้อมูลเข้าสู่ระบบของเจ้าของร้านย่อย (แสดงครั้งเดียว) และร้านใหม่สถานะ รออนุมัติ ในตาราง" />
        <Shot src="merchant-approve.jpg" caption="ภาพที่ 9-6 (ฝั่งผู้ดูแลระบบ) อนุมัติร้านย่อย — เปลี่ยนสถานะเป็น “ใช้งาน (อนุมัติร้านนี้)” แล้วบันทึก" />
        <Shot src="sub-first-login.jpg" caption="ภาพที่ 9-7 เจ้าของร้านย่อยเข้าสู่ระบบครั้งแรก — แถบแจ้งร้านรออนุมัติ และให้เปลี่ยนรหัสผ่านชั่วคราวก่อน" />

        <h3 className="mt-6 mb-1 font-semibold">9.2 ตั้งค่าร้านย่อย</h3>
        <p>ในตารางร้านย่อย ร้านชั้นถัดไปมีปุ่ม <strong>แก้ไข</strong> และปุ่ม <strong>🔑</strong> (รหัสผ่านเจ้าของร้าน) — ร้านชั้นลึกกว่ามีเฉพาะปุ่ม <strong>ดู</strong></p>
        <Shot src="sub-edit.jpg" caption="ภาพที่ 9-8 แก้ไขร้านย่อย — ชื่อ สถานะ อัตราค่าธรรมเนียม และสิทธิ์สร้างร้านย่อยต่อ" />
        <Table head={["ตั้งค่า", "ผลที่เกิดขึ้น"]} rows={[
          ["อัตราค่าธรรมเนียม", "ใช้กับรายการที่สร้าง<strong>หลังจากบันทึก</strong> — รายการเดิมคงค่าธรรมเนียมเดิม · ต้องไม่ต่ำกว่าอัตราของร้านคุณ และต้องไม่สูงกว่าอัตราของร้านย่อยของร้านนั้น (ถ้ามี)".split("<strong>").map((x, i) => (i ? <><strong key={i}>{x.split("</strong>")[0]}</strong>{x.split("</strong>")[1]}</> : x))],
          ["สถานะ: ระงับ", "ร้านนั้นและร้านย่อยทุกชั้นใต้ร้านนั้นเข้าสู่ระบบ / เรียก API / รับชำระไม่ได้ทันที — เปิดใช้งานอีกครั้งได้ภายหลัง (ร้านที่ยังรออนุมัติ เปิดใช้งานเองไม่ได้)"],
          ["อนุญาตให้สร้างร้านย่อยต่อ", "เอาติ๊กออก = ร้านนั้นสร้างร้านย่อยใหม่ไม่ได้ (ร้านย่อยที่มีอยู่แล้วยังใช้งานได้)"],
          ["🔑 รหัสผ่านชั่วคราวใหม่", "รหัสเดิมของเจ้าของร้านย่อยใช้ไม่ได้ทันที — ใช้เมื่อเจ้าของร้านลืมรหัส · ต้องเปลี่ยนเมื่อเข้าสู่ระบบครั้งถัดไป"],
        ]} />
        <Shot src="sub-rate-error.jpg" caption="ภาพที่ 9-9 อัตราต่ำกว่าอัตราของร้านคุณ — ช่องแสดงสีแดง “ต่ำสุด …” และบันทึกไม่ได้" />
        <Shot src="sub-owner-password.jpg" caption="ภาพที่ 9-10 ตั้งรหัสผ่านชั่วคราวใหม่ให้เจ้าของร้านย่อย" />

        <h3 className="mt-6 mb-1 font-semibold">9.3 ดูข้อมูลของร้านย่อย (ทุกชั้น)</h3>
        <Steps items={[
          <>กดชื่อร้านที่มุมซ้ายบน (ตัวเลือกร้าน) แล้วเลือกร้านย่อย — หรือกดปุ่ม <strong>ดู</strong> ในหน้าร้านย่อย / <strong>เปิดร้าน →</strong> ในหน้าภาพรวมร้านย่อย</>,
          <>ทุกหน้า (แดชบอร์ด รายการชำระเงิน ถอนเงิน ตั้งค่า) จะแสดงข้อมูลของร้านนั้น พร้อมแถบสีเหลือง <strong>กำลังดูร้านย่อย … ดูอย่างเดียว</strong> — ปุ่มสร้าง / แก้ไขทั้งหมดถูกซ่อน</>,
          <>กด <strong>กลับร้านของฉัน</strong> เพื่อกลับมาที่ร้านของคุณ</>,
        ]} />
        <Shot src="sub-switcher.jpg" caption="ภาพที่ 9-11 ตัวเลือกร้าน — ร้านของคุณ และร้านย่อยทุกชั้น (เยื้องตามชั้น พร้อมสถานะ)" />
        <Shot src="sub-viewing.jpg" caption="ภาพที่ 9-12 ดูแดชบอร์ดของร้านย่อย “ร้านนิมมาน” (ชั้น 3) — ดูอย่างเดียว" />
        <Shot src="sub-viewing-transactions.jpg" caption="ภาพที่ 9-13 ดูรายการชำระเงินของร้านย่อย — ไม่มีปุ่มสร้างรายการ" />
        <Note>เชื่อมต่อด้วยระบบของร้านเองก็ได้: <code>GET /sub-merchants</code>, <code>GET /sub-merchants/overview</code>, <code>GET /sub-merchants/:id</code>, <code>POST /sub-merchants</code> และ header <code>X-Sub-Merchant</code> — ดู <Link href="/merchant/docs/api#sub-merchants" className="text-primary underline">คู่มือ API หัวข้อ Sub-merchants</Link></Note>
      </Section>

      <Section id="sub-finance" title="10. ภาพรวมร้านย่อย และการคำนวณเงิน">
        <h3 className="mb-1 font-semibold">10.1 แดชบอร์ด ภาพรวมร้านย่อย</h3>
        <p>แท็บ <strong>ภาพรวมร้านย่อย</strong> (แสดงเมื่อร้านมีร้านย่อย) รวมตัวเลขของร้านย่อย<strong>ทุกชั้น</strong>ใต้ร้านคุณ — เลือก 7 / 30 / 90 วัน และเลือก <strong>ร้าน</strong> เพื่อดูเฉพาะร้านเดียว (drill-down)</p>
        <Shot src="network-all.jpg" caption="ภาพที่ 10-1 ภาพรวมร้านย่อยทั้งหมดของ Siam Holding (30 วัน) — การ์ดสรุป กราฟแนวโน้ม กราฟยอดตามร้าน กราฟวงกลมค่าคอม และตารางรายร้าน" />
        <Table head={["ส่วน", "ความหมาย"]} rows={[
          ["ยอดรับชำระ", "ยอดที่ลูกค้าของร้านย่อยชำระสำเร็จในช่วงที่เลือก (ทุกชั้น)"],
          ["ค่าคอมที่คุณได้", "ส่วนต่างค่าธรรมเนียมที่เข้ายอดคงเหลือของร้านคุณจากรายการในช่วงนั้น (เงินเข้า + เงินออก)"],
          ["เงินออก (ถอน / payout)", "ยอดที่ร้านย่อยถอน / จ่ายออกสำเร็จ พร้อมค่าธรรมเนียมเงินออก"],
          ["ยอดคงเหลือรวม (ตอนนี้)", "ผลรวมยอดคงเหลือของร้านย่อยทุกร้าน ณ ตอนนี้ และยอดที่รอถอน"],
          ["ค่าธรรมเนียมที่ร้านย่อยจ่าย", "ค่าธรรมเนียมเงินเข้าทั้งหมดที่ร้านย่อยจ่าย (รวมส่วนของระบบและร้านแม่ทุกชั้น)"],
          ["แนวโน้มรายวัน", "เส้นเขียว = ยอดรับชำระ · เส้นแดง = เงินออก (แกนซ้าย) · เส้นทองประ = ค่าคอมที่คุณได้ (แกนขวา) — ชี้เมาส์ดูตัวเลขรายวัน กดชื่อเส้นเพื่อซ่อน / แสดง"],
          ["ยอดรับชำระตามร้าน", "10 ร้านที่ยอดสูงสุด พร้อมสัดส่วน (%)"],
          ["ค่าคอมที่คุณได้ มาจากร้านไหน", "สัดส่วนค่าคอมแยกตามร้านที่ทำรายการ"],
          ["ตารางรายละเอียด", "ทุกร้าน: สถานะ ยอดรับชำระ ค่าธรรมเนียม เงินออก ค่าคอม ยอดคงเหลือ รอชำระ · “เฉพาะร้านนี้” = drill-down · “เปิดร้าน →” = ดูทุกหน้าของร้านนั้น"],
        ]} />
        <Shot src="network-one.jpg" caption="ภาพที่ 10-2 Drill-down: เลือกเฉพาะ “ร้านนิมมาน” — ตัวเลขและกราฟของร้านนี้ร้านเดียว" />

        <h3 className="mt-6 mb-1 font-semibold">10.2 หลักการคำนวณ</h3>
        <ol className="list-decimal space-y-1.5 pl-5">
          <li><strong>ร้านที่ทำรายการจ่ายตามอัตราของตัวเอง</strong> — เงินเข้า: ค่าธรรมเนียม = ยอด × % ÷ 100 + คงที่ (หักจากยอดที่ลูกค้าโอน) · เงินออก: ค่าธรรมเนียม = ยอด × % ÷ 100 + คงที่ (บวกเพิ่ม — ผู้รับได้เต็มยอด)</li>
          <li><strong>Option Pay (ระบบ)</strong> ได้ส่วนตาม<strong>อัตราของร้านระดับบนสุด</strong> (ในตัวอย่างคือ Siam Holding)</li>
          <li><strong>ร้านแม่ทุกชั้นบนเส้นทาง</strong> ได้ = ค่าธรรมเนียมตามอัตราของร้านชั้นถัดลงไปบนเส้นทาง − ค่าธรรมเนียมตามอัตราของตัวเอง</li>
          <li>ผลรวมทุกส่วน = ค่าธรรมเนียมที่ร้านทำรายการจ่าย <strong>พอดีทุกสตางค์</strong> · ปัดเศษทีละรายการ (ทศนิยม 2 ตำแหน่ง)</li>
          <li>ส่วนแบ่ง<strong>เข้ายอดคงเหลือเมื่อรายการอนุมัติ</strong>เท่านั้น — รายการที่รอ หมดอายุ ถูกปฏิเสธ หรือคืนเงิน ไม่มีใครได้</li>
          <li><strong>ยอดคงเหลือของร้าน</strong> = ยอดเริ่มต้น + Σ(เงินเข้า − ค่าธรรมเนียม) − Σ(เงินออก + ค่าธรรมเนียมเงินออก) ± ปรับเครดิต + <strong>ค่าคอมจากร้านย่อย</strong></li>
          <li>ไม่มีการเก็บเงินลงล่าง — ร้านแม่ไม่ได้จ่ายอะไรให้ร้านย่อย และร้านแม่ถอนยอดของร้านย่อยไม่ได้</li>
        </ol>

        <h3 className="mt-6 mb-1 font-semibold">10.3 ตัวอย่างจริง: Siam Holding — ร้านย่อย 3 ชั้น</h3>
        <p>ข้อมูลจริงจากระบบ (ร้านตัวอย่าง) — ร้านแม่ระดับบนสุด 1 ร้าน ร้านย่อยชั้น 1 = 2 ตัวแทนภาค (+ ร้านตัวอย่าง API ที่ระงับไว้) ชั้น 2 = 4 สาขา (หาดใหญ่ยังรออนุมัติ) ชั้น 3 = 3 ร้านค้า รวม {EX.shops.length} ร้านในต้นไม้นี้ · ยอดขายจริง 30 วันจำนวน {EX.netTotals.paidCount} รายการในร้านย่อย</p>
        <Table head={["ร้าน", "ชั้น", "ร้านแม่", "สถานะ", "อัตราเงินเข้า", "อัตราเงินออก"]} rows={EX.shops.map((s) => [
          <span key="n" style={{ paddingLeft: `${s.depth * 14}px` }}>{s.depth ? "└ " : ""}{s.name}</span>, String(s.depth),
          s.parent_id ? EX.shops.find((x) => x.id === s.parent_id)?.name ?? "-" : "— (ระดับบนสุด)", STATUS[s.status] ?? s.status, rateIn(s), rateOut(s)])} />

        <h4 className="mt-5 mb-1 font-semibold">ตัวอย่าง A — ลูกค้าชำระ {baht(EX.pay.amount)} ที่ร้านนิมมาน (ชั้น 3) · รายการ {EX.pay.ref}</h4>
        <p>เส้นทางขึ้นไป: ร้านนิมมาน ({pct(nimman.fee_percent)}) → เชียงใหม่ สาขา 1 ({pct(cm.fee_percent)}) → ตัวแทนภาคเหนือ ({pct(north.fee_percent)}) → Siam Holding ({pct(holding.fee_percent)}) → Option Pay</p>
        <Table head={["ใคร", "วิธีคิด", "ได้รับ"]} rows={[
          ["ร้านนิมมาน (จ่าย)", `${baht(EX.pay.amount)} × ${pct(nimman.fee_percent)} = ค่าธรรมเนียม ${baht(EX.pay.fee)}`, <strong key="a">เข้าร้าน {baht(Number(EX.pay.amount) - Number(EX.pay.fee))}</strong>],
          ["เชียงใหม่ สาขา 1", `${baht(EX.pay.amount)} × (${pct(nimman.fee_percent)} − ${pct(cm.fee_percent)})`, baht(EX.paySplits[3].amount)],
          ["ตัวแทนภาคเหนือ", `${baht(EX.pay.amount)} × (${pct(cm.fee_percent)} − ${pct(north.fee_percent)})`, baht(EX.paySplits[2].amount)],
          ["Siam Holding", `${baht(EX.pay.amount)} × (${pct(north.fee_percent)} − ${pct(holding.fee_percent)})`, baht(EX.paySplits[1].amount)],
          ["Option Pay (ระบบ)", `${baht(EX.pay.amount)} × ${pct(holding.fee_percent)} (อัตราของร้านระดับบนสุด)`, baht(EX.paySplits[0].amount)],
          [<strong key="t">รวมค่าธรรมเนียม</strong>, "", <strong key="v">{baht(EX.paySplits.reduce((t, x) => t + Number(x.amount), 0))} = {baht(EX.pay.fee)} ✓</strong>],
        ]} />
        <FeeBar title={`ตัวอย่าง A: ${baht(EX.pay.amount)} ที่ร้านนิมมาน`} total={Number(EX.pay.fee)} parts={EX.paySplits} />

        <h4 className="mt-5 mb-1 font-semibold">ตัวอย่าง B — ร้านนิมมานถอนเงิน {baht(EX.out.amount)} · {EX.example.withdrawalRef} → {EX.out.ref}</h4>
        <Table head={["ใคร", "วิธีคิด (เงินออก % + คงที่)", "ได้รับ"]} rows={[
          ["ร้านนิมมาน (จ่าย)", `${baht(EX.out.amount)} × ${pct(nimman.out_fee_percent)} + ${baht(nimman.out_fee_flat)} = ค่าธรรมเนียม ${baht(EX.out.fee)}`, <strong key="a">ถูกหัก {baht(Number(EX.out.amount) + Number(EX.out.fee))} · ผู้รับได้ {baht(EX.out.amount)}</strong>],
          ["เชียงใหม่ สาขา 1", `(${pct(nimman.out_fee_percent)} + ${baht(nimman.out_fee_flat)}) − (${pct(cm.out_fee_percent)} + ${baht(cm.out_fee_flat)}) = ${baht(EX.out.fee)} − ${baht(Number(EX.out.amount) * Number(cm.out_fee_percent) / 100 + Number(cm.out_fee_flat))}`, baht(EX.outSplits[3].amount)],
          ["ตัวแทนภาคเหนือ", `(${pct(cm.out_fee_percent)} + ${baht(cm.out_fee_flat)}) − (${pct(north.out_fee_percent)} + ${baht(north.out_fee_flat)})`, baht(EX.outSplits[2].amount)],
          ["Siam Holding", `(${pct(north.out_fee_percent)} + ${baht(north.out_fee_flat)}) − (${pct(holding.out_fee_percent)} + ${baht(holding.out_fee_flat)})`, baht(EX.outSplits[1].amount)],
          ["Option Pay (ระบบ)", `${baht(EX.out.amount)} × ${pct(holding.out_fee_percent)} + ${baht(holding.out_fee_flat)}`, baht(EX.outSplits[0].amount)],
          [<strong key="t">รวมค่าธรรมเนียม</strong>, "", <strong key="v">{baht(EX.outSplits.reduce((t, x) => t + Number(x.amount), 0))} = {baht(EX.out.fee)} ✓</strong>],
        ]} />
        <FeeBar title={`ตัวอย่าง B: ถอน ${baht(EX.out.amount)} ที่ร้านนิมมาน`} total={Number(EX.out.fee)} parts={EX.outSplits} />

        <h4 className="mt-5 mb-1 font-semibold">ตัวอย่าง C — ภาพรวม 30 วันของทั้งต้นไม้ (ยอดจริงในระบบ)</h4>
        <Table head={["ร้าน", "ยอดรับชำระ (รายการ)", "ค่าธรรมเนียมที่จ่าย", "ค่าคอมที่ได้จากร้านย่อย", "ยอดคงเหลือ"]} rows={[
          ...EX.shops.map((s) => [<span key="n" style={{ paddingLeft: `${s.depth * 14}px` }}>{s.depth ? "└ " : ""}{s.name}</span>, `${baht(s.paid)} (${s.n})`, baht(s.fees), baht(s.commission), baht(s.balance)]),
          [<strong key="t">รวม</strong>, <strong key="p">{baht(EX.shops.reduce((t, s) => t + Number(s.paid), 0))}</strong>, <strong key="f">{baht(EX.shops.reduce((t, s) => t + Number(s.fees), 0))}</strong>, <strong key="c">{baht(commSum)}</strong>, <strong key="b">{baht(EX.shops.reduce((t, s) => t + Number(s.balance), 0))}</strong>],
        ]} />
        <p className="mt-2"><strong>ตรวจยอด (ทุกบาทมีที่ไป):</strong> ร้านย่อยจ่ายค่าธรรมเนียมรวม {baht(subFees)} (เงินเข้า {baht(EX.netTotals.feesPaid)} + เงินออก {baht(EX.netTotals.outFees)}) = ส่วนของ Option Pay {baht(EX.platformFromSubtree)} + ค่าคอมที่ร้านแม่ทุกชั้นได้รวม {baht(commSum)} = {baht(Number(EX.platformFromSubtree) + commSum)} ✓</p>
        <h4 className="mt-4 mb-1 font-semibold">ค่าคอมของตัวแทนภาคเหนือ {baht(north.commission)} มาจากไหน</h4>
        <Table head={["จากร้าน", "ประเภท", "ยอด (รายการ)", "ส่วนต่างที่ได้", "ค่าคอม"]} rows={EX.commissionBy.north.map((r) => {
          const from = byName(r.from);
          const diff = r.kind === "payment" ? (from.name === "เชียงใหม่ สาขา 1" || from.parent_id === cm.id ? Number(cm.fee_percent) - Number(north.fee_percent) : Number(from.fee_percent) - Number(north.fee_percent)) : null;
          return [r.from, r.kind === "payment" ? "เงินเข้า" : "เงินออก", `${baht(r.base)} (${r.n})`, diff != null ? `${Math.round(diff * 100) / 100}%` : "ตามตัวอย่าง B", baht(r.commission)];
        })} />
        <p className="mt-2"><strong>ยอดคงเหลือ Siam Holding</strong> = ยอดขายของร้านเอง {baht(holding.paid)} − ค่าธรรมเนียม {baht(holding.fees)} + ค่าคอมจากร้านย่อยทุกชั้น {baht(holding.commission)} = <strong>{baht(holding.balance)}</strong> · <strong>ยอดคงเหลือร้านนิมมาน</strong> = {baht(nimman.paid)} − {baht(nimman.fees)} − (ถอน {baht(EX.out.amount)} + ค่าธรรมเนียม {baht(EX.out.fee)}) = <strong>{baht(nimman.balance)}</strong></p>
        <Note tone="warn">ค่าคอมแต่ละรายการปัดเศษเป็นสตางค์ทีละรายการ — ผลรวมของหลายรายการจึงอาจต่างจาก “ยอดรวม × %” ได้ไม่กี่สตางค์ (เช่น ตัวแทนภาคเหนือขายเอง {baht(north.paid)} × 0.5% = ฿42.50 แต่ Siam Holding ได้จริง ฿42.48 จาก 4 รายการที่ปัดเศษแยกกัน)</Note>
      </Section>
    </>
  );
}
