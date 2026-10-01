"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { Modal, btn, field, fieldLabel } from "@/components/interactive/Modal";
import type { ActionResult } from "@/lib/api";
import { deleteDevice, renameDevice, resumeDevice, suspendDevice } from "./actions";

/** เปลี่ยนชื่อ · ระงับ / เปิดใช้ · ลบ — suspend and delete confirm first. */
export function DeviceActions({ id, name, suspended }: { id: number; name: string; suspended: boolean }) {
  const [dialog, setDialog] = useState<null | "rename" | "suspend" | "delete">(null);
  const [value, setValue] = useState(name);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<ActionResult>) =>
    start(async () => {
      setError(null);
      const r = await fn();
      if (r.ok) setDialog(null);
      else setError(r.error);
    });
  const cancel = <button className={`${btn.base} ${btn.md} ${btn.ghost}`} onClick={() => setDialog(null)}>ยกเลิก</button>;

  return (
    <div className="flex justify-end gap-1.5">
      <button className={`${btn.base} ${btn.sm} ${btn.ghost}`} onClick={() => { setValue(name); setDialog("rename"); }}>เปลี่ยนชื่อ</button>
      {suspended ? (
        <button className={`${btn.base} ${btn.sm} ${btn.ghost}`} disabled={pending} onClick={() => run(() => resumeDevice(id))}>เปิดใช้</button>
      ) : (
        <button className={`${btn.base} ${btn.sm} border-line bg-transparent text-danger hover:bg-danger/10`} onClick={() => setDialog("suspend")}>ระงับ</button>
      )}
      <button className={`${btn.base} ${btn.sm} border-line bg-transparent text-danger hover:bg-danger/10`} onClick={() => setDialog("delete")} aria-label="ลบอุปกรณ์" title="ลบอุปกรณ์"><Trash2 size={14} /></button>
      {error && !dialog && <span className="text-[11px] text-danger">{error}</span>}

      {dialog === "rename" && (
        <Modal title="เปลี่ยนชื่ออุปกรณ์" onClose={() => setDialog(null)} footer={<>{cancel}<button className={`${btn.base} ${btn.md} ${btn.primary}`} disabled={pending || !value.trim()} onClick={() => run(() => renameDevice(id, value))}>บันทึก</button></>}>
          <label className={fieldLabel} htmlFor={`dv-${id}`}>ชื่ออุปกรณ์</label>
          <input id={`dv-${id}`} className={field} value={value} onChange={(e) => setValue(e.target.value)} autoFocus />
          {error && <p className="mt-3 text-[13px] text-danger">{error}</p>}
        </Modal>
      )}
      {dialog === "suspend" && (
        <Modal title={`ระงับ ${name}`} onClose={() => setDialog(null)} footer={<>{cancel}<button className={`${btn.base} ${btn.md} ${btn.danger}`} disabled={pending} onClick={() => run(() => suspendDevice(id))}>ระงับเครื่องนี้</button></>}>
          <p className="text-sm">เครื่องนี้จะส่งข้อความเข้าระบบไม่ได้ทันที — ไม่ต้องเปลี่ยนรหัสลับของช่องทาง จึงไม่กระทบเครื่องอื่น</p>
        </Modal>
      )}
      {dialog === "delete" && (
        <Modal title={`ลบ ${name}`} onClose={() => setDialog(null)} footer={<>{cancel}<button className={`${btn.base} ${btn.md} ${btn.danger}`} disabled={pending} onClick={() => run(() => deleteDevice(id))}>ลบอุปกรณ์</button></>}>
          <p className="text-sm">ลบอุปกรณ์ออกจากระบบ? เครื่องจะต้องจับคู่ใหม่ด้วย QR ถ้าจะใช้อีก</p>
        </Modal>
      )}
    </div>
  );
}
