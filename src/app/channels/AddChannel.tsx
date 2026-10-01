"use client";

import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { Modal, btn, field, fieldLabel } from "@/components/interactive/Modal";
import { createChannel } from "./actions";

export function AddChannel({ type, label }: { type: string; label: string }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <>
      <button className={`${btn.base} ${btn.sm} ${btn.primary}`} onClick={() => { setName(""); setError(null); setOpen(true); }}>
        <Plus size={14} /> เพิ่ม {label}
      </button>
      {open && (
        <Modal
          title={`เพิ่ม ${label} ใหม่`}
          onClose={() => setOpen(false)}
          footer={
            <>
              <button className={`${btn.base} ${btn.md} ${btn.ghost}`} onClick={() => setOpen(false)}>ยกเลิก</button>
              <button className={`${btn.base} ${btn.md} ${btn.primary}`} disabled={pending || !name.trim()} onClick={() => start(async () => { const r = await createChannel(type, name); if (r.ok) setOpen(false); else setError(r.error); })}>
                สร้าง
              </button>
            </>
          }
        >
          <label className={fieldLabel} htmlFor="ch-new-name">ชื่อ</label>
          <input id="ch-new-name" className={field} value={name} onChange={(e) => setName(e.target.value)} placeholder={`เช่น ${label} รับสลิปร้าน A`} autoFocus />
          {error && <p className="mt-3 text-[13px] text-danger">{error}</p>}
        </Modal>
      )}
    </>
  );
}
