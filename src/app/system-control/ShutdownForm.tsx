"use client";

import { useState, useTransition } from "react";
import { Power } from "lucide-react";
import { btn, field, fieldLabel } from "@/components/interactive/Modal";
import { requestShutdown } from "./actions";

/** ปิดระบบ (shutdown): password (+2FA), typed phrase and reason, then off to the control container's progress page. */
export function ShutdownForm() {
  const [v, setV] = useState({ password: "", code: "", phrase: "", reason: "" });
  const [err, setErr] = useState<string | null>(null);
  const [needCode, setNeedCode] = useState(false);
  const [pending, start] = useTransition();
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement>) => setV({ ...v, [k]: e.target.value });
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    start(async () => {
      const r = await requestShutdown(v);
      if (!r.ok) { setErr(r.error); if (r.needCode) setNeedCode(true); return; }
      window.location.href = r.progressUrl;   // served by the always-on control container
    });
  };
  return (
    <form onSubmit={submit} className="grid max-w-[520px] gap-3">
      {err && <div role="alert" className="rounded-lg border border-red-500/30 bg-red-500/15 px-3.5 py-2.5 text-[13px] text-red-300">{err}</div>}
      <div><label htmlFor="sd-pw" className={fieldLabel}>รหัสผ่านของคุณ</label><input id="sd-pw" type="password" required className={field} value={v.password} onChange={set("password")} autoComplete="current-password" /></div>
      {needCode && <div><label htmlFor="sd-code" className={fieldLabel}>รหัส 2FA (6 หลัก)</label><input id="sd-code" inputMode="numeric" maxLength={6} className={field} value={v.code} onChange={set("code")} /></div>}
      <div><label htmlFor="sd-reason" className={fieldLabel}>เหตุผล</label><input id="sd-reason" required minLength={5} maxLength={200} className={field} value={v.reason} onChange={set("reason")} placeholder="เช่น ปิดปรับปรุงเซิร์ฟเวอร์" /></div>
      <div><label htmlFor="sd-phrase" className={fieldLabel}>พิมพ์คำว่า <b>ปิดระบบ</b> เพื่อยืนยัน</label><input id="sd-phrase" required className={field} value={v.phrase} onChange={set("phrase")} /></div>
      <button type="submit" disabled={pending || v.phrase.trim() !== "ปิดระบบ"} className={`${btn.base} ${btn.md} ${btn.danger} justify-center`}>
        <Power size={16} /> {pending ? "กำลังส่งคำสั่ง…" : "ยืนยันปิดระบบ"}
      </button>
    </form>
  );
}
