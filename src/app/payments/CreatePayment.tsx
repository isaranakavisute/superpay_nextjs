"use client";

import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { Modal, btn, field, fieldLabel } from "@/components/interactive/Modal";
import { BANKS } from "@/lib/domain";
import { createPayment } from "./actions";

type Opt = { id: number; label: string };

/** "+ สร้างรายการใหม่": a pending payment for a shop (or house) into a receiving account. */
export function CreatePayment({ merchants, accounts }: { merchants: Opt[]; accounts: Opt[] }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [form, setForm] = useState({ merchantId: "", customerName: "", payerBankCode: "KBANK", bankAccountId: String(accounts[0]?.id ?? ""), amount: "", merchantOrderId: "" });
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm({ ...form, [k]: e.target.value });

  const submit = () =>
    start(async () => {
      setError(null);
      const r = await createPayment({
        merchantId: form.merchantId ? Number(form.merchantId) : null,
        customerName: form.customerName,
        payerBankCode: form.payerBankCode,
        bankAccountId: Number(form.bankAccountId),
        amount: Number(form.amount),
        merchantOrderId: form.merchantOrderId || undefined,
      });
      if (r.ok) {
        setCreated(String(r.ref));
        setOpen(false);
        setForm({ ...form, customerName: "", amount: "", merchantOrderId: "" });
      } else setError(r.error);
    });

  return (
    <>
      {created && <span className="self-center text-[13px] text-success">สร้าง {created} แล้ว</span>}
      <button className={`${btn.base} ${btn.md} ${btn.primary}`} onClick={() => { setError(null); setCreated(null); setOpen(true); }}>
        <Plus size={16} /> สร้างรายการใหม่
      </button>
      {open && (
        <Modal
          title="สร้างรายการชำระเงิน"
          onClose={() => setOpen(false)}
          footer={
            <>
              <button className={`${btn.base} ${btn.md} ${btn.ghost}`} onClick={() => setOpen(false)}>ยกเลิก</button>
              <button className={`${btn.base} ${btn.md} ${btn.primary}`} disabled={pending || !form.customerName.trim() || !(Number(form.amount) > 0)} onClick={submit}>
                สร้างรายการ
              </button>
            </>
          }
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={fieldLabel} htmlFor="cp-merchant">ร้านค้า</label>
              <select id="cp-merchant" className={field} value={form.merchantId} onChange={set("merchantId")}>
                <option value="">— ไม่ผูกร้าน (house) —</option>
                {merchants.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
              </select>
            </div>
            <div>
              <label className={fieldLabel} htmlFor="cp-order">Order ID ของร้าน</label>
              <input id="cp-order" className={field} value={form.merchantOrderId} onChange={set("merchantOrderId")} placeholder="ไม่บังคับ" />
            </div>
            <div>
              <label className={fieldLabel} htmlFor="cp-customer">ชื่อลูกค้า *</label>
              <input id="cp-customer" className={field} value={form.customerName} onChange={set("customerName")} autoFocus />
            </div>
            <div>
              <label className={fieldLabel} htmlFor="cp-bank">ธนาคารผู้โอน</label>
              <select id="cp-bank" className={field} value={form.payerBankCode} onChange={set("payerBankCode")}>
                {BANKS.map((b) => <option key={b.code} value={b.code}>{b.name}</option>)}
              </select>
            </div>
            <div>
              <label className={fieldLabel} htmlFor="cp-account">บัญชีรับเงิน *</label>
              <select id="cp-account" className={field} value={form.bankAccountId} onChange={set("bankAccountId")}>
                {accounts.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}
              </select>
            </div>
            <div>
              <label className={fieldLabel} htmlFor="cp-amount">ยอด (บาท) *</label>
              <input id="cp-amount" className={field} type="number" min="0.01" step="0.01" value={form.amount} onChange={set("amount")} />
            </div>
          </div>
          {error && <p className="mt-4 text-[13px] text-danger">{error}</p>}
        </Modal>
      )}
    </>
  );
}
