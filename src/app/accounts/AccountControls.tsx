"use client";

import { useState, useTransition } from "react";
import { Pencil, Plus, RotateCcw, Trash2 } from "lucide-react";
import { Modal, btn, field, fieldLabel } from "@/components/interactive/Modal";
import { BANKS } from "@/lib/domain";
import { accountAction, createAccount, resetAccounts, updateAccount, type AccountInput } from "./actions";

export type EditableAccount = { id: number; bankCode: string; accountNo: string | null; accountName: string | null; accountType: AccountInput["accountType"]; promptpayId: string | null; merchantIds: number[]; label: string };
type Shop = { id: number; name: string };
const B = (v: keyof typeof btn, s: "sm" | "md" = "sm") => `${btn.base} ${btn[s]} ${btn[v]}`;

function AccountForm({ account, shops, onClose }: { account?: EditableAccount; shops: Shop[]; onClose: () => void }) {
  const [f, setF] = useState<AccountInput>({
    bankCode: account?.bankCode ?? "KBANK", accountNo: account?.accountNo ?? "", accountName: account?.accountName ?? "",
    accountType: account?.accountType ?? "receive", promptpayId: account?.promptpayId ?? "", merchantIds: account?.merchantIds ?? [],
  });
  const [find, setFind] = useState("");
  const toggleShop = (id: number) => setF({ ...f, merchantIds: f.merchantIds.includes(id) ? f.merchantIds.filter((x) => x !== id) : [...f.merchantIds, id] });
  const chosen = shops.filter((s) => f.merchantIds.includes(s.id));
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const set = (k: keyof AccountInput) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });
  const save = () => start(async () => {
    const r = account ? await updateAccount(account.id, f) : await createAccount(f);
    if (r.ok) onClose(); else setError(r.error);
  });
  return (
    <Modal title={account ? `แก้ไขบัญชี ${account.label}` : "เพิ่มบัญชีใหม่"} onClose={onClose} width={680} footer={<><button className={B("ghost", "md")} onClick={onClose}>ยกเลิก</button><button className={B("primary", "md")} disabled={pending} onClick={save}>บันทึก</button></>}>
      {error && <div role="alert" className="mb-3 rounded-lg border border-red-500/30 bg-red-500/15 px-3.5 py-2.5 text-[13px] text-red-300">{error}</div>}
      <div className="grid gap-4 sm:grid-cols-2">
        <div><label htmlFor="ac-bank" className={fieldLabel}>ธนาคาร</label><select id="ac-bank" className={`${field} [color-scheme:dark]`} value={f.bankCode} onChange={set("bankCode")}>{BANKS.map((b) => <option key={b.code} value={b.code}>{b.name}</option>)}</select></div>
        <div><label htmlFor="ac-type" className={fieldLabel}>ประเภท</label><select id="ac-type" className={`${field} [color-scheme:dark]`} value={f.accountType} onChange={set("accountType")}><option value="receive">รับเงินเข้า</option><option value="send">โอนออก</option><option value="both">รับ + โอน</option></select></div>
        <div><label htmlFor="ac-no" className={fieldLabel}>เลขบัญชี</label><input id="ac-no" inputMode="numeric" className={field} value={f.accountNo} onChange={set("accountNo")} /></div>
        <div><label htmlFor="ac-name" className={fieldLabel}>ชื่อบัญชี</label><input id="ac-name" className={field} maxLength={120} value={f.accountName} onChange={set("accountName")} /></div>
        <div><label htmlFor="ac-pp" className={fieldLabel}>PromptPay ID (ถ้ามี)</label><input id="ac-pp" inputMode="numeric" placeholder="มือถือ 10 หลัก / เลขบัตร 13 หลัก" className={field} value={f.promptpayId} onChange={set("promptpayId")} /><div className="mt-1 text-[11.5px] text-muted">ใช้สร้าง QR ในหน้าชำระเงินของลูกค้า</div></div>
      </div>
      <fieldset className="mt-4">
        <legend className={fieldLabel}>ผูกกับร้าน (เลือกได้หลายร้าน — ไม่เลือก = บัญชีกลาง)</legend>
        <div className="mb-2 flex flex-wrap gap-1.5 text-[12px]">
          {chosen.length === 0 ? <span className="rounded-full bg-surface-alt px-2.5 py-1 text-muted">บัญชีกลาง (ไม่ผูกร้าน)</span>
            : chosen.map((s) => <button key={s.id} type="button" onClick={() => toggleShop(s.id)} className="rounded-full bg-primary-50 px-2.5 py-1 text-primary" title="นำออก">{s.name} ×</button>)}
        </div>
        <input aria-label="ค้นหาร้าน" placeholder="ค้นหาร้าน…" className={field} value={find} onChange={(e) => setFind(e.target.value)} />
        <div className="mt-1.5 max-h-44 overflow-y-auto rounded-lg border border-line">
          {shops.filter((s) => !find || s.name.toLowerCase().includes(find.toLowerCase())).map((s) => (
            <label key={s.id} className="flex cursor-pointer items-center gap-2 border-b border-line px-3 py-1.5 text-[13px] last:border-0 hover:bg-surface-alt">
              <input type="checkbox" checked={f.merchantIds.includes(s.id)} onChange={() => toggleShop(s.id)} /> {s.name}
            </label>
          ))}
        </div>
        {chosen.length > 1 && (
          <p className="mt-2 rounded-lg border border-line bg-surface-alt px-3 py-2 text-[12px] text-muted">
            <strong className="text-ink">ใช้ร่วม {chosen.length} ร้าน</strong> — ยอดออเดอร์เป็นไปตามที่ร้านส่งมา (ไม่บวกสตางค์) · สลิปผูกกับออเดอร์เสมอ จึงแยกได้ว่าเงินเป็นของร้านไหน · ถ้าเปิด “ยอดไม่ซ้ำ” ในตั้งค่าระบบ ยอดเดิมจะไม่ถูกใช้ซ้ำภายในเวลาพัก
            เพื่อให้ระบบรู้เสมอว่าเงินที่เข้าเป็นของร้านไหน · เงินเข้าบัญชีเดียวกัน แต่ยอดของแต่ละออเดอร์เป็นของร้านเจ้าของออเดอร์
          </p>
        )}
        <p className="mt-1 text-[11.5px] text-muted">นำร้านออกไม่ได้ถ้าร้านนั้นยังมีออเดอร์รอชำระบนบัญชีนี้ · ร้านย่อยที่ไม่มีบัญชีของตัวเองใช้บัญชีของร้านแม่</p>
      </fieldset>
    </Modal>
  );
}

export function NewAccountButton({ shops }: { shops: Shop[] }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button className={B("primary", "md")} onClick={() => setOpen(true)}><Plus size={16} /> เพิ่มบัญชีใหม่</button>
      {open && <AccountForm shops={shops} onClose={() => setOpen(false)} />}
    </>
  );
}

export function AccountSwitch({ id, on }: { id: number; on: boolean }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button" role="switch" aria-checked={on} disabled={pending} title={on ? "ปิดใช้งานบัญชีนี้" : "เปิดใช้งานบัญชีนี้"}
      onClick={() => start(async () => { const r = await accountAction(id, "toggle"); if (!r.ok) alert(r.error); })}
      className={`relative inline-block h-6 w-11 rounded-full transition disabled:opacity-60 ${on ? "bg-primary" : "bg-[#cbd5e1]"}`}
    >
      <span className={`absolute top-0.5 size-5 rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.2)] transition-all ${on ? "left-[22px]" : "left-0.5"}`} />
    </button>
  );
}

export function AccountActions({ account, shops }: { account: EditableAccount; shops: Shop[] }) {
  const [edit, setEdit] = useState(false);
  const [pending, start] = useTransition();
  const run = (action: "reset" | "delete", q: string) => { if (confirm(q)) start(async () => { const r = await accountAction(account.id, action); if (!r.ok) alert(r.error); }); };
  return (
    <>
      <button className={B("ghost")} onClick={() => setEdit(true)}><Pencil size={14} /> แก้ไข</button>
      <button className={`${B("ghost")} text-danger`} disabled={pending} title="ตั้งยอดเงินเป็น 0 และเริ่มนับรายการใหม่" onClick={() => run("reset", `Reset ${account.label}? ยอดเงินจะเป็น 0 และเริ่มนับรายการใหม่ (รายการเดิมไม่ถูกลบ)`)}><RotateCcw size={13} /> Reset</button>
      <button className={`${B("ghost")} text-danger`} disabled={pending} aria-label="ลบบัญชี" onClick={() => run("delete", `ลบบัญชี ${account.label}?`)}><Trash2 size={14} /></button>
      {edit && <AccountForm account={account} shops={shops} onClose={() => setEdit(false)} />}
    </>
  );
}

export function ResetAllButton({ ids }: { ids: number[] }) {
  const [pending, start] = useTransition();
  return (
    <button className={`${B("ghost")} border-transparent text-danger`} disabled={pending} title="ตั้งยอดเงินเป็น 0 และเริ่มนับรายการใหม่ ทุกบัญชีที่แสดงอยู่"
      onClick={() => { if (confirm(`Reset ทั้ง ${ids.length} บัญชีที่แสดงอยู่?`)) start(async () => { const r = await resetAccounts(ids); if (!r.ok) alert(r.error); }); }}>
      <RotateCcw size={13} /> Reset ทั้งหมด ({ids.length} บัญชี)
    </button>
  );
}
