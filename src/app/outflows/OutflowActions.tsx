"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import QR from "qrcode";
import { Check, Copy, Eye, Pencil, Trash2, Upload, X } from "lucide-react";
import { Modal, btn, field, fieldLabel } from "@/components/interactive/Modal";
import type { ActionResult } from "@/lib/api";
import { BANKS } from "@/lib/domain";
import { fmtMoney } from "@/lib/format";

/** Standard reason when an admin rejects an auto-approved payout (shown to the shop with status FAILED). */
const ADMIN_CANCEL_REASON = "ยกเลิกโดยผู้ดูแลระบบ";
import { approveOutflow, deleteOutflow, rejectOutflow, updateOutflow, uploadOutflowSlip } from "./actions";
import { OUTFLOW_CATEGORIES } from "./categories";
import { DeleteDialog } from "@/components/interactive/DeleteDialog";

type Dialog = null | "slip" | "edit" | "qr" | "approve" | "reject" | "delete";

export type OutflowForActions = {
  ref: string;
  status: "pending" | "approved" | "rejected";
  amount: string;
  category: string;
  bankAccountId: number | null;
  receiverName: string;
  receiverBankCode: string;
  receiverAccount: string;
  description: string | null;
  hasSlipImage: boolean;
  /** Auto-approved payouts the team has not transferred yet can still be rejected (refunds the shop). */
  adminDone?: boolean;
};

function toBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(",")[1] ?? "");
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
}

/** Copy-to-clipboard button showing "คัดลอกแล้ว" for 1.5s. */
export function CopyButton({ text, label = "คัดลอกเลขบัญชี" }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className={`${btn.base} ml-auto flex-none self-center border-line bg-transparent px-[9px] py-[7px] leading-none text-muted hover:bg-surface-alt hover:text-ink`}
      title={`${label} ${text}`}
      aria-label={label}
      onClick={() => {
        navigator.clipboard?.writeText(text.replace(/-/g, ""));
        setDone(true);
        setTimeout(() => setDone(false), 1500);
      }}
    >
      {done ? <Check size={13} className="text-success" /> : <Copy size={13} />}
    </button>
  );
}

/** QR code for the transfer (account + amount), drawn in the browser. */
function TransferQr({ o }: { o: OutflowForActions }) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    QR.toDataURL(`${o.receiverBankCode}|${o.receiverAccount.replace(/-/g, "")}|${o.amount}|${o.ref}`, { margin: 1, width: 240 }).then(setSrc);
  }, [o]);
  const bank = BANKS.find((b) => b.code === o.receiverBankCode);
  return (
    <div className="text-center">
      {/* eslint-disable-next-line @next/next/no-img-element -- generated data URL */}
      {src && <img src={src} alt={`QR โอนให้ ${o.receiverName}`} className="mx-auto rounded-xl bg-white p-2" width={240} height={240} />}
      <div className="mt-4 text-[22px] font-bold text-primary">{fmtMoney(o.amount)}</div>
      <div className="mt-2 flex items-center justify-center gap-2 text-[13px]">
        <span>{bank?.name ?? o.receiverBankCode} · {o.receiverAccount}</span>
        <CopyButton text={o.receiverAccount} />
      </div>
      <div className="text-[13px] text-muted">{o.receiverName}</div>
    </div>
  );
}

export function OutflowActions({ o, accounts }: { o: OutflowForActions; accounts: { id: number; label: string }[] }) {
  const [dialog, setDialog] = useState<Dialog>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [reason, setReason] = useState("");
  const [form, setForm] = useState({ category: o.category, bankAccountId: o.bankAccountId ? String(o.bankAccountId) : "", receiverBankCode: o.receiverBankCode, description: o.description ?? "" });
  // Deducting account is optional (payouts are paid outside Option Pay): "" = not specified.
  const [accountId, setAccountId] = useState(o.bankAccountId ? String(o.bankAccountId) : "");
  const [transferRef, setTransferRef] = useState("");
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
    setReason(d === "reject" && o.status === "approved" && o.adminDone === false ? ADMIN_CANCEL_REASON : "");
    setForm({ category: o.category, bankAccountId: o.bankAccountId ? String(o.bankAccountId) : "", receiverBankCode: o.receiverBankCode, description: o.description ?? "" });
    setDialog(d);
  };

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) return setError("ไฟล์ใหญ่เกิน 5 MB");
    run(async () => {
      const r = await uploadOutflowSlip(o.ref, file.type, await toBase64(file));
      if (r.ok) setSlipVersion((v) => v + 1);
      return r;
    }, false);
  };

  const sm = `${btn.base} ${btn.sm}`;
  const close = () => setDialog(null);
  const cancel = <button className={`${btn.base} ${btn.md} ${btn.ghost}`} onClick={close}>ยกเลิก</button>;
  const isPending = o.status === "pending";
  // "รอ admin ดำเนินการ": approved automatically, money not sent yet — may still be rejected.
  const rejectableApproved = o.status === "approved" && o.adminDone === false;

  return (
    <div className="flex flex-nowrap items-center justify-end gap-1.5">
      {o.hasSlipImage && (
        <button className={`${sm} ${btn.ghost}`} onClick={() => open("slip")} title="ดูสลิป" aria-label="ดูสลิป"><Eye size={14} /></button>
      )}
      <button className={`${sm} ${btn.ghost}`} onClick={() => fileRef.current?.click()} disabled={pending} title="แนบสลิป" aria-label="แนบสลิป"><Upload size={14} /></button>
      <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={onFile} />
      <button className={`${sm} ${btn.ghost}`} onClick={() => open("edit")} disabled={pending} title="จัดหมวดหมู่ / โอนจากบัญชี / ธนาคารปลายทาง" aria-label="จัดหมวดหมู่"><Pencil size={14} /></button>
      {o.status !== "rejected" && (
        <button className={`${sm} ${btn.ghost}`} onClick={() => open("qr")} title="QR โอนออก / คัดลอกเลขบัญชี">QR โอน</button>
      )}
      {rejectableApproved && (
        <button className={`${sm} border-[#fecaca]/40 bg-transparent text-danger hover:bg-danger/10`} onClick={() => open("reject")} disabled={pending} title="ปฏิเสธรายการนี้ — คืนยอด + ค่าธรรมเนียมให้ร้าน">
          <X size={14} /> ปฏิเสธ
        </button>
      )}
      {isPending && (
        <>
          <button className={`${sm} ${btn.success}`} onClick={() => open("approve")} disabled={pending} title="อนุมัติและโอนออก">
            <Check size={13} /> อนุมัติ
          </button>
          <button className={`${sm} border-[#fecaca]/40 bg-transparent text-danger hover:bg-danger/10`} onClick={() => open("reject")} disabled={pending} title="ปฏิเสธรายการนี้" aria-label="ปฏิเสธ">
            <X size={14} />
          </button>
        </>
      )}
      {o.status !== "approved" && (
        <button className={`${sm} border-line bg-transparent text-danger hover:bg-danger/10`} onClick={() => open("delete")} disabled={pending} title="ลบรายการ" aria-label="ลบรายการ">
          <Trash2 size={14} />
        </button>
      )}
      {error && !dialog && <span className="text-[11px] whitespace-normal text-danger">{error}</span>}

      {dialog === "slip" && (
        <Modal title={`สลิป ${o.ref}`} onClose={close} width={560}>
          {/* eslint-disable-next-line @next/next/no-img-element -- private, auth-gated image route */}
          <img src={`/outflows/${o.ref}/slip?v=${slipVersion}`} alt={`สลิปของ ${o.ref}`} className="mx-auto max-h-[70vh] rounded-lg bg-white" />
        </Modal>
      )}

      {dialog === "qr" && (
        <Modal title={`QR โอนออก — ${o.ref}`} onClose={close} width={420}>
          <TransferQr o={o} />
        </Modal>
      )}

      {dialog === "edit" && (
        <Modal
          title={`จัดหมวดหมู่ ${o.ref}`}
          onClose={close}
          footer={
            <>
              {cancel}
              <button
                className={`${btn.base} ${btn.md} ${btn.primary}`}
                disabled={pending}
                onClick={() =>
                  run(() =>
                    updateOutflow(o.ref, {
                      category: form.category,
                      bankAccountId: form.bankAccountId ? Number(form.bankAccountId) : null,
                      receiverBankCode: form.receiverBankCode,
                      description: form.description || undefined,
                    }),
                  )
                }
              >
                บันทึก
              </button>
            </>
          }
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={fieldLabel} htmlFor={`ec-${o.ref}`}>หมวดหมู่</label>
              <select id={`ec-${o.ref}`} className={field} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                {OUTFLOW_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label className={fieldLabel} htmlFor={`ea-${o.ref}`}>โอนจากบัญชี (ถ้ามี)</label>
              <select id={`ea-${o.ref}`} className={field} value={form.bankAccountId} onChange={(e) => setForm({ ...form, bankAccountId: e.target.value })} disabled={!isPending}>
                <option value="">— ยังไม่ระบุ —</option>
                {accounts.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}
              </select>
            </div>
            <div>
              <label className={fieldLabel} htmlFor={`eb-${o.ref}`}>ธนาคารปลายทาง</label>
              <select id={`eb-${o.ref}`} className={field} value={form.receiverBankCode} onChange={(e) => setForm({ ...form, receiverBankCode: e.target.value })}>
                {BANKS.map((b) => <option key={b.code} value={b.code}>{b.name}</option>)}
              </select>
            </div>
            <div>
              <label className={fieldLabel} htmlFor={`ed-${o.ref}`}>รายละเอียด</label>
              <input id={`ed-${o.ref}`} className={field} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
          </div>
          {error && <p className="mt-3 text-[13px] text-danger">{error}</p>}
        </Modal>
      )}

      {dialog === "approve" && (
        <Modal
          title={`อนุมัติ ${o.ref}`}
          onClose={close}
          footer={<>{cancel}<button className={`${btn.base} ${btn.md} ${btn.success}`} disabled={pending} onClick={() => run(() => approveOutflow(o.ref, accountId ? Number(accountId) : undefined, transferRef))}>ยืนยันอนุมัติ</button></>}
        >
          <p className="mb-3 text-[13px] text-muted">ยืนยันว่าโอน {fmtMoney(o.amount)} ให้ {o.receiverName} แล้ว — ยอด {fmtMoney(o.amount)} + ค่าธรรมเนียม จะถูกหักจากยอดคงเหลือของร้าน</p>
          <label className={fieldLabel} htmlFor={`at-${o.ref}`}>เลขอ้างอิงการโอน / หมายเหตุ (ถ้ามี)</label>
          <input id={`at-${o.ref}`} className={field} value={transferRef} maxLength={200} onChange={(e) => setTransferRef(e.target.value)} placeholder="เช่น เลขที่รายการจากแอปธนาคาร" autoFocus />
          <label className={`${fieldLabel} mt-3`} htmlFor={`aa-${o.ref}`}>โอนจากบัญชี (ถ้ามี)</label>
          <select id={`aa-${o.ref}`} className={field} value={accountId} onChange={(e) => setAccountId(e.target.value)}>
            <option value="">ไม่ระบุ — โอนนอกระบบ</option>
            {accounts.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}
          </select>
          {error && <p className="mt-3 text-[13px] text-danger">{error}</p>}
        </Modal>
      )}

      {dialog === "reject" && (
        <Modal
          title={`ปฏิเสธ ${o.ref}`}
          onClose={close}
          footer={<>{cancel}<button className={`${btn.base} ${btn.md} ${btn.danger}`} disabled={pending || !reason.trim()} onClick={() => run(() => rejectOutflow(o.ref, reason))}>ปฏิเสธรายการ</button></>}
        >
          {rejectableApproved && <p className="mb-3 text-[13px] text-muted">รายการนี้อนุมัติอัตโนมัติแล้ว — เมื่อปฏิเสธ ยอด {fmtMoney(o.amount)} + ค่าธรรมเนียม จะคืนเข้ายอดคงเหลือของร้าน และร้านเห็นสถานะ “ไม่สำเร็จ” พร้อมเหตุผลนี้ · ปฏิเสธได้เฉพาะรายการที่ยังไม่ได้โอนเงินให้ผู้รับ</p>}
          <label className={fieldLabel} htmlFor={`rr-${o.ref}`}>เหตุผล</label>
          <input id={`rr-${o.ref}`} className={field} value={reason} onChange={(e) => setReason(e.target.value)} autoFocus />
          {error && <p className="mt-3 text-[13px] text-danger">{error}</p>}
        </Modal>
      )}

      {dialog === "delete" && (
        <DeleteDialog
          title="ยืนยันการลบรายการเงินออก"
          what={<>ลบ <strong>{o.ref}</strong> ยอด {fmtMoney(o.amount)} · {o.receiverName}?</>}
          warning={o.status === "pending" ? "รายการนี้ยังรออนุมัติ — จะถูกปฏิเสธด้วยเหตุผลนี้ก่อน (รายการจาก API ร้านจะได้รับแจ้ง payout.failed)" : undefined}
          placeholder="เช่น สร้างซ้ำ / ข้อมูลผู้รับผิด"
          onConfirm={(reason) => deleteOutflow(o.ref, reason)}
          onClose={close}
        />
      )}
    </div>
  );
}
