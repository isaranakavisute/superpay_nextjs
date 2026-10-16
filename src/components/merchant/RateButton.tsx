"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import { Modal, btn, field, fieldLabel } from "../interactive/Modal";
import { saveRates, type Rates } from "@/app/merchant-dashboard/actions";

const FIELDS: [keyof Rates, string, string][] = [
  ["feePercent", "เงินเข้า (%)", "%"], ["feeFlat", "เงินเข้า คงที่ (บาท/รายการ)", "฿"],
  ["outFeePercent", "เงินออก (%)", "%"], ["outFeeFlat", "เงินออก คงที่ (บาท/รายการ)", "฿"],
];
const fmt = (k: keyof Rates, v: number) => (k.endsWith("Percent") ? `${v}%` : `฿${v.toFixed(2)}`);

/**
 * ✏️ next to a shop's rates: edit → review (before / after, the limits, what it affects) → confirm. Rates may not go
 * below the parent's or above any direct child's (the parent would lose money on that child).
 */
export type Volume = { label: string; gross: number; payCount: number; outAmount: number; outCount: number };

export function RateButton({ merchantId, name, current, floor, ceiling, volume }: {
  merchantId: number; name: string; current: Rates;
  floor: (Rates & { name: string }) | null;      // the parent's rates
  ceiling: (Rates & { names: string }) | null;   // the lowest rates among the direct children
  volume: Volume;                                // this shop's own approved volume in the selected period (for the estimates)
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"edit" | "confirm" | "risk">("edit");
  const [accepted, setAccepted] = useState(false);
  const [v, setV] = useState<Record<keyof Rates, string>>(() => Object.fromEntries(FIELDS.map(([k]) => [k, String(current[k])])) as Record<keyof Rates, string>);
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const next: Rates = Object.fromEntries(FIELDS.map(([k]) => [k, Number(v[k])])) as Rates;
  const changed = FIELDS.filter(([k]) => next[k] !== current[k]);
  const problems = FIELDS.flatMap(([k, label]) => [
    !Number.isFinite(next[k]) || next[k] < 0 ? `${label}: ต้องเป็นตัวเลข ≥ 0` : null,
    floor && next[k] < floor[k] ? `${label}: ต่ำกว่าร้านแม่ ${floor.name} (${fmt(k, floor[k])})` : null,
    ceiling && next[k] > ceiling[k] ? `${label}: สูงกว่าร้านย่อย (${ceiling.names}: ${fmt(k, ceiling[k])})` : null,
  ]).filter(Boolean) as string[];
  const close = () => { setOpen(false); setStep("edit"); setErr(null); setAccepted(false); };
  // What the new rates would have changed on this shop's own volume in the selected period.
  const feeOn = (r: Rates) => ({
    in: (volume.gross * r.feePercent) / 100 + volume.payCount * r.feeFlat,
    out: (volume.outAmount * r.outFeePercent) / 100 + volume.outCount * r.outFeeFlat,
  });
  const before = feeOn(current); const after = feeOn(next);
  const dIn = after.in - before.in; const dOut = after.out - before.out;
  const baht = (v: number) => `${v < 0 ? "−" : "+"}฿${Math.abs(v).toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const gap = (a: number, b: number) => `${Math.round((a - b) * 1000) / 1000}%`;
  const confirm = () => start(async () => {
    const r = await saveRates(merchantId, next);
    if (!r.ok) { setErr(r.error); setStep("edit"); return; }
    close();
    router.refresh();
  });

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} title={`แก้อัตราค่าธรรมเนียมของ ${name}`} aria-label={`แก้อัตราค่าธรรมเนียมของ ${name}`}
        className="ml-1.5 inline-grid size-6 place-items-center rounded-md border border-line text-muted transition hover:border-primary hover:text-primary">
        <Pencil size={12} />
      </button>
      {open && (
        <Modal title={step === "edit" ? `อัตราค่าธรรมเนียม — ${name}` : `ยืนยันการเปลี่ยนอัตรา — ${name}`} onClose={close} width={620}
          footer={step === "edit" ? (
            <div className="flex w-full justify-end gap-2">
              <button type="button" className={`${btn.base} ${btn.md} ${btn.ghost}`} onClick={close}>ยกเลิก</button>
              <button type="button" className={`${btn.base} ${btn.md} ${btn.primary}`} disabled={!changed.length || problems.length > 0} onClick={() => { setErr(null); setStep("confirm"); }}>ตรวจสอบก่อนบันทึก</button>
            </div>
          ) : (
            <div className="flex w-full justify-end gap-2">
              <button type="button" className={`${btn.base} ${btn.md} ${btn.ghost}`} disabled={pending} onClick={() => setStep(step === "risk" ? "confirm" : "edit")}>ย้อนกลับ</button>
              {step === "confirm"
                ? <button type="button" className={`${btn.base} ${btn.md} ${btn.primary}`} onClick={() => { setAccepted(false); setStep("risk"); }}>ยืนยัน — ดูความเสี่ยงก่อนบันทึก</button>
                : <button type="button" className={`${btn.base} ${btn.md} ${btn.primary}`} disabled={pending || !accepted} onClick={confirm}>{pending ? "กำลังบันทึก…" : "รับทราบความเสี่ยง — เปลี่ยนอัตรา"}</button>}
            </div>
          )}>
          {step === "risk" ? (
            <div className="text-[13px]">
              <div className="mb-3 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3.5 py-2.5 font-medium text-danger">
                ⚠️ โปรดอ่านความเสี่ยงทั้งหมดก่อนเปลี่ยนอัตราของ {name}
              </div>
              <ol className="list-decimal space-y-2.5 pl-5 text-[12.5px] leading-relaxed">
                <li><strong>ผลต่อรายได้ (ประมาณจาก{volume.label}: รับชำระ ฿{volume.gross.toLocaleString("th-TH", { minimumFractionDigits: 2 })} · {volume.payCount} รายการ · โอนออก ฿{volume.outAmount.toLocaleString("th-TH", { minimumFractionDigits: 2 })} · {volume.outCount} รายการ)</strong> —
                  ค่าธรรมเนียมเงินเข้า <span className={dIn < 0 ? "text-danger" : "text-success"}>{baht(dIn)}</span> · เงินออก <span className={dOut < 0 ? "text-danger" : "text-success"}>{baht(dOut)}</span> ต่อปริมาณเท่านี้
                  {floor ? <> — ส่วนต่างนี้ไปที่<strong>ค่าคอมของร้านแม่ {floor.name}</strong> (ส่วนต่างอัตราเงินเข้า {gap(current.feePercent, floor.feePercent)} → {gap(next.feePercent, floor.feePercent)} · เงินออก {gap(current.outFeePercent, floor.outFeePercent)} → {gap(next.outFeePercent, floor.outFeePercent)}) รายได้ของ Option Pay ไม่เปลี่ยน</>
                    : <> — ร้านนี้เป็นร้านระดับบนสุด: ส่วนต่างนี้คือ<strong>รายได้ของ Option Pay</strong>โดยตรง (จากร้านนี้และร้านย่อยทั้งหมดของร้านนี้)</>}
                </li>
                {ceiling && <li><strong>ค่าคอมของ {name} จากร้านย่อย ({ceiling.names})</strong> เปลี่ยน: ส่วนต่างอัตราเงินเข้าต่ำสุด {gap(ceiling.feePercent, current.feePercent)} → {gap(ceiling.feePercent, next.feePercent)} · เงินออก {gap(ceiling.outFeePercent, current.outFeePercent)} → {gap(ceiling.outFeePercent, next.outFeePercent)} {next.feePercent > current.feePercent || next.outFeePercent > current.outFeePercent ? "— ค่าคอมจากร้านย่อยจะลดลง" : "— ค่าคอมจากร้านย่อยจะเพิ่มขึ้น"}</li>}
                <li><strong>ร้านค้าและระบบของร้านต้องรู้ก่อน</strong> — ร้าน (และระบบที่เชื่อม API เช่น prismapays) อาจคำนวณยอดสุทธิ/ยอดที่ต้องโอนจากอัตราเดิม: ยอดที่ร้านได้รับจริงและยอดที่ถูกหักเมื่อโอนออกจะต่างจากที่ระบบของร้านคาด — แจ้งร้านก่อนเปลี่ยน</li>
                <li><strong>มีผลทันทีกับรายการใหม่</strong> — ออเดอร์ที่สร้างแล้ว (รวมที่รอชำระ) ใช้อัตราเดิม · รายการที่อนุมัติแล้วและค่าคอมที่เกิดแล้ว<strong>ไม่ถูกคำนวณใหม่</strong> · ช่วงที่มีทั้งอัตราเก่าและใหม่ ยอดในรายงานจะเป็นแบบผสม</li>
                {(next.outFeePercent > current.outFeePercent || next.outFeeFlat > current.outFeeFlat) && <li><strong>ค่าธรรมเนียมเงินออกสูงขึ้น</strong> — การโอนออก/ถอนครั้งถัดไปหักยอดร้านมากขึ้น: payout ที่ยอดคงเหลือพอดีกับอัตราเดิมอาจถูกปฏิเสธ (ยอดไม่พอ / ต่ำกว่ายอดขั้นต่ำ)</li>}
                {(next.feePercent < current.feePercent || next.outFeePercent < current.outFeePercent) && <li><strong>อัตราลดลง</strong> — {floor ? `ค่าคอมของ ${floor.name} จากร้านนี้ลดลง` : "รายได้ของ Option Pay ลดลง"}; ถ้าต้องการกลับไปอัตราเดิมภายหลังทำได้ แต่รายการที่เกิดในระหว่างนั้นไม่ถูกปรับย้อนหลัง</li>}
                <li><strong>ข้อจำกัด</strong> — ระบบไม่ยอมให้ต่ำกว่าร้านแม่หรือสูงกว่าร้านย่อย (ตรวจอีกครั้งตอนบันทึก) · การเปลี่ยนแปลงถูกบันทึกใน audit log พร้อมชื่อผู้แก้ อัตราเดิม และอัตราใหม่</li>
              </ol>
              <label className="mt-4 flex items-start gap-2 rounded-lg border border-line bg-surface-alt px-3 py-2.5">
                <input type="checkbox" className="mt-0.5" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} />
                <span>ฉันอ่านและเข้าใจความเสี่ยงทั้งหมดข้างต้น และต้องการเปลี่ยนอัตราค่าธรรมเนียมของ <strong>{name}</strong></span>
              </label>
              {err && <div className="mt-2 rounded-lg bg-rose-500/10 px-3 py-2 text-[12.5px] text-danger">{err}</div>}
            </div>
          ) : step === "edit" ? (
            <div className="grid gap-3 text-[13px] sm:grid-cols-2">
              {FIELDS.map(([k, label]) => (
                <div key={k}>
                  <label className={fieldLabel} htmlFor={`rate-${merchantId}-${k}`}>{label}</label>
                  <input id={`rate-${merchantId}-${k}`} className={field} inputMode="decimal" value={v[k]} onChange={(e) => setV({ ...v, [k]: e.target.value })} />
                  <div className="mt-1 text-[11.5px] text-muted">
                    ตอนนี้ {fmt(k, current[k])}{floor ? ` · ต่ำสุด ${fmt(k, floor[k])}` : ""}{ceiling ? ` · สูงสุด ${fmt(k, ceiling[k])}` : ""}
                  </div>
                </div>
              ))}
              <div className="text-[12px] text-muted sm:col-span-2">
                {floor ? `ต้องไม่ต่ำกว่าร้านแม่ (${floor.name})` : "ร้านระดับบนสุด — ไม่มีร้านแม่"}{ceiling ? ` · ต้องไม่สูงกว่าร้านย่อย (${ceiling.names}) มิฉะนั้นร้านนี้จะขาดทุนจากรายการของร้านย่อย` : ""}
              </div>
              {problems.length > 0 && <div className="rounded-lg bg-rose-500/10 px-3 py-2 text-[12.5px] text-danger sm:col-span-2">{problems.map((p) => <div key={p}>• {p}</div>)}</div>}
              {err && <div className="rounded-lg bg-rose-500/10 px-3 py-2 text-[12.5px] text-danger sm:col-span-2">{err}</div>}
            </div>
          ) : (
            <div className="text-[13px]">
              <table className="mb-4 w-full border-collapse">
                <thead><tr className="text-left text-[12px] text-muted"><th className="py-1.5">อัตรา</th><th className="py-1.5">เดิม</th><th className="py-1.5"></th><th className="py-1.5">ใหม่</th></tr></thead>
                <tbody>
                  {FIELDS.map(([k, label]) => (
                    <tr key={k} className={`border-t border-line ${next[k] !== current[k] ? "font-semibold" : "text-muted"}`}>
                      <td className="py-2">{label}</td><td className="py-2 tabular-nums">{fmt(k, current[k])}</td><td className="py-2 text-muted">→</td>
                      <td className={`py-2 tabular-nums ${next[k] !== current[k] ? "text-primary" : ""}`}>{fmt(k, next[k])}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <ul className="list-disc space-y-1 pl-5 text-[12.5px] text-muted">
                <li>มีผลกับ<strong className="text-ink">รายการใหม่</strong>เท่านั้น — รายการที่สร้างแล้วใช้ค่าธรรมเนียมเดิม</li>
                <li>ค่าคอมของร้านแม่จากร้านนี้ = อัตราของร้านนี้ − อัตราร้านแม่ · ค่าคอมของร้านนี้จากร้านย่อย = อัตราร้านย่อย − อัตราของร้านนี้</li>
                <li>บันทึกในบันทึกการตรวจสอบ (audit log) พร้อมชื่อผู้แก้</li>
              </ul>
            </div>
          )}
        </Modal>
      )}
    </>
  );
}
