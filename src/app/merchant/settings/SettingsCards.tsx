"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { Copy, Eye, EyeOff, KeyRound, Plus, Trash2 } from "lucide-react";
import { btn, field, fieldLabel, Modal } from "@/components/interactive/Modal";
import type { ActionResult } from "@/lib/api";
import { BANKS } from "@/lib/domain";
import { fmtDateTime } from "@/lib/format";
import { CodeBlock } from "../docs/CodeBlock";
import { addAccount, changePassword, createKey, createSecretKey, removeAccount, revealKeys, revokeKey, revokeSecretKey, rotateSecret, setWebhook } from "../actions";

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

type KeyInfo = { masked: string; revealable: boolean; createdAt: string; lastUsedAt: string | null };
type FullKeys = { secretKey: string | null; apiKey: string | null };

/** Masked key with copy once revealed. */
function KeyLine({ title, info, full, empty, onView, onHide, children }: {
  title: string; info: KeyInfo | null; full: string | null | undefined; empty: React.ReactNode; onView: () => void; onHide: () => void; children?: React.ReactNode;
}) {
  const revealed = full !== undefined;
  return (
    <div className="flex flex-wrap items-center gap-3 px-3.5 py-2.5">
      <KeyRound size={15} className="text-muted" />
      {info ? (
        <div className="min-w-0 flex-1">
          <div className="text-[11.5px] text-muted">{title}</div>
          <div className="font-mono text-[12px] break-all select-all">{revealed ? (full ?? <span className="font-sans text-warning">ดูแบบเต็มไม่ได้ — key นี้ออกก่อนเปิดฟีเจอร์ดู key (สร้างใหม่ / login ใหม่เพื่อให้ดูได้)</span>) : info.masked}</div>
          <div className="text-[11.5px] text-muted">สร้างเมื่อ {fmtDateTime(info.createdAt)} · ใช้ล่าสุด {info.lastUsedAt ? fmtDateTime(info.lastUsedAt) : "ยังไม่เคยใช้"}</div>
        </div>
      ) : <div className="min-w-0 flex-1"><div className="text-[11.5px] text-muted">{title}</div><div className="text-muted">{empty}</div></div>}
      {info && full && <button type="button" className={B("ghost", "sm")} onClick={() => navigator.clipboard?.writeText(full)}><Copy size={13} /> คัดลอก</button>}
      {info && (revealed
        ? <button type="button" className={B("ghost", "sm")} onClick={onHide}><EyeOff size={13} /> ซ่อน</button>
        : <button type="button" className={B("ghost", "sm")} onClick={onView}><Eye size={13} /> ดู</button>)}
      {children}
    </div>
  );
}

/** Re-enter the portal login + password before full keys are shown. */
function RevealDialog({ onClose, onDone }: { onClose: () => void; onDone: (k: FullKeys) => void }) {
  const [v, setV] = useState({ login: "", password: "" });
  const { r, pending, run } = useRun();
  return (
    <Modal title="ยืนยันตัวตนเพื่อดู key แบบเต็ม" onClose={onClose} width={440}
      footer={<><button type="button" className={B("ghost")} onClick={onClose}>ยกเลิก</button><button type="submit" form="reveal-form" disabled={pending} className={B("primary")}>{pending ? "กำลังตรวจสอบ..." : "ยืนยันและแสดง"}</button></>}>
      <form id="reveal-form" className="grid gap-3" onSubmit={(e) => { e.preventDefault(); run(() => revealKeys(v.login, v.password), (x) => { if (x.ok) onDone({ secretKey: (x.secretKey as string | null) ?? null, apiKey: (x.apiKey as string | null) ?? null }); }); }}>
        <p className="text-[13px] text-muted">ใส่อีเมลหรือชื่อผู้ใช้ และรหัสผ่านที่ใช้เข้า Merchant Portal ของบัญชีนี้ — ใส่ผิด 5 ครั้งบัญชีจะถูกล็อก 15 นาที</p>
        <Err r={r} />
        <div><label htmlFor="rv-login" className={fieldLabel}>อีเมล หรือ ชื่อผู้ใช้</label><input id="rv-login" required autoFocus autoComplete="username" className={field} value={v.login} onChange={(e) => setV({ ...v, login: e.target.value })} /></div>
        <div><label htmlFor="rv-pass" className={fieldLabel}>รหัสผ่าน</label><input id="rv-pass" type="password" required autoComplete="current-password" className={field} value={v.password} onChange={(e) => setV({ ...v, password: e.target.value })} /></div>
      </form>
    </Modal>
  );
}

/** The user's own secret key and API key (issued here only; /auth/login is portal-internal). */
export function SecretKeyCard({ secretKey, apiKey, apiBase }: { secretKey: KeyInfo | null; apiKey: KeyInfo | null; apiBase: string }) {
  const [shown, setShown] = useState<FullKeys | null>(null);
  const [full, setFull] = useState<FullKeys | null>(null);
  const [asking, setAsking] = useState(false);
  const { r, pending, run } = useRun();
  // Full keys are cleared after a minute.
  useEffect(() => { if (!full) return; const t = setTimeout(() => setFull(null), 60_000); return () => clearTimeout(t); }, [full]);
  const create = () => {
    if (secretKey && !confirm("สร้าง secret key ใหม่? อันเดิมและ API key ที่ login ด้วยอันเดิมจะใช้ไม่ได้ทันที")) return;
    run(() => createSecretKey(), (x) => { if (x.ok) { setShown({ secretKey: String(x.secretKey), apiKey: (x.apiKey as string | undefined) ?? null }); setFull(null); } });
  };
  const view = () => setAsking(true);
  const hide = () => setFull(null);
  return (
    <section className={card}>
      <div className={head}><h2 className="text-lg font-semibold">Secret key และ API key (สำหรับ API)</h2><span className="text-[12.5px] text-muted">ของคุณเอง · ใช้แทนรหัสผ่าน</span></div>
      <div className="px-[22px] py-5 text-[13px]">
        <Err r={r} />
        {shown?.secretKey && <OnceSecret label="Secret key ใหม่" value={shown.secretKey} />}
        {shown?.apiKey && <OnceSecret label="API key ใหม่ (ใช้ใน X-API-Key ได้ทันที)" value={shown.apiKey} />}
        <p className="mb-3 text-muted"><strong className="text-ink">API key</strong> (<code>ak_live_</code>) ส่งใน header <code>X-API-Key</code> · <strong className="text-ink">Secret key</strong> (<code>sk_live_</code>) ใช้<strong className="text-ink">เซ็นทุกคำขอ</strong> (<code>X-Timestamp</code> + <code>X-Signature</code>) และห้ามส่งไปกับคำขอ · สร้าง secret key แล้วได้ API key ทันที · กด <strong className="text-ink">สร้างใหม่</strong> เพื่อเปลี่ยนทั้งคู่ (อันเดิมใช้ไม่ได้ทันที) · กด <strong className="text-ink">ดู</strong> เพื่อแสดงแบบเต็ม (ยืนยันรหัสผ่าน แสดง 1 นาที)</p>
        <div className="mb-4 divide-y divide-line rounded-lg border border-line">
          <KeyLine title="Secret key" info={secretKey} full={full ? full.secretKey : undefined} empty="ยังไม่มี secret key" onView={view} onHide={hide}>
            {secretKey && <button type="button" disabled={pending} className={B("dangerGhost", "sm")} onClick={() => { if (confirm("ยกเลิก secret key? ระบบที่ใช้ key นี้จะ login ไม่ได้ และ API key ที่ได้จากมันจะถูกเพิกถอน")) run(() => revokeSecretKey(), () => { setShown(null); setFull(null); }); }}>ยกเลิก</button>}
            <button type="button" disabled={pending} className={B("primary", "sm")} onClick={create}><Plus size={14} /> {secretKey ? "สร้างใหม่" : "สร้าง secret key"}</button>
          </KeyLine>
          <KeyLine title="API key" info={apiKey} full={full ? full.apiKey : undefined} onView={view} onHide={hide}
            empty={secretKey ? "ยังไม่มี — กดสร้าง secret key ใหม่ แล้วจะได้ API key ทันที" : "สร้าง secret key แล้ว API key จะแสดงที่นี่ทันที"} />
        </div>
        <div className="mb-1 text-[11px] font-semibold tracking-wider text-soft uppercase">ตัวอย่าง</div>
        <CodeBlock code={`API_KEY="${shown?.apiKey ?? full?.apiKey ?? "ak_live_YOUR_API_KEY"}"     # ส่งไปกับคำขอ
SECRET="${shown?.secretKey ?? full?.secretKey ?? "sk_live_YOUR_SECRET_KEY"}"   # ใช้เซ็นเท่านั้น ห้ามส่ง
TS=$(date +%s)
SIG=$(printf '%s' "$TS.GET./api/v1/balance." | openssl dgst -sha256 -hmac "$SECRET" | awk '{print $NF}')
curl "${apiBase}/balance" \\
  -H "X-API-Key: $API_KEY" -H "X-Timestamp: $TS" -H "X-Signature: $SIG"`} />
      </div>
      {asking && <RevealDialog onClose={() => setAsking(false)} onDone={(k) => { setFull(k); setAsking(false); }} />}
    </section>
  );
}

type Key = { id: number; label: string; keyPrefix: string; status: string; lastUsedAt: string | null; createdAt: string };
export function KeysCard({ keys, owner }: { keys: Key[]; owner: boolean }) {
  const [label, setLabel] = useState("");
  const [shown, setShown] = useState<string | null>(null);
  const [shownSecret, setShownSecret] = useState<string | null>(null);
  const { r, pending, run } = useRun();
  return (
    <section className={card}>
      <div className={head}><h2 className="text-lg font-semibold">API Keys</h2><Link href="/merchant/docs/api" className="text-[12.5px] text-muted">key ระดับร้าน + signing secret · ดูคู่มือ API</Link></div>
      <div className="px-[22px] py-5">
        <Err r={r} />
        {shown && <OnceSecret label="API key ใหม่ (X-API-Key)" value={shown} />}
        {shownSecret && <OnceSecret label="Signing secret ของ key นี้ — ใช้เซ็นทุกคำขอ ห้ามส่งไปกับคำขอ" value={shownSecret} />}
        {owner && (
          <form className="mb-4 flex gap-2" onSubmit={(e) => { e.preventDefault(); run(() => createKey(label.trim()), (x) => { if (x.ok) { setShown(String(x.key)); setShownSecret(x.signingSecret ? String(x.signingSecret) : null); setLabel(""); } }); }}>
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

export function WebhookCard({ url, secretPrefix, owner, signing = null, signingKeyPrefix = null }: { url: string | null; secretPrefix: string | null; owner: boolean; signing?: string | null; signingKeyPrefix?: string | null }) {
  // Callbacks are signed with the shop's own sk_live_ key (default since 18 Oct 2026); the whsec_ secret is only the fallback.
  const byShopKey = signing !== "whsec";
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
          {byShopKey ? (
            <span>
              ลายเซ็นใน header <code>X-Signature</code>: เซ็นด้วย <strong className="text-ink">secret key ของร้านเจ้าของรายการ</strong> + body ที่ส่ง — รายการของร้านคุณใช้{" "}
              {signingKeyPrefix ? <code className="font-mono">{signingKeyPrefix}…</code> : <span className="text-warning">(ร้านยังไม่มี secret key ที่ใช้งานอยู่ — ระบบเซ็นด้วย webhook secret สำรองแทน)</span>}{" "}
              · รายการของร้านย่อยใช้ secret key ของร้านย่อยนั้น — ดูสูตรและโค้ดตรวจที่ <Link href="/merchant/docs/api#callbacks" className="text-primary hover:underline">คู่มือ API → Callback</Link>
              <br />Webhook secret สำรอง (ใช้เมื่อร้านไม่มี secret key): <code className="font-mono">{secretPrefix ?? "ยังไม่ได้ออก"}</code>
            </span>
          ) : (
            <span>Signing secret: <code className="font-mono">{secretPrefix ?? "ยังไม่ได้ออก"}</code> · ลายเซ็นใน header <code>X-Signature</code></span>
          )}
          {owner && url && <button type="button" disabled={pending} className={B("ghost", "sm")} onClick={() => { if (confirm(byShopKey ? "ออก webhook secret สำรองใหม่? ลายเซ็นปกติใช้ secret key ของร้าน ไม่เปลี่ยน — secret สำรองใช้เฉพาะตอนร้านไม่มี secret key" : "ออก secret ใหม่? secret เดิมจะใช้ตรวจลายเซ็นไม่ได้อีก")) run(() => rotateSecret(), (x) => x.ok && setShown(String(x.secret))); }}>{byShopKey ? "ออก secret สำรองใหม่" : "ออก secret ใหม่"}</button>}
        </div>
      </div>
    </section>
  );
}

type Acct = { id: string; type: string; accountNumber: string | null; accountName: string | null; bankCode: string | null; bankName: string | null; status: string; shared?: boolean };
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
              <div className="min-w-0 flex-1"><div className="font-medium">{a.bankName ?? a.bankCode} · {a.type === "PROMPTPAY" ? "PromptPay" : "บัญชีธนาคาร"}{a.shared && <span className="ml-2 rounded-full bg-sky-400/15 px-2 py-0.5 text-[11px] text-sky-300">ใช้ร่วมกับร้านอื่น</span>}</div><div className="font-mono text-[12px] text-muted">{a.accountNumber}{a.accountName ? ` · ${a.accountName}` : ""}</div></div>
              {a.status === "ACTIVE" ? (owner && <button type="button" aria-label="ลบบัญชี" disabled={pending} className={B("dangerGhost", "sm")} onClick={() => { if (confirm(a.shared ? "เลิกใช้บัญชีนี้? บัญชียังใช้งานกับร้านอื่นที่ใช้ร่วม — เฉพาะร้านคุณที่จะไม่ใช้บัญชีนี้อีก" : "ลบบัญชีนี้? ออเดอร์ใหม่จะไม่ใช้บัญชีนี้อีก")) run(() => removeAccount(Number(a.id))); }}><Trash2 size={13} /></button>) : <span className="text-[11.5px] text-muted">ปิดใช้แล้ว</span>}
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
