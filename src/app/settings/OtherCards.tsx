"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { fmtDate, fmtDateTime, fmtMoney } from "@/lib/format";
import { checkQuota, saveSection } from "./actions";
import { B, Msg, Num, SCard, Secret, Switch, field, fieldLabel, hint, row, select, useRun } from "./parts";

type Probe = { provider: string; ok: boolean; message: string; quota?: { remaining: number | null; total: number | null; used: number | null; credit: number | null; plan: string | null; expiresAt: string | null } };
export type QuotaStatus = { checkedAt: string; primary: Probe | null; fallback: Probe | null } | null;
const NAMES: Record<string, string> = { thunder: "Thunder Solution", slipok: "SlipOK", easyslip: "EasySlip", slip2go: "Slip2Go" };

function ProbeBox({ title, p, checkedAt }: { title: string; p: Probe; checkedAt: string }) {
  const q = p.quota;
  return (
    <div className="min-w-[240px] flex-1 rounded-[10px] border border-line bg-surface-alt p-3.5 text-[13px]">
      <div className="mb-1.5 font-semibold">{title} — {NAMES[p.provider] ?? p.provider}</div>
      {p.ok && q ? (
        <>
          <div className="text-[22px] font-bold">{q.remaining != null ? `คงเหลือ ${q.remaining.toLocaleString()} ครั้ง` : "—"}</div>
          <div className="mt-1 text-muted">
            {q.total != null && <>โควตาทั้งหมด {q.total.toLocaleString()} · </>}{q.used != null && <>ใช้ไปแล้ว {q.used.toLocaleString()} · </>}
            {q.credit != null && <>เครดิตคงเหลือ {fmtMoney(q.credit)} · </>}{q.plan && <>{q.plan} · </>}
            ตรวจล่าสุด {fmtDateTime(checkedAt)}{q.expiresAt && <> · หมดอายุ {fmtDate(q.expiresAt)}</>}
          </div>
        </>
      ) : (
        <div className="text-danger">{p.message}<div className="text-muted">ตรวจล่าสุด {fmtDateTime(checkedAt)}</div></div>
      )}
    </div>
  );
}

export function QuotaCard({ threshold, status }: { threshold: number; status: QuotaStatus }) {
  const router = useRouter();
  const [t, setT] = useState(threshold);
  const save = useRun();
  const check = useRun();
  const st = (check.r?.ok ? (check.r.status as QuotaStatus) : null) ?? status;
  return (
    <SCard title="โควตาตรวจสลิปคงเหลือ" note="เตือนก่อนโควตาหมด ไม่ใช่ตอนสลิปเริ่มพัง">
      {st && (st.primary || st.fallback) ? (
        <div className="mb-4 flex flex-wrap gap-3">
          {st.primary && <ProbeBox title="ตัวหลัก" p={st.primary} checkedAt={st.checkedAt} />}
          {st.fallback && <ProbeBox title="ตัวสำรอง" p={st.fallback} checkedAt={st.checkedAt} />}
        </div>
      ) : (
        <div className="mb-4 rounded-[10px] border border-dashed border-line p-3.5 text-[13px] text-muted">ยังไม่เคยตรวจ — เลือกผู้ให้บริการในการ์ด &ldquo;การตรวจสลิป&rdquo; แล้วกด &ldquo;ตรวจสอบตอนนี้&rdquo;</div>
      )}
      {check.r && !check.r.ok && <Msg r={check.r} />}
      <Msg r={save.r} />
      <form onSubmit={(e) => { e.preventDefault(); save.run(() => saveSection("quota", { threshold: t }), (r) => r.ok && router.refresh()); }}>
        <div className={row}><Num id="slipQuotaThreshold" label="เตือนเมื่อโควตาเหลือน้อยกว่า (ครั้ง)" min={0} max={1_000_000} value={t} onChange={setT} help={<>0 = ไม่เตือน · การเช็คไม่กินโควตา · bot ไหนรับแจ้งเตือนนี้ เลือกที่หน้า <Link href="/alerts" className="text-primary">แจ้งเตือน Telegram</Link></>} /></div>
        <div className="flex justify-end gap-2">
          <button type="button" className={B()} disabled={check.pending} onClick={() => check.run(() => checkQuota(), (r) => r.ok && router.refresh())}>{check.pending ? "กำลังตรวจ..." : "ตรวจสอบตอนนี้"}</button>
          <button type="submit" className={B("primary")} disabled={save.pending}>บันทึก</button>
        </div>
      </form>
    </SCard>
  );
}

export function BalanceCard({ min }: { min: number }) {
  const router = useRouter();
  const [v, setV] = useState(min);
  const { r, pending, run } = useRun();
  return (
    <SCard title="วงเงินคงเหลือขั้นต่ำของร้านค้า" note="ต่ำกว่าขั้นต่ำ = ถอนไม่ได้ + แจ้งเตือนทั้งแอดมินและร้านค้า">
      <div className="mb-4 text-[13px] leading-[1.7] text-muted">
        ยอดที่ร้านค้า<strong className="text-ink">ต้องเหลือไว้เสมอ</strong> — คำขอถอนที่จะทำให้เหลือน้อยกว่านี้จะถูกปฏิเสธตอนแอดมินกดอนุมัติ · ร้านที่ยอดต่ำกว่าขั้นต่ำอยู่แล้วจะถอนไม่ได้เลย ·
        เมื่อยอดตกลงต่ำกว่าขั้นต่ำ ระบบแจ้งเตือน<strong className="text-ink">ทั้งฝั่งแอดมิน</strong> (Telegram + แถบเตือนบนคอนโซล)
      </div>
      <Msg r={r} />
      <form onSubmit={(e) => { e.preventDefault(); run(() => saveSection("balance", { minMerchantBalance: v }), (res) => res.ok && router.refresh()); }}>
        <div className={row}><Num id="minMerchantBalance" label="ขั้นต่ำเริ่มต้นของทุกร้าน (บาท)" min={0} max={10_000_000} step={0.01} value={v} onChange={setV} help="0 = ไม่บังคับขั้นต่ำ (ค่าเริ่มต้นของระบบ)" /></div>
        <div className="flex justify-end"><button type="submit" className={B("primary")} disabled={pending}>บันทึก</button></div>
      </form>
      <div className={hint}>ตั้งขั้นต่ำเฉพาะบางร้านได้ที่หน้า <Link href="/merchants" className="text-primary">ร้านค้า</Link> → แก้ไขร้าน (ค่าที่ตั้งไว้ในร้านชนะค่าเริ่มต้นนี้) · การอนุมัติ &ldquo;รายการเงินออก&rdquo; ที่หน้าเงินออกไม่ถูกบล็อกด้วยขั้นต่ำนี้ เพราะตอนนั้นแอดมินมักโอนเงินจริงไปแล้ว</div>
    </SCard>
  );
}

export function LimitsCard({ minDeposit, minWithdraw }: { minDeposit: number; minWithdraw: number }) {
  const router = useRouter();
  const [v, setV] = useState({ minDeposit, minWithdraw });
  const { r, pending, run } = useRun();
  return (
    <SCard title="ยอดขั้นต่ำต่อรายการ ฝาก / ถอน" note="ร้านสร้างรายการที่ยอดต่ำกว่านี้ไม่ได้">
      <div className="mb-4 text-[13px] leading-[1.7] text-muted">
        <strong className="text-ink">ฝาก:</strong> สร้างออเดอร์ฝากผ่านหน้าชำระเงินของลูกค้าที่ยอดต่ำกว่านี้ไม่ได้ · ยกเว้นรายการที่แอดมินสร้างเอง<br />
        <strong className="text-ink">ถอน:</strong> คำขอถอนที่ยอดต่ำกว่านี้ถูกปฏิเสธ · แอดมินอนุมัติ/จ่ายเองในหลังบ้านไม่ถูกบล็อก<br />
        เงินที่โอนเข้ามาแล้วไม่ถูกปฏิเสธไม่ว่ายอดเท่าไร — ถ้าไม่มีออเดอร์รองรับจะไปรอที่ตาราง &ldquo;รอตรวจสอบ&rdquo;
      </div>
      <Msg r={r} />
      <form onSubmit={(e) => { e.preventDefault(); run(() => saveSection("limits", v), (res) => res.ok && router.refresh()); }}>
        <div className={row}>
          <Num id="minDepositAmount" label="ยอดฝากขั้นต่ำ (บาท)" min={0} max={10_000_000} step={0.01} value={v.minDeposit} onChange={(minDeposit) => setV({ ...v, minDeposit })} help="0 = ไม่จำกัด" />
          <Num id="minWithdrawAmount" label="ยอดถอนขั้นต่ำ (บาท)" min={0} max={10_000_000} step={0.01} value={v.minWithdraw} onChange={(minWithdraw) => setV({ ...v, minWithdraw })} help="0 = ไม่จำกัด" />
        </div>
        <div className="flex justify-end"><button type="submit" className={B("primary")} disabled={pending}>บันทึก</button></div>
      </form>
    </SCard>
  );
}

export function SecurityCard({ enforce2fa, ownerUserId, users, meId }: { enforce2fa: boolean; ownerUserId: number | null; users: { id: number; label: string }[]; meId: number }) {
  const router = useRouter();
  const [v, setV] = useState({ enforce2fa, ownerUserId: ownerUserId ?? meId });
  const { r, pending, run } = useRun();
  return (
    <SCard title="ความปลอดภัย — บังคับยืนยันตัวตน 2 ชั้น (2FA)" note="ทุกบัญชีต้องเปิด TOTP ยกเว้นเจ้าของระบบ">
      <div className="mb-4 text-[13px] leading-[1.7] text-muted">
        เมื่อเปิด ระบบบังคับยืนยันตัวตน 2 ชั้น (TOTP) กับ<strong className="text-ink">ทุกบัญชีทุกบทบาท</strong> — ยกเว้นบัญชีเจ้าของระบบเพียงบัญชีเดียว ซึ่งเปิด/ปิด 2FA ได้เอง ·
        ผู้ใช้ที่ยังไม่เปิด 2FA จะยัง<strong className="text-ink">เข้าสู่ระบบได้</strong> แต่ถูกพาไปหน้าตั้งค่า 2FA ทันทีจนกว่าจะตั้งค่าเสร็จ — ไม่มีใครถูกล็อกออก ·
        ผู้ใช้ที่ถูกบังคับปิด 2FA เองไม่ได้
      </div>
      <Msg r={r} />
      <form onSubmit={(e) => { e.preventDefault(); run(() => saveSection("security", v), (res) => res.ok && router.refresh()); }}>
        <div className={row}>
          <div className="mb-4 flex items-center gap-2.5 text-[13px]"><Switch on={v.enforce2fa} label="บังคับ 2FA" onChange={(enforce2fa) => setV({ ...v, enforce2fa })} /> บังคับ 2FA ทุกบัญชี</div>
          <div className="mb-4"><label htmlFor="ownerUserId" className={fieldLabel}>บัญชีเจ้าของระบบ (ไม่ถูกบังคับ)</label>
            <select id="ownerUserId" className={select} value={v.ownerUserId} onChange={(e) => setV({ ...v, ownerUserId: Number(e.target.value) })}>{users.map((u) => <option key={u.id} value={u.id}>{u.label}</option>)}</select></div>
        </div>
        <div className="flex justify-end"><button type="submit" className={B("primary")} disabled={pending}>บันทึก</button></div>
      </form>
    </SCard>
  );
}

type Dest = { id?: string; name: string; url: string; secret: string; enabled: boolean };

export function OutboundCard({ destinations }: { destinations: Dest[] }) {
  const router = useRouter();
  const [list, setList] = useState(destinations);
  const { r, pending, run } = useRun();
  const upd = (i: number, patch: Partial<Dest>) => setList(list.map((d, j) => (j === i ? { ...d, ...patch } : d)));
  return (
    <SCard title="แจ้งเตือนภายนอก (Outbound Webhook)" note="ยิง HTTP callback ออกไปทุกครั้งที่ payment ถูก approve">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-[13px] text-muted">
        <span><strong className="text-ink">{list.filter((d) => d.enabled).length}</strong> ปลายทาง — ทุก destination ที่เปิดอยู่จะถูกยิงพร้อมกันเมื่อ payment ถูก approve</span>
        <button type="button" className={B("primary", "sm")} onClick={() => setList([...list, { name: "", url: "https://", secret: "", enabled: true }])}><Plus size={14} /> เพิ่มปลายทาง</button>
      </div>
      <Msg r={r} />
      {list.length === 0 ? (
        <div className="mb-3 rounded-[10px] border border-dashed border-line p-6 text-center text-[13px] text-muted">ยังไม่มีปลายทาง — กด &ldquo;เพิ่มปลายทาง&rdquo; เพื่อสร้างใหม่</div>
      ) : (
        <div className="mb-3 flex flex-col gap-3">
          {list.map((d, i) => (
            <div key={d.id ?? `new-${i}`} className="rounded-[10px] border border-line bg-surface-alt p-3.5">
              <div className="mb-2 flex items-center gap-2.5">
                <Switch on={d.enabled} label="เปิดใช้" onChange={(enabled) => upd(i, { enabled })} />
                <input aria-label="ชื่อปลายทาง" className={`${field} flex-1`} placeholder="ชื่อปลายทาง เช่น ระบบบัญชี" value={d.name} onChange={(e) => upd(i, { name: e.target.value })} />
                <button type="button" aria-label="ลบปลายทาง" className={B("dangerGhost", "sm")} onClick={() => setList(list.filter((_, j) => j !== i))}><Trash2 size={14} /></button>
              </div>
              <div className="grid gap-3 md:grid-cols-[2fr_1fr]">
                <input aria-label="URL" className={field} placeholder="https://example.com/hooks/payment" value={d.url} onChange={(e) => upd(i, { url: e.target.value })} />
                <Secret id={`dest-secret-${i}`} label="" placeholder="Signing secret (เว้นว่าง = สร้างให้อัตโนมัติ)" value={d.secret} onChange={(secret) => upd(i, { secret })} />
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="flex justify-end"><button type="button" className={B("primary")} disabled={pending} onClick={() => run(() => saveSection("outbound", { destinations: list }), (res) => { if (res.ok) { setList(((res.value as { destinations: Dest[] }).destinations)); router.refresh(); } })}>บันทึกทั้งหมด</button></div>
      <div className={hint}>
        ส่ง <code>POST</code> JSON <code>{"{ event: \"payment.approved\", data: { ref, merchantId, merchantOrderId, amount, approvedBy }, sentAt }"}</code> พร้อม header <code>X-Signature: t=…,v1=HMAC-SHA256(secret, t.body)</code> · https เท่านั้น และไม่ยิงไปที่อยู่ภายใน · ผลการส่งดูได้ที่หน้า <Link href="/audit?q=outbound.deliver" className="text-primary">บันทึกการตรวจสอบ</Link>
      </div>
    </SCard>
  );
}
