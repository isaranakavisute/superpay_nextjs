"use client";

import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { Modal, btn, field, fieldLabel } from "@/components/interactive/Modal";
import { BANKS } from "@/lib/domain";
import { createOutflow } from "./actions";
import { OUTFLOW_CATEGORIES } from "./categories";

type Opt = { id: number; label: string };

/** "+ สร้างรายการเงินออก": a pending outflow; the deducting account may be picked later at approval. */
export function CreateOutflow({ merchants, accounts }: { merchants: Opt[]; accounts: Opt[] }) {
  const empty = { category: "expense", merchantId: "", bankAccountId: "", receiverName: "", receiverBankCode: "KBANK", receiverAccount: "", amount: "", description: "" };
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm({ ...form, [k]: e.target.value });

  const submit = () =>
    start(async () => {
      setError(null);
      const r = await createOutflow({
        category: form.category,
        merchantId: form.merchantId ? Number(form.merchantId) : null,
        bankAccountId: form.bankAccountId ? Number(form.bankAccountId) : null,
        receiverName: form.receiverName,
        receiverBankCode: form.receiverBankCode,
        receiverAccount: form.receiverAccount,
        amount: Number(form.amount),
        description: form.description || undefined,
      });
      if (r.ok) {
        setCreated(String(r.ref));
        setOpen(false);
        setForm(empty);
      } else setError(r.error);
    });

  return (
    <>
      {created && <span className="self-center text-[13px] text-success">สร้าง {created} แล้ว</span>}
      <button className={`${btn.base} ${btn.md} ${btn.primary}`} onClick={() => { setError(null); setCreated(null); setOpen(true); }}>
        <Plus size={16} /> สร้างรายการเงินออก
      </button>
      {open && (
        <Modal
          title="สร้างรายการเงินออก"
          width={620}
          onClose={() => setOpen(false)}
          footer={
            <>
              <button className={`${btn.base} ${btn.md} ${btn.ghost}`} onClick={() => setOpen(false)}>ยกเลิก</button>
              <button className={`${btn.base} ${btn.md} ${btn.primary}`} disabled={pending || !form.receiverName.trim() || !form.receiverAccount.trim() || !(Number(form.amount) > 0)} onClick={submit}>
                สร้างรายการ
              </button>
            </>
          }
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={fieldLabel} htmlFor="co-cat">หมวดหมู่</label>
              <select id="co-cat" className={field} value={form.category} onChange={set("category")}>
                {OUTFLOW_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label className={fieldLabel} htmlFor="co-m">ร้านค้า</label>
              <select id="co-m" className={field} value={form.merchantId} onChange={set("merchantId")}>
                <option value="">— ไม่ผูกร้าน (house) —</option>
                {merchants.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className={fieldLabel} htmlFor="co-a">โอนจากบัญชี (ถ้ามี)</label>
              <select id="co-a" className={field} value={form.bankAccountId} onChange={set("bankAccountId")}>
                <option value="">— เลือกตอนอนุมัติ —</option>
                {accounts.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}
              </select>
            </div>
            <div>
              <label className={fieldLabel} htmlFor="co-rn">ชื่อผู้รับ *</label>
              <input id="co-rn" className={field} value={form.receiverName} onChange={set("receiverName")} />
            </div>
            <div>
              <label className={fieldLabel} htmlFor="co-rb">ธนาคารปลายทาง</label>
              <select id="co-rb" className={field} value={form.receiverBankCode} onChange={set("receiverBankCode")}>
                {BANKS.map((b) => <option key={b.code} value={b.code}>{b.name}</option>)}
              </select>
            </div>
            <div>
              <label className={fieldLabel} htmlFor="co-ra">เลขบัญชีปลายทาง *</label>
              <input id="co-ra" className={field} value={form.receiverAccount} onChange={set("receiverAccount")} placeholder="xxx-x-xxxxx-x" />
            </div>
            <div>
              <label className={fieldLabel} htmlFor="co-amt">ยอด (บาท) *</label>
              <input id="co-amt" className={field} type="number" min="0.01" step="0.01" value={form.amount} onChange={set("amount")} />
            </div>
            <div className="sm:col-span-2">
              <label className={fieldLabel} htmlFor="co-d">รายละเอียด</label>
              <input id="co-d" className={field} value={form.description} onChange={set("description")} />
            </div>
          </div>
          {error && <p className="mt-4 text-[13px] text-danger">{error}</p>}
        </Modal>
      )}
    </>
  );
}
