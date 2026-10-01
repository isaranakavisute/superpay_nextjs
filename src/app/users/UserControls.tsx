"use client";

import { useState, useTransition } from "react";
import { Lock, Pencil, Plus, RotateCcw, Trash2, Unlock } from "lucide-react";
import { Modal, btn, field, fieldLabel } from "@/components/interactive/Modal";
import type { ActionResult } from "@/lib/api";
import { createUser, updateUser, userAction, type UserInput } from "./actions";

export type EditableUser = { id: number; username: string; fullName: string; email: string | null; phone: string | null; roleCode: string; status: string };
type Role = { code: string; name: string };

export function UserForm({ user, roles, onClose }: { user?: EditableUser; roles: Role[]; onClose: () => void }) {
  const [f, setF] = useState<UserInput>({
    username: user?.username ?? "",
    password: user ? "" : "123456",
    fullName: user?.fullName ?? "",
    email: user?.email ?? "",
    phone: user?.phone ?? "",
    roleCode: user?.roleCode ?? roles.at(-1)?.code ?? "viewer",
    status: user?.status === "inactive" ? "inactive" : "active",
  });
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const set = (k: keyof UserInput) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });
  return (
    <Modal
      title={user ? "แก้ไขข้อมูลผู้ใช้" : "เพิ่มผู้ใช้ใหม่"}
      onClose={onClose}
      width={640}
      footer={
        <>
          <button className={`${btn.base} ${btn.md} ${btn.ghost}`} onClick={onClose}>ยกเลิก</button>
          <button className={`${btn.base} ${btn.md} ${btn.primary}`} disabled={pending} onClick={() => start(async () => { const r = user ? await updateUser(user.id, f) : await createUser(f); if (r.ok) onClose(); else setError(r.error); })}>บันทึก</button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div><label className={fieldLabel} htmlFor="uf-n">ชื่อ-นามสกุล *</label><input id="uf-n" className={field} value={f.fullName} onChange={set("fullName")} autoFocus /></div>
        <div><label className={fieldLabel} htmlFor="uf-u">ชื่อผู้ใช้ (Username) *</label><input id="uf-u" className={field} value={f.username} onChange={set("username")} readOnly={!!user} /></div>
        <div><label className={fieldLabel} htmlFor="uf-e">อีเมล</label><input id="uf-e" type="email" className={field} value={f.email} onChange={set("email")} /></div>
        <div><label className={fieldLabel} htmlFor="uf-p">เบอร์โทร</label><input id="uf-p" className={field} value={f.phone} onChange={set("phone")} /></div>
        <div>
          <label className={fieldLabel} htmlFor="uf-r">ระดับสิทธิ์ *</label>
          <select id="uf-r" className={field} value={f.roleCode} onChange={set("roleCode")}>{roles.map((r) => <option key={r.code} value={r.code}>{r.name}</option>)}</select>
        </div>
        <div>
          <label className={fieldLabel} htmlFor="uf-s">สถานะ</label>
          <select id="uf-s" className={field} value={f.status} onChange={set("status")}><option value="active">ใช้งาน</option><option value="inactive">ปิดใช้</option></select>
        </div>
        <div className="sm:col-span-2">
          <label className={fieldLabel} htmlFor="uf-pw">{user ? "รีเซ็ตรหัสผ่าน (เว้นว่างถ้าไม่เปลี่ยน)" : "รหัสผ่านเริ่มต้น *"}</label>
          <input id="uf-pw" type="text" className={field} value={f.password} onChange={set("password")} autoComplete="new-password" />
          {!user && <div className="mt-1 text-[12px] text-muted">ผู้ใช้สามารถเปลี่ยนรหัสผ่านได้ในภายหลัง</div>}
        </div>
      </div>
      {error && <p className="mt-4 text-[13px] text-danger">{error}</p>}
    </Modal>
  );
}

export function NewUserButton({ roles }: { roles: Role[] }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button className={`${btn.base} ${btn.md} ${btn.primary}`} onClick={() => setOpen(true)}><Plus size={16} /> เพิ่มผู้ใช้ใหม่</button>
      {open && <UserForm roles={roles} onClose={() => setOpen(false)} />}
    </>
  );
}

const CONFIRM: Record<string, [string, string]> = {
  lock: ["ล็อกบัญชีนี้?", "ผู้ใช้จะเข้าสู่ระบบไม่ได้จนกว่าจะปลดล็อก"],
  unlock: ["ปลดล็อกบัญชีนี้?", "ผู้ใช้จะเข้าสู่ระบบได้อีกครั้ง"],
  delete: ["ลบผู้ใช้นี้?", "ย้ายไปแท็บ “ผู้ใช้ที่ถูกลบ” — กู้คืนได้ภายหลัง"],
  restore: ["กู้คืนผู้ใช้นี้?", "ผู้ใช้จะกลับมาใช้งานได้"],
};

export function UserActions({ user, roles, isSelf }: { user: EditableUser; roles: Role[]; isSelf: boolean }) {
  const [dialog, setDialog] = useState<null | "edit" | "lock" | "unlock" | "delete" | "restore">(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const icon = `${btn.base} ${btn.sm} ${btn.ghost}`;
  const run = (a: "lock" | "unlock" | "delete" | "restore") =>
    start(async () => {
      const r: ActionResult = await userAction(user.id, a);
      if (r.ok) setDialog(null);
      else setError(r.error);
    });
  const deleted = user.status === "deleted";

  return (
    <div className="flex justify-end gap-1.5">
      {deleted ? (
        <button className={icon} onClick={() => setDialog("restore")}><Unlock size={14} /> กู้คืน</button>
      ) : (
        <>
          <button className={icon} onClick={() => setDialog("edit")} title="แก้ไข" aria-label="แก้ไข"><Pencil size={14} /></button>
          {!isSelf && (user.status === "locked" ? (
            <button className={icon} onClick={() => setDialog("unlock")} title="ปลดล็อก" aria-label="ปลดล็อก"><Unlock size={14} /></button>
          ) : (
            <button className={icon} onClick={() => setDialog("lock")} title="ล็อก" aria-label="ล็อก"><Lock size={14} /></button>
          ))}
          {!isSelf && <button className={`${btn.base} ${btn.sm} border-line bg-transparent text-danger hover:bg-danger/10`} onClick={() => setDialog("delete")} title="ลบ" aria-label="ลบ"><Trash2 size={14} /></button>}
        </>
      )}
      {dialog === "edit" && <UserForm user={user} roles={roles} onClose={() => setDialog(null)} />}
      {dialog && dialog !== "edit" && (
        <Modal
          title={CONFIRM[dialog][0]}
          onClose={() => setDialog(null)}
          footer={
            <>
              <button className={`${btn.base} ${btn.md} ${btn.ghost}`} onClick={() => setDialog(null)}>ยกเลิก</button>
              <button className={`${btn.base} ${btn.md} ${dialog === "delete" || dialog === "lock" ? btn.danger : btn.primary}`} disabled={pending} onClick={() => run(dialog)}>
                {dialog === "restore" ? <><RotateCcw size={14} /> กู้คืน</> : "ยืนยัน"}
              </button>
            </>
          }
        >
          <p className="text-sm"><strong>{user.fullName}</strong> (@{user.username}) — {CONFIRM[dialog][1]}</p>
          {error && <p className="mt-3 text-[13px] text-danger">{error}</p>}
        </Modal>
      )}
    </div>
  );
}
