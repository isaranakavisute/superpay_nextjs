"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { Check, Eye, Upload, X } from "lucide-react";
import { Modal, btn, field, fieldLabel } from "@/components/interactive/Modal";
import type { ActionResult } from "@/lib/api";
import { fmtMoney } from "@/lib/format";
import { uploadOutflowSlip } from "../outflows/actions";
import { approveWithdrawal, rejectWithdrawal } from "./actions";

export type WithdrawalForActions = {
  ref: string;
  status: "pending" | "approved" | "rejected";
  amount: string;
  receiverName: string;
  outflowRef: string | null;
  hasSlipImage: boolean;
  p2pStatus: string | null;
  p2pRef: string | null;
};

function toBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(",")[1] ?? "");
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
}

export function WithdrawalActions({ w }: { w: WithdrawalForActions }) {
  const [dialog, setDialog] = useState<null | "reject" | "slip">(null);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [slipVersion, setSlipVersion] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  const run = (fn: () => Promise<ActionResult>, close = true) =>
    start(async () => {
      setError(null);
      const r = await fn();
      if (r.ok) {
        if (close) setDialog(null);
      } else setError(r.error);
    });

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !w.outflowRef) return;
    if (file.size > 5 * 1024 * 1024) return setError("ไฟล์ใหญ่เกิน 5 MB");
    run(async () => {
      const r = await uploadOutflowSlip(w.outflowRef!, file.type, await toBase64(file));
      if (r.ok) setSlipVersion((v) => v + 1);
      return r;
    }, false);
  };

  const sm = `${btn.base} ${btn.sm}`;
  const pairActive = w.p2pStatus === "reserved" || w.p2pStatus === "disputed";

  return (
    <div className="flex flex-nowrap items-center justify-end gap-1.5">
      {w.hasSlipImage && w.outflowRef && (
        <button className={`${sm} ${btn.ghost}`} onClick={() => setDialog("slip")} title="ดูสลิปการโอน" aria-label="ดูสลิป"><Eye size={14} /></button>
      )}
      {w.outflowRef && (
        <>
          <button className={`${sm} ${btn.ghost}`} onClick={() => fileRef.current?.click()} disabled={pending} title="แนบสลิปการโอน" aria-label="แนบสลิปการโอน"><Upload size={14} /></button>
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={onFile} />
        </>
      )}
      {pairActive && w.p2pRef && (
        <Link href={`/p2p?status=${w.p2pStatus}&q=${w.ref}`} className={`${sm} ${btn.ghost}`} title="จัดการคู่ P2P ของคำขอนี้">ปล่อยคู่</Link>
      )}
      {w.status === "pending" && w.p2pStatus !== "reserved" && (
        <>
          <button className={`${sm} ${btn.success}`} disabled={pending} onClick={() => run(() => approveWithdrawal(w.ref))} title="อนุมัติ — สร้างรายการเงินออกรอโอน">
            <Check size={13} /> อนุมัติ
          </button>
          <button className={`${sm} border-[#fecaca]/40 bg-transparent text-danger hover:bg-danger/10`} disabled={pending} onClick={() => { setReason(""); setError(null); setDialog("reject"); }}>
            <X size={13} /> ปฏิเสธ
          </button>
        </>
      )}
      {error && !dialog && <span className="text-[11px] whitespace-normal text-danger">{error}</span>}

      {dialog === "slip" && w.outflowRef && (
        <Modal title={`สลิปการโอน ${w.outflowRef}`} onClose={() => setDialog(null)} width={560}>
          {/* eslint-disable-next-line @next/next/no-img-element -- private, auth-gated image route */}
          <img src={`/outflows/${w.outflowRef}/slip?v=${slipVersion}`} alt={`สลิปของ ${w.outflowRef}`} className="mx-auto max-h-[70vh] rounded-lg bg-white" />
        </Modal>
      )}
      {dialog === "reject" && (
        <Modal
          title={`ปฏิเสธคำขอถอน ${w.ref}`}
          onClose={() => setDialog(null)}
          footer={
            <>
              <button className={`${btn.base} ${btn.md} ${btn.ghost}`} onClick={() => setDialog(null)}>ยกเลิก</button>
              <button className={`${btn.base} ${btn.md} ${btn.danger}`} disabled={pending || !reason.trim()} onClick={() => run(() => rejectWithdrawal(w.ref, reason))}>ปฏิเสธคำขอ</button>
            </>
          }
        >
          <p className="mb-3 text-[13px] text-muted">ยอด {fmtMoney(w.amount)} → {w.receiverName}</p>
          <label className={fieldLabel} htmlFor={`wr-${w.ref}`}>เหตุผล (ร้านค้าจะเห็นข้อความนี้)</label>
          <input id={`wr-${w.ref}`} className={field} value={reason} onChange={(e) => setReason(e.target.value)} autoFocus />
          {error && <p className="mt-3 text-[13px] text-danger">{error}</p>}
        </Modal>
      )}
    </div>
  );
}
