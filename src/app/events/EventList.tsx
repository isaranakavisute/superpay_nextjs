"use client";

import { useState, useTransition } from "react";
import { Check, Eye, RefreshCw, Search, X } from "lucide-react";
import { Modal, btn, field, fieldLabel } from "@/components/interactive/Modal";
import { Badge } from "@/components/ui";
import type { ActionResult } from "@/lib/api";
import { fmtDateTime, fmtMoney } from "@/lib/format";
import type { EventRow } from "@/lib/rows";
import { candidateOrders, createAndMatch, flipEvent, matchEvent, recheckEvent, rejectEvent } from "./actions";

const STATUS: Record<EventRow["status"], [string, string]> = {
  new: ["ใหม่", "bg-[rgba(59,130,246,0.15)] text-[#93c5fd]"],
  ambiguous: ["กำกวม", "bg-[#7c2d12] text-[#fed7aa]"],
  matched: ["จับคู่แล้ว", "bg-[rgba(16,185,129,0.15)] text-[#6ee7b7]"],
  manual: ["จับคู่เอง", "bg-[rgba(245,158,11,0.15)] text-[#fcd34d]"],
  rejected: ["ปฏิเสธ", "bg-[rgba(239,68,68,0.15)] text-[#fca5a5]"],
};

type Opt = { id: number; label: string };
type Candidate = { ref: string; amount: string; customerName: string; merchantName: string | null; createdAt: string };

function MatchDialog({ e, merchants, accounts, onClose }: { e: EventRow; merchants: Opt[]; accounts: Opt[]; onClose: () => void }) {
  const [mode, setMode] = useState<"existing" | "new">("existing");
  const [cands, setCands] = useState<Candidate[] | null>(null);
  const [pick, setPick] = useState(e.paymentRef ?? "");
  const [f, setF] = useState({ merchantId: "", bankAccountId: String(accounts[0]?.id ?? ""), customerName: e.sender });
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  if (cands === null) candidateOrders(Number(e.amount ?? 0)).then(setCands);

  const submit = () =>
    start(async () => {
      setError(null);
      const r: ActionResult =
        mode === "existing" ? await matchEvent(e.id, pick) : await createAndMatch(e.id, f.merchantId ? Number(f.merchantId) : null, Number(f.bankAccountId), f.customerName);
      if (r.ok) onClose();
      else setError(r.error);
    });

  return (
    <Modal
      title={`จับคู่ event #${e.id} — ${e.amount ? fmtMoney(e.amount) : "ไม่ระบุยอด"}`}
      onClose={onClose}
      width={720}
      footer={
        <>
          <button className={`${btn.base} ${btn.md} ${btn.ghost}`} onClick={onClose}>ยกเลิก</button>
          <button className={`${btn.base} ${btn.md} ${btn.success}`} disabled={pending || (mode === "existing" ? !pick : !f.customerName.trim() || !e.amount)} onClick={submit}>
            {mode === "existing" ? "จับคู่และอนุมัติ" : "สร้าง + จับคู่"}
          </button>
        </>
      }
    >
      <div className="mb-4 flex gap-1 border-b border-line">
        {(["existing", "new"] as const).map((m) => (
          <button key={m} type="button" onClick={() => setMode(m)} className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium ${mode === m ? "border-primary text-primary" : "border-transparent text-muted"}`}>
            {m === "existing" ? `เลือกรายการที่มี (${cands?.length ?? "…"})` : "+ สร้างรายการใหม่"}
          </button>
        ))}
      </div>
      {mode === "existing" ? (
        <div className="max-h-80 overflow-auto rounded-lg border border-line">
          {(cands ?? []).map((c) => (
            <label key={c.ref} className={`flex cursor-pointer items-center gap-3 border-b border-line px-3 py-2 text-[13px] last:border-0 ${pick === c.ref ? "bg-primary-50" : "hover:bg-surface-alt"}`}>
              <input type="radio" name={`m-${e.id}`} checked={pick === c.ref} onChange={() => setPick(c.ref)} className="accent-[var(--color-primary)]" />
              <strong className="w-28">{c.ref}</strong>
              <span className={`w-28 tabular-nums ${Number(c.amount) === Number(e.amount) ? "font-semibold text-success" : ""}`}>{fmtMoney(c.amount)}</span>
              <span className="flex-1 truncate">{c.customerName} · {c.merchantName ?? "house"}</span>
              <span className="text-xs text-muted">{fmtDateTime(c.createdAt)}</span>
            </label>
          ))}
          {cands && cands.length === 0 && <div className="p-6 text-center text-[13px] text-muted">ไม่มีออเดอร์ที่รอชำระ</div>}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <div><label className={fieldLabel} htmlFor={`cm-n-${e.id}`}>ชื่อลูกค้า</label><input id={`cm-n-${e.id}`} className={field} value={f.customerName} onChange={(x) => setF({ ...f, customerName: x.target.value })} /></div>
          <div>
            <label className={fieldLabel} htmlFor={`cm-m-${e.id}`}>ร้านค้า</label>
            <select id={`cm-m-${e.id}`} className={field} value={f.merchantId} onChange={(x) => setF({ ...f, merchantId: x.target.value })}>
              <option value="">— ไม่ผูกร้าน (house) —</option>
              {merchants.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className={fieldLabel} htmlFor={`cm-a-${e.id}`}>บัญชีที่รับเงิน</label>
            <select id={`cm-a-${e.id}`} className={field} value={f.bankAccountId} onChange={(x) => setF({ ...f, bankAccountId: x.target.value })}>
              {accounts.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}
            </select>
          </div>
        </div>
      )}
      {error && <p className="mt-3 text-[13px] text-danger">{error}</p>}
    </Modal>
  );
}

function Row({ e, merchants, accounts }: { e: EventRow; merchants: Opt[]; accounts: Opt[] }) {
  const [dialog, setDialog] = useState<null | "detail" | "match" | "reject" | "slip">(null);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const open = e.status === "new" || e.status === "ambiguous";
  const run = (fn: () => Promise<ActionResult>) =>
    start(async () => {
      setError(null);
      const r = await fn();
      if (r.ok) setDialog(null);
      else setError(r.error);
    });
  const out = e.direction === "out";

  return (
    <div className="grid grid-cols-[110px_1fr_150px_130px_110px_auto] items-center gap-3.5 border-b border-line px-5 py-3.5 text-[13.5px] last:border-0">
      <div>
        <div className="text-[13px] font-semibold">{e.channelName}</div>
        <div className="text-xs text-muted">{fmtDateTime(e.receivedAt)}</div>
        <div className="mt-1">
          <Badge className={out ? "bg-[#fee2e2] text-[#b91c1c]" : "bg-[#dcfce7] text-[#166534]"}>{out ? "↑ เงินออก" : "↓ เงินเข้า"}</Badge>
        </div>
      </div>
      <div className="truncate rounded bg-surface-alt px-2 py-1 font-mono text-[11.5px] text-muted" title={JSON.stringify(e.rawPayload)}>
        {e.rawPayload ? JSON.stringify(e.rawPayload) : e.summary}
      </div>
      <div className="min-w-0">
        <div className={`font-semibold tabular-nums ${out ? "text-danger" : ""}`}>{e.amount ? `${out ? "- " : ""}${fmtMoney(e.amount)}` : "—"}</div>
        {e.paymentRef && <div className="text-[11px] text-muted">{e.paymentRef}</div>}
        {e.orderId && <div className="truncate font-mono text-[10.5px] text-muted">{e.orderId} · ออเดอร์ {fmtMoney(e.orderAmount)}</div>}
        <div className="truncate text-[11px] text-soft">{e.sender}</div>
      </div>
      <div>{e.accountLabel ?? <span className="text-xs text-soft">—</span>}</div>
      <div>
        <Badge className={STATUS[e.status][1]}>{STATUS[e.status][0]}</Badge>
        {e.recheckAt && <div className="mt-1 text-[10.5px] text-[#fcd34d]">ตรวจซ้ำ {fmtDateTime(e.recheckAt)}</div>}
        {e.note && <div className={`mt-1 text-[10.5px] ${e.status === "rejected" ? "text-muted" : e.status === "ambiguous" ? "text-[#fcd34d]" : "text-[#fca5a5]"}`}>{e.status === "ambiguous" ? "⚠ " : open ? "⛔ " : ""}{e.note}</div>}
        {error && <div className="mt-1 text-[10.5px] text-danger">{error}</div>}
      </div>
      <div className="flex flex-wrap justify-end gap-1.5">
        {e.hasSlipImage && <button className={`${btn.base} ${btn.sm} ${btn.ghost}`} onClick={() => setDialog("slip")} title="ดูสลิป" aria-label="ดูสลิป"><Eye size={14} /></button>}
        <button className={`${btn.base} ${btn.sm} ${btn.ghost}`} onClick={() => setDialog("detail")} title="รายละเอียด" aria-label="รายละเอียด"><Search size={14} /></button>
        {open && (
          <>
            <button className={`${btn.base} ${btn.sm} ${btn.ghost} text-[#b45309]`} disabled={pending} onClick={() => run(() => recheckEvent(e.id))} title="ตรวจ / จับคู่ใหม่อีกครั้ง" aria-label="ตรวจใหม่"><RefreshCw size={14} /></button>
            <button className={`${btn.base} ${btn.sm} ${btn.ghost} text-muted`} disabled={pending} onClick={() => run(() => flipEvent(e.id))} title="สลับเงินเข้า/ออก">↻ {out ? "เข้า" : "ออก"}</button>
            <button className={`${btn.base} ${btn.sm} ${btn.success}`} disabled={pending} onClick={() => setDialog("match")} title="จับคู่กับออเดอร์" aria-label="จับคู่"><Check size={14} /></button>
            <button className={`${btn.base} ${btn.sm} border-line bg-transparent text-danger hover:bg-danger/10`} disabled={pending} onClick={() => { setReason(""); setDialog("reject"); }} title="ปฏิเสธ" aria-label="ปฏิเสธ"><X size={14} /></button>
          </>
        )}
      </div>

      {dialog === "detail" && (
        <Modal title={`Event #${e.id}`} onClose={() => setDialog(null)} width={720}>
          <div className="mb-4 grid grid-cols-2 gap-2 rounded-lg bg-surface-alt p-3 text-[13px]">
            <div><span className="text-muted">ช่องทาง:</span> {e.channelName}</div>
            <div><span className="text-muted">เวลา:</span> {fmtDateTime(e.receivedAt)}</div>
            <div><span className="text-muted">ผู้โอน:</span> {e.sender}</div>
            <div><span className="text-muted">ยอด:</span> {e.amount ? fmtMoney(e.amount) : "—"}</div>
            <div><span className="text-muted">ออเดอร์:</span> {e.paymentRef ?? "—"}</div>
            <div><span className="text-muted">สถานะ:</span> {STATUS[e.status][0]}{e.decidedBy ? ` · โดย ${e.decidedBy}` : ""}</div>
            <div className="col-span-2"><span className="text-muted">ข้อความ:</span> {e.summary}</div>
          </div>
          <pre className="max-h-60 overflow-auto rounded-lg bg-[#0f172a] p-3 text-[11.5px] text-[#cbd5e1]">{JSON.stringify(e.rawPayload, null, 2)}</pre>
        </Modal>
      )}
      {dialog === "slip" && e.paymentRef && (
        <Modal title={`สลิป ${e.paymentRef}`} onClose={() => setDialog(null)} width={560}>
          {/* eslint-disable-next-line @next/next/no-img-element -- private, auth-gated image route */}
          <img src={`/payments/${e.paymentRef}/slip`} alt={`สลิปของ ${e.paymentRef}`} className="mx-auto max-h-[70vh] rounded-lg bg-white" />
        </Modal>
      )}
      {dialog === "match" && <MatchDialog e={e} merchants={merchants} accounts={accounts} onClose={() => setDialog(null)} />}
      {dialog === "reject" && (
        <Modal
          title={`ปฏิเสธ event #${e.id}`}
          onClose={() => setDialog(null)}
          footer={
            <>
              <button className={`${btn.base} ${btn.md} ${btn.ghost}`} onClick={() => setDialog(null)}>ยกเลิก</button>
              <button className={`${btn.base} ${btn.md} ${btn.danger}`} disabled={pending || !reason.trim()} onClick={() => run(() => rejectEvent(e.id, reason))}>ปฏิเสธ</button>
            </>
          }
        >
          <label className={fieldLabel} htmlFor={`er-${e.id}`}>เหตุผล</label>
          <input id={`er-${e.id}`} className={field} value={reason} onChange={(x) => setReason(x.target.value)} autoFocus />
          {error && <p className="mt-3 text-[13px] text-danger">{error}</p>}
        </Modal>
      )}
    </div>
  );
}

export function EventList({ rows, empty, merchants, accounts }: { rows: EventRow[]; empty: string; merchants: Opt[]; accounts: Opt[] }) {
  if (rows.length === 0) return <div className="px-5 py-10 text-center text-[13px] text-muted">{empty}</div>;
  return (
    <div className="overflow-x-auto">
      <div className="min-w-[920px]">
        {rows.map((e) => <Row key={e.id} e={e} merchants={merchants} accounts={accounts} />)}
      </div>
    </div>
  );
}
