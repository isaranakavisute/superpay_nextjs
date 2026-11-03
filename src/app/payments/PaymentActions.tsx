"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useCan } from "@/components/shell/perms-context";
import Link from "next/link";
import { Check, Eye, Link2, RotateCcw, Trash2, Undo2, Upload, X } from "lucide-react";
import { Modal, btn, field, fieldLabel } from "@/components/interactive/Modal";
import type { ActionResult } from "@/lib/api";
import type { PaymentStatus } from "@/lib/domain";
import { fmtMoney } from "@/lib/format";
import { ApproveDialog } from "./ApproveDialog";
import { SlipHistory } from "./SlipHistory";
import { precheckPayment, type PrecheckSuggestion, type PrecheckWarning } from "./precheck";
import { PrecheckPanel } from "./PrecheckPanel";
import { DeleteDialog } from "@/components/interactive/DeleteDialog";
import { slipCheckDone, slipCheckStart } from "./SlipCheckHost";
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

type Dialog = null | "approve" | "reject" | "amount" | "refund" | "delete" | "assign" | "slip" | "attach";

export type PaymentForActions = {
  ref: string;
  status: PaymentStatus;
  amount: string;
  refundedAmount: string;
  merchantId: number | null;
  merchantOrderId: string | null;
  hasSlipImage: boolean;
  customerName?: string | null;
  reviewNote?: string | null;
  slipAmount?: string | null;
  slipDecision?: string | null;
  slipTransferLeft?: string | null;
  slipTransferUsedBy?: string | null;
  customerLeftover?: string | null;
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
  // สิทธิ์การเข้าถึง: only the buttons this operator's role may use (the backend refuses the rest anyway).
  const can = useCan();
  const canApprove = can("payment.approve");
  const canRefund = can("payment.refund");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [reason, setReason] = useState("");
  const [amount, setAmount] = useState(p.amount);
  const [merchantId, setMerchantId] = useState(p.merchantId ? String(p.merchantId) : "");
  const [orderId, setOrderId] = useState(p.merchantOrderId ?? "");
  const [slipVersion, setSlipVersion] = useState(0);
  // "ระบุร้าน": the same checks as creating an order (precheck.ts); red ones must be ticked before saving (1 Nov 2026)
  const [check, setCheck] = useState<{ warnings: PrecheckWarning[]; suggestions: PrecheckSuggestion[] } | null>(null);
  const [acks, setAcks] = useState<boolean[]>([]);
  const [checking, setChecking] = useState(false);   // outside the transition — see CreatePayment
  const allAcked = !check || check.warnings.every((w, i) => w.level !== "red" || acks[i]);
  const fileRef = useRef<HTMLInputElement>(null);

  const run = (fn: () => Promise<ActionResult>, close = true) =>
    start(async () => {
      setError(null);
      const r = await fn();
      if (r.ok) {
        if (close) setDialog(null);
      } else setError(r.error);
    });

  const saveAssign = async () => {
    setError(null);
    const mid = merchantId ? Number(merchantId) : null;
    if (!check) {
      setChecking(true);
      const c = await precheckPayment({ merchantId: mid, merchantOrderId: orderId || undefined, customerName: p.customerName ?? undefined, amount: Number(p.amount), exceptRef: p.ref })
        .catch((e: unknown) => ({ ok: false as const, error: e instanceof Error ? e.message : String(e) }));
      setChecking(false);
      if (!c.ok) { setError(`ตรวจข้อมูลไม่สำเร็จ: ${c.error}`); return; }
      if (c.warnings.length) { setCheck({ warnings: c.warnings, suggestions: c.suggestions }); setAcks([]); return; }
    }
    run(() => assignPayment(p.ref, mid, orderId));
  };

  const open = (d: Dialog) => {
    setError(null);
    setReason("");
    setAmount(p.amount);
    setMerchantId(p.merchantId ? String(p.merchantId) : "");
    setOrderId(p.merchantOrderId ?? "");
    setCheck(null);
    setDialog(d);
  };

  // แนบสลิป dialog: paste (Ctrl/⌘+V), drag & drop, or choose a file → preview → attach and check.
  const [picked, setPicked] = useState<{ file: File; url: string } | null>(null);
  // Confirm step (2 Nov 2026, TXN222101 — another customer's slip attached to the wrong order): the admin ticks that the
  // slip belongs to THIS order (customer + amount shown) before it is sent; ticked again for every new picture.
  const [confirmed, setConfirmed] = useState(false);
  const pick = (file: File | null | undefined) => {
    if (!file) return;
    setConfirmed(false);
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) return setError("รองรับเฉพาะรูป JPG, PNG หรือ WebP");
    if (file.size > 5 * 1024 * 1024) return setError("ไฟล์ใหญ่เกิน 5 MB");
    setError(null);
    setPicked({ file, url: URL.createObjectURL(file) });
  };
  useEffect(() => {
    if (dialog !== "attach") return;
    const onPaste = (e: ClipboardEvent) => {
      const item = Array.from(e.clipboardData?.items ?? []).find((i) => i.kind === "file" && i.type.startsWith("image/"));
      const f = item?.getAsFile();
      if (!f) return;
      e.preventDefault();
      // Pasted screenshots have no useful name; keep the type.
      pick(new File([f], `slip-${p.ref}.${f.type.split("/")[1] ?? "png"}`, { type: f.type }));
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [dialog]); // eslint-disable-line react-hooks/exhaustive-deps
  const openAttach = () => { setPicked(null); setConfirmed(false); open("attach"); };
  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    pick(file);
  };
  const attach = () => {
    const file = picked?.file;
    if (!file) return;
    setDialog(null);
    setPicked(null);
    // Outside the transition so the page's "กำลังตรวจสอบสลิป…" dialog shows at once (SlipCheckHost).
    slipCheckStart(p.ref);
    run(async () => {
      // A passing slip approves the order and this row moves to another list — the result is shown by the page.
      const r = await uploadSlip(p.ref, file.type, await toBase64(file)).catch((e: unknown) => ({ ok: false as const, error: e instanceof Error ? e.message : String(e) }));
      slipCheckDone(r.ok ? { ref: p.ref, checked: false, ...(r as object) } : { ref: p.ref, checked: false, error: r.error });
      if (r.ok) setSlipVersion((v) => v + 1);
      return r;
    }, false);
  };

  const s = p.status;
  const open_ = s === "pending" || s === "expired";
  const finished = s === "approved" || s === "refunded" || s === "rejected";
  // An approved / refunded order keeps the slip that was checked and passed — no replacing it (the backend refuses too).
  const slipLocked = (s === "approved" || s === "refunded") && p.hasSlipImage && (p.slipDecision === "approve" || p.slipDecision === "evidence" || p.slipAmount != null);
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
      {canApprove && !slipLocked && <button className={`${sm} ${btn.ghost}`} onClick={openAttach} disabled={pending} title={p.hasSlipImage ? "เปลี่ยนสลิป — ตรวจสลิปอัตโนมัติ (ผ่าน = อนุมัติทันที)" : "แนบสลิป — ตรวจสลิปอัตโนมัติ (ผ่าน = อนุมัติทันที)"} aria-label="แนบสลิป">
        <Upload size={14} />
      </button>}
      <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={onFile} />
      {p.merchantId != null && can("webhook.view") && (
        <Link href={`/webhooks?range=all&q=${p.ref}`} className={`${sm} ${btn.ghost}`} title="ดูว่าแจ้งร้านไปหรือยัง / ร้านตอบอะไรกลับมา" aria-label="Webhook ของรายการนี้">
          <Link2 size={14} />
        </Link>
      )}
      {open_ && canApprove && (
        <>
          <button className={`${sm} ${btn.ghost}`} onClick={() => open("amount")} disabled={pending} title="แก้ยอด (ลูกค้าโอนเศษไม่ตรง)">แก้ยอด</button>
          <button className={`${sm} ${btn.ghost}`} onClick={() => open("assign")} disabled={pending} title="เลือกว่าเงินก้อนนี้เข้าร้านไหน / ลูกค้าคนไหน · เติม Order ID ของร้านได้ถ้ายังไม่มี">ระบุร้าน</button>
        </>
      )}
      {s === "expired" && canApprove && (
        <button className={`${sm} ${btn.ghost}`} onClick={() => run(() => revivePayment(p.ref))} disabled={pending} title="เปิดให้จ่ายได้อีกครั้ง">
          <RotateCcw size={13} /> ปลุกคืน
        </button>
      )}
      {open_ && canApprove && (
        <>
          <button className={`${sm} ${btn.success}`} onClick={() => open("approve")} disabled={pending} title="ยืนยันว่าเงินเข้าแล้ว">
            <Check size={13} /> อนุมัติ
          </button>
          <button className={dangerGhost} onClick={() => open("reject")} disabled={pending} title="ปฏิเสธรายการนี้">
            <X size={13} /> ปฏิเสธ
          </button>
        </>
      )}
      {s === "approved" && canRefund && (
        <button className={`${sm} ${btn.ghost}`} onClick={() => open("refund")} disabled={pending} title="คืนเงินให้ลูกค้า">
          <Undo2 size={13} /> คืนเงิน
        </button>
      )}
      {(open_ || s === "rejected") && Number(p.refundedAmount) === 0 && canApprove && (
        <button className={`${sm} border-line bg-transparent text-danger hover:bg-danger/10`} onClick={() => open("delete")} disabled={pending} title="ปิดรายการนี้ทิ้ง (ลูกค้าไม่ได้โอน)" aria-label="ลบรายการ">
          <Trash2 size={14} />
        </button>
      )}
      {error && !dialog && <span className="text-[11px] whitespace-normal text-danger">{error}</span>}

      {dialog === "attach" && (
        <Modal title={`${p.hasSlipImage ? "เปลี่ยนสลิป" : "แนบสลิป"} ${p.ref}`} onClose={() => { setDialog(null); setPicked(null); }} width={520}
          footer={<>
            <button className={`${btn.base} ${btn.md} ${btn.ghost}`} onClick={() => { setDialog(null); setPicked(null); }}>ยกเลิก</button>
            <button className={`${btn.base} ${btn.md} ${btn.primary}`} disabled={!picked || !confirmed || pending} onClick={attach}><Upload size={14} /> {picked && !confirmed ? "ติ๊กยืนยันก่อน" : "แนบและตรวจสลิป"}</button>
          </>}>
          <div className="mb-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 rounded-xl border border-primary/40 bg-primary/5 px-4 py-3 text-[13px]">
            <span className="text-muted">รายการ</span><b>{p.ref}{p.merchantOrderId ? <span className="font-normal text-muted"> · {p.merchantOrderId}</span> : null}</b>
            <span className="text-muted">ลูกค้า</span><b>{p.customerName || "—"}</b>
            <span className="text-muted">ยอด</span><b className="text-[16px] tabular-nums text-primary">{fmtMoney(p.amount)}</b>
          </div>
          {finished && (
            <p className="mb-3 rounded-lg border border-amber-400/40 bg-amber-400/10 px-3 py-2 text-[12.5px] text-warning">
              รายการนี้{s === "approved" ? "อนุมัติ" : s === "refunded" ? "คืนเงิน" : "ยกเลิก"}แล้ว — สลิปจะไม่เปลี่ยนสถานะรายการ ระบบจะตรวจกับธนาคาร และรับเฉพาะสลิปที่ยอดและผู้โอนตรงกับรายการนี้ · ทุกการแนบจะแจ้งกลุ่ม Option Pay Controller
            </p>
          )}
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); pick(e.dataTransfer.files?.[0]); }}
            className="grid place-items-center gap-2 rounded-xl border-2 border-dashed border-line bg-surface-alt p-5 text-center"
          >
            {picked ? (
              // eslint-disable-next-line @next/next/no-img-element -- local preview of the pasted / chosen slip
              <img src={picked.url} alt="สลิปที่จะแนบ" className="max-h-[50vh] rounded-lg border border-line" />
            ) : (
              <>
                <div className="text-[15px] font-semibold text-ink">วางรูปสลิปที่นี่ — กด Ctrl+V (Mac: ⌘+V)</div>
                <div className="text-[13px] text-muted">หรือลากไฟล์มาวาง หรือเลือกไฟล์จากเครื่อง</div>
              </>
            )}
            <button type="button" className={`${btn.base} ${btn.sm} ${btn.ghost}`} onClick={() => fileRef.current?.click()}>
              {picked ? "เปลี่ยนรูป" : "เลือกไฟล์…"}
            </button>
          </div>
          {picked && (
            <label className="mt-3 flex items-start gap-2 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2.5 text-[13px]">
              <input type="checkbox" className="mt-0.5" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />
              <span>ตรวจแล้ว — สลิปนี้เป็นของ <b>{p.customerName || "ลูกค้ารายการนี้"}</b> ยอด <b className="tabular-nums">{fmtMoney(p.amount)}</b> บาท (รายการ <b>{p.ref}</b>) ไม่ใช่สลิปของลูกค้าคนอื่น</span>
            </label>
          )}
          <p className="mt-3 text-[12.5px] text-muted">
            ระบบจะตรวจสลิปกับธนาคารอัตโนมัติ (ยอด บัญชีรับเงิน เวลาโอน และสลิปซ้ำ) — {finished ? <b className="text-ink">รายการที่ปิดแล้ว: เก็บเป็นหลักฐานเมื่อยอดตรงเท่านั้น</b> : <b className="text-ink">ผ่านแล้วอนุมัติรายการและแจ้งร้านค้าทันที</b>}
          </p>
          {error && <p className="mt-2 text-[13px] text-danger">{error}</p>}
        </Modal>
      )}

      {dialog === "approve" && (
        <ApproveDialog
          items={[{ ref: p.ref, amount: p.amount, customerName: p.customerName, status: p.status, hasSlipImage: p.hasSlipImage, slipAmount: p.slipAmount, slipDecision: p.slipDecision, slipTransferLeft: p.slipTransferLeft, slipTransferUsedBy: p.slipTransferUsedBy, customerLeftover: p.customerLeftover, reviewNote: p.reviewNote, merchantId: p.merchantId, merchantOrderId: p.merchantOrderId }]}
          pending={pending} error={error} onClose={() => setDialog(null)} onConfirm={() => run(() => approvePayment(p.ref))}
        />
      )}
      {dialog === "slip" && (
        <Modal title={`สลิป ${p.ref}`} onClose={close} width={560}>
          {/* eslint-disable-next-line @next/next/no-img-element -- private, auth-gated image route */}
          <img src={`/payments/${p.ref}/slip?v=${slipVersion}`} alt={`สลิปของ ${p.ref}`} className="mx-auto max-h-[60vh] rounded-lg bg-white" />
          {slipLocked && <p className="mt-3 text-center text-[12.5px] text-muted">🔒 สลิปนี้ตรวจผ่านและใช้อนุมัติรายการแล้ว — เปลี่ยนสลิปไม่ได้</p>}
          <SlipHistory paymentRef={p.ref} version={slipVersion} />
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
          footer={<>{cancel}<button className={`${btn.base} ${btn.md} ${btn.primary}`} disabled={pending || checking || !allAcked} onClick={saveAssign}>{checking ? "กำลังตรวจ…" : pending ? "กำลังบันทึก…" : check ? (allAcked ? "ยืนยันบันทึก" : "ติ๊กยืนยันทุกข้อสีแดงก่อน") : "บันทึก"}</button></>}
        >
          <p className="mb-3 text-[13px] text-muted">เลือกว่าเงินก้อนนี้เข้าร้านไหน — ค่าธรรมเนียมจะคำนวณใหม่ตามเรตของร้านที่เลือก</p>
          <div className="grid gap-4">
            <div>
              <label className={fieldLabel} htmlFor={`as-m-${p.ref}`}>ร้านค้า</label>
              <select id={`as-m-${p.ref}`} className={field} value={merchantId} onChange={(e) => { setMerchantId(e.target.value); setCheck(null); }}>
                <option value="">— ไม่ผูกร้าน (house) —</option>
                {merchants.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
            <div>
              <label className={fieldLabel} htmlFor={`as-o-${p.ref}`}>Order ID ของร้าน</label>
              <input id={`as-o-${p.ref}`} className={field} value={orderId} onChange={(e) => { setOrderId(e.target.value); setCheck(null); }} placeholder="ไม่บังคับ" />
            </div>
          </div>
          {check && <PrecheckPanel warnings={check.warnings} suggestions={check.suggestions} acks={acks} setAck={(i, v) => setAcks((a) => { const n = [...a]; n[i] = v; return n; })} />}
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
        <DeleteDialog
          title="ยืนยันการลบรายการ"
          what={<>ลบ <strong>{p.ref}</strong> ยอด {fmtMoney(p.amount)}{p.customerName ? <> · {p.customerName}</> : null}?</>}
          warning={p.status === "rejected" ? undefined : "รายการนี้ยังเปิดอยู่ — จะถูกปฏิเสธด้วยเหตุผลนี้ก่อน และร้านจะได้รับแจ้ง payment.rejected"}
          placeholder="เช่น ออเดอร์ซ้ำกับ TXN… / ร้านสร้างผิด"
          onConfirm={(reason) => deletePayment(p.ref, reason)}
          onClose={close}
        />
      )}
    </div>
  );
}
