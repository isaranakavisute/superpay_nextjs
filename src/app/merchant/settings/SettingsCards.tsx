"use client";

import { useState, useTransition } from "react";
import { Copy, KeyRound, Plus, Trash2 } from "lucide-react";
import { btn, field, fieldLabel } from "@/components/interactive/Modal";
import type { ActionResult } from "@/lib/api";
import { BANKS } from "@/lib/domain";
import { fmtDateTime } from "@/lib/format";
import { addAccount, changePassword, createKey, removeAccount, revokeKey, rotateSecret, setWebhook } from "../actions";

const B = (v: keyof typeof btn, s: "sm" | "md" = "md") => `${btn.base} ${btn[s]} ${btn[v]}`;
const card = "rounded-xl border border-line bg-surface shadow-sm";
const head = "flex flex-wrap items-center justify-between gap-3 border-b border-line px-[22px] py-[18px]";

function useRun() {
  const [r, setR] = useState<ActionResult | null>(null);
  const [pending, start] = useTransition();
  return { r, setR, pending, run: (fn: () => Promise<ActionResult>, after?: (x: ActionResult) => void) => start(async () => { const x = await fn(); setR(x); after?.(x); }) };
}
const Err = ({ r }: { r: ActionResult | null }) => (r && !r.ok ? <div role="alert" className="mb-3 rounded-lg border border-red-500/30 bg-red-500/15 px-3.5 py-2.5 text-[13px] text-red-300">{r.error}</div> : null);

/** A secret shown exactly once, with copy. */
function OnceSecret({ label, value }: { label: string; value: string }) {
  return (
    <div className="mb-3 rounded-lg border border-warning/40 bg-warning/10 p-3 text-[13px]">
      <div className="mb-1 font-semibold">{label} — แสดงครั้งเดียว เก็บไว้ทันที</div>
      <div className="flex items-center gap-2"><code className="flex-1 font-mono text-[12px] break-all select-all">{value}</code>
        <button type="button" className={B("ghost", "sm")} onClick={() => navigator.clipboard?.writeText(value)}><Copy size={13} /> คัดลอก</button></div>
    </div>
  );
}

type Key = { id: number; label: string; keyPrefix: string; status: string; lastUsedAt: string | null; createdAt: string };
export function KeysCard({ keys, owner }: { keys: Key[]; owner: boolean }) {
  const [label, setLabel] = useState("");
  const [shown, setShown] = useState<string | null>(null);
  const { r, pending, run } = useRun();
  return (
    <section className={card}>
      <div className={head}><h2 className="text-lg font-semibold">API Keys</h2><a href="/api-docs" className="text-[12.5px] text-muted">ใช้กับ X-API-Key · ดูเอกสาร API จากผู้ดูแล</a></div>
      <div className="px-[22px] py-5">
        <Err r={r} />
        {shown && <OnceSecret label="API key ใหม่" value={shown} />}
        {owner && (
          <form className="mb-4 flex gap-2" onSubmit={(e) => { e.preventDefault(); run(() => createKey(label.trim()), (x) => { if (x.ok) { setShown(String(x.key)); setLabel(""); } }); }}>
            <input aria-label="ชื่อ key" required maxLength={60} placeholder="ชื่อ key เช่น Production" className={field} value={label} onChange={(e) => setLabel(e.target.value)} />
            <button type="submit" disabled={pending} className={B("primary")}><Plus size={15} /> ออก key</button>
          </form>
        )}
        <div className="divide-y divide-line rounded-lg border border-line">
          {keys.length === 0 && <div className="p-4 text-center text-[13px] text-muted">ยังไม่มี key</div>}
          {keys.map((k) => (
            <div key={k.id} className={`flex flex-wrap items-center gap-3 px-3.5 py-2.5 text-[13px] ${k.status !== "active" ? "opacity-55" : ""}`}>
              <KeyRound size={15} className="text-muted" />
              <div className="min-w-0 flex-1"><div className="font-medium">{k.label}</div><div className="font-mono text-[11.5px] text-muted">{k.keyPrefix}</div></div>
              <div className="text-[11.5px] text-muted">ใช้ล่าสุด {k.lastUsedAt ? fmtDateTime(k.lastUsedAt) : "ยังไม่เคยใช้"}</div>
              {k.status === "active" ? (owner && <button type="button" disabled={pending} className={B("dangerGhost", "sm")} onClick={() => { if (confirm(`เพิกถอน key "${k.label}"? ระบบที่ใช้ key นี้จะเรียก API ไม่ได้ทันที`)) run(() => revokeKey(k.id)); }}>เพิกถอน</button>) : <span className="text-[11.5px] text-muted">เพิกถอนแล้ว</span>}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function WebhookCard({ url, secretPrefix, owner }: { url: string | null; secretPrefix: string | null; owner: boolean }) {
  const [v, setV] = useState(url ?? "");
  const [shown, setShown] = useState<string | null>(null);
  const { r, pending, run } = useRun();
  return (
    <section className={card}>
      <div className={head}><h2 className="text-lg font-semibold">Webhook</h2><span className="text-[12.5px] text-muted">แจ้งร้านเมื่อชำระสำเร็จ / ถูกปฏิเสธ</span></div>
      <div className="px-[22px] py-5">
        <Err r={r} />
        {r?.ok && !shown && <div role="status" className="mb-3 text-[13px] text-emerald-300">บันทึกแล้ว</div>}
        {shown && <OnceSecret label="Signing secret ใหม่" value={shown} />}
        <form onSubmit={(e) => { e.preventDefault(); run(() => setWebhook(v.trim())); }}>
          <label htmlFor="wh-url" className={fieldLabel}>Webhook URL</label>
          <div className="flex gap-2"><input id="wh-url" type="url" required placeholder="https://your-site.com/webhook" className={field} value={v} onChange={(e) => setV(e.target.value)} disabled={!owner} />
            {owner && <button type="submit" disabled={pending} className={B("primary")}>บันทึก</button>}</div>
        </form>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[12.5px] text-muted">
          <span>Signing secret: <code className="font-mono">{secretPrefix ?? "ยังไม่ได้ออก"}</code> · ลายเซ็นใน header <code>X-Signature</code></span>
          {owner && url && <button type="button" disabled={pending} className={B("ghost", "sm")} onClick={() => { if (confirm("ออก secret ใหม่? secret เดิมจะใช้ตรวจลายเซ็นไม่ได้อีก")) run(() => rotateSecret(), (x) => x.ok && setShown(String(x.secret))); }}>ออก secret ใหม่</button>}
        </div>
      </div>
    </section>
  );
}

type Acct = { id: string; type: string; accountNumber: string | null; accountName: string | null; bankCode: string | null; bankName: string | null; status: string };
export function AccountsCard({ accounts, note, owner }: { accounts: Acct[]; note: string | null; owner: boolean }) {
  const [f, setF] = useState({ type: "BANK" as "BANK" | "PROMPTPAY", bankCode: "KBANK", accountNumber: "", accountName: "", promptPayId: "" });
  const { r, pending, run } = useRun();
  return (
    <section className={card}>
      <div className={head}><h2 className="text-lg font-semibold">บัญชีรับเงินของร้าน</h2></div>
      <div className="px-[22px] py-5">
        <Err r={r} />
        {note && <div className="mb-3 text-[12.5px] text-muted">{note}</div>}
        <div className="mb-4 divide-y divide-line rounded-lg border border-line">
          {accounts.length === 0 && <div className="p-4 text-center text-[13px] text-muted">ยังไม่มีบัญชีของร้าน</div>}
          {accounts.map((a) => (
            <div key={a.id} className={`flex items-center gap-3 px-3.5 py-2.5 text-[13px] ${a.status !== "ACTIVE" ? "opacity-55" : ""}`}>
              <div className="min-w-0 flex-1"><div className="font-medium">{a.bankName ?? a.bankCode} · {a.type === "PROMPTPAY" ? "PromptPay" : "บัญชีธนาคาร"}</div><div className="font-mono text-[12px] text-muted">{a.accountNumber}{a.accountName ? ` · ${a.accountName}` : ""}</div></div>
              {a.status === "ACTIVE" ? (owner && <button type="button" aria-label="ลบบัญชี" disabled={pending} className={B("dangerGhost", "sm")} onClick={() => { if (confirm("ลบบัญชีนี้? ออเดอร์ใหม่จะไม่ใช้บัญชีนี้อีก")) run(() => removeAccount(Number(a.id))); }}><Trash2 size={13} /></button>) : <span className="text-[11.5px] text-muted">ปิดใช้แล้ว</span>}
            </div>
          ))}
        </div>
        {owner && (
          <form className="grid gap-3 md:grid-cols-2" onSubmit={(e) => { e.preventDefault(); run(() => addAccount(f.type === "BANK" ? { type: "BANK", bankCode: f.bankCode, accountNumber: f.accountNumber, accountName: f.accountName } : { type: "PROMPTPAY", bankCode: f.bankCode, promptPayId: f.promptPayId, accountName: f.accountName }), (x) => x.ok && setF({ ...f, accountNumber: "", promptPayId: "" })); }}>
            <div><label htmlFor="ac-type" className={fieldLabel}>ประเภท</label><select id="ac-type" className={`${field} [color-scheme:dark]`} value={f.type} onChange={(e) => setF({ ...f, type: e.target.value as "BANK" | "PROMPTPAY" })}><option value="BANK">บัญชีธนาคาร</option><option value="PROMPTPAY">PromptPay</option></select></div>
            <div><label htmlFor="ac-bank" className={fieldLabel}>ธนาคาร</label><select id="ac-bank" className={`${field} [color-scheme:dark]`} value={f.bankCode} onChange={(e) => setF({ ...f, bankCode: e.target.value })}>{BANKS.map((b) => <option key={b.code} value={b.code}>{b.name}</option>)}</select></div>
            {f.type === "BANK"
              ? <div><label htmlFor="ac-no" className={fieldLabel}>เลขบัญชี</label><input id="ac-no" inputMode="numeric" required pattern="\d{6,20}" className={field} value={f.accountNumber} onChange={(e) => setF({ ...f, accountNumber: e.target.value })} /></div>
              : <div><label htmlFor="ac-pp" className={fieldLabel}>PromptPay ID</label><input id="ac-pp" inputMode="numeric" required placeholder="มือถือ 10 หลัก / เลขบัตร 13 หลัก" className={field} value={f.promptPayId} onChange={(e) => setF({ ...f, promptPayId: e.target.value })} /></div>}
            <div><label htmlFor="ac-name" className={fieldLabel}>ชื่อบัญชี</label><input id="ac-name" maxLength={120} className={field} value={f.accountName} onChange={(e) => setF({ ...f, accountName: e.target.value })} /></div>
            <div className="flex justify-end md:col-span-2"><button type="submit" disabled={pending} className={B("primary")}><Plus size={15} /> เพิ่มบัญชี</button></div>
          </form>
        )}
      </div>
    </section>
  );
}

export function PasswordCard() {
  const [v, setV] = useState({ current: "", next: "", confirm: "" });
  const { r, setR, pending, run } = useRun();
  return (
    <section className={card}>
      <div className={head}><h2 className="text-lg font-semibold">เปลี่ยนรหัสผ่าน</h2></div>
      <form className="px-[22px] py-5" onSubmit={(e) => { e.preventDefault(); if (v.next !== v.confirm) return setR({ ok: false, error: "ยืนยันรหัสผ่านใหม่ไม่ตรงกัน" }); run(() => changePassword(v.current, v.next), (x) => x.ok && setV({ current: "", next: "", confirm: "" })); }}>
        <Err r={r} />
        {r?.ok && <div role="status" className="mb-3 text-[13px] text-emerald-300">เปลี่ยนรหัสผ่านแล้ว</div>}
        <div className="grid gap-3 md:grid-cols-3">
          <div><label htmlFor="pp-cur" className={fieldLabel}>รหัสผ่านปัจจุบัน</label><input id="pp-cur" type="password" autoComplete="current-password" required className={field} value={v.current} onChange={(e) => setV({ ...v, current: e.target.value })} /></div>
          <div><label htmlFor="pp-new" className={fieldLabel}>รหัสผ่านใหม่ (≥ 8 ตัว)</label><input id="pp-new" type="password" autoComplete="new-password" minLength={8} required className={field} value={v.next} onChange={(e) => setV({ ...v, next: e.target.value })} /></div>
          <div><label htmlFor="pp-conf" className={fieldLabel}>ยืนยันรหัสผ่านใหม่</label><input id="pp-conf" type="password" autoComplete="new-password" minLength={8} required className={field} value={v.confirm} onChange={(e) => setV({ ...v, confirm: e.target.value })} /></div>
        </div>
        <div className="mt-4 flex justify-end"><button type="submit" disabled={pending} className={B("primary")}>เปลี่ยนรหัสผ่าน</button></div>
      </form>
    </section>
  );
}
