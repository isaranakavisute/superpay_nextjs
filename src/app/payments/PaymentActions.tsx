"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { Check, Eye, Link2, RotateCcw, Trash2, Undo2, Upload, X } from "lucide-react";
import { Modal, btn, field, fieldLabel } from "@/components/interactive/Modal";
import type { ActionResult } from "@/lib/api";
import type { PaymentStatus } from "@/lib/domain";
import { fmtMoney } from "@/lib/format";
import {
  approvePayment,
  assignPayment,
  deletePayment,
  editPaymentAmount,
  refundPayment,
  rejectPayment,
  revivePayment,
  uploadSlip,
} from "./actions";

type Dialog = null | "reject" | "amount" | "refund" | "delete" | "assign" | "slip";

export type PaymentForActions = {
  ref: string;
  status: PaymentStatus;
  amount: string;
  refundedAmount: string;
  merchantId: number | null;
  merchantOrderId: string | null;
  hasSlipImage: boolean;
};

/** Read a File as base64 (no data: prefix). */
function toBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(",")[1] ?? "");
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
}

/**
 * Row actions in the original's order: ดูสลิป · แนบสลิป · webhook · แก้ยอด · ระบุร้าน ·
 * อนุมัติ · ปฏิเสธ · ลบ — each shown only when the status allows it.
 */
export function PaymentActions({ p, merchants }: { p: PaymentForActions; merchants: { id: number; name: string }[] }) {
  const [dialog, setDialog] = useState<Dialog>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [reason, setReason] = useState("");
  const [amount, setAmount] = useState(p.amount);
  const [merchantId, setMerchantId] = useState(p.merchantId ? String(p.merchantId) : "");
  const [orderId, setOrderId] = useState(p.merchantOrderId ?? "");
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

  const open = (d: Dialog) => {
    setError(null);
    setReason("");
    setAmount(p.amount);
    setMerchantId(p.merchantId ? String(p.merchantId) : "");
    setOrderId(p.merchantOrderId ?? "");
    setDialog(d);
  };

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) return setError("ไฟล์ใหญ่เกิน 5 MB");
    run(async () => {
      const r = await uploadSlip(p.ref, file.type, await toBase64(file));
      if (r.ok) setSlipVersion((v) => v + 1);
      return r;
    }, false);
  };

  const s = p.status;
  const open_ = s === "pending" || s === "expired";
  const sm = `${btn.base} ${btn.sm}`;
  const dangerGhost = `${sm} border-[#fecaca]/40 bg-transparent text-danger hover:bg-danger/10`;
  const close = () => setDialog(null);
  const cancel = <button className={`${btn.base} ${btn.md} ${btn.ghost}`} onClick={close}>ยกเลิก</button>;

  return (
    <div className="flex flex-nowrap items-center justify-end gap-1.5">
      {p.hasSlipImage && (
        <button className={`${sm} ${btn.ghost}`} onClick={() => open("slip")} title="ดูสลิป" aria-label="ดูสลิป">
          <Eye size={14} />
        </button>
      )}
      <button className={`${sm} ${btn.ghost}`} onClick={() => fileRef.current?.click()} disabled={pending} title={p.hasSlipImage ? "เปลี่ยนสลิป" : "แนบสลิป"} aria-label="แนบสลิป">
        <Upload size={14} />
      </button>
      <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={onFile} />
      {p.merchantId != null && (
        <Link href={`/webhooks?range=all&q=${p.ref}`} className={`${sm} ${btn.ghost}`} title="ดูว่าแจ้งร้านไปหรือยัง / ร้านตอบอะไรกลับมา" aria-label="Webhook ของรายการนี้">
          <Link2 size={14} />
        </Link>
      )}
      {open_ && (
        <>
          <button className={`${sm} ${btn.ghost}`} onClick={() => open("amount")} disabled={pending} title="แก้ยอด (ลูกค้าโอนเศษไม่ตรง)">แก้ยอด</button>
          <button className={`${sm} ${btn.ghost}`} onClick={() => open("assign")} disabled={pending} title="เลือกว่าเงินก้อนนี้เข้าร้านไหน / ลูกค้าคนไหน · เติม Order ID ของร้านได้ถ้ายังไม่มี">ระบุร้าน</button>
        </>
      )}
      {s === "expired" && (
        <button className={`${sm} ${btn.ghost}`} onClick={() => run(() => revivePayment(p.ref))} disabled={pending} title="เปิดให้จ่ายได้อีกครั้ง">
          <RotateCcw size={13} /> ปลุกคืน
        </button>
      )}
      {open_ && (
        <>
          <button className={`${sm} ${btn.success}`} onClick={() => run(() => approvePayment(p.ref))} disabled={pending} title="ยืนยันว่าเงินเข้าแล้ว">
            <Check size={13} /> อนุมัติ
          </button>
          <button className={dangerGhost} onClick={() => open("reject")} disabled={pending} title="ปฏิเสธรายการนี้">
            <X size={13} /> ปฏิเสธ
          </button>
        </>
      )}
      {s === "approved" && (
        <button className={`${sm} ${btn.ghost}`} onClick={() => open("refund")} disabled={pending} title="คืนเงินให้ลูกค้า">
          <Undo2 size={13} /> คืนเงิน
        </button>
      )}
      {(open_ || s === "rejected") && Number(p.refundedAmount) === 0 && (
        <button className={`${sm} border-line bg-transparent text-danger hover:bg-danger/10`} onClick={() => open("delete")} disabled={pending} title="ปิดรายการนี้ทิ้ง (ลูกค้าไม่ได้โอน)" aria-label="ลบรายการ">
          <Trash2 size={14} />
        </button>
      )}
      {error && !dialog && <span className="text-[11px] whitespace-normal text-danger">{error}</span>}

      {dialog === "slip" && (
        <Modal title={`สลิป ${p.ref}`} onClose={close} width={560}>
          {/* eslint-disable-next-line @next/next/no-img-element -- private, auth-gated image route */}
          <img src={`/payments/${p.ref}/slip?v=${slipVersion}`} alt={`สลิปของ ${p.ref}`} className="mx-auto max-h-[70vh] rounded-lg bg-white" />
        </Modal>
      )}

      {dialog === "reject" && (
        <Modal
          title={`ปฏิเสธรายการ ${p.ref}`}
          onClose={close}
          footer={<>{cancel}<button className={`${btn.base} ${btn.md} ${btn.danger}`} disabled={pending || !reason.trim()} onClick={() => run(() => rejectPayment(p.ref, reason))}>ปฏิเสธรายการ</button></>}
        >
          <label className={fieldLabel} htmlFor={`reason-${p.ref}`}>เหตุผล</label>
          <input id={`reason-${p.ref}`} className={field} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="เช่น สลิปไม่ชัด / ยอดไม่ตรง" autoFocus />
          {error && <p className="mt-3 text-[13px] text-danger">{error}</p>}
        </Modal>
      )}

      {dialog === "amount" && (
        <Modal
          title={`แก้ยอด ${p.ref}`}
          onClose={close}
          footer={<>{cancel}<button className={`${btn.base} ${btn.md} ${btn.primary}`} disabled={pending || !(Number(amount) > 0)} onClick={() => run(() => editPaymentAmount(p.ref, Number(amount)))}>บันทึกยอด</button></>}
        >
          <p className="mb-3 text-[13px] text-muted">ยอดเดิม {fmtMoney(p.amount)} — ค่าธรรมเนียมจะคำนวณใหม่ตามเรตของร้าน</p>
          <label className={fieldLabel} htmlFor={`amt-${p.ref}`}>ยอดใหม่ (บาท)</label>
          <input id={`amt-${p.ref}`} className={field} type="number" min="0.01" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus />
          {error && <p className="mt-3 text-[13px] text-danger">{error}</p>}
        </Modal>
      )}

      {dialog === "assign" && (
        <Modal
          title={`ระบุร้าน ${p.ref}`}
          onClose={close}
          footer={<>{cancel}<button className={`${btn.base} ${btn.md} ${btn.primary}`} disabled={pending} onClick={() => run(() => assignPayment(p.ref, merchantId ? Number(merchantId) : null, orderId))}>บันทึก</button></>}
        >
          <p className="mb-3 text-[13px] text-muted">เลือกว่าเงินก้อนนี้เข้าร้านไหน — ค่าธรรมเนียมจะคำนวณใหม่ตามเรตของร้านที่เลือก</p>
          <div className="grid gap-4">
            <div>
              <label className={fieldLabel} htmlFor={`as-m-${p.ref}`}>ร้านค้า</label>
              <select id={`as-m-${p.ref}`} className={field} value={merchantId} onChange={(e) => setMerchantId(e.target.value)}>
                <option value="">— ไม่ผูกร้าน (house) —</option>
                {merchants.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
            <div>
              <label className={fieldLabel} htmlFor={`as-o-${p.ref}`}>Order ID ของร้าน</label>
              <input id={`as-o-${p.ref}`} className={field} value={orderId} onChange={(e) => setOrderId(e.target.value)} placeholder="ไม่บังคับ" />
            </div>
          </div>
          {error && <p className="mt-3 text-[13px] text-danger">{error}</p>}
        </Modal>
      )}

      {dialog === "refund" && (
        <Modal
          title={`คืนเงิน ${p.ref}`}
          onClose={close}
          footer={
            <>
              {cancel}
              <button className={`${btn.base} ${btn.md} ${btn.danger}`} disabled={pending || !(Number(amount) > 0) || Number(amount) > Number(p.amount)} onClick={() => run(() => refundPayment(p.ref, Number(amount)))}>
                ยืนยันคืนเงิน
              </button>
            </>
          }
        >
          <p className="mb-3 text-[13px] text-muted">ยอดที่ชำระ {fmtMoney(p.amount)} — คืนได้ไม่เกินยอดนี้</p>
          <label className={fieldLabel} htmlFor={`ref-${p.ref}`}>ยอดคืน (บาท)</label>
          <input id={`ref-${p.ref}`} className={field} type="number" min="0.01" max={p.amount} step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus />
          {error && <p className="mt-3 text-[13px] text-danger">{error}</p>}
        </Modal>
      )}

      {dialog === "delete" && (
        <Modal
          title="ลบรายการ"
          onClose={close}
          footer={<>{cancel}<button className={`${btn.base} ${btn.md} ${btn.danger}`} disabled={pending} onClick={() => run(() => deletePayment(p.ref))}>ลบรายการ</button></>}
        >
          <p className="text-sm">ลบ <strong>{p.ref}</strong> ยอด {fmtMoney(p.amount)} ออกจากระบบ? การลบจะถูกบันทึกใน Audit Log และย้อนกลับไม่ได้</p>
          {error && <p className="mt-3 text-[13px] text-danger">{error}</p>}
        </Modal>
      )}
    </div>
  );
}
