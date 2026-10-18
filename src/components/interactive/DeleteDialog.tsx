"use client";

import { useState, useTransition } from "react";
import { Archive } from "lucide-react";
import { Modal, btn, field, fieldLabel } from "@/components/interactive/Modal";
import type { ActionResult } from "@/lib/api";
import { DELETE_NOTE, REASON_MAX, reasonError } from "@/lib/delete-reason";

/**
 * The one confirmation every console "ลบ" goes through (soft delete, 18 Oct 2026): says what is deleted, that it is
 * kept and can be restored, asks for the reason (required), and only deletes on "ยืนยันการลบ".
 */
export function DeleteDialog({
  title,
  what,
  warning,
  placeholder = "เช่น สร้างซ้ำ / ข้อมูลผิด / ไม่ใช้แล้ว",
  onConfirm,
  onClose,
  onDone,
}: {
  title: string;
  what: React.ReactNode;
  warning?: React.ReactNode;
  placeholder?: string;
  onConfirm: (reason: string) => Promise<ActionResult> | ActionResult;
  onClose: () => void;
  onDone?: (r: ActionResult) => void;
}) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);
  const [pending, start] = useTransition();
  const invalid = reasonError(reason);

  const confirm = () => {
    setTouched(true);
    if (invalid) return;
    start(async () => {
      const r = await onConfirm(reason.trim());
      if (r.ok) { onDone?.(r); onClose(); } else setError(r.error);
    });
  };

  return (
    <Modal
      title={title}
      onClose={onClose}
      footer={
        <>
          <button className={`${btn.base} ${btn.md} ${btn.ghost}`} onClick={onClose} disabled={pending}>ยกเลิก</button>
          <button className={`${btn.base} ${btn.md} ${btn.danger}`} disabled={pending || !!invalid} onClick={confirm}>
            {pending ? "กำลังลบ…" : "ยืนยันการลบ"}
          </button>
        </>
      }
    >
      <div className="text-sm">{what}</div>
      {warning && <div className="mt-2 rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-[12.5px] text-warning">{warning}</div>}
      <div className="mt-3 flex items-start gap-2 rounded-lg border border-line bg-surface-alt/60 px-3 py-2 text-[12.5px] text-muted">
        <Archive size={14} className="mt-0.5 shrink-0" />
        <span>{DELETE_NOTE}</span>
      </div>
      <label className={`${fieldLabel} mt-4`} htmlFor="delete-reason">เหตุผลที่ลบ <span className="text-danger">*</span></label>
      <textarea
        id="delete-reason"
        className={field}
        rows={3}
        maxLength={REASON_MAX}
        value={reason}
        placeholder={placeholder}
        onChange={(e) => { setReason(e.target.value); setError(null); }}
        onBlur={() => setTouched(true)}
        onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) confirm(); }}
        autoFocus
      />
      <div className="mt-1 flex justify-between text-[11.5px] text-muted">
        <span className={touched && invalid ? "text-danger" : ""}>{touched && invalid ? invalid : "จะบันทึกไว้ใน Audit Log และหน้ารายการที่ลบแล้ว"}</span>
        <span>{reason.trim().length}/{REASON_MAX}</span>
      </div>
      {error && <p className="mt-3 text-[13px] text-danger">{error}</p>}
    </Modal>
  );
}
