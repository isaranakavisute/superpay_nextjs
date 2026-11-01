"use client";

import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { Modal, btn, field, fieldLabel } from "@/components/interactive/Modal";
import { BANKS } from "@/lib/domain";
import { createPayment } from "./actions";
import { precheckPayment, type PrecheckSuggestion, type PrecheckWarning } from "./precheck";
import { PrecheckPanel } from "./PrecheckPanel";

type Opt = { id: number; label: string };

/**
 * "+ สร้างรายการใหม่": a pending payment for a shop (or house) into a receiving account. Checked first (precheck.ts):
 * any warning is shown before the order is made, and every red one must be ticked (1 Nov 2026).
 */
export function CreatePayment({ merchants, accounts }: { merchants: Opt[]; accounts: Opt[] }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [form, setForm] = useState({ merchantId: "", customerName: "", payerBankCode: "KBANK", bankAccountId: String(accounts[0]?.id ?? ""), amount: "", merchantOrderId: "" });
  const [check, setCheck] = useState<{ warnings: PrecheckWarning[]; suggestions: PrecheckSuggestion[] } | null>(null);
  const [acks, setAcks] = useState<boolean[]>([]);
  // the check runs outside the transition: the payments page refreshes itself every 10 s, and a transition's result is
  // only shown once that refresh is done too — the warnings appeared up to a minute late (test, 1 Nov 2026)
  const [checking, setChecking] = useState(false);
  // any change → the checks must run again
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => { setForm({ ...form, [k]: e.target.value }); setCheck(null); };
  const allAcked = !check || check.warnings.every((w, i) => w.level !== "red" || acks[i]);

  const input = () => ({
    merchantId: form.merchantId ? Number(form.merchantId) : null, merchantOrderId: form.merchantOrderId || undefined,
    customerName: form.customerName, amount: Number(form.amount), bankAccountId: Number(form.bankAccountId),
  });
  const submit = async () => {
    setError(null);
    if (!check) {
      setChecking(true);
      const c = await precheckPayment(input()).catch((e: unknown) => ({ ok: false as const, error: e instanceof Error ? e.message : String(e) }));
      setChecking(false);
      if (!c.ok) { setError(`ตรวจข้อมูลไม่สำเร็จ: ${c.error}`); return; }
      if (c.warnings.length) { setCheck({ warnings: c.warnings, suggestions: c.suggestions }); setAcks([]); return; }
    }
    start(async () => {
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
        setCheck(null);
      } else setError(r.error);
    });
  };

  return (
    <>
      {created && <span className="self-center text-[13px] text-success">สร้าง {created} แล้ว</span>}
      <button className={`${btn.base} ${btn.md} ${btn.primary}`} onClick={() => { setError(null); setCreated(null); setOpen(true); }}>
        <Plus size={16} /> สร้างรายการใหม่
      </button>
      {open && (
        <Modal
          title="สร้างรายการชำระเงิน"
          onClose={() => { setOpen(false); setCheck(null); }}
          footer={
            <>
              <button className={`${btn.base} ${btn.md} ${btn.ghost}`} onClick={() => setOpen(false)}>ยกเลิก</button>
              <button className={`${btn.base} ${btn.md} ${btn.primary}`} disabled={pending || checking || !form.customerName.trim() || !(Number(form.amount) > 0) || !allAcked} onClick={submit}>
                {checking ? "กำลังตรวจ…" : pending ? "กำลังสร้าง…" : check ? (allAcked ? "ยืนยันสร้างรายการ" : "ติ๊กยืนยันทุกข้อสีแดงก่อน") : "สร้างรายการ"}
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
          {check && <PrecheckPanel warnings={check.warnings} suggestions={check.suggestions} acks={acks} setAck={(i, v) => setAcks((a) => { const n = [...a]; n[i] = v; return n; })} />}
          {error && <p className="mt-4 text-[13px] text-danger">{error}</p>}
        </Modal>
      )}
    </>
  );
}
