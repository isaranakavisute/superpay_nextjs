"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArchiveRestore, Ban, CheckCircle2, CircleDot, Clock, Copy, ExternalLink, FileImage, Loader2, Pencil, PlusCircle, RotateCcw, Send, Trash2, Undo2, X,
} from "lucide-react";
import { fmtDateTime, fmtMoney } from "@/lib/format";
import { txnTimeline } from "./actions";
import { StatusBadge } from "./StatusBadge";
import { KIND, bankText } from "./meta";
import type { TxnEvent, TxnTimeline } from "./types";

type Tone = "green" | "red" | "blue" | "violet" | "amber" | "gray";
const TONE: Record<Tone, string> = {
  green: "bg-[rgba(16,185,129,0.15)] text-[#6ee7b7] ring-[rgba(16,185,129,0.35)]",
  red: "bg-[rgba(239,68,68,0.15)] text-[#fca5a5] ring-[rgba(239,68,68,0.35)]",
  blue: "bg-[rgba(59,130,246,0.15)] text-[#93c5fd] ring-[rgba(59,130,246,0.35)]",
  violet: "bg-[rgba(139,92,246,0.15)] text-[#c4b5fd] ring-[rgba(139,92,246,0.35)]",
  amber: "bg-[rgba(245,158,11,0.15)] text-[#fcd34d] ring-[rgba(245,158,11,0.35)]",
  gray: "bg-surface-alt text-muted ring-line",
};

/** Thai label, icon and colour for an audit action ("payment.approve" → อนุมัติ). */
function describe(action: string): { label: string; icon: typeof CircleDot; tone: Tone } {
  const verb = action.split(".").slice(1).join(".") || action;
  if (action.startsWith("webhook.")) return { label: verb === "retry" ? "ส่ง callback ซ้ำ" : "ส่ง callback ถึงร้าน", icon: Send, tone: "violet" };
  const map: Record<string, [string, typeof CircleDot, Tone]> = {
    create: ["สร้างรายการ", PlusCircle, "blue"],
    slip: ["แนบสลิป / ตรวจสลิป", FileImage, "blue"],
    approve: ["อนุมัติ", CheckCircle2, "green"],
    reject: ["ปฏิเสธ", Ban, "red"],
    delete: ["ลบ", Trash2, "red"],
    restore: ["กู้คืน", ArchiveRestore, "amber"],
    refund: ["คืนเงิน", Undo2, "amber"],
    revive: ["ปลุกคืนออเดอร์", RotateCcw, "amber"],
    amount: ["แก้ยอด", Pencil, "amber"],
    assign: ["ย้ายร้าน / แก้ Order ID", Pencil, "amber"],
    admin_done: ["admin ดำเนินการ", CheckCircle2, "green"],
    update: ["แก้ไข", Pencil, "amber"],
    expire: ["หมดเวลา", Clock, "gray"],
  };
  const hit = map[verb] ?? Object.entries(map).find(([k]) => verb.startsWith(k))?.[1];
  return hit ? { label: hit[0], icon: hit[1], tone: hit[2] } : { label: action, icon: CircleDot, tone: "gray" };
}

const Field = ({ label, children, mono }: { label: string; children: React.ReactNode; mono?: boolean }) => (
  <div className="min-w-0">
    <div className="text-[11px] font-semibold tracking-[0.4px] text-soft uppercase">{label}</div>
    <div className={`mt-0.5 text-[13px] break-words ${mono ? "font-mono" : ""}`}>{children ?? "—"}</div>
  </div>
);

const LIST: Record<string, string> = { payment: "/payments", outflow: "/outflows", withdrawal: "/withdrawals" };

/** One transaction from creation to now — details, slip check, every recorded step and the callbacks to the shop. */
export function TxnDetail({ txnRef, onClose }: { txnRef: string; onClose: () => void }) {
  const [data, setData] = useState<TxnTimeline | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let live = true;
    txnTimeline(txnRef).then((r) => { if (!live) return; if (r.ok) setData(r.data); else setError(r.error); });
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => { live = false; document.removeEventListener("keydown", onKey); };
  }, [txnRef, onClose]);

  const d = data?.details;
  const kind = data?.kind ?? "payment";
  const K = KIND[kind];
  const status = d?.status ?? (data?.purged ? "purged" : "");
  const amount = d?.amount ?? (data?.purged?.createDetail?.match(/ยอด ([\d,]+\.\d\d)/)?.[1]?.replace(/,/g, "") ?? null);
  const events: TxnEvent[] = data?.events ?? [];

  return (
    <div className="fixed inset-0 z-[70] grid place-items-center bg-black/65 p-3 backdrop-blur-[2px] sm:p-6" onMouseDown={onClose}>
      <div
        role="dialog"
        aria-label={`ประวัติรายการ ${txnRef}`}
        className="flex max-h-[92vh] w-full max-w-[980px] flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-[0_24px_70px_rgba(0,0,0,0.55)]"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* header */}
        <div className="flex flex-wrap items-start gap-4 border-b border-line bg-gradient-to-b from-surface-alt/70 to-surface px-6 py-5">
          <span className={`grid size-11 place-items-center rounded-xl ${K.tone}`}><K.icon size={20} /></span>
          <div className="min-w-0 flex-1">
            <div className="text-[12px] text-muted">{K.label}</div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h2 className="font-mono text-[22px] font-bold tracking-tight">{txnRef}</h2>
              <button className="grid size-7 place-items-center rounded-md text-muted hover:bg-surface-alt hover:text-ink" title="คัดลอกเลขที่"
                onClick={() => { navigator.clipboard.writeText(txnRef); setCopied(true); setTimeout(() => setCopied(false), 1200); }}>
                {copied ? <CheckCircle2 size={15} className="text-success" /> : <Copy size={15} />}
              </button>
              {status && <StatusBadge status={status} deleted={!!d?.deletedAt} />}
            </div>
            {d && <div className="mt-1 text-[13px] text-muted">{d.merchantName ?? "—"} · {d.name ?? "—"}</div>}
          </div>
          <div className="text-right">
            <div className="text-[12px] text-muted">ยอด</div>
            <div className="text-[24px] font-bold tabular-nums">{amount ? fmtMoney(amount) : "—"}</div>
            {d?.fee && Number(d.fee) > 0 && <div className="text-[12px] text-muted">ค่าธรรมเนียม {fmtMoney(d.fee)}</div>}
          </div>
          <button onClick={onClose} className="grid size-8 place-items-center rounded-lg text-muted hover:bg-surface-alt hover:text-ink" aria-label="ปิด"><X size={18} /></button>
        </div>

        <div className="overflow-y-auto px-6 py-5">
          {!data && !error && <div className="grid place-items-center py-16 text-muted"><Loader2 className="animate-spin" /></div>}
          {error && <div className="rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-[13px] text-danger">{error}</div>}

          {data?.purged && (
            <div className="mb-5 rounded-xl border border-line bg-surface-alt/60 px-4 py-3 text-[13px] text-muted">
              รายการนี้ถูก<strong className="text-ink">ลบถาวร</strong>โดย {data.purged.deletedBy ?? "—"} เมื่อ {fmtDateTime(data.purged.deletedAt)} (ก่อนระบบเก็บข้อมูลที่ลบ 18 ต.ค. 2569)
              — รายละเอียดเดิมไม่มีแล้ว แต่ประวัติด้านล่างยังอยู่ครบจาก Audit Log
            </div>
          )}
          {d?.deletedAt && (
            <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-[13px]">
              <Trash2 size={16} className="mt-0.5 shrink-0 text-danger" />
              <span>ลบโดย <strong>{d.deletedBy ?? "—"}</strong> เมื่อ {fmtDateTime(d.deletedAt)} — เหตุผล: {d.deleteReason ?? "—"} <span className="text-muted">(ข้อมูลยังเก็บไว้ · กู้คืนได้ที่หน้ารายการที่ลบแล้ว)</span></span>
            </div>
          )}

          {d && (
            <section className="grid gap-x-6 gap-y-4 rounded-xl border border-line p-4 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="ร้านค้า">{d.merchantName}</Field>
              <Field label={kind === "payment" ? "ลูกค้า (ผู้โอน)" : "ผู้รับเงิน"}>{d.name}</Field>
              <Field label={kind === "payment" ? "Order ID ของร้าน" : "เลขอ้างอิงของร้าน"} mono>{d.orderId}</Field>
              {kind === "payment" ? (
                <>
                  <Field label="ธนาคารผู้โอน">{d.payerBankName ?? d.payerBankCode ?? "—"} {d.payerAccountFull ? <span className="font-mono">{d.payerAccountFull}</span> : d.payerAccount ? <span className="font-mono">{d.payerAccount}</span> : null}</Field>
                  <Field label="บัญชีรับเงิน">{d.accountBankName ?? d.accountBankCode ?? "—"} {d.accountLast4 ? <span className="font-mono">···{d.accountLast4}</span> : null}{d.accountName ? <div className="text-[12px] text-muted">{d.accountName}</div> : null}</Field>
                  <Field label="ช่องทาง">{d.source === "api" ? "API ของร้าน" : d.source ?? "—"}</Field>
                </>
              ) : (
                <>
                  <Field label="ธนาคารผู้รับ">{d.payerBankName ?? d.payerBankCode ?? "—"} {d.payerAccount ? <span className="font-mono">{d.payerAccount}</span> : null}</Field>
                  <Field label="โอนจากบัญชี">{d.accountBankCode ? <>{d.accountBankName ?? d.accountBankCode} <span className="font-mono">···{d.accountLast4}</span></> : "—"}</Field>
                  <Field label={kind === "withdrawal" ? "รายการเงินออก" : "admin ดำเนินการ"}>{kind === "withdrawal" ? d.outflowRef ?? "—" : d.adminDone ? "ทำแล้ว" : "ยัง"}</Field>
                </>
              )}
              <Field label="สร้างเมื่อ">{fmtDateTime(d.createdAt)}</Field>
              <Field label="เสร็จสิ้นเมื่อ">{d.completedAt ? fmtDateTime(d.completedAt) : "—"}</Field>
              <Field label={d.status === "pending" ? "หมดเวลาเมื่อ" : "ผู้ดำเนินการ"}>{d.status === "pending" ? fmtDateTime(d.expiresAt) : d.reviewedBy ?? "—"}</Field>
              {d.note && <div className="sm:col-span-2 lg:col-span-3"><Field label="หมายเหตุ / เหตุผล">{d.note}</Field></div>}
            </section>
          )}

          {data?.slip && (
            <section className="mt-4 rounded-xl border border-line p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="flex items-center gap-2 text-[14px] font-semibold"><FileImage size={16} /> ผลตรวจสลิป</h3>
                <span className={`rounded-full px-2.5 py-1 text-[11.5px] font-semibold ring-1 ${TONE[data.slip.decision === "approve" ? "green" : data.slip.decision === "invalid" ? "red" : "amber"]}`}>
                  {data.slip.decision === "approve" ? "ผ่าน" : data.slip.decision === "invalid" ? "ไม่ผ่าน" : data.slip.recheckAt ? "รอตรวจซ้ำ" : "รอตรวจสอบ"}
                </span>
              </div>
              <div className="grid gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-4">
                <Field label="เวลาโอนในสลิป">{data.slip.transferAt ? fmtDateTime(data.slip.transferAt) : "—"}</Field>
                <Field label="ยอดในสลิป">{data.slip.amount ? fmtMoney(data.slip.amount) : "—"}</Field>
                <Field label="เลขอ้างอิงธนาคาร" mono>{data.slip.transRef}</Field>
                <Field label="ตรวจโดย">{data.slip.provider ?? "—"} · {fmtDateTime(data.slip.uploadedAt)}</Field>
              </div>
              {data.slip.message && <p className="mt-3 rounded-lg bg-surface-alt/70 px-3 py-2 text-[13px]">{data.slip.message}</p>}
            </section>
          )}

          {data && (
            <section className="mt-5">
              <h3 className="mb-3 text-[14px] font-semibold">ประวัติรายการ — ตั้งแต่สร้างจนถึงตอนนี้ <span className="font-normal text-muted">({events.length} ขั้นตอน)</span></h3>
              <ol className="relative ml-4 border-l border-line">
                {events.map((e) => {
                  const x = describe(e.action);
                  return (
                    <li key={e.id} className="relative pb-4 pl-7 last:pb-1">
                      <span className={`absolute top-0 -left-[15px] grid size-[30px] place-items-center rounded-full ring-1 ${TONE[x.tone]}`}><x.icon size={14} /></span>
                      <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
                        <span className="text-[13.5px] font-semibold">{x.label}</span>
                        <span className="text-[12px] text-muted tabular-nums">{fmtDateTime(e.at)}</span>
                        <span className="rounded bg-surface-alt px-1.5 py-0.5 text-[11px] text-muted">{e.actor ?? "system"}</span>
                      </div>
                      {e.detail && <div className="mt-1 text-[12.5px] break-words text-muted">{e.detail}</div>}
                    </li>
                  );
                })}
                <li className="relative pl-7">
                  <span className="absolute top-0 -left-[9px] size-[18px] rounded-full border-2 border-primary bg-surface" />
                  <div className="text-[13px] font-semibold">ตอนนี้ {status && <span className="ml-1 align-middle"><StatusBadge status={status} deleted={!!d?.deletedAt} small /></span>}</div>
                </li>
              </ol>
            </section>
          )}

          {!!data?.deliveries.length && (
            <section className="mt-5">
              <h3 className="mb-2 text-[14px] font-semibold">Callback ที่ส่งถึงร้าน</h3>
              <div className="overflow-x-auto rounded-xl border border-line">
                <table className="w-full min-w-[620px] text-[12.5px]">
                  <thead><tr className="bg-surface-alt text-left text-[11px] tracking-[0.4px] text-muted uppercase">
                    <th className="px-3 py-2">Event</th><th className="px-3 py-2">ผล</th><th className="px-3 py-2">HTTP</th><th className="px-3 py-2">ครั้ง</th><th className="px-3 py-2">ส่งเมื่อ</th><th className="px-3 py-2">ปลายทาง</th>
                  </tr></thead>
                  <tbody>
                    {data.deliveries.map((w) => (
                      <tr key={w.id} className="border-t border-line">
                        <td className="px-3 py-2 font-mono">{w.event}</td>
                        <td className="px-3 py-2"><span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${TONE[w.state === "delivered" ? "green" : w.state === "failed" ? "red" : "amber"]}`}>{w.state === "delivered" ? "สำเร็จ" : w.state === "failed" ? "ล้มเหลว" : "รอส่งซ้ำ"}</span></td>
                        <td className="px-3 py-2 tabular-nums">{w.statusCode ?? "—"}{w.responseMs != null ? <span className="text-muted"> · {w.responseMs} ms</span> : null}</td>
                        <td className="px-3 py-2 tabular-nums">{w.attempts}</td>
                        <td className="px-3 py-2 whitespace-nowrap">{fmtDateTime(w.deliveredAt)}</td>
                        <td className="max-w-[240px] truncate px-3 py-2 text-muted" title={w.url ?? ""}>{w.url ? new URL(w.url).host : "—"}{w.error ? <div className="text-danger">{w.error}</div> : null}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-line bg-surface-alt/40 px-6 py-3 text-[12px] text-muted">
          <span>{d ? <>{bankText(d.payerBankCode, d.payerAccount)}{kind === "payment" ? <> → {bankText(d.accountBankCode, d.accountLast4)}</> : null}</> : "ข้อมูลจาก Audit Log"}</span>
          {d && !d.deletedAt && (
            <Link href={`${LIST[kind]}?q=${encodeURIComponent(txnRef)}`} onClick={onClose} className="inline-flex items-center gap-1.5 text-primary hover:underline">
              เปิดในหน้ารายการ <ExternalLink size={13} />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
