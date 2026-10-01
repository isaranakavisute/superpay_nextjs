"use client";

import { useActionState, useState } from "react";
import { loginPortal, type PortalLoginState } from "../actions";

const input = "w-full rounded-lg border border-line bg-surface px-3.5 py-[11px] text-sm text-ink outline-none transition placeholder:text-soft focus:border-primary focus:shadow-ring";

export function PortalLoginForm({ returnTo }: { returnTo?: string }) {
  const [state, action, pending] = useActionState<PortalLoginState, FormData>(loginPortal, {});
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  return (
    <form action={action} className="w-full max-w-105 rounded-2xl bg-surface px-9 py-10 shadow-card">
      <h1 className="mb-1.5 text-[24px] font-bold">Merchant Portal</h1>
      <p className="mb-7 text-muted">เข้าสู่ระบบสำหรับร้านค้า</p>
      {state.error && <div role="alert" className="mb-4 rounded-lg border border-red-500/30 bg-red-500/15 px-3.5 py-2.5 text-[13px] text-red-300">{state.error}</div>}
      <input type="hidden" name="returnTo" value={returnTo ?? ""} />
      <label htmlFor="login" className="mb-1.5 block text-[13px] font-medium">อีเมล หรือ ชื่อผู้ใช้</label>
      <input id="login" name="login" className={`${input} mb-4`} autoComplete="username" required autoFocus value={login} onChange={(e) => setLogin(e.target.value)} />
      <label htmlFor="password" className="mb-1.5 block text-[13px] font-medium">รหัสผ่าน</label>
      <input id="password" name="password" type="password" className={`${input} mb-5`} autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
      <button type="submit" disabled={pending} className="w-full rounded-lg border border-primary bg-primary px-4 py-3 text-sm font-medium text-primary-fg disabled:opacity-70">{pending ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}</button>
      <p className="mt-4 text-center text-[12px] text-soft">ยังไม่มีบัญชี? ติดต่อผู้ดูแลระบบเพื่อเปิดผู้ใช้ portal ของร้าน</p>
    </form>
  );
}
