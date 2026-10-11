"use client";

import { useState, useTransition } from "react";
import QRCode from "qrcode";
import { Copy, ExternalLink, Plus } from "lucide-react";
import { btn, field, fieldLabel, Modal } from "@/components/interactive/Modal";
import { fmtDateTime, fmtMoney } from "@/lib/format";
import { createPortalPayment } from "../actions";

const B = (v: keyof typeof btn, s: "sm" | "md" = "md") => `${btn.base} ${btn[s]} ${btn[v]}`;
type Created = { ref: string; orderId: string; amount: number; link: string; qr: string; expires: string | null };
const EMPTY = { amount: "", orderId: "", description: "", customerName: "" };

/** Transactions → สร้างรายการชำระ: a pending order plus the payment-page link / QR to send to the customer. */
export function CreatePortalPayment() {
  const [open, setOpen] = useState(false);
  const [v, setV] = useState(EMPTY);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState<Created | null>(null);
  const [copied, setCopied] = useState(false);
  const [pending, start] = useTransition();
  const set = (k: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement>) => setV({ ...v, [k]: e.target.value });
  const close = () => { setOpen(false); setV(EMPTY); setErr(null); setDone(null); setCopied(false); };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    start(async () => {
      const r = await createPortalPayment({ amount: Number(v.amount), orderId: v.orderId, description: v.description, customerName: v.customerName });
      if (!r.ok) return setErr(r.error);
      const t = r.transaction as { id: string; ref: string; orderId: string; amount: number; qrExpiry: string | null };
      const link = `${window.location.origin}/c?t=${t.id}`;
      setDone({ ref: t.ref, orderId: t.orderId, amount: t.amount, link, qr: await QRCode.toDataURL(link, { margin: 1, width: 220 }), expires: t.qrExpiry });
    });
  };

  return (
    <>
      <button type="button" className={B("primary")} onClick={() => setOpen(true)}><Plus size={15} /> สร้างรายการชำระ</button>
      {open && (
        <Modal title={done ? "สร้างรายการแล้ว" : "สร้างรายการชำระ"} onClose={close} width={480}
          footer={done
            ? <><button type="button" className={B("ghost")} onClick={() => { setDone(null); setV(EMPTY); setCopied(false); }}>สร้างอีกรายการ</button><button type="button" className={B("primary")} onClick={close}>เสร็จสิ้น</button></>
            : <><button type="button" className={B("ghost")} onClick={close}>ยกเลิก</button><button type="submit" form="pp-create" disabled={pending} className={B("primary")}>{pending ? "กำลังสร้าง..." : "สร้างรายการ"}</button></>}>
          {done ? (
            <div className="text-[13.5px]">
              <div className="mb-3 grid grid-cols-2 gap-2">
                <div><div className="text-[12px] text-muted">เลขที่</div><div className="font-mono">{done.ref}</div></div>
                <div><div className="text-[12px] text-muted">ยอดที่ลูกค้าต้องโอน</div><div className="text-lg font-semibold">{fmtMoney(done.amount)}</div></div>
                <div><div className="text-[12px] text-muted">Order ID</div><div className="font-mono text-[12.5px] break-all">{done.orderId}</div></div>
                <div><div className="text-[12px] text-muted">หมดอายุ</div><div>{done.expires ? fmtDateTime(done.expires) : "ไม่หมดอายุ"}</div></div>
              </div>
              <p className="mb-2 text-muted">ส่งลิงก์หรือให้ลูกค้าสแกน QR เพื่อเปิดหน้าชำระเงิน — ลูกค้าโอนและแนบสลิปได้ในหน้านั้น</p>
              <div className="mb-3 grid place-items-center rounded-lg bg-white p-3">
                {/* eslint-disable-next-line @next/next/no-img-element -- generated data: URL */}
                <img src={done.qr} alt="QR หน้าชำระเงิน" width={220} height={220} />
              </div>
              <div className="flex gap-2">
                <input readOnly aria-label="ลิงก์หน้าชำระเงิน" className={`${field} font-mono text-[12px]`} value={done.link} onFocus={(e) => e.target.select()} />
                <button type="button" className={B("ghost", "sm")} onClick={() => { navigator.clipboard?.writeText(done.link); setCopied(true); }}><Copy size={13} /> {copied ? "คัดลอกแล้ว" : "คัดลอก"}</button>
                <a href={done.link} target="_blank" rel="noreferrer" className={B("ghost", "sm")}><ExternalLink size={13} /> เปิด</a>
              </div>
            </div>
          ) : (
            <form id="pp-create" onSubmit={submit} className="grid gap-3">
              {err && <div role="alert" className="rounded-lg border border-red-500/30 bg-red-500/15 px-3.5 py-2.5 text-[13px] text-red-300">{err}</div>}
              <div><label htmlFor="pp-amount" className={fieldLabel}>ยอด (บาท) *</label>
                <input id="pp-amount" type="number" inputMode="decimal" min="0.01" step="0.01" required autoFocus className={field} value={v.amount} onChange={set("amount")} placeholder="เช่น 150" /></div>
              <div><label htmlFor="pp-desc" className={fieldLabel}>รายละเอียด</label>
                <input id="pp-desc" maxLength={200} className={field} value={v.description} onChange={set("description")} placeholder="เช่น ก๋วยเตี๋ยว 2 ชาม (ไม่บังคับ)" /></div>
              <div><label htmlFor="pp-customer" className={fieldLabel}>ชื่อลูกค้า</label>
                <input id="pp-customer" maxLength={120} className={field} value={v.customerName} onChange={set("customerName")} placeholder="ไม่บังคับ" /></div>
              <div><label htmlFor="pp-order" className={fieldLabel}>Order ID</label>
                <input id="pp-order" maxLength={64} pattern="[A-Za-z0-9._:#/\-]+" title="ตัวอักษรอังกฤษ ตัวเลข และ . _ : - # / เท่านั้น" className={`${field} font-mono`} value={v.orderId} onChange={set("orderId")} placeholder="เว้นว่างให้ระบบสร้างให้" /></div>
            </form>
          )}
        </Modal>
      )}
    </>
  );
}
