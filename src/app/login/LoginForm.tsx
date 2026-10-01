"use client";

import { useActionState, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { login, type LoginState } from "./actions";

const input =
  "w-full rounded-lg border border-line bg-surface px-3.5 py-[11px] text-sm text-ink outline-none transition-[border-color,box-shadow] duration-200 placeholder:text-soft focus:border-primary focus:shadow-ring";
const label = "mb-1.5 block text-[13px] font-medium text-ink";

export function LoginForm({ returnTo }: { returnTo?: string }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(login, {});
  // Controlled so a failed attempt keeps what was typed (React resets uncontrolled forms after an action).
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);

  return (
    <form action={action} autoComplete="off" className="w-full max-w-105 rounded-2xl bg-surface px-9 py-10 shadow-card">
      <h1 className="mb-1.5 text-[26px] font-bold">ยินดีต้อนรับกลับ</h1>
      <p className="mb-7 text-muted">กรุณาเข้าสู่ระบบเพื่อจัดการระบบ</p>

      {state.error && (
        <div role="alert" className="mb-4 rounded-lg border border-red-500/30 bg-red-500/15 px-3.5 py-2.5 text-[13px] text-red-300">
          {state.error}
        </div>
      )}

      <input type="hidden" name="returnTo" value={returnTo ?? ""} />

      <div className="mb-4">
        <label htmlFor="username" className={label}>ชื่อผู้ใช้</label>
        <input
          id="username"
          name="username"
          className={input}
          placeholder="ชื่อผู้ใช้"
          autoFocus
          required
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
      </div>

      <div className="mb-4">
        <label htmlFor="password" className={label}>รหัสผ่าน</label>
        <div className="relative">
          <input
            id="password"
            name="password"
            type={showPw ? "text" : "password"}
            className={`${input} pr-10.5`}
            placeholder="••••••••"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button
            type="button"
            onClick={() => setShowPw((v) => !v)}
            className="absolute top-1/2 right-1.5 grid size-7.5 -translate-y-1/2 place-items-center rounded-lg text-muted transition hover:bg-surface-alt hover:text-ink active:scale-95"
            aria-label={showPw ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
          >
            {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
      </div>

      {state.needCode && (
        <div className="mb-4">
          <label htmlFor="code" className={label}>รหัส 2FA</label>
          <input
            id="code"
            name="code"
            className={`${input} text-center font-mono tracking-[6px]`}
            placeholder="000000"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            autoFocus
            required
          />
          <p className="mt-1.5 text-xs text-muted">ใส่รหัส 6 หลักจากแอป Google Authenticator / Authy</p>
        </div>
      )}

      <button
        type="submit"
        disabled={pending}
        className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-primary bg-primary px-4.5 py-3 text-sm font-medium whitespace-nowrap text-primary-fg transition-all duration-200 hover:border-primary-600 hover:bg-primary-600 disabled:opacity-70"
      >
        {pending ? "กำลังเข้าสู่ระบบ..." : state.needCode ? "ยืนยันรหัส" : "เข้าสู่ระบบ"}
      </button>
    </form>
  );
}
