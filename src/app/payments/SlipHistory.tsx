"use client";

import { useEffect, useState } from "react";
import { fmtDateTime, fmtMoney } from "@/lib/format";

type Entry = {
  id: number; uploadedAt: string; uploadedBy: string | null; outcome: "checked" | "evidence" | "refused" | "earlier"; reason: string | null;
  slipAmount: string | null; slipDate: string | null; slipRef: string | null; slipSender: string | null; hasImage: boolean; current: boolean;
};
const OUTCOME: Record<Entry["outcome"], [string, string]> = {
  checked: ["ตรวจอัตโนมัติ", "border-sky-400/40 bg-sky-400/10 text-sky-300"],
  evidence: ["หลักฐาน (ตรวจแล้ว)", "border-emerald-400/40 bg-emerald-400/10 text-emerald-300"],
  refused: ["ถูกปฏิเสธ", "border-rose-500/40 bg-rose-500/10 text-rose-300"],
  earlier: ["สลิปเดิม", "border-line bg-surface-alt text-muted"],
};

/**
 * Every slip ever attached to this payment (2 Nov 2026 — TXN222101): who attached it, when, what the bank read, and
 * whether it was checked, kept as evidence or refused. Each image opens in a new tab.
 */
export function SlipHistory({ paymentRef, version }: { paymentRef: string; version: number }) {
  const [rows, setRows] = useState<Entry[] | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let live = true;
    fetch(`/payments/${paymentRef}/slips?v=${version}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((j: { history?: Entry[] }) => { if (live) setRows(j.history ?? []); })
      .catch(() => { if (live) setFailed(true); });
    return () => { live = false; };
  }, [paymentRef, version]);
  if (failed) return <p className="mt-4 text-[12.5px] text-muted">โหลดประวัติสลิปไม่สำเร็จ</p>;
  if (!rows) return <p className="mt-4 text-[12.5px] text-muted">กำลังโหลดประวัติสลิป…</p>;
  if (!rows.length) return null;
  return (
    <div className="mt-4">
      <div className="mb-2 text-[13px] font-semibold">ประวัติการแนบสลิป ({rows.length})</div>
      <ul className="grid gap-2">
        {rows.map((h) => {
          const [label, cls] = OUTCOME[h.outcome] ?? OUTCOME.earlier;
          return (
            <li key={h.id} className="rounded-lg border border-line px-3 py-2 text-[12.5px]">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${cls}`}>{label}</span>
                {h.current && <span className="rounded-full border border-primary/50 px-2 py-0.5 text-[11px] text-primary">สลิปของรายการตอนนี้</span>}
                <span className="text-muted">{fmtDateTime(h.uploadedAt)} · โดย {h.uploadedBy ?? "—"}</span>
                {h.hasImage && <a href={`/payments/${paymentRef}/slips/${h.id}`} target="_blank" rel="noreferrer" className="ml-auto text-primary underline-offset-2 hover:underline">ดูภาพ</a>}
              </div>
              {(h.slipAmount != null || h.slipSender || h.slipDate) && (
                <div className="mt-1 tabular-nums">
                  {h.slipAmount != null && <>ยอด <b>{fmtMoney(h.slipAmount)}</b></>}{h.slipSender && <> · ผู้โอน {h.slipSender}</>}{h.slipDate && <> · โอน {fmtDateTime(h.slipDate)}</>}{h.slipRef && <span className="text-muted"> · {h.slipRef}</span>}
                </div>
              )}
              {h.reason && <div className="mt-1 text-muted">{h.reason}</div>}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
