"use client";

import { useState } from "react";
import { AlertTriangle, Check } from "lucide-react";
import { Modal, btn } from "@/components/interactive/Modal";
import { approvalWarnings, fmtBaht, type ApprovalInput } from "./approvalCheck";

/** Confirmation before approving one or more payments (Thai). Mismatches must be acknowledged with a tick. */
export function ApproveDialog({ items, pending, error, onConfirm, onClose }: {
  items: ApprovalInput[]; pending: boolean; error?: string | null; onConfirm: () => void; onClose: () => void;
}) {
  const [ack, setAck] = useState(false);
  const flagged = items.map((p) => ({ p, w: approvalWarnings(p) })).filter((x) => x.w.length);
  const total = items.reduce((n, p) => n + Number(p.amount), 0);
  const many = items.length > 1;
  const blocked = flagged.length > 0 && !ack;

  return (
    <Modal title={many ? `ยืนยันการอนุมัติ ${items.length} รายการ` : `ยืนยันการอนุมัติ ${items[0]?.ref ?? ""}`} onClose={onClose} width={many ? 720 : 560}
      footer={
        <>
          <button type="button" className={`${btn.base} ${btn.md} ${btn.ghost}`} onClick={onClose} disabled={pending}>ยกเลิก</button>
          <button type="button" className={`${btn.base} ${btn.md} ${btn.success} inline-flex items-center gap-1.5`} disabled={pending || blocked} onClick={onConfirm}>
            <Check size={15} /> {pending ? "กำลังอนุมัติ…" : `ยืนยันอนุมัติ ${fmtBaht(total)}`}
          </button>
        </>
      }>
      <div className="text-[13px]">
        <p className="mb-3 text-muted">
          การอนุมัติจะเติมเงิน{many ? "ทุกรายการ" : ""}เข้ายอดคงเหลือของร้าน และแจ้งระบบของร้าน (webhook) ทันที — ตรวจให้แน่ใจว่าได้รับเงินตามยอดจริงแล้ว
        </p>
        <div className="mb-3 overflow-auto rounded-xl border border-line">
          <table className="w-full border-collapse">
            <thead><tr className="bg-surface-alt text-left text-[11.5px] text-muted">
              <th className="px-3 py-2">เลขที่</th><th className="px-3 py-2">ลูกค้า</th><th className="px-3 py-2 text-right">ยอดออเดอร์</th><th className="px-3 py-2 text-right">ยอดในสลิป</th><th className="px-3 py-2">ผลตรวจสลิป</th>
            </tr></thead>
            <tbody>
              {items.map((p) => {
                const bad = approvalWarnings(p).length > 0;
                return (
                  <tr key={p.ref} className={`border-t border-line ${bad ? "bg-rose-500/10" : ""}`}>
                    <td className="px-3 py-2 font-semibold whitespace-nowrap">{p.ref}</td>
                    <td className="px-3 py-2">{p.customerName ?? "—"}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{fmtBaht(p.amount)}</td>
                    <td className={`px-3 py-2 text-right tabular-nums ${p.slipAmount != null && Number(p.slipAmount) !== Number(p.amount) ? "font-semibold text-danger" : ""}`}>
                      {p.slipAmount != null && p.slipAmount !== "" ? fmtBaht(p.slipAmount) : p.hasSlipImage ? "อ่านไม่ได้" : "ไม่มีสลิป"}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">{p.slipDecision === "approve" ? "ผ่าน" : p.slipDecision === "invalid" ? <span className="text-danger">ไม่ผ่าน</span> : p.slipDecision === "review" ? "รอตรวจ" : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {flagged.length > 0 && (
          <div className="mb-3 rounded-xl border border-rose-500/40 bg-rose-500/10 px-3.5 py-3">
            <div className="mb-1.5 flex items-center gap-1.5 font-semibold text-danger"><AlertTriangle size={15} /> ข้อควรระวัง — {flagged.length} รายการไม่ตรงกับสลิป</div>
            <ul className="list-disc space-y-1 pl-5 text-[12.5px]">
              {flagged.flatMap(({ p, w }) => w.map((x, i) => <li key={`${p.ref}${i}`}><strong>{p.ref}</strong>: {x}</li>))}
            </ul>
            <label className="mt-3 flex items-start gap-2">
              <input type="checkbox" className="mt-0.5" checked={ack} onChange={(e) => setAck(e.target.checked)} />
              <span>ฉันตรวจสอบยอดเงินในบัญชีธนาคารแล้ว และยืนยันว่าต้องการอนุมัติ{many ? "ทุกรายการ" : "รายการนี้"}ตามยอดออเดอร์ แม้ไม่ตรงกับสลิป</span>
            </label>
          </div>
        )}
        {error && <div className="rounded-lg bg-rose-500/10 px-3 py-2 text-[12.5px] text-danger">{error}</div>}
      </div>
    </Modal>
  );
}
