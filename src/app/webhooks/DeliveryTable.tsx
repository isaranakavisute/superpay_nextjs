"use client";

import { useState, useTransition } from "react";
import { Eye, Inbox, Zap } from "lucide-react";
import { Modal, btn } from "@/components/interactive/Modal";
import { Badge } from "@/components/ui";
import { fmtDateTime } from "@/lib/format";
import type { WebhookRow } from "@/lib/rows";
import { retryDeliveries } from "./actions";

const th = "border-b border-line bg-surface-alt px-[18px] py-[13px] text-left text-xs font-semibold tracking-[0.5px] text-muted uppercase whitespace-nowrap";
const td = "px-[18px] py-[13px] align-middle";
const STATE: Record<WebhookRow["state"], [string, string]> = {
  delivered: ["สำเร็จ", "bg-[rgba(16,185,129,0.15)] text-[#6ee7b7]"],
  pending: ["กำลังลอง", "bg-[rgba(245,158,11,0.15)] text-[#fcd34d]"],
  failed: ["ล้มเหลว", "bg-[rgba(239,68,68,0.15)] text-[#fca5a5]"],
};

/** Delivery rows; `selectable` adds checkboxes and the bulk resend controls in `header`. */
export function DeliveryTable({ rows, selectable, empty, onSelectionHeader }: { rows: WebhookRow[]; selectable?: boolean; empty: string; onSelectionHeader?: boolean }) {
  const [sel, setSel] = useState<Set<WebhookRow["id"]>>(new Set());
  const [detail, setDetail] = useState<WebhookRow | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const live = new Set(rows.map((r) => r.id));
  const picked = [...sel].filter((id) => live.has(id));

  const retry = (ids: WebhookRow["id"][]) =>
    start(async () => {
      setMsg(null);
      const r = await retryDeliveries(ids);
      if (!r.ok) setMsg(r.error);
      else {
        setSel(new Set());
        const one = r as { state?: string; error?: string | null; delivered?: number };
        setMsg(ids.length === 1 ? (one.state === "delivered" ? "ส่งสำเร็จ" : `ยังไม่สำเร็จ: ${one.error ?? ""}`) : `ส่งสำเร็จ ${one.delivered ?? 0} จาก ${ids.length} รายการ`);
      }
    });

  return (
    <>
      {selectable && onSelectionHeader && (
        <div className="flex flex-wrap items-center justify-end gap-2 border-b border-line px-[22px] py-2.5">
          {msg && <span className="mr-auto text-[12.5px] text-muted">{msg}</span>}
          <button className={`${btn.base} ${btn.sm} ${btn.ghost}`} onClick={() => setSel(new Set(rows.map((r) => r.id)))}>เลือกทั้งหน้า</button>
          <button className={`${btn.base} ${btn.sm} ${btn.primary}`} disabled={!picked.length || pending} onClick={() => retry(picked)}>
            <Zap size={13} /> ยิงซ้ำที่เลือก ({picked.length})
          </button>
        </div>
      )}
      {!selectable && msg && <div className="border-b border-line px-[22px] py-2 text-[12.5px] text-muted">{msg}</div>}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-[12.5px]">
          <thead>
            <tr>
              {selectable && <th className={`${th} w-[34px] pr-0`} />}
              {["เวลา", "ร้านค้า", "ออเดอร์", "Event", "ปลายทาง", "ผลลัพธ์", "สาเหตุ / สิ่งที่ต้องทำ", "จัดการ"].map((h) => (
                <th key={h} className={`${th} ${h === "จัดการ" ? "text-right" : ""}`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={selectable ? 9 : 8} className="px-5 py-[60px] text-center text-muted">
                  <div className="mb-3.5 inline-grid size-16 place-items-center rounded-full bg-surface-alt text-soft"><Inbox size={26} /></div>
                  <div>{empty}</div>
                </td>
              </tr>
            ) : (
              rows.map((d) => (
                <tr key={d.id} className="cursor-pointer hover:bg-surface-alt" onClick={() => setDetail(d)}>
                  {selectable && (
                    <td className={`${td} w-[34px] pr-0`} onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        className="size-4 accent-[var(--color-primary)]"
                        checked={sel.has(d.id)}
                        aria-label={`เลือก ${d.paymentRef ?? d.id}`}
                        onChange={(e) => setSel((prev) => { const n = new Set(prev); if (e.target.checked) n.add(d.id); else n.delete(d.id); return n; })}
                      />
                    </td>
                  )}
                  <td className={`${td} text-[12px] whitespace-nowrap text-muted`}>{fmtDateTime(d.deliveredAt)}</td>
                  <td className={`${td} whitespace-nowrap`}>{d.merchantName}</td>
                  <td className={`${td} whitespace-nowrap`}>
                    {d.paymentRef ? <strong>{d.paymentRef}</strong> : <span className="text-soft">—</span>}
                    {d.orderId && <div className="text-[11px] text-muted">{d.orderId}</div>}
                  </td>
                  <td className={td}><code className="text-[11px]">{d.event}</code></td>
                  <td className={`${td} max-w-[220px] truncate text-muted`} title={d.url}>{d.url}</td>
                  <td className={`${td} whitespace-nowrap`}>
                    <Badge className={STATE[d.state][1]}>{STATE[d.state][0]}</Badge> <span className="text-muted">{d.statusCode ?? "—"}</span>
                    <div className="text-[11px] text-muted">ลอง {d.attempts} ครั้ง</div>
                  </td>
                  <td className={`${td} max-w-[320px] text-[12px] ${d.error ? "text-[#fca5a5]" : "text-soft"}`}>{d.error ?? "—"}</td>
                  <td className={td} onClick={(e) => e.stopPropagation()}>
                    <div className="flex justify-end gap-1.5">
                      <button className={`${btn.base} ${btn.sm} ${btn.ghost}`} onClick={() => setDetail(d)} title="ดูรายละเอียด" aria-label="ดูรายละเอียด"><Eye size={14} /></button>
                      {d.state !== "delivered" && (
                        <button className={`${btn.base} ${btn.sm} ${btn.ghost}`} disabled={pending} onClick={() => retry([d.id])} title="ยิงซ้ำ" aria-label="ยิงซ้ำ"><Zap size={14} /></button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {detail && (
        <Modal
          title="รายละเอียดการส่ง"
          onClose={() => setDetail(null)}
          width={900}
          footer={
            <>
              {detail.state !== "delivered" && (
                <button className={`${btn.base} ${btn.md} ${btn.primary}`} disabled={pending} onClick={() => { retry([detail.id]); setDetail(null); }}>
                  <Zap size={14} /> ยิงซ้ำ
                </button>
              )}
              <button className={`${btn.base} ${btn.md} ${btn.ghost}`} onClick={() => setDetail(null)}>ปิด</button>
            </>
          }
        >
          <div className="mb-4 grid gap-2 rounded-lg bg-surface-alt p-3 text-[13px] sm:grid-cols-2">
            <div><span className="text-muted">ร้านค้า:</span> {detail.merchantName}</div>
            <div><span className="text-muted">ออเดอร์:</span> {detail.paymentRef ?? "—"}</div>
            <div><span className="text-muted">Event:</span> <code>{detail.event}</code></div>
            <div><span className="text-muted">ผลลัพธ์:</span> {STATE[detail.state][0]} · HTTP {detail.statusCode ?? "—"} · ลอง {detail.attempts} ครั้ง</div>
            <div className="sm:col-span-2 break-all"><span className="text-muted">ปลายทาง:</span> {detail.url}</div>
            <div><span className="text-muted">ส่งล่าสุด:</span> {fmtDateTime(detail.deliveredAt)}</div>
            {detail.nextRetryAt && <div><span className="text-muted">ลองใหม่:</span> {fmtDateTime(detail.nextRetryAt)}</div>}
          </div>
          <div className="mb-1 text-[13px] font-semibold">payload ที่เราส่งไป</div>
          <pre className="mb-4 max-h-56 overflow-auto rounded-lg border-l-[3px] border-primary bg-surface-alt p-3 text-[11.5px]">{JSON.stringify(detail.payload, null, 2) ?? "—"}</pre>
          <div className="mb-1 text-[13px] font-semibold">สิ่งที่ร้านตอบกลับ (HTTP {detail.statusCode ?? "—"})</div>
          <pre className={`mb-4 max-h-40 overflow-auto rounded-lg border-l-[3px] bg-surface-alt p-3 text-[11.5px] ${detail.state === "delivered" ? "border-success" : "border-danger"}`}>
            {detail.responseBody ?? detail.error ?? "—"}
          </pre>
          <div className="text-[12px] text-muted">Signature header: <code className="break-all">{detail.signature ? `X-Signature: ${detail.signature}` : "—"}</code></div>
        </Modal>
      )}
    </>
  );
}
