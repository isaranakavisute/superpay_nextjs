"use client";

import { useState, useTransition } from "react";
import QR from "qrcode";
import { Eye, EyeOff, ShieldCheck } from "lucide-react";
import { btn, field, fieldLabel } from "@/components/interactive/Modal";
import type { ActionResult } from "@/lib/api";
import { changePassword, disable2fa, enable2fa, saveInfo, setup2fa } from "./actions";

const head = "flex flex-wrap items-center justify-between gap-3 border-b border-line px-[22px] py-[18px]";
const card = "rounded-xl border border-line bg-surface shadow-sm";
const body = "px-[22px] py-5";
const row = "grid gap-4 sm:grid-cols-2";

function Msg({ r }: { r: ActionResult | null }) {
  if (!r) return null;
  return r.ok ? (
    <div role="status" className="mb-3 rounded-lg border border-emerald-500/30 bg-emerald-500/15 px-3.5 py-2.5 text-[13px] text-emerald-300">บันทึกเรียบร้อย</div>
  ) : (
    <div role="alert" className="mb-3 rounded-lg border border-red-500/30 bg-red-500/15 px-3.5 py-2.5 text-[13px] text-red-300">{r.error}</div>
  );
}

function Password({ name, label, value, onChange, auto = "new-password" }: { name: string; label: string; value: string; onChange: (v: string) => void; auto?: string }) {
  const [show, setShow] = useState(false);
  return (
    <div className="mb-4">
      <label htmlFor={`pw-${name}`} className={fieldLabel}>{label}</label>
      <div className="relative">
        <input id={`pw-${name}`} name={name} type={show ? "text" : "password"} autoComplete={auto} required className={`${field} pr-10`} value={value} onChange={(e) => onChange(e.target.value)} />
        <button type="button" tabIndex={-1} onClick={() => setShow((v) => !v)} aria-label={show ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"} title="แสดงรหัสผ่าน" className="absolute top-1/2 right-1.5 grid size-7.5 -translate-y-1/2 place-items-center rounded-lg text-muted hover:bg-surface-alt hover:text-ink">
          {show ? <EyeOff size={17} /> : <Eye size={17} />}
        </button>
      </div>
    </div>
  );
}

export function InfoForm({ initial, username }: { initial: { fullName: string; email: string; phone: string }; username: string }) {
  const [v, setV] = useState(initial);
  const [r, setR] = useState<ActionResult | null>(null);
  const [pending, start] = useTransition();
  return (
    <div className={card}>
      <div className={head}><h2 className="text-lg font-semibold">ข้อมูลส่วนตัว</h2></div>
      <form className={body} onSubmit={(e) => { e.preventDefault(); start(async () => setR(await saveInfo(v))); }}>
        <Msg r={r} />
        <div className={row}>
          <div className="mb-4"><label htmlFor="pf-name" className={fieldLabel}>ชื่อ-นามสกุล</label><input id="pf-name" className={field} required value={v.fullName} onChange={(e) => setV({ ...v, fullName: e.target.value })} /></div>
          <div className="mb-4"><label htmlFor="pf-user" className={fieldLabel}>ชื่อผู้ใช้</label><input id="pf-user" className={`${field} bg-surface-alt`} value={username} readOnly /></div>
        </div>
        <div className={row}>
          <div className="mb-4"><label htmlFor="pf-email" className={fieldLabel}>อีเมล</label><input id="pf-email" type="email" className={field} value={v.email} onChange={(e) => setV({ ...v, email: e.target.value })} /></div>
          <div className="mb-4"><label htmlFor="pf-phone" className={fieldLabel}>เบอร์โทร</label><input id="pf-phone" className={field} value={v.phone} onChange={(e) => setV({ ...v, phone: e.target.value })} /></div>
        </div>
        <div className="mt-2 flex justify-end"><button type="submit" disabled={pending} className={`${btn.base} ${btn.md} ${btn.primary}`}>{pending ? "กำลังบันทึก..." : "บันทึกข้อมูล"}</button></div>
      </form>
    </div>
  );
}

export function PasswordForm() {
  const empty = { current: "", next: "", confirm: "" };
  const [v, setV] = useState(empty);
  const [r, setR] = useState<ActionResult | null>(null);
  const [pending, start] = useTransition();
  return (
    <div className={card}>
      <div className={head}>
        <h2 className="text-lg font-semibold">เปลี่ยนรหัสผ่าน</h2>
        <span className="inline-flex items-center gap-1 text-[12.5px] text-muted"><ShieldCheck size={14} /> แนะนำให้เปลี่ยนทุก 90 วัน</span>
      </div>
      <form className={body} onSubmit={(e) => { e.preventDefault(); start(async () => { const res = await changePassword(v); setR(res); if (res.ok) setV(empty); }); }}>
        <Msg r={r} />
        <Password name="current" label="รหัสผ่านปัจจุบัน" auto="current-password" value={v.current} onChange={(current) => setV({ ...v, current })} />
        <div className={row}>
          <Password name="next" label="รหัสผ่านใหม่" value={v.next} onChange={(next) => setV({ ...v, next })} />
          <Password name="confirm" label="ยืนยันรหัสผ่านใหม่" value={v.confirm} onChange={(confirm) => setV({ ...v, confirm })} />
        </div>
        <div className="mt-2 flex justify-end"><button type="submit" disabled={pending} className={`${btn.base} ${btn.md} ${btn.primary}`}>{pending ? "กำลังบันทึก..." : "เปลี่ยนรหัสผ่าน"}</button></div>
      </form>
    </div>
  );
}

export function TwoFactorCard({ enabled, forced }: { enabled: boolean; forced: boolean }) {
  const [setup, setSetup] = useState<{ secret: string; qr: string } | null>(null);
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [r, setR] = useState<ActionResult | null>(null);
  const [pending, start] = useTransition();

  const begin = () => start(async () => {
    const res = await setup2fa();
    if (!res.ok) return setR(res);
    setR(null);
    setSetup({ secret: String(res.secret), qr: await QR.toDataURL(String(res.uri), { margin: 1, width: 180 }) });
  });

  return (
    <div className={card}>
      <div className={head}>
        <h2 className="text-lg font-semibold">ยืนยันตัวตน 2 ชั้น (2FA)</h2>
        <span className="inline-flex items-center gap-1 text-[12.5px] text-muted"><ShieldCheck size={14} /> TOTP · Google Authenticator / Authy</span>
      </div>
      <div className={body}>
        {r && !r.ok && <Msg r={r} />}
        {enabled ? (
          <>
            <div className="mb-3 flex flex-wrap items-center gap-2.5">
              <span className="rounded-full bg-[#dcfce7] px-2.5 py-1 text-[11px] font-semibold text-[#166534]">เปิดใช้งานอยู่</span>
              <span className="text-[13px] text-muted">ต้องใส่รหัสจากแอปทุกครั้งที่เข้าสู่ระบบ</span>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); start(async () => { const res = await disable2fa(password, code); setR(res); if (res.ok) { setPassword(""); setCode(""); } }); }}>
              <div className={row}>
                <Password name="password" label="รหัสผ่าน" auto="current-password" value={password} onChange={setPassword} />
                <div className="mb-4"><label htmlFor="tfa-off" className={fieldLabel}>รหัส 2FA ปัจจุบัน</label><input id="tfa-off" className={field} inputMode="numeric" autoComplete="one-time-code" maxLength={6} required value={code} onChange={(e) => setCode(e.target.value)} /></div>
              </div>
              <div className="flex justify-end"><button type="submit" disabled={pending || forced} title={forced ? "ระบบบังคับ 2FA สำหรับบัญชีนี้ — ปิดไม่ได้" : undefined} className={`${btn.base} ${btn.md} ${btn.dangerGhost}`}>ปิด 2FA</button></div>
              {forced && <div className="mt-1.5 text-xs text-muted">ทุกบัญชียกเว้นเจ้าของระบบถูกบังคับให้เปิด 2FA จึงปิดเองไม่ได้ — หากทำเครื่องหายให้ติดต่อผู้ดูแลเพื่อรีเซ็ต</div>}
            </form>
          </>
        ) : setup ? (
          <form onSubmit={(e) => { e.preventDefault(); start(async () => { const res = await enable2fa(code); setR(res); if (res.ok) { setSetup(null); setCode(""); } }); }}>
            <div className="flex flex-wrap items-start gap-5">
              {/* eslint-disable-next-line @next/next/no-img-element -- local data: URL */}
              <img src={setup.qr} alt="QR สำหรับแอป Authenticator" width={180} height={180} className="rounded-lg bg-white p-1" />
              <div className="min-w-60 flex-1 text-[13px]">
                <ol className="mb-3 ml-4 list-decimal space-y-1 text-muted">
                  <li>เปิดแอป Google Authenticator / Authy แล้วสแกน QR</li>
                  <li>หรือใส่รหัสนี้เอง: <code className="font-mono text-ink break-all select-all">{setup.secret}</code></li>
                  <li>ใส่รหัส 6 หลักที่แอปแสดงเพื่อยืนยัน</li>
                </ol>
                <label htmlFor="tfa-on" className={fieldLabel}>รหัส 6 หลัก</label>
                <input id="tfa-on" className={`${field} max-w-50 text-center font-mono tracking-[6px]`} inputMode="numeric" autoComplete="one-time-code" maxLength={6} required autoFocus value={code} onChange={(e) => setCode(e.target.value)} />
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" className={`${btn.base} ${btn.md} ${btn.ghost}`} onClick={() => { setSetup(null); setCode(""); }}>ยกเลิก</button>
              <button type="submit" disabled={pending} className={`${btn.base} ${btn.md} ${btn.primary}`}>ยืนยันและเปิดใช้</button>
            </div>
          </form>
        ) : (
          <>
            <div className="mb-3 flex flex-wrap items-center gap-2.5">
              <span className="rounded-full bg-surface-alt px-2.5 py-1 text-[11px] font-semibold text-muted">ยังไม่เปิดใช้งาน</span>
              <span className="text-[13px] text-muted">เพิ่มความปลอดภัยด้วยรหัสจากแอปบนมือถือ</span>
            </div>
            <div className="flex justify-end"><button type="button" disabled={pending} onClick={begin} className={`${btn.base} ${btn.md} ${btn.primary}`}>เปิดใช้ 2FA</button></div>
          </>
        )}
      </div>
    </div>
  );
}
