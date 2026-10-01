"use client";

import { useState, useTransition } from "react";
import { RefreshCw, Zap } from "lucide-react";
import { Modal, btn, field, fieldLabel } from "@/components/interactive/Modal";
import { recheckToday, simulateEvent } from "./actions";

type Opt = { id: number; label: string };

/** "⚡ จำลอง event": push a test event through the real matcher. */
export function SimulateButton({ channels, accounts }: { channels: Opt[]; accounts: Opt[] }) {
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ channelId: String(channels[0]?.id ?? ""), direction: "in", sender: "", amount: "", bankAccountId: String(accounts[0]?.id ?? ""), orderRef: "" });
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });
  const LABEL: Record<string, string> = { matched: "จับคู่และอนุมัติอัตโนมัติแล้ว", ambiguous: "ยอดชนหลายออเดอร์ — รอคนเลือก", unmatched: "ไม่พบออเดอร์ที่ยอดตรงกัน", "needs-review": "รอตรวจสอบ (ระบุออเดอร์มา)", skipped: "เงินออก — ไม่จับคู่" };

  return (
    <>
      {result && <span className="self-center text-[13px] text-success">{result}</span>}
      <button className={`${btn.base} ${btn.md} ${btn.primary}`} onClick={() => { setError(null); setResult(null); setOpen(true); }}><Zap size={16} /> จำลอง event</button>
      {open && (
        <Modal
          title="จำลอง event"
          onClose={() => setOpen(false)}
          footer={
            <>
              <button className={`${btn.base} ${btn.md} ${btn.ghost}`} onClick={() => setOpen(false)}>ยกเลิก</button>
              <button
                className={`${btn.base} ${btn.md} ${btn.primary}`}
                disabled={pending || !f.sender.trim() || !(Number(f.amount) > 0)}
                onClick={() =>
                  start(async () => {
                    const r = await simulateEvent({ channelId: Number(f.channelId), direction: f.direction as "in" | "out", sender: f.sender, amount: Number(f.amount), bankAccountId: f.bankAccountId ? Number(f.bankAccountId) : null, orderRef: f.orderRef.trim() });
                    if (r.ok) { setResult(`event #${r.id}: ${LABEL[String(r.result)] ?? r.result}`); setOpen(false); }
                    else setError(r.error);
                  })
                }
              >
                ส่ง event
              </button>
            </>
          }
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div><label className={fieldLabel} htmlFor="sim-ch">ช่องทาง</label><select id="sim-ch" className={field} value={f.channelId} onChange={set("channelId")}>{channels.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}</select></div>
            <div><label className={fieldLabel} htmlFor="sim-dir">ทิศทาง</label><select id="sim-dir" className={field} value={f.direction} onChange={set("direction")}><option value="in">เงินเข้า</option><option value="out">เงินออก</option></select></div>
            <div><label className={fieldLabel} htmlFor="sim-s">ชื่อผู้โอน *</label><input id="sim-s" className={field} value={f.sender} onChange={set("sender")} /></div>
            <div><label className={fieldLabel} htmlFor="sim-a">ยอด (บาท) *</label><input id="sim-a" className={field} type="number" min="0.01" step="0.01" value={f.amount} onChange={set("amount")} /></div>
            <div><label className={fieldLabel} htmlFor="sim-acc">เข้าบัญชี</label><select id="sim-acc" className={field} value={f.bankAccountId} onChange={set("bankAccountId")}><option value="">— ไม่ระบุ —</option>{accounts.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}</select></div>
            <div><label className={fieldLabel} htmlFor="sim-o">OrderID ใต้สลิป (ไม่บังคับ)</label><input id="sim-o" className={field} value={f.orderRef} onChange={set("orderRef")} placeholder="TXN…" /></div>
          </div>
          <p className="mt-3 text-[12px] text-muted">event จำลองจะผ่านตัวจับคู่จริง — ถ้ายอดตรงกับออเดอร์ที่รอชำระพอดี 1 รายการ ออเดอร์นั้นจะถูกอนุมัติ</p>
          {error && <p className="mt-3 text-[13px] text-danger">{error}</p>}
        </Modal>
      )}
    </>
  );
}

export function RecheckTodayButton() {
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <span className="ml-auto flex items-center gap-2">
      {msg && <span className="text-[12px] text-muted">{msg}</span>}
      <button
        className={`${btn.base} ${btn.sm} ${btn.ghost} whitespace-nowrap text-[#b45309]`}
        disabled={pending}
        onClick={() => start(async () => { const r = await recheckToday(); setMsg(r.ok ? `ตรวจ ${r.checked} รายการ · จับคู่ได้ ${r.matched}` : r.error); })}
      >
        <RefreshCw size={13} /> ตรวจสลิปใหม่ทั้งหมดของวันนี้
      </button>
    </span>
  );
}
