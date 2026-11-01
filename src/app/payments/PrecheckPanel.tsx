"use client";

import Link from "next/link";
import { AlertTriangle, Info } from "lucide-react";
import type { PrecheckSuggestion, PrecheckWarning } from "./precheck";

const STATUS_TH: Record<string, string> = { pending: "รอชำระ", expired: "หมดอายุ", rejected: "ยกเลิก/ปฏิเสธ" };

/**
 * The checks shown before creating / tying a payment to a shop (1 Nov 2026). Every red warning has its own tick. The
 * customer's earlier unpaid shop orders link to that order: pay the original instead of making a new one (a second order
 * with the same shop Order ID is not allowed, and only the original reaches the shop's system).
 */
export function PrecheckPanel({ warnings, suggestions, acks, setAck }: {
  warnings: PrecheckWarning[]; suggestions: PrecheckSuggestion[]; acks: boolean[]; setAck: (i: number, v: boolean) => void;
}) {
  if (!warnings.length) return null;
  return (
    <div className="mt-4 grid gap-2 text-[13px]">
      {warnings.map((x, i) => x.level === "red" ? (
        <label key={i} className="flex items-start gap-2 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2.5">
          <input type="checkbox" className="mt-0.5" checked={!!acks[i]} onChange={(e) => setAck(i, e.target.checked)} />
          <span><AlertTriangle size={14} className="mr-1 inline text-danger" /><b className="text-danger">ต้องตรวจ: </b>{x.text}</span>
        </label>
      ) : (
        <div key={i} className="flex items-start gap-2 rounded-lg border border-amber-400/40 bg-amber-400/10 px-3 py-2.5"><Info size={14} className="mt-0.5 shrink-0 text-warning" /><span>{x.text}</span></div>
      ))}
      {suggestions.length > 0 && (
        <div className="overflow-auto rounded-lg border border-line">
          <table className="w-full text-[12.5px]">
            <thead><tr className="bg-surface-alt text-left text-muted"><th className="px-2.5 py-1.5">ออเดอร์เดิม</th><th className="px-2.5 py-1.5">ร้าน</th><th className="px-2.5 py-1.5">ลูกค้า</th><th className="px-2.5 py-1.5 text-right">ยอด</th><th className="px-2.5 py-1.5">สถานะ</th><th className="px-2.5 py-1.5">Order ID ของร้าน</th><th /></tr></thead>
            <tbody>{suggestions.map((s) => (
              <tr key={s.ref} className="border-t border-line">
                <td className="px-2.5 py-1.5 font-semibold">{s.ref}</td><td className="px-2.5 py-1.5">{s.merchantName}</td><td className="px-2.5 py-1.5">{s.customerName}</td>
                <td className="px-2.5 py-1.5 text-right tabular-nums">{Number(s.amount).toLocaleString("th-TH", { minimumFractionDigits: 2 })}</td><td className="px-2.5 py-1.5">{STATUS_TH[s.status] ?? s.status}</td>
                <td className="px-2.5 py-1.5 font-mono text-[11px]">{s.orderId}</td>
                <td className="px-2.5 py-1.5"><Link href={`/payments?q=${s.ref}`} className="rounded-md border border-line px-2 py-1 text-[12px] whitespace-nowrap hover:bg-surface-alt">ไปที่ออเดอร์นี้</Link></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </div>
  );
}
