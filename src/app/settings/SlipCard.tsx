"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { fmtDateTime } from "@/lib/format";
import { saveSection, testSlip } from "./actions";
import { B, Check, Msg, Num, SCard, Secret, field, fieldLabel, hint, row, select, useRun } from "./parts";

export type Slip = {
  provider: string; thunderAccessToken: string; slipOkApiKey: string; slipOkBranchId: string; easySlipApiKey: string; slip2goApiUrl: string; slip2goSecretKey: string;
  fallbackProvider: string; failoverAfter: number; failoverMinutes: number; failoverTrustNotFound: boolean; autoMatchAmount: boolean; autoMatchTimeWindow: number;
  requireApproval: boolean; slipAgeCheck: boolean; slipMaxAgeHours: number; uniqueAmount: boolean; uniqueAmountMaxSatang: number; orderTtlMinutes: number;
  intentPurgeDays: number; smsStrictAllChannels: boolean; centralReceiving: boolean; centralDistribution: string; centralFixedAccountId: number | "";
  p2pMatching: boolean; p2pRepoolGraceMinutes: number; p2pStaleAfterMinutes: number; p2pAutoPayout: boolean; updatedAt?: string | null;
};
const PROVIDERS = [["none", "ไม่ verify (เก็บรูปอย่างเดียว)"], ["thunder", "Thunder Solution"], ["slipok", "SlipOK"], ["easyslip", "EasySlip"], ["slip2go", "Slip2Go"]] as const;
const sub = "mb-4 rounded-[10px] border border-line bg-surface-alt p-3.5";

export function SlipCard({ slip, accounts }: { slip: Slip; accounts: { id: number; label: string }[] }) {
  const router = useRouter();
  const { updatedAt, ...initial } = slip;
  const [s, setS] = useState(initial);
  const set = <K extends keyof typeof s>(k: K) => (v: (typeof s)[K]) => setS((p) => ({ ...p, [k]: v }));
  const save = useRun();
  const test = useRun();
  const result = test.r?.ok ? (test.r.result as { provider?: string; ok: boolean; message: string; ms?: number; quota?: { remaining: number | null; total: number | null } }) : null;

  return (
    <SCard title="การตรวจสลิป — ค่าเริ่มต้น" note={'ใช้กับ bot ที่ตั้ง "ใช้ค่าเริ่มต้น" และการอัปโหลดสลิปแบบ manual'}>
      <form onSubmit={(e) => { e.preventDefault(); save.run(() => saveSection("slip", s), (r) => r.ok && router.refresh()); }}>
        <Msg r={save.r} />
        <div className="mb-4">
          <label htmlFor="providerSel" className={fieldLabel}>ผู้ให้บริการตรวจสลิปเริ่มต้น</label>
          <select id="providerSel" className={select} value={s.provider} onChange={(e) => set("provider")(e.target.value)}>{PROVIDERS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
        </div>
        <div className={row}>
          <Secret id="thunderAccessToken" label="Thunder Access Token" placeholder="จาก developer.thunder.in.th" value={s.thunderAccessToken} onChange={set("thunderAccessToken")} />
          <Secret id="slipOkApiKey" label="SlipOK API Key" value={s.slipOkApiKey} onChange={set("slipOkApiKey")} />
          <div className="mb-4"><label htmlFor="slipOkBranchId" className={fieldLabel}>SlipOK Branch ID</label><input id="slipOkBranchId" className={field} value={s.slipOkBranchId} onChange={(e) => set("slipOkBranchId")(e.target.value)} /></div>
          <Secret id="easySlipApiKey" label="EasySlip API Key" placeholder="Bearer token จาก developer.easyslip.com" value={s.easySlipApiKey} onChange={set("easySlipApiKey")} />
          <div className="mb-4"><label htmlFor="slip2goApiUrl" className={fieldLabel}>Slip2Go API URL</label><input id="slip2goApiUrl" className={field} placeholder="https://….slip2go.com (ดูได้ที่หน้า API Connect ใน dashboard)" value={s.slip2goApiUrl} onChange={(e) => set("slip2goApiUrl")(e.target.value)} /></div>
          <Secret id="slip2goSecretKey" label="Slip2Go Secret Key" placeholder="Secret Key จาก dashboard ของ Slip2Go" value={s.slip2goSecretKey} onChange={set("slip2goSecretKey")} />
        </div>

        <div className={sub}>
          <div className={row}>
            <div className="mb-4"><label htmlFor="fallbackSel" className={fieldLabel}>ผู้ให้บริการสำรอง — ใช้แทนอัตโนมัติเมื่อตัวหลักขัดข้อง</label>
              <select id="fallbackSel" className={select} value={s.fallbackProvider} onChange={(e) => set("fallbackProvider")(e.target.value)}><option value="">ไม่มี</option>{PROVIDERS.slice(1).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>
            <div />
            <Num id="failoverAfter" label="สลับไปตัวสำรองเมื่อล้มติดกัน (ใบ)" min={1} max={100} value={s.failoverAfter} onChange={set("failoverAfter")} />
            <Num id="failoverMinutes" label="ใช้ตัวสำรองนาน (นาที) ก่อนลองตัวหลักอีกครั้ง" min={1} max={1440} value={s.failoverMinutes} onChange={set("failoverMinutes")} />
          </div>
          <Check id="fotrust" checked={s.failoverTrustNotFound} onChange={set("failoverTrustNotFound")}>
            <strong>เชื่อคำตอบ &ldquo;ไม่พบสลิป / สลิปไม่ถูกต้อง&rdquo; ของตัวสำรองทันที</strong> — ไม่ต้องรอตัวหลักกลับมาตรวจซ้ำ · <strong className="text-danger">เสี่ยงกับสลิปธนาคารกรุงเทพ</strong> ที่บางผู้ให้บริการอ่านไม่ได้
          </Check>
        </div>

        <div className={sub}>
          <Check id="ama" checked={s.autoMatchAmount} onChange={set("autoMatchAmount")}>จับคู่อัตโนมัติเมื่อยอดตรงกัน</Check>
          <div className={row}>
            <Num id="autoMatchTimeWindow" label="ช่วงเวลาจับคู่ย้อนหลัง (ชั่วโมง)" min={1} max={168} value={s.autoMatchTimeWindow} onChange={set("autoMatchTimeWindow")} help="เงินเข้าจะจับกับออเดอร์ที่ยอดตรงกันซึ่งสร้างภายในช่วงนี้ก่อนเวลาโอน" />
          </div>
          <Check id="rqa" checked={s.requireApproval} onChange={set("requireApproval")}>ต้องให้ผู้ดูแลยืนยันก่อน</Check>
          <Check id="slipage" checked={s.slipAgeCheck} onChange={set("slipAgeCheck")}><strong>ตรวจอายุสลิป</strong> — ปฏิเสธสลิปที่เก่ากว่าที่กำหนด</Check>
          {s.slipAgeCheck && <div className={row}><Num id="slipMaxAgeHours" label="ตรวจสลิปย้อนหลังได้ (ชั่วโมง) — 0 = ต้องเป็นวันเดียวกับออเดอร์" min={0} max={720} value={s.slipMaxAgeHours} onChange={set("slipMaxAgeHours")} /></div>}
          <Check id="uamt" checked={s.uniqueAmount} onChange={set("uniqueAmount")}>ยอดไม่ซ้ำต่อออเดอร์ — เติมสตางค์อัตโนมัติเพื่อแยกผู้จ่ายเมื่อยอดเท่ากันเข้าพร้อมกัน</Check>
          {s.uniqueAmount && <p className="mt-1 rounded-lg border-l-[3px] border-[#f59e0b] bg-[#f59e0b]/10 px-3 py-2 text-[12.5px] leading-relaxed text-ink">⚠️ ยอดของออเดอร์จะ<strong>ไม่ตรงกับที่ร้านส่งมา</strong> (เช่น 500 → 500.03) — ร้านต้องแสดงยอดจาก response (<code>copy.amount</code>) ให้ลูกค้าโอนตรงทุกสตางค์ · ถ้าลูกค้าโอนยอดกลมตามที่ร้านสั่ง ระบบยังยอมรับได้เมื่อธนาคารยืนยันสลิป (ปรับยอดออเดอร์เป็นยอดที่ได้รับจริง) · เปิดเฉพาะเมื่อจำเป็นต้องจับคู่เงินเข้าโดยไม่มีสลิป (SMS / แจ้งเตือนธนาคาร)</p>}
          {s.uniqueAmount && <div className={row}><Num id="uniqueAmountMaxSatang" label="สตางค์สูงสุดที่เติมได้ต่อยอด (0–99)" min={0} max={99} value={s.uniqueAmountMaxSatang} onChange={set("uniqueAmountMaxSatang")} /></div>}
          <div className={row}>
            <Num id="orderTtlMinutes" label="อายุออเดอร์ (นาที) — 0 = ไม่หมดอายุ" min={0} max={10080} value={s.orderTtlMinutes} onChange={set("orderTtlMinutes")} help={<>เกินเวลานี้ออเดอร์จะเป็น <strong className="text-ink">หมดอายุ</strong></>} />
            <Num id="intentPurgeDays" label="ล้างออเดอร์ฝากไม่ระบุยอดที่หมดอายุแล้วไม่มีเงินเข้า หลัง (วัน) — 0 = ไม่ล้าง" min={0} max={365} value={s.intentPurgeDays} onChange={set("intentPurgeDays")} help={<>ล้างเฉพาะที่ <strong className="text-ink">หมดอายุ ยอดยัง 0 ไม่มีสลิป ไม่มีเงินเข้า</strong></>} />
          </div>
          <Check id="strictsms" checked={s.smsStrictAllChannels} onChange={set("smsStrictAllChannels")}><strong>บังคับอุปกรณ์ที่ลงทะเบียนกับทุกช่องทาง SMS</strong> — เปิดเมื่อ<strong className="text-ink">จับคู่มือถือครบทุกช่องทางแล้ว</strong></Check>
        </div>

        <div className={sub}>
          <Check id="ctrl" checked={s.centralReceiving} onChange={set("centralReceiving")}><strong>โหมดบัญชีรับเงินกลาง</strong> — ออเดอร์ของร้านที่<strong className="text-ink">ไม่ผูกร้าน</strong>กับบัญชีใด จะใช้บัญชีกลาง</Check>
          {s.centralReceiving && (
            <div className={row}>
              <div className="mb-4"><label htmlFor="centralDistribution" className={fieldLabel}>การกระจายบัญชีรับเงิน</label>
                <select id="centralDistribution" className={select} value={s.centralDistribution} onChange={(e) => set("centralDistribution")(e.target.value)}>
                  <option value="auto">กระจายตามยอดเงิน — บัญชีที่รับเงินวันนี้น้อยที่สุด</option>
                  <option value="count">กระจายตามจำนวนรายการ — บัญชีที่มีออเดอร์วันนี้น้อยที่สุด</option>
                  <option value="random">สุ่ม — เลือกบัญชีแบบสุ่มทุกออเดอร์</option>
                  <option value="fixed">ใช้บัญชีเดียว (เลือกด้านขวา)</option>
                </select></div>
              <div className="mb-4"><label htmlFor="centralFixedAccountId" className={fieldLabel}>บัญชีกลางที่ใช้ (โหมดใช้บัญชีเดียว)</label>
                <select id="centralFixedAccountId" className={select} value={s.centralFixedAccountId} onChange={(e) => set("centralFixedAccountId")(e.target.value ? Number(e.target.value) : "")}>
                  <option value="">— ให้ระบบเลือกอัตโนมัติ —</option>
                  {accounts.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}
                </select></div>
            </div>
          )}
        </div>

        <div className={sub}>
          <Check id="p2pchk" checked={s.p2pMatching} onChange={set("p2pMatching")}><strong>โหมด P2P จับคู่ฝาก-ถอน</strong> — ให้ลูกค้าที่ฝากโอนตรงไปยังผู้ขอถอน</Check>
          {s.p2pMatching && (
            <>
              <div className="mb-3 flex flex-wrap items-center gap-2 text-[13px]">คืนคำขอถอนกลับเข้าคิวหลังจากคู่ถูกยกเลิก <input aria-label="p2pRepoolGraceMinutes" type="number" className={`${field} w-[90px]`} min={0} max={1440} value={s.p2pRepoolGraceMinutes} onChange={(e) => set("p2pRepoolGraceMinutes")(Number(e.target.value))} /> นาที</div>
              <div className="mb-3 flex flex-wrap items-center gap-2 text-[13px]">คำขอถอนที่รอนานเกิน <input aria-label="p2pStaleAfterMinutes" type="number" className={`${field} w-[90px]`} min={0} max={10080} value={s.p2pStaleAfterMinutes} onChange={(e) => set("p2pStaleAfterMinutes")(Number(e.target.value))} /> นาที ให้ออกจาก P2P (0 = <strong>ไม่มีเวลารอ</strong>)</div>
              <Check id="p2pAutoPayoutChk" checked={s.p2pAutoPayout} onChange={set("p2pAutoPayout")}><strong>อนุมัติคำขอถอนอัตโนมัติไปรอโอนที่หน้าเงินออก (ทุกคำขอ)</strong></Check>
            </>
          )}
        </div>

        <div className="mb-3 flex flex-wrap items-center gap-2">
          <button type="button" className={B()} disabled={test.pending} onClick={() => test.run(() => testSlip("primary", s))}>ทดสอบ provider</button>
          <button type="button" className={B()} disabled={test.pending} title="ทดสอบผู้ให้บริการสำรองด้วยค่าที่กรอกอยู่ — ไม่ต้องสลับตัวหลัก" onClick={() => test.run(() => testSlip("fallback", s))}>ทดสอบตัวสำรอง</button>
          {test.pending && <span className="text-[13px] text-muted">กำลังทดสอบ...</span>}
        </div>
        {test.r && !test.r.ok && <Msg r={test.r} />}
        {result && (
          <div role="status" className={`mb-3 rounded-lg border px-3.5 py-2.5 text-[13px] ${result.ok ? "border-emerald-500/30 bg-emerald-500/15 text-emerald-300" : "border-red-500/30 bg-red-500/15 text-red-300"}`}>
            {result.provider && <strong>{result.provider}: </strong>}{result.message}{result.ms != null && ` · ${result.ms} ms`}
            {result.quota?.remaining != null && ` · คงเหลือ ${result.quota.remaining.toLocaleString()} ครั้ง`}
          </div>
        )}
        <div className={hint}>ยิงจริงไปที่ provider ด้วยค่าที่กรอกอยู่ในฟอร์มนี้ (ยังไม่ต้องกดบันทึกก่อนก็ได้) เพื่อดูว่า key ใช้ได้ — เรียก endpoint บัญชี/โควตา จึงไม่กินโควตา · รองรับ EasySlip และ SlipOK</div>

        <div className="mt-4 flex items-center justify-between gap-3 border-t border-line pt-4">
          <span className="text-[12.5px] text-muted">อัปเดตล่าสุด: {updatedAt ? fmtDateTime(updatedAt) : "—"}</span>
          <button type="submit" className={B("primary")} disabled={save.pending}>บันทึก</button>
        </div>
      </form>
    </SCard>
  );
}
