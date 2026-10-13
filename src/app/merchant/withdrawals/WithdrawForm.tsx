"use client";

import { useState, useTransition } from "react";
import { btn, field, fieldLabel } from "@/components/interactive/Modal";
import { BANKS } from "@/lib/domain";
import { requestWithdrawal } from "../actions";

const baht = (n: number) => n.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function WithdrawForm({ available, minBalance, outFeePercent = 0, outFeeFlat = 0 }: { available: number; minBalance: number; outFeePercent?: number; outFeeFlat?: number }) {
  const [f, setF] = useState({ amount: "", bankCode: "KBANK", accountNumber: "", accountName: "", note: "" });
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });
  // Outgoing fee is on top: the receiver gets the amount, the shop is debited amount + fee.
  const hasFee = outFeePercent > 0 || outFeeFlat > 0;
  const amt = Number(f.amount) || 0;
  const fee = amt > 0 ? Math.round((amt * outFeePercent / 100 + outFeeFlat) * 100) / 100 : 0;
  const max = Math.max(0, Math.floor(((available - minBalance - outFeeFlat) / (1 + outFeePercent / 100)) * 100) / 100);
  return (
    <form
      className="px-[22px] py-5"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await requestWithdrawal({ ...f, amount: Number(f.amount) });
          if (!r.ok) return setMsg({ ok: false, text: r.error });
          setMsg({ ok: true, text: `ส่งคำขอถอนแล้ว (${(r.request as { requestRef: string }).requestRef}) — รอผู้ดูแลอนุมัติ` });
          setF({ ...f, amount: "", note: "" });
        });
      }}
    >
      {msg && <div role={msg.ok ? "status" : "alert"} className={`mb-3 rounded-lg border px-3.5 py-2.5 text-[13px] ${msg.ok ? "border-emerald-500/30 bg-emerald-500/15 text-emerald-300" : "border-red-500/30 bg-red-500/15 text-red-300"}`}>{msg.text}</div>}
      <div className="grid gap-4 md:grid-cols-2">
        <div><label htmlFor="w-amount" className={fieldLabel}>จำนวนเงิน (บาท)</label><input id="w-amount" type="number" step="0.01" min="1" required className={field} value={f.amount} onChange={set("amount")} />
          <div className="mt-1 text-[11.5px] text-muted">ถอนได้สูงสุด {baht(max)} บาท{hasFee && " (หลังหักค่าธรรมเนียม)"}{minBalance > 0 && ` (ต้องเหลือขั้นต่ำ ${minBalance.toLocaleString("th-TH")} บาท)`}</div>
          {hasFee && <div className="mt-0.5 text-[11.5px] text-muted">ค่าธรรมเนียมถอน {outFeePercent}% + {baht(outFeeFlat)} บาท/รายการ{amt > 0 && <> · ค่าธรรมเนียม <strong className="text-ink">{baht(fee)}</strong> · หักจากยอดคงเหลือ <strong className="text-ink">{baht(amt + fee)}</strong> บาท</>}</div>}</div>
        <div><label htmlFor="w-bank" className={fieldLabel}>ธนาคาร</label><select id="w-bank" className={`${field} [color-scheme:dark]`} value={f.bankCode} onChange={set("bankCode")}>{BANKS.map((b) => <option key={b.code} value={b.code}>{b.name}</option>)}</select></div>
        <div><label htmlFor="w-acc" className={fieldLabel}>เลขบัญชี</label><input id="w-acc" inputMode="numeric" pattern="\d{6,20}" required className={field} value={f.accountNumber} onChange={set("accountNumber")} /></div>
        <div><label htmlFor="w-name" className={fieldLabel}>ชื่อบัญชี</label><input id="w-name" required maxLength={120} className={field} value={f.accountName} onChange={set("accountName")} /></div>
      </div>
      <div className="mt-4"><label htmlFor="w-note" className={fieldLabel}>หมายเหตุ (ไม่บังคับ)</label><input id="w-note" maxLength={200} className={field} value={f.note} onChange={set("note")} /></div>
      <div className="mt-4 flex justify-end"><button type="submit" disabled={pending} className={`${btn.base} ${btn.md} ${btn.primary}`}>{pending ? "กำลังส่ง..." : "ส่งคำขอถอน"}</button></div>
    </form>
  );
}
