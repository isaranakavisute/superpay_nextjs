"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Eye, KeyRound, Pencil, Plus } from "lucide-react";
import { btn, field, fieldLabel, Modal } from "@/components/interactive/Modal";
import type { ActionResult } from "@/lib/api";
import { createSubMerchant, resetSubOwnerPassword, updateSubMerchant, viewShop, type SubRates } from "../actions";

export type SubMerchant = SubRates & {
  id: number; name: string; slug: string; parentId: number; depth: number; status: "active" | "suspended" | "pending"; kycStatus: string;
  allowSubMerchants: boolean; approvedAt: string | null; createdAt: string; contactPhone: string | null; balance: string; paidCount: number; paidTotal: string;
  commissionToMe: string; childCount: number; owner: { fullName: string; email: string | null; username: string } | null;
};
export type SelfInfo = SubRates & { allowSubMerchants: boolean; status: "active" | "suspended" | "pending" };

const B = (v: keyof typeof btn, s: "sm" | "md" = "md") => `${btn.base} ${btn[s]} ${btn[v]}`;
const money = (n: number | string) => `฿${Number(n).toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const r2 = (n: number) => Math.round(n * 100) / 100;
const STATUS: Record<string, [string, string]> = {
  active: ["ใช้งาน", "bg-emerald-500/15 text-emerald-300"],
  pending: ["รออนุมัติ", "bg-amber-400/15 text-amber-200"],
  suspended: ["ระงับ", "bg-red-500/15 text-red-300"],
};
const genPassword = () => {
  const a = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  return Array.from(crypto.getRandomValues(new Uint32Array(12)), (x) => a[x % a.length]).join("");
};
const slugOf = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);

type RateForm = { feePercent: string; feeFlat: string; outFeePercent: string; outFeeFlat: string };
const rateNums = (f: RateForm): SubRates => ({ feePercent: Number(f.feePercent), feeFlat: Number(f.feeFlat), outFeePercent: Number(f.outFeePercent), outFeeFlat: Number(f.outFeeFlat) });
const rateText = (r: SubRates) => `${Number(r.feePercent)}% + ${money(r.feeFlat)}`;

/** Rate inputs with the floor (this shop's own rates) and the markup this shop keeps. */
function RateFields({ f, set, self }: { f: RateForm; set: (k: keyof RateForm, v: string) => void; self: SelfInfo }) {
  const n = rateNums(f);
  const keepIn = `${r2(n.feePercent - self.feePercent)}% + ${money(r2(n.feeFlat - self.feeFlat))}`;
  const keepOut = `${r2(n.outFeePercent - self.outFeePercent)}% + ${money(r2(n.outFeeFlat - self.outFeeFlat))}`;
  const row = (label: string, k: keyof RateForm, min: number, unit: string) => (
    <div>
      <label className={fieldLabel} htmlFor={`sm-${k}`}>{label}</label>
      <input id={`sm-${k}`} type="number" min={min} step="0.01" required className={field} value={f[k]} onChange={(e) => set(k, e.target.value)} />
      <div className={`mt-1 text-[11px] ${Number(f[k]) < min ? "text-red-300" : "text-muted"}`}>ต่ำสุด {min}{unit} (อัตราของร้านคุณ)</div>
    </div>
  );
  return (
    <>
      {row("ค่าธรรมเนียมเงินเข้า (%)", "feePercent", self.feePercent, "%")}
      {row("ค่าธรรมเนียมเงินเข้าคงที่ (บาท/รายการ)", "feeFlat", self.feeFlat, " บาท")}
      {row("ค่าธรรมเนียมเงินออก (%)", "outFeePercent", self.outFeePercent, "%")}
      {row("ค่าธรรมเนียมเงินออกคงที่ (บาท/รายการ)", "outFeeFlat", self.outFeeFlat, " บาท")}
      <div className="rounded-lg border border-line bg-surface-alt px-3.5 py-2.5 text-[12.5px] text-muted sm:col-span-2">
        คุณได้จากทุกรายการของร้านนี้: เงินเข้า <strong className="text-primary">{keepIn}</strong> · เงินออก <strong className="text-primary">{keepOut}</strong>
        <div className="mt-0.5 text-[11.5px]">ส่วนต่างระหว่างอัตราของร้านย่อยกับอัตราของร้านคุณ — เข้ายอดคงเหลือของร้านคุณเมื่อรายการอนุมัติ</div>
      </div>
    </>
  );
}

export function SubMerchantsEditor({ subs, self }: { subs: SubMerchant[]; self: SelfInfo }) {
  const router = useRouter();
  const [dialog, setDialog] = useState<null | { kind: "create" } | { kind: "edit"; s: SubMerchant } | { kind: "password"; s: SubMerchant }>(null);
  const [done, setDone] = useState<null | { title: string; lines: [string, string][] }>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<ActionResult>, after: (r: ActionResult) => void) => start(async () => {
    setError(null);
    const r = await fn();
    if (!r.ok) return setError(r.error);
    after(r);
    router.refresh();
  });
  const canCreate = self.allowSubMerchants && self.status === "active";
  const direct = subs.filter((s) => s.depth === 1);
  const commission = subs.reduce((t, s) => t + Number(s.commissionToMe), 0);
  const waiting = subs.filter((s) => s.status === "pending").length;
  const open = (d: typeof dialog) => { setError(null); setDialog(d); };

  return (
    <div className="grid gap-5">
      <div className="grid gap-3 sm:grid-cols-3">
        {[["ร้านย่อยทั้งหมด", `${subs.length} ร้าน`, `ชั้นถัดไป ${direct.length} ร้าน`], ["ค่าคอมที่ได้รับรวม", money(commission), "เข้ายอดคงเหลือของร้านคุณแล้ว"], ["รอผู้ดูแลอนุมัติ", `${waiting} ร้าน`, "ร้านใหม่รับชำระได้หลังอนุมัติ"]].map(([l, v, n]) => (
          <div key={l} className="rounded-xl border border-line bg-surface px-5 py-4">
            <div className="text-[12px] text-muted">{l}</div>
            <div className="mt-1 text-xl font-semibold tabular-nums">{v}</div>
            <div className="mt-0.5 text-[11.5px] text-soft">{n}</div>
          </div>
        ))}
      </div>

      <section className="rounded-xl border border-line bg-surface">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-[22px] py-4">
          <div>
            <h2 className="text-lg font-semibold">ร้านย่อยของคุณ</h2>
            <div className="text-[12px] text-muted">อัตราของร้านคุณ: เงินเข้า {rateText(self)} · เงินออก {Number(self.outFeePercent)}% + {money(self.outFeeFlat)} — ร้านย่อยต้องไม่ต่ำกว่านี้</div>
          </div>
          <button type="button" className={B("primary")} disabled={!canCreate} onClick={() => open({ kind: "create" })}><Plus size={15} /> สร้างร้านย่อย</button>
        </div>
        {!self.allowSubMerchants && <div className="border-b border-line px-[22px] py-2.5 text-[12.5px] text-amber-200">ร้านนี้ไม่ได้รับอนุญาตให้สร้างร้านย่อย — ติดต่อผู้ดูแลระบบ หรือร้านแม่ของคุณ</div>}
        {self.allowSubMerchants && self.status !== "active" && <div className="border-b border-line px-[22px] py-2.5 text-[12.5px] text-amber-200">ร้านของคุณต้องได้รับอนุมัติก่อน จึงจะสร้างร้านย่อยได้</div>}
        {done && (
          <div role="status" className="m-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-[13px]">
            <div className="font-semibold text-emerald-300">{done.title}</div>
            <dl className="mt-1.5 grid gap-0.5">{done.lines.map(([k, v]) => <div key={k} className="flex gap-2"><dt className="text-muted">{k}</dt><dd className="font-mono">{v}</dd></div>)}</dl>
            <div className="mt-1.5 text-[11.5px] text-muted">ส่งข้อมูลนี้ให้เจ้าของร้านย่อยทางช่องทางที่ปลอดภัย — รหัสผ่านแสดงครั้งเดียว และต้องเปลี่ยนเมื่อเข้าสู่ระบบครั้งแรก</div>
            <button type="button" className={`${B("ghost", "sm")} mt-2`} onClick={() => setDone(null)}>ปิด</button>
          </div>
        )}
        {subs.length === 0 ? (
          <div className="px-[22px] py-10 text-center text-[13px] text-muted">ยังไม่มีร้านย่อย{canCreate && <> — กด <strong>สร้างร้านย่อย</strong> เพื่อเริ่ม</>}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[12.5px]">
              <thead>
                <tr>{["ร้าน", "เจ้าของ (เข้าสู่ระบบ)", "สถานะ", "อัตรา เข้า / ออก", "ยอดขายสะสม", "ยอดคงเหลือ", "ค่าคอมที่คุณได้", ""].map((h) => (
                  <th key={h} className="border-b border-line bg-surface-alt px-4 py-2.5 text-left text-[11.5px] font-semibold text-muted whitespace-nowrap">{h}</th>
                ))}</tr>
              </thead>
              <tbody className="divide-y divide-line">
                {subs.map((s) => {
                  const [label, tone] = STATUS[s.status] ?? [s.status, ""];
                  return (
                    <tr key={s.id} className="hover:bg-surface-alt">
                      <td className="px-4 py-2.5" style={{ paddingLeft: `${16 + (s.depth - 1) * 22}px` }}>
                        <div className="font-medium">{s.depth > 1 && <span className="mr-1 text-soft">└</span>}{s.name}</div>
                        <div className="text-[11px] text-muted"><code>{s.slug}</code>{s.depth > 1 ? ` · ชั้นที่ ${s.depth}` : ""}{s.childCount ? ` · ร้านย่อย ${s.childCount}` : ""}</div>
                      </td>
                      <td className="px-4 py-2.5"><div>{s.owner?.fullName ?? "—"}</div><div className="text-[11px] text-muted">{s.owner?.email ?? s.owner?.username ?? ""}</div></td>
                      <td className="px-4 py-2.5"><span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${tone}`}>{label}</span></td>
                      <td className="px-4 py-2.5 whitespace-nowrap">{rateText(s)}<div className="text-[11px] text-muted">ออก {Number(s.outFeePercent)}% + {money(s.outFeeFlat)}</div></td>
                      <td className="px-4 py-2.5 text-right tabular-nums">{money(s.paidTotal)}<div className="text-[11px] text-muted">{s.paidCount} รายการ</div></td>
                      <td className="px-4 py-2.5 text-right tabular-nums">{money(s.balance)}</td>
                      <td className="px-4 py-2.5 text-right font-semibold text-primary tabular-nums">{money(s.commissionToMe)}</td>
                      <td className="px-4 py-2.5">
                        <div className="flex justify-end gap-1.5">
                          <button type="button" title="ดูร้านนี้ (ดูอย่างเดียว)" className={B("ghost", "sm")} onClick={() => start(async () => { await viewShop(s.id); router.push("/merchant/dashboard"); })}><Eye size={13} /> ดู</button>
                          {s.depth === 1 && <button type="button" className={B("ghost", "sm")} onClick={() => open({ kind: "edit", s })}><Pencil size={13} /> แก้ไข</button>}
                          {s.depth === 1 && <button type="button" title="ตั้งรหัสผ่านชั่วคราวใหม่ให้เจ้าของร้าน" className={B("ghost", "sm")} onClick={() => open({ kind: "password", s })}><KeyRound size={13} /></button>}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <p className="border-t border-line px-[22px] py-2.5 text-[11.5px] text-muted">แก้ไขได้เฉพาะร้านย่อยชั้นถัดไป — ร้านในชั้นลึกกว่านั้นจัดการโดยร้านแม่ของร้านนั้น · คุณดูข้อมูลทุกร้านใต้ร้านคุณได้ (ดูอย่างเดียว)</p>
      </section>

      {dialog?.kind === "create" && <CreateDialog self={self} pending={pending} error={error} onClose={() => setDialog(null)}
        onSave={(b) => run(() => createSubMerchant(b), (r) => { setDialog(null); setDone({ title: `สร้างร้าน ${b.name} แล้ว — รอผู้ดูแลระบบอนุมัติ`, lines: [["เข้าสู่ระบบที่", "https://optionpay.co/merchant/login"], ["อีเมล", b.owner.email], ["ชื่อผู้ใช้", String((r as { owner?: { username?: string } }).owner?.username ?? "")], ["รหัสผ่านชั่วคราว", b.owner.password]] }); })} />}
      {dialog?.kind === "edit" && <EditDialog s={dialog.s} self={self} pending={pending} error={error} onClose={() => setDialog(null)}
        onSave={(b) => run(() => updateSubMerchant(dialog.s.id, b), () => setDialog(null))} />}
      {dialog?.kind === "password" && <PasswordDialog s={dialog.s} pending={pending} error={error} onClose={() => setDialog(null)}
        onSave={(pw) => run(() => resetSubOwnerPassword(dialog.s.id, pw), () => { setDialog(null); setDone({ title: `ตั้งรหัสผ่านชั่วคราวใหม่ให้เจ้าของร้าน ${dialog.s.name} แล้ว`, lines: [["อีเมล", dialog.s.owner?.email ?? dialog.s.owner?.username ?? "-"], ["รหัสผ่านชั่วคราว", pw]] }); })} />}
    </div>
  );
}

const Err = ({ error }: { error: string | null }) => (error ? <div role="alert" className="mb-3 rounded-lg border border-red-500/30 bg-red-500/15 px-3.5 py-2.5 text-[13px] text-red-300">{error}</div> : null);
const footer = (onClose: () => void, pending: boolean, label: string, form: string) => (
  <><button type="button" className={B("ghost")} onClick={onClose}>ยกเลิก</button><button type="submit" form={form} disabled={pending} className={B("primary")}>{pending ? "กำลังบันทึก..." : label}</button></>
);

function CreateDialog({ self, pending, error, onClose, onSave }: { self: SelfInfo; pending: boolean; error: string | null; onClose: () => void;
  onSave: (b: Parameters<typeof createSubMerchant>[0]) => void }) {
  const [f, setF] = useState({ name: "", slug: "", slugTouched: false, phone: "", allow: true, ownerName: "", email: "", password: genPassword(),
    feePercent: String(self.feePercent), feeFlat: String(self.feeFlat), outFeePercent: String(self.outFeePercent), outFeeFlat: String(self.outFeeFlat) });
  return (
    <Modal title="สร้างร้านย่อย" onClose={onClose} width={680} footer={footer(onClose, pending, "สร้างร้านย่อย", "sm-create")}>
      <form id="sm-create" className="grid gap-4 text-[13px] sm:grid-cols-2" onSubmit={(e) => {
        e.preventDefault();
        onSave({ name: f.name.trim(), slug: f.slug.trim(), allowSubMerchants: f.allow, contactPhone: f.phone.trim() || undefined, ...rateNums(f),
          owner: { fullName: f.ownerName.trim(), email: f.email.trim().toLowerCase(), password: f.password } });
      }}>
        <div className="sm:col-span-2"><Err error={error} /></div>
        <div className="text-[12px] font-semibold tracking-wide text-muted uppercase sm:col-span-2">ข้อมูลร้าน</div>
        <div><label className={fieldLabel} htmlFor="sm-name">ชื่อร้าน *</label>
          <input id="sm-name" required maxLength={120} className={field} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value, slug: f.slugTouched ? f.slug : slugOf(e.target.value) })} autoFocus /></div>
        <div><label className={fieldLabel} htmlFor="sm-slug">Slug *</label>
          <input id="sm-slug" required pattern="[a-z0-9][a-z0-9-]{1,40}" className={field} value={f.slug} onChange={(e) => setF({ ...f, slug: e.target.value.toLowerCase(), slugTouched: true })} placeholder="เช่น noodle-branch-2" />
          <div className="mt-1 text-[11px] text-muted">a–z 0–9 และขีด - · แก้ภายหลังไม่ได้</div></div>
        <RateFields f={f} self={self} set={(k, v) => setF({ ...f, [k]: v })} />
        <label className="flex items-center gap-2 sm:col-span-2"><input type="checkbox" checked={f.allow} onChange={(e) => setF({ ...f, allow: e.target.checked })} /> อนุญาตให้ร้านนี้สร้างร้านย่อยต่อ</label>

        <div className="mt-1 text-[12px] font-semibold tracking-wide text-muted uppercase sm:col-span-2">เจ้าของร้าน (ใช้เข้าสู่ระบบ Merchant Portal)</div>
        <div><label className={fieldLabel} htmlFor="sm-owner">ชื่อ-นามสกุล *</label><input id="sm-owner" required maxLength={120} className={field} value={f.ownerName} onChange={(e) => setF({ ...f, ownerName: e.target.value })} /></div>
        <div><label className={fieldLabel} htmlFor="sm-email">อีเมล *</label><input id="sm-email" type="email" required maxLength={200} className={field} value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
          <div className="mt-1 text-[11px] text-muted">1 อีเมลใช้ได้กับร้านเดียว</div></div>
        <div><label className={fieldLabel} htmlFor="sm-pw">รหัสผ่านชั่วคราว *</label>
          <div className="flex gap-2"><input id="sm-pw" required minLength={8} className={`${field} font-mono`} value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} />
            <button type="button" className={B("ghost", "sm")} onClick={() => setF({ ...f, password: genPassword() })}>สุ่มรหัส</button></div>
          <div className="mt-1 text-[11px] text-muted">อย่างน้อย 8 ตัว · เจ้าของร้านต้องเปลี่ยนเมื่อเข้าสู่ระบบครั้งแรก</div></div>
        <div><label className={fieldLabel} htmlFor="sm-phone">เบอร์ติดต่อ</label><input id="sm-phone" maxLength={40} className={field} value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></div>
        <p className="text-[12px] text-muted sm:col-span-2">ร้านใหม่จะมีสถานะ <strong className="text-amber-200">รออนุมัติ</strong> จนกว่าผู้ดูแลระบบจะอนุมัติ — ระหว่างนี้เจ้าของร้านเข้าสู่ระบบได้ แต่ยังรับชำระ / ถอนเงิน / ออก API key ไม่ได้ · ยอดเริ่มต้น ยอดคงเหลือขั้นต่ำ และ KYC กำหนดโดยผู้ดูแลระบบ</p>
      </form>
    </Modal>
  );
}

function EditDialog({ s, self, pending, error, onClose, onSave }: { s: SubMerchant; self: SelfInfo; pending: boolean; error: string | null; onClose: () => void;
  onSave: (b: Parameters<typeof updateSubMerchant>[1]) => void }) {
  const [f, setF] = useState({ name: s.name, allow: s.allowSubMerchants, status: s.status === "suspended" ? "suspended" : "active",
    feePercent: String(Number(s.feePercent)), feeFlat: String(Number(s.feeFlat)), outFeePercent: String(Number(s.outFeePercent)), outFeeFlat: String(Number(s.outFeeFlat)) });
  return (
    <Modal title={`แก้ไขร้านย่อย — ${s.name}`} onClose={onClose} width={680} footer={footer(onClose, pending, "บันทึก", "sm-edit")}>
      <form id="sm-edit" className="grid gap-4 text-[13px] sm:grid-cols-2" onSubmit={(e) => {
        e.preventDefault();
        onSave({ name: f.name.trim(), allowSubMerchants: f.allow, status: f.status as "active" | "suspended", ...rateNums(f) });
      }}>
        <div className="sm:col-span-2"><Err error={error} /></div>
        <div><label className={fieldLabel} htmlFor="se-name">ชื่อร้าน *</label><input id="se-name" required maxLength={120} className={field} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
        <div><label className={fieldLabel} htmlFor="se-st">สถานะ</label>
          <select id="se-st" className={`${field} [color-scheme:dark]`} value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })}>
            <option value="active">{s.status === "pending" ? "รออนุมัติ (ผู้ดูแลระบบเป็นผู้อนุมัติ)" : "ใช้งาน"}</option>
            <option value="suspended">ระงับ (รวมร้านย่อยทั้งหมดใต้ร้านนี้)</option>
          </select></div>
        <RateFields f={f} self={self} set={(k, v) => setF({ ...f, [k]: v })} />
        <label className="flex items-center gap-2 sm:col-span-2"><input type="checkbox" checked={f.allow} onChange={(e) => setF({ ...f, allow: e.target.checked })} /> อนุญาตให้ร้านนี้สร้างร้านย่อยต่อ</label>
        <p className="text-[12px] text-muted sm:col-span-2">อัตราใหม่ใช้กับรายการที่สร้างหลังจากนี้ · ถ้าร้านนี้มีร้านย่อยของตัวเอง อัตราต้องไม่สูงกว่าอัตราของร้านย่อยเหล่านั้น</p>
      </form>
    </Modal>
  );
}

function PasswordDialog({ s, pending, error, onClose, onSave }: { s: SubMerchant; pending: boolean; error: string | null; onClose: () => void; onSave: (pw: string) => void }) {
  const [pw, setPw] = useState(genPassword());
  return (
    <Modal title={`รหัสผ่านชั่วคราวใหม่ — ${s.name}`} onClose={onClose} footer={footer(onClose, pending, "ตั้งรหัสผ่าน", "sm-pw-form")}>
      <form id="sm-pw-form" className="grid gap-3 text-[13px]" onSubmit={(e) => { e.preventDefault(); onSave(pw); }}>
        <Err error={error} />
        <p className="text-muted">ตั้งรหัสผ่านชั่วคราวใหม่ให้เจ้าของร้าน <strong className="text-ink">{s.owner?.fullName ?? "-"}</strong> ({s.owner?.email ?? s.owner?.username}) — รหัสเดิมใช้ไม่ได้ทันที และต้องเปลี่ยนเมื่อเข้าสู่ระบบครั้งถัดไป</p>
        <div className="flex gap-2"><input aria-label="รหัสผ่านชั่วคราว" required minLength={8} className={`${field} font-mono`} value={pw} onChange={(e) => setPw(e.target.value)} />
          <button type="button" className={B("ghost", "sm")} onClick={() => setPw(genPassword())}>สุ่มรหัส</button></div>
      </form>
    </Modal>
  );
}
