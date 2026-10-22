"use client";

import { useEffect, useState } from "react";
import { Modal, btn } from "@/components/interactive/Modal";
import { LoadingDialog } from "@/components/list/LoadingDialog";

/**
 * The admin slip upload runs the automatic check (bank, amount / account / time, reuse). A passing slip approves the
 * order at once, which moves its row to another list and unmounts the row's buttons — so the "checking…" and result
 * dialogs live here, on the page, and rows talk to it through window events.
 */
export type SlipCheckResult = {
  ref: string; checked: boolean; verified?: boolean; result?: string; message?: string; mismatches?: string[];
  autoCancelled?: { ref: string; reason: string }[]; error?: string;
};
export const slipCheckStart = (ref: string) => window.dispatchEvent(new CustomEvent("slip-check:start", { detail: ref }));
export const slipCheckDone = (r: SlipCheckResult) => window.dispatchEvent(new CustomEvent("slip-check:done", { detail: r }));

export function SlipCheckHost() {
  const [checking, setChecking] = useState<string | null>(null);
  const [result, setResult] = useState<SlipCheckResult | null>(null);
  useEffect(() => {
    const start = (e: Event) => { setResult(null); setChecking((e as CustomEvent<string>).detail); };
    const done = (e: Event) => { setChecking(null); setResult((e as CustomEvent<SlipCheckResult>).detail); };
    window.addEventListener("slip-check:start", start);
    window.addEventListener("slip-check:done", done);
    return () => { window.removeEventListener("slip-check:start", start); window.removeEventListener("slip-check:done", done); };
  }, []);
  const r = result;
  return (
    <>
      <LoadingDialog open={!!checking} title="กำลังตรวจสอบสลิป กรุณารอสักครู่"
        text={`ตรวจกับธนาคารและเทียบยอด บัญชีรับเงิน เวลาโอน ของรายการ ${checking ?? ""} (อาจใช้เวลาถึง 15 วินาที)`} />
      {r && (
        <Modal title={`ผลตรวจสลิป ${r.ref}`} onClose={() => setResult(null)} width={520}
          footer={<button className={`${btn.base} ${btn.md} ${btn.primary}`} onClick={() => setResult(null)}>ตกลง</button>}>
          <div className="grid gap-2 text-[14px] whitespace-normal">
            {r.error ? (
              <p className="font-semibold text-danger">✖ แนบสลิปไม่สำเร็จ: {r.error}</p>
            ) : !r.checked ? (
              <p className="text-muted">{r.message ?? "แนบสลิปแล้ว"}</p>
            ) : r.verified ? (
              <p className="font-semibold text-success">✔ ตรวจสลิปผ่าน — อนุมัติรายการแล้ว และแจ้งร้านค้า (callback) แล้ว</p>
            ) : r.result === "PENDING_REVIEW" ? (
              <p className="font-semibold text-warning">⏳ ยังยืนยันไม่ได้ — รอผู้ดูแลตรวจ / ระบบจะตรวจซ้ำอัตโนมัติ</p>
            ) : (
              <p className="font-semibold text-danger">✖ สลิปไม่ผ่าน — รายการยังไม่ถูกอนุมัติ</p>
            )}
            {r.checked && r.message && <p className="text-muted">{r.message}</p>}
            {!!r.mismatches?.length && <ul className="list-disc pl-5 text-[13px] text-danger">{r.mismatches.map((m) => <li key={m}>{m}</li>)}</ul>}
            {!!r.autoCancelled?.length && <div className="text-[13px] text-muted">ยกเลิกอัตโนมัติ (สลิปเดียวกัน): {r.autoCancelled.map((a) => a.ref).join(", ")}</div>}
            {r.checked && !r.verified && !r.error && <p className="text-[12.5px] text-soft">ถ้าตรวจกับบัญชีธนาคารแล้วว่าเงินเข้าจริง ยังกด “อนุมัติ” เองได้ตามปกติ</p>}
          </div>
        </Modal>
      )}
    </>
  );
}
