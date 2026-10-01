"use client";

import { useState, useTransition } from "react";
import { Check } from "lucide-react";
import { Modal, btn } from "@/components/interactive/Modal";
import { fmtMoney } from "@/lib/format";
import { releasePair, settlePair } from "./actions";

/** ✓ ปิดคู่ / ปล่อยคู่ — both confirm first: choosing wrong pays twice or not at all. */
export function PairActions({ pair }: { pair: { ref: string; status: string; amount: string; paymentRef: string; withdrawalRef: string } }) {
  const [confirm, setConfirm] = useState<null | "settle" | "release">(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (pair.status !== "reserved" && pair.status !== "disputed") return <span className="text-[11.5px] text-soft">ปิดเรื่องแล้ว</span>;

  const run = () =>
    start(async () => {
      setError(null);
      const r = await (confirm === "settle" ? settlePair(pair.ref) : releasePair(pair.ref));
      if (r.ok) setConfirm(null);
      else setError(r.error);
    });

  return (
    <div className="flex flex-nowrap items-center justify-end gap-1.5">
      <button className={`${btn.base} ${btn.sm} ${btn.success}`} disabled={pending} onClick={() => setConfirm("settle")}><Check size={13} /> ปิดคู่</button>
      <button className={`${btn.base} ${btn.sm} border-[#fecaca]/40 bg-transparent text-danger hover:bg-danger/10`} disabled={pending} onClick={() => setConfirm("release")}>ปล่อยคู่</button>
      {confirm && (
        <Modal
          title={confirm === "settle" ? `ปิดคู่ ${pair.ref}` : `ปล่อยคู่ ${pair.ref}`}
          onClose={() => setConfirm(null)}
          footer={
            <>
              <button className={`${btn.base} ${btn.md} ${btn.ghost}`} onClick={() => setConfirm(null)}>ยกเลิก</button>
              <button className={`${btn.base} ${btn.md} ${confirm === "settle" ? btn.success : btn.danger}`} disabled={pending} onClick={run}>
                {confirm === "settle" ? "ยืนยันปิดคู่" : "ยืนยันปล่อยคู่"}
              </button>
            </>
          }
        >
          <p className="text-sm">
            {confirm === "settle"
              ? <>ยืนยันว่าลูกค้าของ <strong>{pair.paymentRef}</strong> โอน {fmtMoney(pair.amount)} ถึงผู้ถอน <strong>{pair.withdrawalRef}</strong> แล้วจริง — ระบบจะอนุมัติทั้งสองฝั่ง</>
              : <>ยืนยันว่า<u>ยังไม่มีการโอน</u> — คำขอถอน <strong>{pair.withdrawalRef}</strong> จะกลับเข้าพูลเพื่อจับคู่ใหม่หรือให้แอดมินโอนเอง</>}
          </p>
          <p className="mt-3 text-[12.5px] text-danger">ตรวจสลิปก่อนยืนยันเสมอ</p>
          {error && <p className="mt-3 text-[13px] text-danger">{error}</p>}
        </Modal>
      )}
    </div>
  );
}
