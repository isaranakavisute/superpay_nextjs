"use client";

import { useEffect, useRef, useState } from "react";
import { Banknote, Check, Copy, CreditCard, Download, ExternalLink, Eye, FileImage, Link2, Loader2, RefreshCw, RotateCw, Sparkles, Store, Terminal, Trash2, Upload, Wallet, X } from "lucide-react";
import { Modal, btn } from "@/components/interactive/Modal";
import { LoadingDialog } from "@/components/list/LoadingDialog";
import { Badge, BankChip } from "@/components/ui";
import { fmtDateTime, fmtMoney } from "@/lib/format";
import { newId } from "@/lib/demo-ids";
import { renderSampleSlip, type SampleSlip } from "@/lib/sample-slip";
import type { DemoCall, DemoCallback, DemoCallbackLog, DemoFees, DemoPayment, DemoPayout } from "@/lib/demo-api";
import { demoBalance, demoCallbacks, demoCreatePaymentsBulk, demoSlipDataMany, demoUploadSlipsBatch, demoSetFees, demoShopFees, demoDelete, demoRejectPayout, demoSetAdminDone, demoCancelPayment, demoCheckPayment, demoCheckPayout, demoCreatePayment, demoCreatePayout, demoLists, demoSlipData, demoUploadSlip, type DemoResult } from "./actions";

type Shop = { name: string; slug: string } | null;
type Balance = { balance: number; availableBalance: number; reserved: number } | null;
type StepKey = "payment" | "slip" | "payout" | "balance" | "row";

const baht = (n: number | undefined) => (n ?? 0).toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Wall-clock ms for timing a click's work (kept out of the component so it is never read during render). */
const nowMs = () => Date.now();
/** Fee of one transaction at the shop's rate (amount × % + flat), rounded to satang — as the backend charges it. */
const feeOf = (amount: number, pct: string, flat: string) => Math.round((amount * Number(pct) / 100 + Number(flat)) * 100) / 100;
const input = "w-full rounded-lg border border-line bg-surface-alt px-3 py-2 text-[14px] text-ink outline-none placeholder:text-soft focus:border-primary focus:shadow-(--shadow-ring)";

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[12.5px] font-semibold text-muted">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[11.5px] text-soft">{hint}</span>}
    </label>
  );
}

function CopyBtn({ text, label = "คัดลอก" }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={() => navigator.clipboard.writeText(text).then(() => { setDone(true); setTimeout(() => setDone(false), 1500); })}
      className="inline-flex items-center gap-1.5 rounded-md border border-line px-2.5 py-1 text-[12px] text-muted hover:text-ink"
    >
      {done ? <Check size={13} className="text-success" /> : <Copy size={13} />} {done ? "คัดลอกแล้ว" : label}
    </button>
  );
}

/** Terminal-style popup: types the curl, then prints what the server answered (the request really runs on our server). */
function TerminalPopup({ call, busy, error, title, onClose }: { call: DemoCall | null; busy: boolean; error: string | null; title: string; onClose: () => void }) {
  const [typed, setTyped] = useState(0);
  const text = call?.curlShort ?? "";
  const bottom = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!text) return;
    const step = Math.max(4, Math.ceil(text.length / 45));
    const id = setInterval(() => setTyped((n) => { if (n >= text.length) { clearInterval(id); return n; } return Math.min(text.length, n + step); }), 18);
    return () => clearInterval(id);
  }, [text]);
  const doneTyping = !!call && typed >= text.length;
  useEffect(() => { bottom.current?.scrollIntoView({ block: "end" }); }, [typed, doneTyping, busy]);
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="flex max-h-[86vh] w-full max-w-[920px] flex-col overflow-hidden rounded-xl border border-[#d4d4d8] bg-white shadow-(--shadow-lift)">
        <div className="flex items-center gap-2 border-b border-[#e4e4e7] bg-[#f4f4f5] px-3 py-2">
          <button type="button" aria-label="ปิด" onClick={onClose} className="size-3 rounded-full bg-[#ff5f57]" />
          <span className="size-3 rounded-full bg-[#febc2e]" />
          <span className="size-3 rounded-full bg-[#28c840]" />
          <span className="ml-2 flex items-center gap-1.5 font-mono text-[12.5px] text-[#52525b]"><Terminal size={13} /> Terminal — {title}</span>
          <div className="ml-auto flex items-center gap-2">
            {call && <CopyBtn text={call.curl} label="คัดลอก curl" />}
            <button type="button" onClick={onClose} className="rounded p-1 text-[#52525b] hover:text-black" aria-label="ปิด"><X size={16} /></button>
          </div>
        </div>
        <div className="overflow-auto p-4 font-mono text-[13px] leading-relaxed">
          {!call && busy && <div className="text-[#52525b]"><span className="text-[#15803d]">demo@optionpay</span>:<span className="text-[#1d4ed8]">~</span>$ <span className="animate-pulse">▍</span> กำลังเตรียมคำสั่ง (เซ็นลายเซ็น)…</div>}
          {error && <div className="text-[#dc2626]">✖ {error}</div>}
          {call && (
            <>
              <pre className="break-all whitespace-pre-wrap text-[#111111]"><span className="text-[#15803d]">demo@optionpay</span>:<span className="text-[#1d4ed8]">~</span>$ {text.slice(0, typed)}{!doneTyping && <span className="animate-pulse">▍</span>}</pre>
              {doneTyping && (
                <>
                  <div className="mt-4 border-t border-[#e4e4e7] pt-3 text-[12px] font-bold tracking-wider text-[#52525b] uppercase">curl response</div>
                  <div className={`mt-1 ${call.ok ? "text-[#15803d]" : "text-[#dc2626]"}`}>
                    {call.ok ? "✔" : "✖"} HTTP {call.status || "—"} · {call.ms} ms
                  </div>
                  <pre className="mt-1 break-all whitespace-pre-wrap text-[#111111]">{call.response}</pre>
                  <div className="mt-2 text-[#52525b]"><span className="text-[#15803d]">demo@optionpay</span>:<span className="text-[#1d4ed8]">~</span>$ <span className="animate-pulse">▍</span></div>
                  {/* The full command (image data not shortened), like the box under each step's button — for row actions such as ปฏิเสธ that have no box of their own. */}
                  <div className="mt-4 border-t border-[#e4e4e7] pt-3 font-sans">
                    <div className="mb-1 flex items-center justify-between">
                      <span className="text-[12px] font-semibold text-[#52525b]">คำสั่ง curl ฉบับเต็ม (ที่ส่งไปแล้ว — ลายเซ็นใช้ได้ครั้งเดียว)</span>
                      <CopyBtn text={call.curl} />
                    </div>
                    <textarea readOnly value={call.curl} rows={Math.min(10, call.curl.split("\n").length + 1)} onFocus={(e) => e.currentTarget.select()}
                      className="w-full resize-y rounded-lg border border-[#d4d4d8] bg-white p-3 font-mono text-[12px] leading-relaxed text-[#111111]" />
                  </div>
                  <div className="mt-3 flex justify-end">
                    <button type="button" onClick={onClose} className="rounded-md border border-[#d4d4d8] px-4 py-1.5 font-sans text-[13px] text-[#111111] hover:bg-[#f4f4f5]">ปิดหน้าต่าง Terminal</button>
                  </div>
                </>
              )}
            </>
          )}
          <div ref={bottom} />
        </div>
      </div>
    </div>
  );
}

function StepCard(p: {
  n: number; icon: React.ReactNode; title: string; method: "GET" | "POST"; path: string; desc: string;
  button: string; busy: boolean; onRun: () => void; call: DemoCall | null; children?: React.ReactNode; extra?: React.ReactNode;
  /** A freshly signed, not-yet-sent copy of the command (the one that ran can't be sent again: signatures are single-use). */
  fresh: DemoCall | null; onFresh: () => void; after?: React.ReactNode;
}) {
  const shown = p.fresh ?? p.call;
  return (
    <section id={`step-${p.n}`} className="flex flex-col rounded-2xl border border-line bg-surface p-5 shadow-card">
      <div className="flex items-start gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary text-[15px] font-bold text-primary-fg">{p.n}</span>
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 text-[17px] font-bold">{p.icon} {p.title}</h2>
          <div className="mt-1 flex flex-wrap items-center gap-1.5 font-mono text-[12px]">
            <span className={`rounded px-1.5 py-0.5 font-bold ${p.method === "GET" ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-[#2563eb]"}`}>{p.method}</span>
            <span className="text-muted">{p.path}</span>
          </div>
          <p className="mt-1.5 text-[13px] text-muted">{p.desc}</p>
        </div>
      </div>
      {p.children && <div className="mt-4 grid gap-3">{p.children}</div>}
      <button
        type="button"
        disabled={p.busy}
        onClick={p.onRun}
        className="mt-4 inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-[14.5px] font-bold text-primary-fg shadow-(--shadow-active) hover:bg-primary-600 disabled:opacity-60"
      >
        {p.busy ? <Loader2 size={16} className="animate-spin" /> : <Terminal size={16} />} {p.button}
      </button>
      {p.extra}
      <div className="mt-4">
        <div className="mb-1 flex items-center justify-between">
          <span className="text-[12px] font-semibold text-muted">คำสั่ง curl {p.fresh ? "(เซ็นใหม่ ยังไม่ได้ส่ง — รันเองได้ภายใน 5 นาที)" : p.call ? "(ที่ส่งไปแล้ว)" : ""}</span>
          <div className="flex items-center gap-1.5">
            <button type="button" disabled={p.busy} onClick={p.onFresh} className="inline-flex items-center gap-1.5 rounded-md border border-line px-2.5 py-1 text-[12px] text-muted hover:text-ink disabled:opacity-60" title="เซ็นคำสั่งใหม่โดยไม่ส่ง เพื่อนำไปรันใน Terminal ของคุณเอง">
              <RefreshCw size={13} /> เซ็นใหม่ (ไม่ส่ง)
            </button>
            {shown && <CopyBtn text={shown.curl} />}
          </div>
        </div>
        <textarea
          readOnly
          value={shown?.curl ?? ""}
          placeholder="กดปุ่มด้านบน — คำสั่ง curl ที่ส่งจริงจะแสดงที่นี่"
          rows={6}
          className="w-full resize-y rounded-lg border border-line bg-white p-3 font-mono text-[12px] leading-relaxed text-[#111111] placeholder:text-soft"
        />
        {p.call && !p.fresh && (
          <div className={`mt-1 text-[12px] font-semibold ${p.call.ok ? "text-success" : "text-danger"}`}>
            {p.call.ok ? "✔ สำเร็จ" : "✖ ไม่สำเร็จ"} · HTTP {p.call.status} · {p.call.ms} ms
          </div>
        )}
      </div>
      {p.after}
    </section>
  );
}

// Same labels as the console's StatusBadge, coloured for this page's white background.
const PILL: Record<string, [string, string]> = {
  pending: ["รอชำระ", "bg-amber-100 text-amber-800"],
  approved: ["อนุมัติแล้ว", "bg-emerald-100 text-emerald-800"],
  rejected: ["ไม่อนุมัติ", "bg-red-100 text-red-700"],
  refunded: ["คืนเงิน", "bg-slate-100 text-slate-700"],
  expired: ["หมดอายุ", "bg-slate-100 text-slate-500"],
};
const Status = ({ status, kind }: { status: string; kind: "payment" | "outflow" }) => {
  const [label, cls] = PILL[status.toLowerCase()] ?? [status, "bg-slate-100 text-slate-600"];
  return <Badge className={cls}>{kind === "outflow" && status.toLowerCase() === "pending" ? "รอตรวจสอบ" : label}</Badge>;
};
const th = "px-3 py-2.5 text-left text-[11.5px] font-semibold tracking-wide whitespace-nowrap text-muted uppercase";
const td = "px-3 py-2.5 align-middle";

/** "admin ดำเนินการ" dropdown, like the console's: no (default, red) → yes (green) once the transfer is made. */
function AdminDone({ refId, done, onSaved }: { refId: string; done: boolean; onSaved: () => void }) {
  const [value, setValue] = useState(done ? "yes" : "no");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <div>
      <select
        aria-label={`admin ดำเนินการ ${refId}`}
        value={value}
        disabled={pending}
        onChange={async (e) => {
          const next = e.target.value, before = value;
          setValue(next); setError(null); setPending(true);
          const r = await demoSetAdminDone(refId, next === "yes").catch((err: unknown) => ({ ok: false, error: reloadIfStale(err) }));
          setPending(false);
          if (!r.ok) { setValue(before); setError(r.error ?? "บันทึกไม่สำเร็จ"); } else onSaved();
        }}
        className={`rounded-lg border px-2.5 py-1.5 text-[12.5px] font-semibold ${value === "yes" ? "border-emerald-300 bg-emerald-100 text-emerald-800" : "border-red-300 bg-red-100 text-red-700"}`}
      >
        <option value="no">no</option>
        <option value="yes">yes</option>
      </select>
      {error && <div className="mt-1 text-[11px] text-danger">{error}</div>}
    </div>
  );
}

/**
 * After a deploy the page's server actions get new ids: a tab opened before it calls ids the server no longer has
 * ("Server Action … was not found on the server"). Tell the visitor and load the new version.
 */
const isStale = (e: unknown) => /Server Action .* was not found|failed-to-find-server-action/i.test(e instanceof Error ? e.message : String(e));
let reloading = false;
function reloadIfStale(e: unknown): string {
  if (isStale(e)) {
    if (!reloading) { reloading = true; setTimeout(() => window.location.reload(), 1500); }
    return "หน้าเว็บมีเวอร์ชันใหม่ — กำลังโหลดหน้าใหม่ให้อัตโนมัติ แล้วกดปุ่มอีกครั้ง";
  }
  return e instanceof Error ? e.message : "เกิดข้อผิดพลาด";
}

export type RowAct = "view" | "upload" | "demo" | "hooks" | "check" | "reject" | "delete";
export type PayoutAct = "hooks" | "check" | "reject" | "delete";
const icon = "inline-flex size-8 items-center justify-center rounded-lg border border-line text-muted transition hover:bg-surface-alt hover:text-ink disabled:opacity-40";

/** รายการเงินเข้า / รายการเงินออก: only what this page created, with the console's row icons (each runs its API call). */
function DemoLists({ lists, tab, setTab, onRefresh, loading, onPayment, onPayout, busy }: {
  lists: { payments: DemoPayment[]; payouts: DemoPayout[] } | null; tab: "in" | "out"; setTab: (t: "in" | "out") => void;
  onRefresh: () => void; loading: boolean; busy: boolean;
  onPayment: (a: RowAct, p: DemoPayment, file?: File) => void; onPayout: (a: PayoutAct, o: DemoPayout) => void;
}) {
  const pays = lists?.payments ?? [];
  const outs = lists?.payouts ?? [];
  const files = useRef<Record<string, HTMLInputElement | null>>({});
  const tabBtn = (t: "in" | "out", label: string, n: number) => (
    <button type="button" onClick={() => setTab(t)} className={`rounded-lg px-4 py-2 text-[14px] font-semibold ${tab === t ? "bg-primary text-primary-fg" : "text-muted hover:text-ink"}`}>
      {label} <span className="ml-1 rounded-full bg-black/20 px-1.5 text-[12px]">{n}</span>
    </button>
  );
  const hookDot = (c: DemoCallback[]) => {
    if (!c.length) return null;
    const last = c[c.length - 1];
    const ok = last.statusCode != null && last.statusCode >= 200 && last.statusCode < 300;
    return <span className={`absolute -top-1 -right-1 size-2.5 rounded-full ${ok ? "bg-success" : last.state === "pending" ? "bg-warning" : "bg-danger"}`} />;
  };
  return (
    <section className="mt-5 rounded-2xl border border-line bg-surface shadow-card">
      <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-3">
        {tabBtn("in", "รายการเงินเข้า", pays.length)}
        {tabBtn("out", "รายการเงินออก", outs.length)}
        <span className="ml-2 text-[12px] text-soft">แสดงเฉพาะรายการที่สร้างจากหน้านี้ · อัปเดตอัตโนมัติทุก 15 วินาที · ทุกไอคอนส่งคำสั่ง curl จริง</span>
        <button type="button" onClick={onRefresh} className="ml-auto inline-flex items-center gap-1 text-[12.5px] text-muted hover:text-ink"><RefreshCw size={13} className={loading ? "animate-spin" : ""} /> รีเฟรช</button>
      </div>
      <div className="overflow-x-auto">
        {tab === "in" ? (
          <table className="w-full text-[13.5px]">
            <thead className="border-b border-line bg-surface-alt"><tr>
              <th className={th}>เลขที่รายการ / orderId / เวลา</th><th className={th}>ร้านค้า</th><th className={th}>ชื่อลูกค้า (customer_name)</th><th className={th}>บัญชีรับเงิน</th>
              <th className={`${th} text-right`}>ยอด / ค่าธรรมเนียม</th><th className={th}>สถานะ</th><th className={th}>สลิป</th><th className={`${th} text-right`}>จัดการ</th>
            </tr></thead>
            <tbody>
              {pays.map((p) => {
                const st = p.status.toLowerCase();
                const del = !!p.deletedAt;
                const open = !del && (st === "pending" || st === "expired");
                // Console rule: delete an open or rejected payment with no refund (an open one is rejected first).
                const deletable = !del && (open || st === "rejected") && !(Number(p.refundedAmount ?? 0) > 0);
                return (
                  <tr key={p.ref} className={`border-b border-line/60 last:border-0 ${del ? "bg-slate-50 text-soft line-through decoration-slate-300" : "hover:bg-surface-alt/60"}`}>
                    <td className={`${td} whitespace-nowrap`}><div className="font-mono font-semibold">{p.ref}</div><div className="font-mono text-[11.5px] text-muted">{p.orderId ?? "—"}</div><div className="text-[11px] text-soft">{fmtDateTime(p.createdAt)}</div></td>
                    <td className={td}><div className="font-semibold">{p.shopName}</div>{p.shopSlug !== p.shopName && <div className="font-mono text-[11px] text-muted">{p.shopSlug}</div>}</td>
                    <td className={td}>{p.customerName ? <span className="font-medium">{p.customerName}</span> : <span className="text-soft">—</span>}</td>
                    <td className={td}>{p.accountBankCode ? (
                      <div className="flex items-center gap-2">
                        <BankChip code={p.accountBankCode} />
                        <div className="max-w-[200px] min-w-[120px] leading-snug">
                          {p.accountName && <div className="text-[12.5px] font-medium break-words whitespace-normal">{p.accountName}</div>}
                          <div className="text-[11.5px] tabular-nums text-muted">{p.accountNo}</div>
                        </div>
                      </div>
                    ) : "—"}</td>
                    <td className={`${td} text-right tabular-nums whitespace-nowrap`}><div className="font-semibold">{fmtMoney(p.amount)}</div><div className="text-[11.5px] text-muted">{fmtMoney(p.fee)}</div></td>
                    <td className={`${td} no-underline`}>
                      {del ? <Badge className="bg-slate-200 text-slate-600">ลบแล้ว</Badge> : <Status status={p.status} kind="payment" />}
                      {(del ? p.deleteReason : p.note) && <div className="mt-1 max-w-[280px] min-w-[180px] text-[11.5px] leading-snug break-words whitespace-normal text-soft" title={(del ? p.deleteReason : p.note) ?? ""}>{del ? `เหตุผล: ${p.deleteReason}` : p.note}</div>}
                    </td>
                    <td className={`${td} text-[12.5px] whitespace-nowrap`}>
                      {!p.slipAt ? <span className="text-soft">ยังไม่แนบ</span>
                        : st === "approved" ? <span className="text-success">แนบแล้ว · ผ่าน{p.slipProvider === "demo" ? " (DEMO)" : ""}</span>
                        : open && p.note ? <span className="text-danger">แนบแล้ว · ไม่ผ่าน</span>
                        : open ? <span className="text-warning">แนบแล้ว · รอตรวจ</span>
                        : <span className="text-muted">แนบแล้ว</span>}
                    </td>
                    <td className={td}>
                      <div className="flex flex-nowrap items-center justify-end gap-1.5">
                        {p.slipAt && (
                          <button type="button" className={icon} onClick={() => onPayment("view", p)} title="ดูสลิป" aria-label="ดูสลิป"><Eye size={15} /></button>
                        )}
                        {open && (
                          <>
                            <button type="button" className={icon} disabled={busy} onClick={() => files.current[p.ref]?.click()} title="แนบสลิป (POST /payment/:ref/slip)" aria-label="แนบสลิป"><Upload size={15} /></button>
                            <input ref={(el) => { files.current[p.ref] = el; }} type="file" accept="image/png,image/jpeg,image/webp" className="hidden"
                              onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) onPayment("upload", p, f); }} />
                            <button type="button" className={`${icon} text-[#2563eb]`} disabled={busy} onClick={() => onPayment("demo", p)} title="สร้างสลิป DEMO แล้วแนบทันที — อนุมัติอัตโนมัติ" aria-label="แนบสลิป DEMO"><Sparkles size={15} /></button>
                          </>
                        )}
                        <button type="button" className={`${icon} relative`} onClick={() => onPayment("hooks", p)} title="callback ที่ส่งไป webhook ของร้าน / ร้านตอบอะไรกลับมา" aria-label="Webhook ของรายการนี้"><Link2 size={15} />{hookDot(p.callbacks)}</button>
                        <button type="button" className={icon} disabled={busy} onClick={() => onPayment("check", p)} title="ตรวจสถานะ (GET /transactions/:ref)" aria-label="ตรวจสถานะ"><RotateCw size={15} /></button>
                        <button type="button" className={`${icon} text-danger hover:bg-danger/10 hover:text-danger`} disabled={busy || !open} onClick={() => onPayment("reject", p)} aria-label="ปฏิเสธรายการ"
                          title={open ? "ปฏิเสธ (PATCH /transactions/:ref/cancel) — ส่ง payment.rejected ไป webhook + Telegram" : del ? "ลบแล้ว" : `ปฏิเสธไม่ได้ — สถานะ ${PILL[st]?.[0] ?? st} (ปฏิเสธได้เฉพาะรายการที่รอชำระ)`}><X size={15} /></button>
                        <button type="button" className={`${icon} text-danger hover:bg-danger/10 hover:text-danger`} disabled={busy || !deletable} onClick={() => onPayment("delete", p)} aria-label="ลบรายการ"
                          title={deletable ? "ลบรายการ (ระบบหลังบ้าน) — ถ้ายังรอชำระจะถูกปฏิเสธก่อน (ส่ง payment.rejected)" : del ? "ลบแล้ว" : "ลบไม่ได้ — รายการที่อนุมัติแล้ว (หรือคืนเงินแล้ว) ลบไม่ได้"}><Trash2 size={15} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!pays.length && <tr><td colSpan={8} className="px-3 py-10 text-center text-soft">ยังไม่มีรายการเงินเข้าจากหน้านี้ — เริ่มที่ขั้นตอนที่ 1</td></tr>}
            </tbody>
          </table>
        ) : (
          <table className="w-full text-[13.5px]">
            <thead className="border-b border-line bg-surface-alt"><tr>
              <th className={th}>เลขที่รายการ / merchantRef</th><th className={th}>ผู้รับ</th>
              <th className={`${th} text-right`}>ยอด / ค่าธรรมเนียม</th><th className={th}>สถานะ</th><th className={th}>admin ดำเนินการ</th><th className={th}>สร้างเมื่อ</th><th className={`${th} text-right`}>จัดการ</th>
            </tr></thead>
            <tbody>
              {outs.map((o) => {
                const st = o.status.toLowerCase();
                // Like the console: an approved payout stays red until admin ดำเนินการ = yes (the team made the transfer), then green.
                const del = !!o.deletedAt;
                const rowCls = del ? "bg-slate-50 text-soft line-through decoration-slate-300" : st === "approved" ? (o.adminDone ? "bg-emerald-50" : "bg-red-50") : "";
                // Console rules: reject a pending payout, or an auto-approved one not yet transferred (refunds the shop);
                // delete a pending or rejected one.
                const rejectable = !del && (st === "pending" || (st === "approved" && !o.adminDone));
                const deletable = !del && (st === "pending" || st === "rejected");
                return (
                <tr key={o.ref} className={`border-b border-line/60 last:border-0 ${rowCls}`}>
                  <td className={`${td} whitespace-nowrap`}><div className="font-mono font-semibold">{o.ref}</div><div className="font-mono text-[11.5px] text-muted">{o.merchantRef ?? "—"}</div></td>
                  <td className={td}><div className="flex items-center gap-2"><BankChip code={o.receiverBankCode} /><div className="leading-tight"><div>{o.receiverName ?? "—"}</div><div className="text-[11.5px] tabular-nums text-muted">{o.receiverAccount}</div></div></div></td>
                  <td className={`${td} text-right tabular-nums whitespace-nowrap`}><div className="font-semibold">{fmtMoney(o.amount)}</div><div className="text-[11.5px] text-muted">{fmtMoney(o.fee)}</div></td>
                  <td className={`${td} no-underline`}>
                    {del && <><Badge className="bg-slate-200 text-slate-600">ลบแล้ว</Badge>{o.deleteReason && <div className="mt-1 max-w-[280px] text-[11.5px] leading-snug break-words whitespace-normal" title={o.deleteReason}>เหตุผล: {o.deleteReason}</div>}</>}
                    {!del && (st === "approved" && o.adminDone ? <Badge className="bg-emerald-100 text-emerald-800">ถอนสำเร็จ</Badge> : <Status status={o.status} kind="outflow" />)}
                    {!del && st === "approved" && !o.adminDone && o.completedAt && <div className="mt-1 text-[11.5px] text-warning">{o.source === "api" ? "อนุมัติอัตโนมัติ" : "อนุมัติแล้ว"} {fmtDateTime(o.completedAt)} · รอโอน</div>}
                    {!del && st === "approved" && o.adminDone && <div className="mt-1 text-[11.5px] text-success">✓ ถอนสำเร็จ {fmtDateTime(o.adminDoneAt ?? o.completedAt)}</div>}
                    {!del && st !== "approved" && o.note && <div className="mt-1 max-w-[280px] min-w-[180px] text-[11.5px] leading-snug break-words whitespace-normal text-soft" title={o.note}>{o.note}</div>}
                  </td>
                  <td className={`${td} no-underline`}>{del ? <span className="text-soft">—</span> : <AdminDone key={`${o.ref}-${o.adminDone}`} refId={o.ref} done={o.adminDone} onSaved={onRefresh} />}</td>
                  <td className={`${td} text-[12.5px] whitespace-nowrap text-muted`}>{fmtDateTime(o.createdAt)}</td>
                  <td className={td}>
                    <div className="flex flex-nowrap items-center justify-end gap-1.5">
                      <button type="button" className={`${icon} relative`} onClick={() => onPayout("hooks", o)} title="callback ที่ส่งไป webhook ของร้าน" aria-label="Webhook ของรายการนี้"><Link2 size={15} />{hookDot(o.callbacks)}</button>
                      <button type="button" className={icon} disabled={busy} onClick={() => onPayout("check", o)} title="ตรวจสถานะ (GET /payout/:id)" aria-label="ตรวจสถานะ"><RotateCw size={15} /></button>
                      <button type="button" className={`${icon} text-danger hover:bg-danger/10 hover:text-danger`} disabled={busy || !rejectable} onClick={() => onPayout("reject", o)} aria-label="ปฏิเสธรายการ"
                        title={rejectable ? "ปฏิเสธ — คืนยอด + ค่าธรรมเนียมให้ร้าน · ส่ง payout.failed ไป webhook + Telegram" : del ? "ลบแล้ว"
                          : st === "approved" ? "ปฏิเสธไม่ได้ — โอนเงินแล้ว (admin ดำเนินการ = yes) · ตั้งเป็น no ก่อนถ้ายังไม่ได้โอนจริง" : "ปฏิเสธแล้ว"}><X size={15} /></button>
                      <button type="button" className={`${icon} text-danger hover:bg-danger/10 hover:text-danger`} disabled={busy || !deletable} onClick={() => onPayout("delete", o)} aria-label="ลบรายการ"
                        title={deletable ? "ลบรายการ (ระบบหลังบ้าน) — ถ้ายังรอตรวจสอบจะถูกปฏิเสธก่อน (ส่ง payout.failed)" : del ? "ลบแล้ว" : "ลบไม่ได้ — payout ที่อนุมัติแล้วลบไม่ได้ · ปฏิเสธก่อน (ถ้ายังไม่ได้โอน) แล้วจึงลบ"}><Trash2 size={15} /></button>
                    </div>
                  </td>
                </tr>
                );
              })}
              {!outs.length && <tr><td colSpan={7} className="px-3 py-10 text-center text-soft">ยังไม่มีรายการเงินออกจากหน้านี้ — ลองขั้นตอนที่ 3</td></tr>}
            </tbody>
          </table>
        )}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 border-t border-line px-4 py-2.5 text-[11.5px] text-soft">
        <span className="inline-flex items-center gap-1"><Eye size={12} /> ดูสลิป</span>
        <span className="inline-flex items-center gap-1"><Upload size={12} /> แนบสลิปจริง (ตรวจสลิปตามปกติ)</span>
        <span className="inline-flex items-center gap-1 text-[#2563eb]"><Sparkles size={12} /> แนบสลิป DEMO (อนุมัติอัตโนมัติ)</span>
        <span className="inline-flex items-center gap-1"><Link2 size={12} /> callback ไป webhook ของร้าน</span>
        <span className="inline-flex items-center gap-1"><RotateCw size={12} /> ตรวจสถานะ</span>
        <span className="inline-flex items-center gap-1 text-danger"><X size={12} /> ปฏิเสธ (ส่ง webhook + Telegram)</span>
        <span className="inline-flex items-center gap-1 text-danger"><Trash2 size={12} /> ลบรายการ</span>
        <span>· อนุมัติ / ปฏิเสธ ทำได้เฉพาะผู้ดูแลในหน้า admin</span>
      </div>
    </section>
  );
}

/** วิธีใช้งาน (Thai), in the free space of the step 4 card. */
function DemoGuide() {
  const steps: [string, React.ReactNode][] = [
    ["สร้างรายการรับเงิน", <>ใส่ยอดเงิน แล้วกด <b>สร้างรายการรับเงิน</b> (ขั้นตอนที่ 1) — ได้เลขที่รายการ <code>TXN…</code> สถานะ <b>รอชำระ</b> (ยังไม่อนุมัติจนกว่าจะแนบสลิป)</>],
    ["แนบสลิป", <>ขั้นตอนที่ 2 ใส่เลขที่รายการให้อัตโนมัติ — เลือก <b>สลิปจริง</b> (ระบบตรวจกับธนาคาร ผ่านแล้วอนุมัติอัตโนมัติ) หรือกด <b>สร้างสลิป DEMO</b> (อนุมัติอัตโนมัติทันที) แล้วกด <b>แนบสลิป</b></>],
    ["ดูผลลัพธ์", <>เมื่ออนุมัติ ระบบส่ง callback <code>payment.approved</code> ไปยัง webhook ของร้าน และแจ้งเตือนในกลุ่ม Telegram — กดไอคอน <Link2 size={12} className="inline" /> ในรายการเงินเข้าเพื่อดูว่า webhook ตอบอะไรกลับมา</>],
    ["โอนเงินออก", <>ขั้นตอนที่ 3 ใส่ธนาคาร เลขบัญชี และชื่อผู้รับ — สถานะ <b>รอตรวจสอบ</b> จนกว่าทีมงานจะโอนเสร็จ แล้วระบบส่ง <code>payout.completed</code> / <code>payout.failed</code></>],
    ["ตรวจยอด", <>กด <b>ตรวจยอดคงเหลือ</b> (ขั้นตอนที่ 4) หรือดูกล่องยอดคงเหลือด้านบน ซึ่งอัปเดตทุกครั้งหลังทำรายการ</>],
  ];
  return (
    <div className="rounded-2xl border border-line bg-surface p-5 shadow-card">
      <h3 className="mb-3 text-[17px] font-bold">📖 วิธีใช้งานหน้า demo</h3>
      <ol className="grid gap-2.5 text-[13px] leading-relaxed">
        {steps.map(([t, d], i) => (
          <li key={t} className="flex gap-2.5">
            <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-primary text-[11px] font-bold text-primary-fg">{i + 1}</span>
            <span><b>{t}</b> — <span className="text-muted">{d}</span></span>
          </li>
        ))}
      </ol>
      <div className="mt-3 grid gap-1.5 border-t border-line pt-3 text-[12.5px] text-muted">
        <div>💻 ทุกปุ่มส่งคำสั่ง <code>curl</code> จริงไปยัง API — ดูคำสั่งและ JSON ที่ตอบกลับในหน้าต่าง Terminal และคัดลอกคำสั่งจากกล่องด้านล่างปุ่มได้</div>
        <div>🔁 คำสั่งที่ส่งแล้วใช้ซ้ำไม่ได้ (ลายเซ็นใช้ครั้งเดียว) — กด <b>เซ็นใหม่ (ไม่ส่ง)</b> เพื่อได้คำสั่งไปรันใน Terminal ของคุณเองภายใน 5 นาที</div>
        <div>📋 รายการเงินเข้า / เงินออก ด้านบนแสดงเฉพาะรายการจากหน้านี้ — ใช้ไอคอนในแต่ละแถวเพื่อดูสลิป แนบสลิป ตรวจสถานะ หรือยกเลิก</div>
        <div>🔒 ร้านทดลองเท่านั้น · อนุมัติ / ปฏิเสธด้วยมือทำได้เฉพาะผู้ดูแลในหน้า admin</div>
      </div>
    </div>
  );
}

/** ร้านค้า card: the shop's fee % for payments / payouts, editable (console rates rule — new transactions only). */
function FeeEditor({ fees, onSaved }: { fees: DemoFees; onSaved: () => void }) {
  const [pay, setPay] = useState(String(Number(fees.feePercent)));
  const [out, setOut] = useState(String(Number(fees.outFeePercent)));
  const [state, setState] = useState<{ busy?: boolean; ok?: boolean; error?: string }>({});
  const changed = Number(pay) !== Number(fees.feePercent) || Number(out) !== Number(fees.outFeePercent);
  const save = async () => {
    setState({ busy: true });
    const r = await demoSetFees(Number(pay), Number(out)).catch((e: unknown) => ({ ok: false, error: reloadIfStale(e) }));
    setState(r.ok ? { ok: true } : { error: r.error ?? "บันทึกไม่สำเร็จ" });
    if (r.ok) onSaved();
  };
  const box = (label: string, v: string, set: (x: string) => void, flat: string) => (
    <label className="block rounded-xl bg-surface-alt px-3 py-2.5">
      <span className="block text-[11.5px] text-muted">{label}</span>
      <span className="mt-1 flex items-center gap-1.5">
        <input inputMode="decimal" value={v} onChange={(e) => { set(e.target.value); setState({}); }} className={`${input} w-24 py-1.5 text-[17px] font-bold tabular-nums`} aria-label={label} />
        <span className="text-[17px] font-bold">%</span>
      </span>
      {Number(flat) > 0 && <span className="mt-0.5 block text-[11px] text-muted">+ ฿{baht(Number(flat))} ต่อรายการ</span>}
    </label>
  );
  return (
    <div className="mt-3">
      <div className="grid grid-cols-2 gap-3">
        {box("ค่าธรรมเนียมรับเงิน", pay, setPay, fees.feeFlat)}
        {box("ค่าธรรมเนียมโอนออก", out, setOut, fees.outFeeFlat)}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <button type="button" disabled={!changed || state.busy} onClick={save} className={`${btn.base} ${btn.sm} ${btn.primary}`}>
          {state.busy ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />} บันทึกค่าธรรมเนียม
        </button>
        {state.ok && <span className="text-[12px] text-success">บันทึกแล้ว — มีผลกับรายการใหม่</span>}
        {state.error && <span className="text-[12px] text-danger">{state.error}</span>}
        {!state.ok && !state.error && <span className="text-[11.5px] text-soft">0–10% · มีผลกับรายการใหม่ (ค่าธรรมเนียมรวมเพิ่มตามอัตราใหม่)</span>}
      </div>
    </div>
  );
}

/** Left panel: every callback of this page's orders — webhook POST (exact curl + answer) and the Telegram alert, with time. */
function CallbackLog({ items }: { items: DemoCallbackLog[] | null }) {
  const [open, setOpen] = useState<string | null>(null);
  return (
    <div className="rounded-2xl border border-line bg-surface shadow-card">
      <div className="border-b border-line px-4 py-3">
        <h3 className="text-[16px] font-bold">📡 สถานะการส่ง Webhook / Telegram</h3>
        <p className="mt-0.5 text-[11.5px] text-soft">ทุก callback ของรายการจากหน้านี้ — บันทึกเก็บไว้ถาวร · อัปเดตทุก 15 วินาที · กดรายการเพื่อดูคำสั่ง curl และคำตอบ</p>
      </div>
      <div className="grid gap-2 p-3">
        {!items && <p className="px-1 py-6 text-center text-[13px] text-soft">กำลังโหลด…</p>}
        {items && !items.length && <p className="px-1 py-6 text-center text-[13px] text-soft">ยังไม่มี callback — จะส่งเมื่อรายการถูกอนุมัติ / ปฏิเสธ / โอนเสร็จ</p>}
        {items?.map((c) => {
          const ok = c.statusCode != null && c.statusCode >= 200 && c.statusCode < 300;
          const isOpen = open === c.id;
          return (
            <div key={c.id} className={`rounded-xl border ${ok ? "border-emerald-200" : c.state === "pending" ? "border-amber-200" : "border-red-200"} bg-white`}>
              <button type="button" onClick={() => setOpen(isOpen ? null : c.id)} className="w-full px-3 py-2.5 text-left">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[12.5px] font-semibold">{c.event}</span>
                  <span className="font-mono text-[12px] text-muted">{c.ref}</span>
                  <span className="ml-auto text-[11px] whitespace-nowrap text-soft">{c.at ? fmtDateTime(c.at) : "—"}</span>
                </div>
                <div className="mt-1.5 flex flex-wrap gap-1.5 text-[11.5px]">
                  <span className={`rounded-full px-2 py-0.5 font-semibold ${ok ? "bg-emerald-100 text-emerald-800" : c.state === "pending" ? "bg-amber-100 text-amber-800" : "bg-red-100 text-red-700"}`}>
                    Webhook {ok ? "✔" : "✖"} HTTP {c.statusCode ?? "—"}{c.ms != null ? ` · ${c.ms} ms` : ""}{c.attempts > 1 ? ` · ${c.attempts} ครั้ง` : ""}
                  </span>
                  <span className={`rounded-full px-2 py-0.5 font-semibold ${c.telegramSent ? "bg-sky-100 text-sky-800" : c.telegramSent === 0 ? "bg-slate-100 text-slate-600" : "bg-slate-50 text-slate-400"}`}
                    title={c.telegramAt ? fmtDateTime(c.telegramAt) : undefined}>
                    Telegram {c.telegramSent ? `✔ ส่งแล้ว (${c.telegramSent} กลุ่ม)` : c.telegramSent === 0 ? "✖ ไม่ได้ส่ง (ยังไม่มีกลุ่ม / ส่งไม่สำเร็จ)" : "— ไม่มีบันทึก"}
                  </span>
                </div>
              </button>
              {isOpen && (
                <div className="border-t border-line px-3 py-2.5">
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-[11.5px] font-semibold text-muted">คำสั่ง curl ที่ใช้ส่งไป webhook{c.exact ? "" : " (รายการเก่า — body เรียงจากข้อมูลที่บันทึก)"}</span>
                    {c.curl && <CopyBtn text={c.curl} />}
                  </div>
                  <pre className="max-h-56 overflow-auto rounded-lg border border-line bg-surface-alt p-2 font-mono text-[11px] break-all whitespace-pre-wrap">{c.curl ?? "—"}</pre>
                  <div className="mt-2 mb-1 text-[11.5px] font-semibold text-muted">webhook ตอบกลับ</div>
                  <pre className="max-h-40 overflow-auto rounded-lg border border-line bg-surface-alt p-2 font-mono text-[11px] break-all whitespace-pre-wrap">{c.response ?? c.error ?? "—"}</pre>
                  <div className="mt-2 text-[11px] text-soft">
                    ส่งเมื่อ {c.at ? fmtDateTime(c.at) : "—"} · Telegram {c.telegramAt ? fmtDateTime(c.telegramAt) : "—"}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CallbacksModal({ title, items, onClose }: { title: string; items: DemoCallback[]; onClose: () => void }) {
  return (
    <Modal title={title} onClose={onClose} width={720}>
      {!items.length ? (
        <p className="text-muted">ยังไม่มี callback สำหรับรายการนี้ — ระบบส่งเมื่อสถานะเปลี่ยน (อนุมัติ / ปฏิเสธ / โอนเสร็จ / ไม่สำเร็จ)</p>
      ) : (
        <div className="grid gap-3">
          {items.map((c, i) => {
            const ok = c.statusCode != null && c.statusCode >= 200 && c.statusCode < 300;
            return (
              <div key={i} className="rounded-lg border border-line p-3">
                <div className="flex flex-wrap items-center gap-2 text-[13px]">
                  <span className="rounded bg-blue-100 px-1.5 py-0.5 font-mono text-[12px] font-bold text-[#2563eb]">POST</span>
                  <span className="font-mono font-semibold">{c.event}</span>
                  <span className={`font-semibold ${ok ? "text-success" : "text-danger"}`}>HTTP {c.statusCode ?? "—"}</span>
                  <span className="text-muted">· ส่ง {c.attempts} ครั้ง · {c.state ?? ""}</span>
                  <span className="ml-auto text-[12px] text-muted">{c.at ? fmtDateTime(c.at) : "—"}</span>
                </div>
                <div className="mt-2 text-[11.5px] font-semibold text-muted">webhook ของร้านค้าตอบกลับ</div>
                <pre className="mt-1 rounded-md bg-[#0c0c0c] p-2.5 font-mono text-[12px] break-all whitespace-pre-wrap text-[#fcd34d]">{c.response ?? c.error ?? "—"}</pre>
              </div>
            );
          })}
        </div>
      )}
    </Modal>
  );
}

export function DemoConsole({ logo, shop, banks, firstIds }: { logo: React.ReactNode; shop: Shop; banks: { code: string; name: string }[]; firstIds: { orderId: string; merchantRef: string } }) {
  const [balance, setBalance] = useState<Balance>(null);
  const [balanceAt, setBalanceAt] = useState<string>("");
  const [calls, setCalls] = useState<Partial<Record<StepKey, DemoCall>>>({});
  const [fresh, setFresh] = useState<Partial<Record<StepKey, DemoCall>>>({});
  const [busy, setBusy] = useState<StepKey | null>(null);
  const [popup, setPopup] = useState<{ step: StepKey; title: string; call: DemoCall | null; error: string | null } | null>(null);

  const [pay, setPay] = useState<{ amount: string; orderId: string; description: string; memberName: string; api: "v1" | "v2"; redirectUrl: string }>(
    { amount: "100", orderId: firstIds.orderId, description: "สินค้าทดลอง", memberName: "", api: "v2", redirectUrl: "https://example.com/deposit/done" });
  const [slipRef, setSlipRef] = useState("");
  const [slip, setSlip] = useState<File | null>(null);
  const [out, setOut] = useState<{ amount: string; bankCode: string; accountNumber: string; accountName: string; merchantRef: string; description: string; api: "v1" | "v2" }>(
    { amount: "10", bankCode: "SCB", accountNumber: "", accountName: "", merchantRef: firstIds.merchantRef, description: "ทดลองโอนออก", api: "v2" });
  const [checkout, setCheckout] = useState<{ url: string; account: string } | null>(null);
  // Receiving account from the payment/create response (selectedAccount) — shown at the bottom of the step 1 card.
  const [payTo, setPayTo] = useState<{ ref: string; bankCode: string; bankName: string; accountNumber: string; accountName: string } | null>(null);
  const [order, setOrder] = useState<SampleSlip | null>(null);
  const [slipPreview, setSlipPreview] = useState<string | null>(null);
  const pickSlip = (f: File | null) => { setSlip(f); setSlipPreview(f ? URL.createObjectURL(f) : null); };
  const [demoSlipUrl, setDemoSlipUrl] = useState<{ ref: string; url: string } | null>(null);
  const [localSlips, setLocalSlips] = useState<Record<string, string>>({});
  const [viewSlip, setViewSlip] = useState<{ ref: string; url: string | null } | null>(null);
  const [hooks, setHooks] = useState<{ ref: string; items: DemoCallback[] } | null>(null);
  // Reject / delete dialog (reason is required by the console for deletes and payout rejects).
  const [confirm, setConfirm] = useState<{ act: "reject" | "delete"; kind: "payment" | "payout"; ref: string; open: boolean } | null>(null);
  const [reason, setReason] = useState("");
  const [notice, setNotice] = useState<{ title: string; ok: boolean; text: string } | null>(null);

  /** DEMO slip (signed QR) for one of this page's open orders: uploading it approves the order automatically. */
  async function makeDemoSlip(ref: string): Promise<File | null> {
    const d = await demoSlipData(ref).catch((err: unknown) => ({ ok: false as const, error: reloadIfStale(err) }));
    if (!d.ok) { setPopup({ step: "row", title: "สร้างสลิป DEMO", call: null, error: d.error }); return null; }
    const info: SampleSlip = order && order.ref === d.ref ? order
      : { ref: d.ref, amount: d.amount, customerName: d.customerName, bankName: d.bankCode ?? "", accountName: shop?.slug ?? null, accountNo: d.accountNo };
    const cv = await renderSampleSlip({ ...info, amount: d.amount }, d.qr);
    const blob = await new Promise<Blob | null>((res) => cv.toBlob(res, "image/png"));
    return blob ? new File([blob], `demo-slip-${d.ref}.png`, { type: "image/png" }) : null;
  }
  async function demoSlipForStep(ref: string) {
    if (!/^TXN\d+$/i.test(ref.trim())) return setPopup({ step: "slip", title: "สร้างสลิป DEMO", call: null, error: "สร้างรายการรับเงินในขั้นตอนที่ 1 ก่อน (ต้องมีเลขที่รายการ)" });
    const f = await makeDemoSlip(ref.trim().toUpperCase());
    if (!f) return;
    pickSlip(f);
    setSlipRef(ref.trim().toUpperCase());
    setDemoSlipUrl({ ref: ref.trim().toUpperCase(), url: URL.createObjectURL(f) });
  }

  // Last change of the balance, so a payout's deduction (at creation) or an approval's credit is visible at a glance.
  const [delta, setDelta] = useState<{ amount: number; at: string } | null>(null);
  const readBalance = (c: DemoCall) => {
    const j = c.json as { balance?: number; availableBalance?: number; reserved?: number } | null;
    if (c.ok && j && typeof j.balance === "number") {
      const nb = j.balance;
      setBalance((prev) => {
        if (prev && Math.abs(prev.balance - nb) >= 0.005) setDelta({ amount: Math.round((nb - prev.balance) * 100) / 100, at: new Date().toLocaleTimeString("th-TH") });
        return { balance: nb, availableBalance: j.availableBalance ?? 0, reserved: j.reserved ?? 0 };
      });
      setBalanceAt(new Date().toLocaleTimeString("th-TH"));
    }
  };
  const [fees, setFees] = useState<DemoFees | null>(null);
  // Balance and fee totals move together: both are read whenever the balance is.
  const quietBalance = () => {
    demoShopFees().then((f) => { if (f) setFees(f); }).catch(reloadIfStale);
    return demoBalance().then((r) => r.ok && readBalance(r.call)).catch(reloadIfStale);
  };
  const [lists, setLists] = useState<{ payments: DemoPayment[]; payouts: DemoPayout[] } | null>(null);
  const [cbLog, setCbLog] = useState<DemoCallbackLog[] | null>(null);
  const [tab, setTab] = useState<"in" | "out">("in");
  const [listLoading, setListLoading] = useState(false);
  const loadLists = () => {
    setListLoading(true);
    quietBalance();
    demoCallbacks().then((c) => { if (c) setCbLog(c); }).catch(reloadIfStale);
    demoLists().then((l) => { if (l) setLists(l); }).catch(reloadIfStale).finally(() => setListLoading(false));
  };
  useEffect(() => {
    if (!shop) return;
    // The balance is polled with the lists: payouts, approvals and refunds made anywhere (admin console, other visitors) show up.
    const pull = () => { quietBalance(); demoLists().then((l) => { if (l) setLists(l); }).catch(reloadIfStale); demoCallbacks().then((c) => { if (c) setCbLog(c); }).catch(reloadIfStale); };
    pull();
    const id = setInterval(pull, 15_000);
    return () => clearInterval(id);
  }, [shop]); // eslint-disable-line react-hooks/exhaustive-deps

  async function run(step: StepKey, title: string, fn: () => Promise<DemoResult>, after?: (c: DemoCall) => void, opts: { admin?: boolean } = {}) {
    setBusy(step);
    // Admin-side actions show only their result dialog — no terminal (there is no curl for them).
    if (!opts.admin) setPopup({ step, title, call: null, error: null });
    const r = await fn().catch((e: unknown) => ({ ok: false as const, error: reloadIfStale(e) }));
    setBusy(null);
    if (!r.ok) return opts.admin ? setNotice({ title, ok: false, text: r.error }) : setPopup({ step, title, call: null, error: r.error });
    // Admin-side actions (delete, payout reject) have no merchant API — a plain result dialog instead of the terminal.
    if (r.call.admin) {
      setPopup(null);
      const msg = (r.call.json?.error as { message?: string } | undefined)?.message ?? (typeof r.call.json?.message === "string" ? r.call.json.message : null);
      setNotice({ title, ok: r.call.ok, text: r.call.ok ? `${title} เรียบร้อยแล้ว` : msg ?? `ไม่สำเร็จ (HTTP ${r.call.status})` });
      loadLists(); quietBalance(); setTimeout(loadLists, 4000);
      return;
    }
    setCalls((c) => ({ ...c, [step]: r.call }));
    setFresh((f) => ({ ...f, [step]: undefined }));
    setPopup({ step, title, call: r.call, error: null });
    after?.(r.call);
    if (step !== "balance") { quietBalance(); loadLists(); }
    if (step === "payout") setTab("out");
    if (step === "payment" || step === "slip") setTab("in");
    // Callbacks go out right after a status change: refresh the list again shortly so they show up.
    if (step !== "balance") setTimeout(loadLists, 4000);
  }

  /** Sign without sending: puts a ready-to-run curl in the step's box. */
  async function signOnly(step: StepKey, fn: () => Promise<DemoResult>) {
    setBusy(step);
    const r = await fn().catch((e: unknown) => ({ ok: false as const, error: reloadIfStale(e) }));
    setBusy(null);
    if (!r.ok) return setPopup({ step, title: "เซ็นคำสั่งใหม่", call: null, error: r.error });
    setFresh((f) => ({ ...f, [step]: r.call }));
  }
  const slipData = (f: File) => new Promise<string>((res, rej) => { const fr = new FileReader(); fr.onload = () => res(String(fr.result).split(",")[1] ?? ""); fr.onerror = () => rej(fr.error); fr.readAsDataURL(f); });
  const noSlip = () => setPopup({ step: "slip", title: "แนบสลิป", call: null, error: "กรุณาเลือกรูปสลิปก่อน" });

  // orderId / merchantRef already used: tell the visitor, put a new one in the box, and let them send again with it.
  const [dup, setDup] = useState<{ kind: "payment" | "payout"; old: string; next: string } | null>(null);
  const isDup = (c: DemoCall, code: string) => !c.ok && (c.json?.error as { code?: string } | undefined)?.code === code;

  const createPayment = (override?: string) => {
    const f = override ? { ...pay, orderId: override } : pay;
    return run("payment", "สร้างรายการรับเงิน", () => demoCreatePayment(f), (c) => {
      if (isDup(c, "DUPLICATE_ORDER_ID")) {
        const next = newId("DEMO");
        setPay((p) => ({ ...p, orderId: next }));
        setPopup(null);
        return setDup({ kind: "payment", old: f.orderId, next });
      }
      const t = (c.json as { transaction?: { ref?: string; checkoutUrl?: string; amount?: number }; selectedAccount?: { bankCode?: string; bankName?: string; accountNumber?: string; accountName?: string } } | null);
      if (c.ok && t?.transaction?.ref) {
        setSlipRef(t.transaction.ref);
        const a = t.selectedAccount;
        setOrder({ ref: t.transaction.ref, amount: Number(t.transaction.amount ?? pay.amount), customerName: pay.memberName || null, bankName: a?.bankName ?? "", accountName: a?.accountName ?? null, accountNo: a?.accountNumber ?? null });
        pickSlip(null);
        setCheckout({ url: t.transaction.checkoutUrl ?? "", account: a ? `${a.bankCode} ${a.accountNumber} · ${a.accountName}` : "" });
        setPayTo(a ? { ref: t.transaction.ref, bankCode: a.bankCode ?? "", bankName: a.bankName ?? "", accountNumber: a.accountNumber ?? "", accountName: a.accountName ?? "" } : null);
        setPay((p) => ({ ...p, orderId: newId("DEMO") }));
      }
    });
  };

  // สร้างหลายรายการ: N orders in one click (amount + description from the card, a unique orderId each).
  const [bulkN, setBulkN] = useState("10");
  // The orders of the last สร้างหลายรายการ — step 2 can put a DEMO slip on all of them at once.
  const [bulkRefs, setBulkRefs] = useState<string[]>([]);
  const [slipTarget, setSlipTarget] = useState<"one" | "bulk">("one");
  const [bulkSlips, setBulkSlips] = useState<{ ref: string; file: File }[]>([]);
  const [bulkPrep, setBulkPrep] = useState<string | null>(null);
  const createBulk = () => {
    const n = Math.floor(Number(bulkN));
    if (!(n >= 1 && n <= 100)) return setPopup({ step: "payment", title: "สร้างหลายรายการ", call: null, error: "ใส่จำนวน 1 – 100 รายการ" });
    run("payment", `สร้างหลายรายการ (${n} รายการ)`, () => demoCreatePaymentsBulk(pay, n), (c) => {
      setCheckout(null); setPayTo(null);
      const refs = ((c.json?.refs as string[] | undefined) ?? []).map((x) => x.split(" ")[0]).filter((x) => /^TXN\d+$/.test(x));
      if (refs.length) { setBulkRefs(refs); setSlipTarget("bulk"); setBulkSlips([]); setSlipRef(refs[0]); }
    });
  };

  /** ใช้สลิป DEMO for every order of the last bulk create: a signed DEMO slip each (rendered here, like the single one). */
  async function prepareBulkDemoSlips() {
    setBulkPrep(`กำลังสร้างสลิป DEMO 0 / ${bulkRefs.length}…`);
    const d = await demoSlipDataMany(bulkRefs).catch((err: unknown) => ({ ok: false as const, error: reloadIfStale(err) }));
    if (!d.ok) { setBulkPrep(null); return setPopup({ step: "slip", title: "สร้างสลิป DEMO", call: null, error: d.error }); }
    const out: { ref: string; file: File }[] = [];
    for (const it of d.items) {
      const cv = await renderSampleSlip({ ref: it.ref, amount: it.amount, customerName: it.customerName, bankName: it.bankCode ?? "", accountName: shop?.slug ?? null, accountNo: it.accountNo }, it.qr);
      const blob = await new Promise<Blob | null>((res) => cv.toBlob(res, "image/png"));
      if (blob) out.push({ ref: it.ref, file: new File([blob], `demo-slip-${it.ref}.png`, { type: "image/png" }) });
      setBulkPrep(`กำลังสร้างสลิป DEMO ${out.length} / ${d.items.length}…`);
    }
    setBulkSlips(out);
    setBulkPrep(d.skipped.length ? `ข้าม ${d.skipped.length} รายการ: ${d.skipped.map((x) => `${x.ref} (${x.why})`).join(", ")}` : null);
  }

  /** แนบสลิป for all prepared DEMO slips: 10 real, signed calls at a time; one combined terminal result + every curl. */
  async function uploadBulkSlips() {
    const list = bulkSlips;
    if (!list.length) return setPopup({ step: "slip", title: "แนบสลิปหลายรายการ", call: null, error: "กด “ใช้สลิป DEMO” ก่อน เพื่อสร้างสลิปของทุกรายการ" });
    const title = `แนบสลิปหลายรายการ (${list.length} รายการ)`;
    setBusy("slip");
    setPopup({ step: "slip", title, call: null, error: null });
    const started = nowMs();
    const all: { ref: string; call: DemoCall | null; error: string | null }[] = [];
    for (let i = 0; i < list.length; i += 10) {
      const part = await Promise.all(list.slice(i, i + 10).map(async (x) => ({ ref: x.ref, mime: x.file.type, data: await slipData(x.file) })));
      const r = await demoUploadSlipsBatch(part).catch((err: unknown) => ({ ok: false as const, error: reloadIfStale(err) }));
      if (!r.ok) { all.push(...part.map((x) => ({ ref: x.ref, call: null, error: r.error }))); continue; }
      all.push(...r.results);
    }
    list.forEach((x) => remember(x.ref, x.file));
    const result = (c: DemoCall | null) => (c?.json?.result as string | undefined) ?? null;
    const approved = all.filter((x) => result(x.call) === "PAID");
    const summary = {
      success: approved.length === all.length,
      requested: all.length,
      approved: approved.length,
      failed: all.length - approved.length,
      totalMs: nowMs() - started,
      results: all.map((x) => `${x.ref}: ${x.error ?? `${result(x.call) ?? "-"} (HTTP ${x.call?.status ?? 0})`}`),
    };
    const first = all.find((x) => x.call)?.call;
    const call: DemoCall = {
      ok: approved.length > 0,
      status: approved.length === all.length ? 200 : approved.length ? 207 : first?.status ?? 0,
      ms: summary.totalMs,
      curl: all.map((x, i) => `# ${i + 1}/${all.length} · ${x.ref}\n${x.call?.curl ?? `# ส่งไม่ได้: ${x.error}`}`).join("\n\n"),
      curlShort: `${first?.curlShort ?? ""}\n\n# … และอีก ${all.length - 1} คำสั่ง (ref ต่างกัน) — ส่งพร้อมกันครั้งละ 10 · คำสั่งทั้งหมดอยู่ในกล่องใต้ปุ่ม`,
      response: JSON.stringify(summary, null, 2),
      json: summary,
    };
    setBusy(null);
    setCalls((c) => ({ ...c, slip: call }));
    setFresh((f) => ({ ...f, slip: undefined }));
    setPopup({ step: "slip", title, call, error: null });
    setBulkSlips([]);
    quietBalance(); loadLists(); setTab("in"); setTimeout(loadLists, 4000);
  }

  const remember = (ref: string, f: File) => setLocalSlips((m) => ({ ...m, [ref.trim().toUpperCase()]: URL.createObjectURL(f) }));
  const uploadSlip = () => {
    if (slipTarget === "bulk" && bulkRefs.length) return uploadBulkSlips();
    if (!slip) return noSlip();
    remember(slipRef, slip);
    run("slip", "แนบสลิป", async () => demoUploadSlip(slipRef, { mime: slip.type, data: await slipData(slip) }));
  };

  /** Row icons of รายการเงินเข้า — each one runs its own signed API call in the terminal. */
  async function onPayment(a: RowAct, p: DemoPayment, file?: File) {
    if (a === "view") return setViewSlip({ ref: p.ref, url: localSlips[p.ref] ?? `/demo/slip/${p.ref}?v=${encodeURIComponent(p.slipAt ?? "")}` });
    if (a === "hooks") return setHooks({ ref: p.ref, items: p.callbacks });
    if (a === "check") return run("row", `ตรวจสถานะ ${p.ref}`, () => demoCheckPayment(p.ref));
    if (a === "reject" || a === "delete") { setReason(""); return setConfirm({ act: a, kind: "payment", ref: p.ref, open: ["pending", "expired"].includes(p.status.toLowerCase()) }); }
    const f = a === "demo" ? await makeDemoSlip(p.ref) : file;
    if (!f) return;
    remember(p.ref, f);
    run("row", `${a === "demo" ? "แนบสลิป DEMO" : "แนบสลิป"} ${p.ref}`, async () => demoUploadSlip(p.ref, { mime: f.type, data: await slipData(f) }));
  }
  const onPayout = (a: PayoutAct, o: DemoPayout) => {
    if (a === "hooks") return setHooks({ ref: o.ref, items: o.callbacks });
    if (a === "check") return run("row", `ตรวจสถานะ ${o.ref}`, () => demoCheckPayout(o.ref));
    setReason("");
    setConfirm({ act: a, kind: "payout", ref: o.ref, open: o.status.toLowerCase() === "pending" || (o.status.toLowerCase() === "approved" && !o.adminDone) });
  };
  /** Runs the confirmed reject / delete in the terminal; the callback (webhook + Telegram) shows up in the log after it. */
  const doConfirm = () => {
    if (!confirm) return;
    const { act, kind, ref } = confirm;
    const why = reason.trim();
    setConfirm(null);
    if (act === "reject" && kind === "payment") return run("row", `ปฏิเสธ ${ref}`, () => demoCancelPayment(ref));
    if (act === "reject") return run("row", `ปฏิเสธ ${ref}`, () => demoRejectPayout(ref, why), undefined, { admin: true });
    run("row", `ลบ ${ref}`, () => demoDelete(kind, ref, why), undefined, { admin: true });
  };

  const createPayout = (override?: string) => {
    const f = override ? { ...out, merchantRef: override } : out;
    return run("payout", "สร้างรายการโอนออก", () => demoCreatePayout(f), (c) => {
      if (isDup(c, "DUPLICATE_MERCHANT_REF")) {
        const next = newId("PO-DEMO");
        setOut((o) => ({ ...o, merchantRef: next }));
        setPopup(null);
        return setDup({ kind: "payout", old: f.merchantRef, next });
      }
      if (c.ok) setOut((o) => ({ ...o, merchantRef: newId("PO-DEMO") }));
    });
  };

  const checkBalance = () => run("balance", "ตรวจยอดคงเหลือ", demoBalance, readBalance);

  const b = busy !== null;
  return (
    <div className="demo-light relative min-h-screen bg-bg text-ink">
      <div aria-hidden className="demo-watermark pointer-events-none fixed inset-0 z-20" />
      <header className="sticky top-0 z-30 border-b border-line bg-surface/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1920px] items-center gap-3 px-5 py-3">
          <div className="rounded-xl bg-[#0c0c0f] px-3 py-1.5">{logo}</div>
          <span className="rounded-full bg-primary-50 px-2.5 py-0.5 text-[12px] font-bold text-primary">API Demo</span>
          <span className="ml-auto text-[12.5px] text-muted">ไม่ต้องเข้าสู่ระบบ</span>
        </div>
      </header>

      <main className="mx-auto grid max-w-[1920px] gap-5 px-5 py-6 xl:grid-cols-[340px_minmax(0,1fr)_320px]">
        <aside className="order-2 xl:sticky xl:top-[76px] xl:order-none xl:max-h-[calc(100vh-92px)] xl:self-start xl:overflow-y-auto">
          <CallbackLog items={cbLog} />
        </aside>
       <div className="min-w-0">
        <h1 className="text-[26px] font-bold">ทดลองเรียก API ของ Option Pay</h1>
        <p className="mt-1 max-w-[820px] text-[14.5px] text-muted">
          กดปุ่มแต่ละขั้นตอน — ระบบจะสร้างคำสั่ง <code className="text-ink">curl</code> ที่เซ็นลายเซ็นแล้ว ส่งไปยัง API จริง และแสดงผลลัพธ์ในหน้าต่าง Terminal
          ทุกรายการเกิดขึ้นจริงกับร้านทดลอง (มี callback ไปยัง webhook ของร้านและแจ้งเตือน Telegram ตามปกติ)
        </p>

        {/* Shop + balance */}
        <div className="mt-5 grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]">
          <div className="rounded-2xl border border-line bg-surface p-5 shadow-card">
            <Field label="ร้านค้า" hint="หน้า demo เลือกได้เฉพาะร้านทดลอง">
              <div className="relative">
                <Store size={16} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted" />
                <select className={`${input} pl-9`} value={shop?.slug ?? ""} onChange={() => {}} disabled={!shop}>
                  {shop ? <option value={shop.slug}>{shop.slug}</option> : <option value="">— ยังไม่มีร้านทดลอง —</option>}
                </select>
              </div>
            </Field>
            {fees && <FeeEditor fees={fees} onSaved={() => quietBalance()} />}
          </div>
          <div className="rounded-2xl border border-line bg-surface p-5 shadow-card">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-[12.5px] font-semibold text-muted"><Wallet size={15} /> ยอดคงเหลือของร้าน (อ่านอย่างเดียว)</span>
              <button type="button" onClick={() => quietBalance()} className="inline-flex items-center gap-1 text-[12px] text-muted hover:text-ink" aria-label="รีเฟรชยอด"><RefreshCw size={13} /> {balanceAt ? `อัปเดต ${balanceAt}` : "รีเฟรช"}</button>
            </div>
            <div className="mt-2 grid grid-cols-3 gap-3">
              {([["ยอดคงเหลือ", balance?.balance, "text-primary text-[26px]"], ["ใช้ได้", balance?.availableBalance, "text-success text-[20px]"], ["กันไว้ (รอโอนออก)", balance?.reserved, "text-warning text-[20px]"]] as const).map(([l, v, cls]) => (
                <div key={l} className="rounded-xl bg-surface-alt px-3 py-2.5">
                  <div className="text-[11.5px] text-muted">{l}</div>
                  <div className={`font-bold tabular-nums ${cls}`}>{balance ? `฿${baht(v)}` : "—"}</div>
                </div>
              ))}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3">
              {([["ค่าธรรมเนียมรับเงินรวม", fees?.paymentFeeTotal, fees?.paymentCount, "รับเงินที่อนุมัติ"], ["ค่าธรรมเนียมโอนออกรวม", fees?.payoutFeeTotal, fees?.payoutCount, "โอนออกที่อนุมัติ"]] as const).map(([l, v, n, what]) => (
                <div key={l} className="rounded-xl border border-line px-3 py-2">
                  <div className="text-[11.5px] text-muted">{l}</div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-[17px] font-bold tabular-nums">{fees ? `฿${baht(Number(v))}` : "—"}</span>
                    {fees && <span className="text-[11.5px] text-soft">จาก{what} {n} รายการ</span>}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-[11.5px] text-soft">
              {delta && (
                <span className={`rounded-full px-2 py-0.5 font-semibold ${delta.amount < 0 ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-800"}`}>
                  ล่าสุด {delta.amount > 0 ? "+" : "−"}฿{baht(Math.abs(delta.amount))} · {delta.at}
                </span>
              )}
              <span>ยอดคงเหลือ = รับเงินที่อนุมัติ (หักค่าธรรมเนียม) − โอนออกที่อนุมัติ (รวมค่าธรรมเนียม) · โอนออกหักยอดทันทีที่สร้าง (อนุมัติอัตโนมัติ) — admin ดำเนินการ = yes เป็นแค่การบันทึกว่าโอนเงินให้ผู้รับแล้ว ไม่หักซ้ำ</span>
            </div>
          </div>
        </div>

        {!shop && <div className="mt-5 rounded-xl border border-danger/40 bg-danger/10 p-4 text-danger">ยังเปิดใช้หน้า demo ไม่ได้ — ไม่พบร้านทดลอง</div>}

        <DemoLists lists={lists} tab={tab} setTab={setTab} loading={listLoading} onRefresh={loadLists} busy={b}
          onPayment={onPayment} onPayout={onPayout} />

        <div className="mt-5 grid gap-5 2xl:grid-cols-2">
          <StepCard n={1} icon={<CreditCard size={18} />} title="สร้างรายการรับเงิน" method="POST" path={pay.api === "v2" ? "/api/v2/payment/create" : "/api/v1/payment/create"}
            desc="สร้างออเดอร์ให้ลูกค้าโอนเงิน — ได้เลขที่รายการ (ref) บัญชีรับเงิน และลิงก์หน้าชำระเงิน"
            button="สร้างรายการรับเงิน" busy={busy === "payment"} onRun={() => createPayment()}
            after={payTo && (
              <div className="mt-4 rounded-xl border-2 border-primary/40 bg-primary-50 p-4">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-[13px] font-bold">บัญชีรับเงินของรายการ <span className="font-mono">{payTo.ref}</span></span>
                  <span className="text-[11px] text-soft">จาก JSON: selectedAccount</span>
                </div>
                <div className="flex items-center gap-3">
                  {payTo.bankCode && <BankChip code={payTo.bankCode} />}
                  <dl className="grid flex-1 grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-[13.5px]">
                    <dt className="text-muted">ธนาคาร</dt><dd className="font-semibold">{payTo.bankName || payTo.bankCode}</dd>
                    <dt className="text-muted">เลขบัญชี</dt><dd className="flex items-center gap-2 font-mono font-semibold">{payTo.accountNumber}<CopyBtn text={payTo.accountNumber} /></dd>
                    <dt className="text-muted">ชื่อบัญชี</dt><dd className="font-semibold">{payTo.accountName}</dd>
                  </dl>
                </div>
              </div>
            )} call={calls.payment ?? null} fresh={fresh.payment ?? null} onFresh={() => signOnly("payment", () => demoCreatePayment(pay, true))}
            extra={<>
              <div className="mt-3 flex flex-wrap items-end gap-2 rounded-lg border border-dashed border-line p-3">
                <label className="block">
                  <span className="mb-1 block text-[12.5px] font-semibold text-muted">สร้างหลายรายการพร้อมกัน (จำนวน)</span>
                  <input className={`${input} w-28 tabular-nums`} inputMode="numeric" value={bulkN} onChange={(e) => setBulkN(e.target.value.replace(/\D/g, "").slice(0, 3))} aria-label="จำนวนรายการ" />
                </label>
                <button type="button" disabled={busy !== null} onClick={createBulk}
                  className={`${btn.base} ${btn.md} border-primary bg-primary-50 text-ink hover:bg-primary/25`}>
                  {busy === "payment" ? <Loader2 size={15} className="animate-spin" /> : <Terminal size={15} />} สร้างหลายรายการ
                </button>
                <span className="w-full text-[11.5px] text-soft">ใช้ยอดเงินและรายละเอียดจากช่องด้านบน · orderId ไม่ซ้ำกันทุกรายการ · ครั้งละ 1–100 รายการ (ไม่เกิน 3 ครั้ง / 10 นาที) · คำสั่ง curl ทั้งหมดอยู่ในกล่องด้านล่าง</span>
              </div>
              {checkout && (
              <div className="mt-3 rounded-lg border border-line bg-surface-alt p-3 text-[13px]">
                <div><span className="text-muted">เลขที่รายการ:</span> <b className="font-mono">{slipRef}</b> <span className="text-soft">(ใส่ให้ในขั้นตอนที่ 2 แล้ว)</span></div>
                {checkout.account && <div><span className="text-muted">โอนเข้าบัญชี:</span> {checkout.account}</div>}
                {checkout.url && <a href={checkout.url} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-primary hover:underline">เปิดหน้าชำระเงินของลูกค้า <ExternalLink size={13} /></a>}
                <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-line pt-3">
                  <button type="button" onClick={() => demoSlipForStep(slipRef)} className={`${btn.base} ${btn.sm} border-[#3b82f6] bg-[#3b82f6] text-white hover:bg-[#2563eb]`}>
                    <Sparkles size={14} /> สร้างสลิป DEMO (อนุมัติอัตโนมัติ)
                  </button>
                  {demoSlipUrl?.ref === slipRef && (
                    <a href={demoSlipUrl.url} download={`demo-slip-${demoSlipUrl.ref}.png`} className={`${btn.base} ${btn.sm} ${btn.ghost}`}><Download size={14} /> ดาวน์โหลดสลิป</a>
                  )}
                  <span className="text-[11.5px] text-soft">สลิป DEMO ถูกใส่ในขั้นตอนที่ 2 แล้ว — กด “แนบสลิป” เพื่อส่ง · สลิปจริงตรวจกับธนาคารตามปกติ</span>
                </div>
              </div>
              )}
            </>}>
            <Field label="API endpoint" hint={pay.api === "v2" ? "v2 = เหมือน v1 + redirect_url (พาลูกค้ากลับหน้าร้านเมื่อชำระสำเร็จ / QR หมดอายุ)" : "v1 = endpoint เดิม (ไม่มี redirect_url)"}>
              <select className={`${input} font-mono`} value={pay.api} onChange={(e) => setPay({ ...pay, api: e.target.value as "v1" | "v2" })} aria-label="API endpoint">
                <option value="v1">POST /api/v1/payment/create</option>
                <option value="v2">POST /api/v2/payment/create</option>
              </select>
            </Field>
            <Field label="redirect_url (ไม่บังคับ · ต้องขึ้นต้นด้วย https://)" hint={pay.api === "v2" ? "ลูกค้าจะถูกพากลับมาที่ลิงก์นี้หลังชำระสำเร็จ หรือเมื่อ QR หมดอายุ (3 วินาที)" : "ใช้ได้กับ v2 เท่านั้น — เลือก POST /api/v2/payment/create ด้านบนเพื่อใส่ redirect_url"}>
              <input className={`${input} font-mono disabled:opacity-50`} disabled={pay.api !== "v2"} value={pay.redirectUrl} placeholder="https://your-site.com/deposit/done" onChange={(e) => setPay({ ...pay, redirectUrl: e.target.value })} aria-label="redirect_url" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="ยอดเงิน (บาท) *" hint={fees && Number(pay.amount) > 0 ? `ค่าธรรมเนียม ${Number(fees.feePercent)}% = ฿${baht(feeOf(Number(pay.amount), fees.feePercent, fees.feeFlat))} · ร้านได้ ฿${baht(Number(pay.amount) - feeOf(Number(pay.amount), fees.feePercent, fees.feeFlat))}` : undefined}>
                <input className={input} inputMode="decimal" value={pay.amount} onChange={(e) => setPay({ ...pay, amount: e.target.value })} /></Field>
              <Field label="orderId (เลขออเดอร์ของร้าน)"><input className={`${input} font-mono`} value={pay.orderId} onChange={(e) => setPay({ ...pay, orderId: e.target.value })} /></Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="รายละเอียด"><input className={input} value={pay.description} onChange={(e) => setPay({ ...pay, description: e.target.value })} /></Field>
              <Field label="ชื่อผู้โอน (ไม่บังคับ)"><input className={input} value={pay.memberName} placeholder="เช่น สมชาย ใจดี" onChange={(e) => setPay({ ...pay, memberName: e.target.value })} /></Field>
            </div>
          </StepCard>

          <StepCard n={2} icon={<Upload size={18} />} title="แนบสลิป" method="POST" path={`/api/v1/payment/${slipRef || ":ref"}/slip`}
            desc="ส่งรูปสลิปการโอนของรายการที่สร้างในขั้นตอนที่ 1 — ระบบตรวจสลิปและจับคู่ยอดอัตโนมัติ"
            button="แนบสลิป" busy={busy === "slip"} onRun={uploadSlip} call={calls.slip ?? null} fresh={fresh.slip ?? null} onFresh={() => (slip ? signOnly("slip", async () => demoUploadSlip(slipRef, { mime: slip.type, data: await slipData(slip) }, true)) : noSlip())}>
            {bulkRefs.length > 0 && (
              <div className="grid gap-1.5 rounded-lg border border-line bg-surface-alt p-3 text-[13px]">
                <span className="font-semibold text-muted">แนบสลิปให้</span>
                <label className="flex items-center gap-2"><input type="radio" checked={slipTarget === "one"} onChange={() => setSlipTarget("one")} /> รายการเดียว (ตามเลขที่รายการด้านล่าง)</label>
                <label className="flex items-center gap-2"><input type="radio" checked={slipTarget === "bulk"} onChange={() => setSlipTarget("bulk")} />
                  ทั้งหมดจาก “สร้างหลายรายการ” ล่าสุด — <b>{bulkRefs.length} รายการ</b> <span className="font-mono text-[12px] text-soft">({bulkRefs[0]} – {bulkRefs[bulkRefs.length - 1]})</span></label>
              </div>
            )}
            {slipTarget === "bulk" && bulkRefs.length > 0 ? (
              <div className="rounded-lg border border-[#3b82f6]/40 bg-[#3b82f6]/5 p-3 text-[13px]">
                {bulkSlips.length
                  ? <span className="font-semibold text-[#1d4ed8]">✔ เตรียมสลิป DEMO แล้ว {bulkSlips.length} ใบ — กด “แนบสลิป” เพื่อส่งทั้งหมด (อนุมัติอัตโนมัติทุกรายการ)</span>
                  : <span className="text-muted">กด “ใช้สลิป DEMO” เพื่อสร้างสลิป DEMO ให้ทั้ง {bulkRefs.length} รายการ แล้วกด “แนบสลิป”</span>}
                {bulkPrep && <div className="mt-1 text-[12px] text-soft">{bulkPrep}</div>}
              </div>
            ) : (
            <Field label="เลขที่รายการ (ref) *" hint="ได้จากขั้นตอนที่ 1 อัตโนมัติ หรือพิมพ์เอง"><input className={`${input} font-mono`} value={slipRef} placeholder="TXN100001" onChange={(e) => setSlipRef(e.target.value)} /></Field>
            )}
            <Field label="รูปสลิป * (PNG / JPG / WEBP ไม่เกิน 8 MB)">
              <label className={`${input} flex cursor-pointer items-center gap-2`}>
                <FileImage size={16} className="text-muted" />
                <span className={slip ? "text-ink" : "text-soft"}>{slip ? `${slip.name} · ${Math.round(slip.size / 1024)} KB` : "เลือกรูปสลิป…"}</span>
                <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => pickSlip(e.target.files?.[0] ?? null)} />
              </label>
            </Field>
            <div className="flex items-start gap-3">
              <button type="button" disabled={!!bulkPrep && bulkPrep.startsWith("กำลัง")} onClick={() => (slipTarget === "bulk" && bulkRefs.length ? prepareBulkDemoSlips() : demoSlipForStep(slipRef))} className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-[#3b82f6]/50 px-3 py-2 text-[13px] text-[#2563eb] hover:bg-[#3b82f6]/10 disabled:opacity-50">
                <Sparkles size={14} /> ใช้สลิป DEMO{slipTarget === "bulk" && bulkRefs.length ? ` (${bulkRefs.length} รายการ)` : ""}
              </button>
              <span className="text-[11.5px] leading-snug text-soft">สลิป DEMO → อนุมัติอัตโนมัติ (เฉพาะหน้านี้) · สลิปจริง → ตรวจกับธนาคารตามปกติ ผ่านแล้วอนุมัติอัตโนมัติเหมือนรายการจริง</span>
            </div>
            {slipTarget === "one" && slipPreview && (
              <div className="flex items-center gap-3 rounded-lg border border-line bg-surface-alt p-2">
                {/* eslint-disable-next-line @next/next/no-img-element -- local preview (blob URL) */}
                <img src={slipPreview} alt="สลิปที่เลือก" className="h-24 rounded border border-line object-contain" />
                <div className="text-[12.5px] text-muted">{slip?.name}<br /><button type="button" onClick={() => pickSlip(null)} className="mt-1 text-danger hover:underline">เอาออก</button></div>
              </div>
            )}
          </StepCard>

          <StepCard n={3} icon={<Banknote size={18} />} title="สร้างรายการโอนออก" method="POST" path={out.api === "v2" ? "/api/v2/payout/create" : "/api/v1/payout/create"}
            desc="ขอโอนเงินจากยอดของร้านให้ผู้รับ — ยอด + ค่าธรรมเนียมถูกกันไว้จนทีมงานโอนเสร็จ"
            button="สร้างรายการโอนออก" busy={busy === "payout"} onRun={() => createPayout()} call={calls.payout ?? null} fresh={fresh.payout ?? null} onFresh={() => signOnly("payout", () => demoCreatePayout(out, true))}>
            <Field label="API endpoint" hint={out.api === "v2" ? "v2 = สถานะ PENDING จนกว่าทีมงานจะโอนจริง (admin ดำเนินการ = yes → COMPLETED) · callback payout.pending / payout.completed / payout.failed" : "v1 = ตอบ COMPLETED ทันทีเมื่อรับรายการ · callback เมื่อโอนสำเร็จ / ไม่สำเร็จ"}>
              <select className={`${input} font-mono`} value={out.api} onChange={(e) => setOut({ ...out, api: e.target.value as "v1" | "v2" })} aria-label="API endpoint ของการโอนออก">
                <option value="v1">POST /api/v1/payout/create</option>
                <option value="v2">POST /api/v2/payout/create</option>
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="ยอดเงิน (บาท) *" hint={fees && Number(out.amount) > 0 ? `ค่าธรรมเนียม ${Number(fees.outFeePercent)}% = ฿${baht(feeOf(Number(out.amount), fees.outFeePercent, fees.outFeeFlat))} · หักยอดร้าน ฿${baht(Number(out.amount) + feeOf(Number(out.amount), fees.outFeePercent, fees.outFeeFlat))}` : undefined}>
                <input className={input} inputMode="decimal" value={out.amount} onChange={(e) => setOut({ ...out, amount: e.target.value })} /></Field>
              <Field label="ธนาคารผู้รับ *">
                <select className={input} value={out.bankCode} onChange={(e) => setOut({ ...out, bankCode: e.target.value })}>
                  {banks.map((x) => <option key={x.code} value={x.code}>{x.code} — {x.name}</option>)}
                </select>
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="เลขบัญชีผู้รับ *"><input className={`${input} font-mono`} inputMode="numeric" value={out.accountNumber} placeholder="1234567890" onChange={(e) => setOut({ ...out, accountNumber: e.target.value })} /></Field>
              <Field label="ชื่อบัญชีผู้รับ *"><input className={input} value={out.accountName} placeholder="ชื่อ-นามสกุล" onChange={(e) => setOut({ ...out, accountName: e.target.value })} /></Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="merchantRef (เลขอ้างอิงของร้าน)"><input className={`${input} font-mono`} value={out.merchantRef} onChange={(e) => setOut({ ...out, merchantRef: e.target.value })} /></Field>
              <Field label="รายละเอียด"><input className={input} value={out.description} onChange={(e) => setOut({ ...out, description: e.target.value })} /></Field>
            </div>
          </StepCard>

          <StepCard n={4} icon={<Wallet size={18} />} title="ตรวจยอดคงเหลือ" method="GET" path="/api/v1/balance"
            desc="ดูยอดคงเหลือ ยอดที่ใช้ได้ และยอดที่กันไว้ของร้าน — ใช้หลังรับเงินหรือโอนออกเพื่อดูยอดที่เปลี่ยน (ไม่ต้องใส่พารามิเตอร์)"
            button="ตรวจยอดคงเหลือ" busy={busy === "balance"} onRun={checkBalance} call={calls.balance ?? null} fresh={fresh.balance ?? null} onFresh={() => signOnly("balance", () => demoBalance(true))} />
        </div>
       </div>

        <aside className="xl:sticky xl:top-[76px] xl:max-h-[calc(100vh-92px)] xl:self-start xl:overflow-y-auto">
          <DemoGuide />
          <p className="mt-3 px-1 text-[11.5px] leading-relaxed text-soft">
            ทุกคำขอเซ็นด้วย X-Timestamp + X-Signature (HMAC-SHA256) — ลายเซ็นใช้ได้ครั้งเดียว ภายใน 5 นาที
          </p>
        </aside>
      </main>

      {viewSlip && (
        <Modal title={`สลิป ${viewSlip.ref}`} onClose={() => setViewSlip(null)} width={560}>
          {viewSlip.url && (
            // eslint-disable-next-line @next/next/no-img-element -- slip image of a demo order (/demo/slip/[ref]) or the local upload
            <img src={viewSlip.url} alt={`สลิป ${viewSlip.ref}`} className="mx-auto max-h-[70vh] rounded-lg border border-line" />
          )}
        </Modal>
      )}
      {hooks && <CallbacksModal title={`Callback ของ ${hooks.ref} → webhook ของร้านค้า`} items={hooks.items} onClose={() => setHooks(null)} />}
      {confirm && (() => {
        const needReason = !(confirm.act === "reject" && confirm.kind === "payment");
        const event = confirm.kind === "payment" ? "payment.rejected" : "payout.failed";
        const sendsCallback = confirm.act === "reject" || confirm.open;
        return (
          <Modal title={`${confirm.act === "reject" ? "ปฏิเสธ" : "ลบ"}รายการ ${confirm.ref}?`} onClose={() => setConfirm(null)} width={500}
            footer={<>
              <button type="button" className={`${btn.base} ${btn.md} ${btn.ghost}`} onClick={() => setConfirm(null)}>ยกเลิก</button>
              <button type="button" disabled={needReason && reason.trim().length < 3} className={`${btn.base} ${btn.md} ${btn.danger}`} onClick={doConfirm}>
                {confirm.act === "reject" ? <X size={14} /> : <Trash2 size={14} />} {confirm.act === "reject" ? "ปฏิเสธรายการ" : "ลบรายการ"}
              </button>
            </>}>
            <div className="grid gap-3 text-[14px] text-muted">
              {confirm.act === "reject" && confirm.kind === "payment" && <p>ส่ง <code className="text-ink">PATCH /api/v1/transactions/{confirm.ref}/cancel</code> (API ของร้านค้า) — สถานะเป็น “ไม่อนุมัติ”</p>}
              {confirm.act === "reject" && confirm.kind === "payout" && <p>ปฏิเสธ payout (ระบบหลังบ้าน เหมือนผู้ดูแลกด) — สถานะเป็น “ไม่อนุมัติ” และคืนยอด + ค่าธรรมเนียมให้ร้าน</p>}
              {confirm.act === "delete" && <p>ลบรายการ (ระบบหลังบ้าน เหมือนผู้ดูแลกด) — {confirm.open ? "รายการยังเปิดอยู่ จะถูกปฏิเสธก่อนแล้วจึงลบ" : "รายการถูกปฏิเสธแล้ว ลบออกได้เลย"} · ผู้ดูแลยังเห็นได้ที่ “รายการที่ลบแล้ว”</p>}
              <p className={sendsCallback ? "text-ink" : ""}>
                {sendsCallback
                  ? <>📣 ระบบส่ง callback <code>{event}</code> ไปยัง webhook ของร้าน และโพสต์ในกลุ่ม Telegram</>
                  : <>ไม่มี callback ใหม่ (ส่ง <code>{event}</code> ไปแล้วตอนปฏิเสธ)</>}
              </p>
              {needReason && (
                <label className="block">
                  <span className="mb-1 block text-[12.5px] font-semibold">เหตุผล * (อย่างน้อย 3 ตัวอักษร)</span>
                  <input autoFocus className={input} value={reason} onChange={(e) => setReason(e.target.value)} placeholder={confirm.act === "reject" ? "เช่น ข้อมูลบัญชีผู้รับไม่ถูกต้อง" : "เช่น รายการทดสอบ"} />
                </label>
              )}
            </div>
          </Modal>
        );
      })()}
      <LoadingDialog open={busy !== null && !popup} text="กำลังดำเนินการ…" />
      {notice && (
        <Modal title={notice.title} onClose={() => setNotice(null)} width={440}
          footer={<button type="button" className={`${btn.base} ${btn.md} ${btn.primary}`} onClick={() => setNotice(null)}>ตกลง</button>}>
          <p className={`text-[15px] font-semibold ${notice.ok ? "text-success" : "text-danger"}`}>{notice.ok ? "✔ " : "✖ "}{notice.text}</p>
          <p className="mt-2 text-[12.5px] text-muted">ทำผ่านระบบหลังบ้าน (เหมือนผู้ดูแลกดในหน้า admin) — ไม่มี API ของร้านค้าสำหรับคำสั่งนี้ จึงไม่มีคำสั่ง curl · callback (ถ้ามี) ดูได้ที่ช่องสถานะการส่ง Webhook / Telegram ด้านซ้าย</p>
        </Modal>
      )}
      {dup && (
        <Modal title={dup.kind === "payment" ? "orderId นี้ถูกใช้แล้ว" : "merchantRef นี้ถูกใช้แล้ว"} onClose={() => setDup(null)} width={480}
          footer={<>
            <button type="button" className={`${btn.base} ${btn.md} ${btn.ghost}`} onClick={() => setDup(null)}>ปิด</button>
            <button type="button" className={`${btn.base} ${btn.md} ${btn.primary}`} onClick={() => { const d = dup; setDup(null); if (d.kind === "payment") createPayment(d.next); else createPayout(d.next); }}>
              <Terminal size={14} /> {dup.kind === "payment" ? "สร้างรายการรับเงิน" : "สร้างรายการโอนออก"}ด้วยเลขใหม่
            </button>
          </>}>
          <p className="text-[14px] text-muted">
            <code className="text-ink">{dup.old}</code> ถูกใช้กับรายการอื่นแล้ว (API ตอบ 409 {dup.kind === "payment" ? "DUPLICATE_ORDER_ID" : "DUPLICATE_MERCHANT_REF"})
          </p>
          <p className="mt-3 text-[14px]">ระบบสร้าง{dup.kind === "payment" ? " orderId" : " merchantRef"} ใหม่ให้อัตโนมัติ และใส่ในช่องของฟอร์มแล้ว:</p>
          <div className="mt-2 rounded-lg border border-primary/40 bg-primary-50 px-3 py-2 font-mono text-[15px] font-semibold">{dup.next}</div>
        </Modal>
      )}
      {popup && <TerminalPopup key={`${popup.step}-${popup.call?.curl.length ?? 0}-${popup.error ?? ""}`} title={popup.title} call={popup.call} busy={b} error={popup.error} onClose={() => setPopup(null)} />}
    </div>
  );
}
