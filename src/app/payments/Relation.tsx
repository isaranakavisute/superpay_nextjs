"use client";

import { useState, useTransition } from "react";
import { Modal, btn } from "@/components/interactive/Modal";
import type { DupOrder, Relation } from "@/lib/api";
import { fmtMoney } from "@/lib/format";
import { loadRelation } from "./actions";

/*
 * "ดูความเกี่ยวข้อง" in the สถานะ cell: an order whose note points at another order, side by side in Thai, with the
 * evidence for the decision. Kinds (backend payment.service.js orderRelation):
 *  - duplicate: closed by the 23:00 duplicate-order rule → the paid order it repeats;
 *  - reused: slip refused "สลิปนี้ถูกใช้กับรายการอื่นแล้ว — ใช้ซ้ำไม่ได้" → the order that transfer paid (or the same order, sent twice);
 *  - carry: this order's transfer paid a newer order of the same customer (carry-over).
 */
export const REUSED_NOTE = "สลิปนี้ถูกใช้กับรายการอื่นแล้ว — ใช้ซ้ำไม่ได้";

/** Which link (if any) a payments row gets, from its note. */
export function relationLink(p: { ref: string; reviewedBy?: string | null; reviewNote?: string | null; slipReusedRef?: string | null }) {
  const note = p.reviewNote ?? "";
  const dup = /^ซ้ำกับ (TXN\d+) ที่ชำระแล้ว/.exec(note);
  if (dup && p.reviewedBy === "system") return `ดูความเกี่ยวข้องกับ ${dup[1]}`;
  if (note.includes(REUSED_NOTE)) {
    const other = /^TXN\d+$/.test(p.slipReusedRef ?? "") ? p.slipReusedRef : null;
    return other === p.ref ? "ดูรายละเอียด (ส่งสลิปซ้ำ)" : other ? `เทียบกับ ${other} ที่ใช้สลิปนี้แล้ว` : null;
  }
  const carry = /(?:ใช้ชำระ|ชำระผ่าน) (TXN\d+)/.exec(note);
  return carry ? `เทียบกับ ${carry[1]} ที่ใช้เงินโอนนี้` : null;
}

const TZ = { timeZone: "Asia/Bangkok" } as const;
const ms = (v: string) => new Date(v).getTime();
const time = (v: string | null) => (v ? `${new Date(v).toLocaleTimeString("th-TH", { ...TZ, hour12: false })} น.` : "—");
const dayOf = (v: string) => new Date(v).toLocaleDateString("th-TH", { ...TZ, day: "numeric", month: "short", year: "numeric" });
const when = (v: string | null) => (v ? `${new Date(v).toLocaleDateString("th-TH", { ...TZ, day: "numeric", month: "short" })} ${time(v)}` : "—");
const STATUS: Record<string, string> = { approved: "ชำระแล้ว", rejected: "ยกเลิก", pending: "รอชำระ", expired: "หมดอายุ", refunded: "คืนเงินแล้ว" };
const EVENT: Record<string, string> = { "payment.approved": "ชำระแล้ว", "payment.rejected": "ยกเลิก", "payment.expired": "หมดอายุ", "payment.refunded": "คืนเงิน" };
const sender = (o: DupOrder) => (o.senderLast4 ? `${o.senderBank ?? ""} ···${o.senderLast4}`.trim() : "—");
const account = (o: DupOrder) => (o.accountLast4 ? `${o.accountBank ?? ""} ···${o.accountLast4}`.trim() : "—");
const slipAmt = (o: DupOrder) => (o.slipAmount != null ? fmtMoney(o.slipAmount) : "—");
const by = (o: DupOrder) =>
  o.reviewedBy === "system" ? `ระบบอัตโนมัติ${o.status === "approved" && o.hasSlip ? ` — ตรวจสลิปผ่าน ${o.slipProvider === "easyslip" ? "EasySlip" : o.slipProvider ?? ""}` : ""}` : o.reviewedBy ?? "—";
const lastCb = (o: DupOrder) => o.callbacks.at(-1);
const cbText = (o: DupOrder) => { const c = lastCb(o); return c ? `${c.event} ${when(c.at)} (HTTP ${c.statusCode ?? "—"})` : "ไม่มี"; };
const sameTransfer = (a: DupOrder, b: DupOrder) => !!a.transRef && a.transRef === b.transRef;

const table = "w-full border-collapse text-[13px] [&_td]:border [&_td]:border-line [&_td]:px-2.5 [&_td]:py-1.5 [&_td]:align-top [&_th]:border [&_th]:border-line [&_th]:bg-surface-alt [&_th]:px-2.5 [&_th]:py-1.5 [&_th]:text-left";
const H = ({ children }: { children: React.ReactNode }) => <h3 className="mt-5 mb-2 text-[14px] font-bold first:mt-0">{children}</h3>;
const Ok = ({ ok }: { ok: boolean | null }) => <span className={ok == null ? "text-muted" : ok ? "text-success" : "text-danger"}>{ok == null ? "–" : ok ? "✔" : "✖"}</span>;

/** One comparison row; `mark` names what is the same (e.g. "คนเดียวกัน"); `key` rows are the evidence and are highlighted. */
type Row = { label: string; a: string; b: string; mark?: string; key?: boolean; mono?: boolean };
function Compare({ a, b, aLabel, bLabel, rows }: { a: DupOrder; b: DupOrder; aLabel: string; bLabel: string; rows: Row[] }) {
  return (
    <table className={table}>
      <thead><tr><th className="w-[190px]">หัวข้อ</th><th>{a.ref} <span className="font-normal text-muted">({aLabel})</span></th><th>{b.ref} <span className="font-normal text-muted">({bLabel})</span></th></tr></thead>
      <tbody>
        {rows.map((r) => {
          const same = r.mark && r.a === r.b && r.a !== "—";
          return (
            <tr key={r.label} className={r.key ? "bg-danger/10" : undefined}>
              <td className={r.key ? "font-semibold" : undefined}>{r.label}</td>
              <td className={r.mono ? "font-mono text-[12px] break-all" : undefined}>{r.a}</td>
              <td className={r.mono ? "font-mono text-[12px] break-all" : undefined}>{r.b}{same && <span className={r.key ? "font-semibold text-danger" : "text-muted"}> ({r.mark})</span>}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

const baseRows = (a: DupOrder, b: DupOrder): Row[] => [
  { label: "ร้านค้า", a: a.merchantName ?? "—", b: b.merchantName ?? "—", mark: "ร้านเดียวกัน" },
  { label: "เลขออเดอร์ของร้าน", a: a.merchantOrderId ?? "—", b: b.merchantOrderId ?? "—", mono: true },
  { label: "ชื่อลูกค้า", a: a.customerName ?? "—", b: b.customerName ?? "—", mark: "คนเดียวกัน" },
  { label: "บัญชีผู้โอน (ที่ร้านส่งมา)", a: sender(a), b: sender(b), mark: "บัญชีเดียวกัน" },
  { label: "ยอดออเดอร์", a: fmtMoney(a.amount), b: fmtMoney(b.amount), mark: "ยอดเท่ากัน" },
  { label: "บัญชีรับเงิน", a: account(a), b: account(b), mark: "บัญชีเดียวกัน" },
  { label: "สร้างรายการเมื่อ", a: when(a.createdAt), b: when(b.createdAt) },
];
const slipRows = (a: DupOrder, b: DupOrder, key: boolean): Row[] => [
  { label: "ส่งสลิปเมื่อ", a: a.hasSlip ? when(a.slipUploadedAt) : "ไม่มีสลิป", b: b.hasSlip ? when(b.slipUploadedAt) : "ไม่มีสลิป" },
  { label: "ยอดในสลิป", a: a.hasSlip ? slipAmt(a) : "—", b: b.hasSlip ? slipAmt(b) : "—", mark: "ยอดเดียวกัน", key },
  { label: "เวลาโอนในสลิป", a: when(a.transferredAt), b: when(b.transferredAt), mark: "เวลาเดียวกัน", key },
  { label: "เลขอ้างอิงการโอน", a: a.transRef ?? "—", b: b.transRef ?? "—", mark: "เลขเดียวกัน = การโอนครั้งเดียวกัน", key, mono: true },
  { label: "ไฟล์รูปสลิป (รหัส)", a: a.imageId ?? "—", b: b.imageId ?? "—", mark: "ไฟล์รูปเดียวกัน", mono: true },
];
const endRows = (a: DupOrder, b: DupOrder): Row[] => [
  { label: "สถานะ", a: `${STATUS[a.status] ?? a.status}${a.completedAt ? ` (${when(a.completedAt)})` : ""}`, b: `${STATUS[b.status] ?? b.status}${b.completedAt ? ` (${when(b.completedAt)})` : ""}` },
  { label: "ดำเนินการโดย", a: by(a), b: by(b) },
  { label: "เหตุผลที่บันทึกไว้", a: a.reviewNote ?? "—", b: b.reviewNote ?? "—" },
  { label: "แจ้งร้านค้า (callback)", a: cbText(a), b: cbText(b) },
];

/** Both orders' events in time order; a transfer shared by both is listed once. */
function Timeline({ a, b, refusedRef }: { a: DupOrder; b: DupOrder; refusedRef?: string }) {
  const ev: [string, string, string][] = [];
  const seenTransfer = new Set<string>();
  for (const o of [a, b]) {
    ev.push([o.createdAt, o.ref, `ร้านสร้างออเดอร์ ${fmtMoney(o.amount)}`]);
    if (o.transferredAt && !seenTransfer.has(o.transRef ?? o.transferredAt)) {
      seenTransfer.add(o.transRef ?? o.transferredAt);
      ev.push([o.transferredAt, o.ref, `ลูกค้าโอนเงิน ${slipAmt(o)}${o.transRef ? ` (เลขอ้างอิง ${o.transRef})` : ""}`]);
    }
    if (o.slipUploadedAt) ev.push([o.slipUploadedAt, o.ref, o.ref === refusedRef ? `ส่งสลิปเข้ารายการนี้ → ปฏิเสธ: ${REUSED_NOTE}` : "ส่งสลิปเข้ารายการ"]);
    if (o.completedAt) ev.push([o.completedAt, o.ref, o.status === "approved" ? "ชำระสำเร็จ" : `${STATUS[o.status] ?? o.status}${o.reviewedBy === "system" ? " (ระบบอัตโนมัติ)" : o.reviewedBy ? ` (${o.reviewedBy})` : ""}`]);
    for (const c of o.callbacks) ev.push([c.at, o.ref, `แจ้ง ${o.merchantName ?? "ร้านค้า"} ว่า${EVENT[c.event] ?? c.event} (HTTP ${c.statusCode ?? "—"})`]);
  }
  ev.sort((x, y) => ms(x[0]) - ms(y[0]));
  const oneDay = ev.every((e) => dayOf(e[0]) === dayOf(ev[0][0]));
  return (
    <table className={table}>
      <thead><tr><th className="w-[150px]">เวลา</th><th className="w-[110px]">รายการ</th><th>เหตุการณ์</th></tr></thead>
      <tbody>{ev.map(([t, r, e], i) => <tr key={i}><td className="whitespace-nowrap">{oneDay ? time(t) : when(t)}</td><td>{r}</td><td>{e}</td></tr>)}</tbody>
    </table>
  );
}

function Checks({ title, rows, result }: { title: string; rows: [string, boolean | null, string][]; result: string }) {
  return (
    <table className={table}>
      <thead><tr><th className="w-[300px]">{title}</th><th>ผลการตรวจ</th></tr></thead>
      <tbody>
        {rows.map(([k, ok, v]) => <tr key={k}><td>{k}</td><td><Ok ok={ok} /> {v}</td></tr>)}
        <tr><td className="font-bold">ผล</td><td className="font-bold">{result}</td></tr>
      </tbody>
    </table>
  );
}

function Summary({ rows }: { rows: [string, string][] }) {
  return <table className={table}><tbody>{rows.map(([k, v]) => <tr key={k}><td className="w-[300px]">{k}</td><td>{v}</td></tr>)}</tbody></table>;
}

const sameCustomer = (a: DupOrder, b: DupOrder) => a.customerName === b.customerName || (!!a.senderLast4 && a.senderLast4 === b.senderLast4);
/** Per order: its last callback, or why there is none (expired / still open orders get no callback). */
const notified = (a: DupOrder, b: DupOrder) =>
  [a, b].map((o) => {
    const c = lastCb(o);
    if (c) return `${o.ref}: ${EVENT[c.event] ?? c.event} (HTTP ${c.statusCode ?? "—"})`;
    return `${o.ref}: ไม่มี callback${o.status === "expired" ? " (หมดอายุ — ระบบไม่ส่ง callback ตามปกติ)" : o.status === "pending" ? " (ยังเปิดอยู่)" : ""}`;
  }).join(" · ");

/** 23:00 duplicate-order rule: a = paid order#1, b = this (cancelled) order#2. */
function Duplicate({ a, b }: { a: DupOrder; b: DupOrder }) {
  const gap = a.completedAt ? Math.round((ms(b.createdAt) - ms(a.completedAt)) / 60_000) : null;
  return (
    <>
      <H>เปรียบเทียบสองรายการ</H>
      <Compare a={a} b={b} aLabel="ออเดอร์ที่ชำระแล้ว" bLabel="รายการนี้" rows={[...baseRows(a, b), ...slipRows(a, b, false), ...endRows(a, b)]} />
      <H>ลำดับเหตุการณ์</H>
      <Timeline a={a} b={b} />
      <H>ทำไมรายการนี้ถูกยกเลิก</H>
      <Checks title="เงื่อนไขของกฎออเดอร์ซ้ำ 23:00 น." result={`${b.ref} ถูกยกเลิกอัตโนมัติ`} rows={[
        ["ร้านเดียวกัน", a.merchantName === b.merchantName, b.merchantName ?? "—"],
        ["ลูกค้าคนเดียวกัน", sameCustomer(a, b), [b.customerName, b.senderLast4 && `บัญชีผู้โอน ${sender(b)}`].filter(Boolean).join(", ")],
        ["ยอดเงินเท่ากัน", Number(a.amount) === Number(b.amount), fmtMoney(b.amount)],
        ["ออเดอร์แรกชำระแล้วก่อนสร้างออเดอร์ที่สอง", !!a.completedAt && ms(a.completedAt) <= ms(b.createdAt), `${a.ref} ชำระ ${time(a.completedAt)} ก่อน ${b.ref} สร้าง ${time(b.createdAt)}${gap != null && gap >= 0 ? ` (ห่าง ${gap} นาที)` : ""}`],
        ["ออเดอร์ที่สองไม่มีเงินโอนของตัวเองภายใน 23:00 น.", true, b.hasSlip ? "สลิปที่ส่งมาไม่ใช่เงินโอนใหม่" : "ไม่มีสลิป ไม่มีการโอนใหม่"],
      ]} />
      <H>สรุป</H>
      <Summary rows={[
        ["ลูกค้าโอนเงินกี่ครั้ง", `1 ครั้ง (${fmtMoney(a.amount)}${a.transferredAt ? ` เวลา ${time(a.transferredAt)}` : ""}) ใช้ชำระ ${a.ref}`],
        [`${b.ref} ได้รับเงินหรือไม่`, "ไม่ได้รับ"],
        ["เงินหายหรือไม่", `ไม่มี — เงิน ${fmtMoney(a.amount)} ถูกบันทึกกับ ${a.ref} แล้ว`],
        ["ร้านค้าได้รับแจ้งครบหรือไม่", notified(a, b)],
        [`หากลูกค้าแจ้งว่าโอนสำหรับ ${b.ref}`, `ขอสลิป — เลขอ้างอิงการโอนต้องไม่ใช่ ${a.transRef ?? `ของ ${a.ref}`} ซึ่งใช้กับ ${a.ref} แล้ว`],
      ]} />
    </>
  );
}

/** Slip refused as already used: a = the order that transfer paid, b = this order. */
function Reused({ a, b }: { a: DupOrder; b: DupOrder }) {
  const amountFits = b.slipAmount != null ? Number(b.slipAmount) === Number(b.amount) : null;
  return (
    <>
      <H>เปรียบเทียบสองรายการ</H>
      <Compare a={a} b={b} aLabel="ใช้สลิป / เงินโอนนี้แล้ว" bLabel="รายการนี้ — สลิปถูกปฏิเสธ" rows={[...baseRows(a, b), ...slipRows(a, b, true), ...endRows(a, b)]} />
      <H>ลำดับเหตุการณ์</H>
      <Timeline a={a} b={b} refusedRef={b.ref} />
      <H>ทำไมสลิปของรายการนี้ถูกปฏิเสธ</H>
      <Checks title="หลักฐาน" result={`สลิปของ ${b.ref} ถูกปฏิเสธ — ${REUSED_NOTE}`} rows={[
        ["เป็นการโอนครั้งเดียวกัน (เลขอ้างอิงการโอนเดียวกัน)", sameTransfer(a, b), sameTransfer(a, b) ? `${b.transRef} — ตรงกับสลิปของ ${a.ref}` : `${b.transRef ?? "—"} / ${a.transRef ?? "—"}`],
        ["ไฟล์รูปสลิปเดียวกัน", a.imageId && b.imageId ? a.imageId === b.imageId : null, a.imageId && b.imageId ? (a.imageId === b.imageId ? "ไฟล์เดียวกันทุกไบต์" : "คนละไฟล์ (ถ่าย/ครอปใหม่) แต่เป็นการโอนเดียวกัน") : "—"],
        [`เงินโอนนี้ชำระ ${a.ref} แล้ว`, a.status === "approved", `${a.ref} ${STATUS[a.status] ?? a.status}${a.completedAt ? ` เมื่อ ${when(a.completedAt)}` : ""}`],
        [`ส่งสลิปให้ ${a.ref} ก่อน`, a.slipUploadedAt && b.slipUploadedAt ? ms(a.slipUploadedAt) <= ms(b.slipUploadedAt) : null, `${a.ref} ${when(a.slipUploadedAt)} · ${b.ref} ${when(b.slipUploadedAt)}`],
        ["ยอดในสลิปตรงกับยอดของรายการนี้", amountFits, b.slipAmount != null ? `ยอดในสลิป ${slipAmt(b)} · ยอดรายการนี้ ${fmtMoney(b.amount)}${amountFits === false ? " (ไม่ตรงอีกด้วย)" : ""}` : "—"],
      ]} />
      <H>สรุป</H>
      <Summary rows={[
        ["เงินโอนในสลิปนี้ชำระรายการไหน", `${a.ref} (${fmtMoney(a.slipAmount ?? a.amount)})`],
        [`${b.ref} ได้รับเงินหรือไม่`, `ไม่ได้รับ — สลิปที่ส่งมาเป็นเงินโอนของ ${a.ref} · สถานะตอนนี้: ${STATUS[b.status] ?? b.status}`],
        ["เงินหายหรือไม่", `ไม่มี — เงินโอนนี้ถูกบันทึกกับ ${a.ref} ครั้งเดียว ใช้ซ้ำไม่ได้`],
        ["ร้านค้าได้รับแจ้งครบหรือไม่", notified(a, b)],
        [`หากลูกค้าแจ้งว่าโอนสำหรับ ${b.ref}`, `ขอสลิปการโอนครั้งใหม่ — เลขอ้างอิงต้องไม่ใช่ ${a.transRef ?? `ของ ${a.ref}`}`],
      ]} />
    </>
  );
}

/** Same slip sent to the same order twice at once: the order is paid; the second send left the "ใช้ซ้ำไม่ได้" note. */
function SentTwice({ o }: { o: DupOrder }) {
  return (
    <>
      <H>รายละเอียด</H>
      <Summary rows={[
        ["รายการ", `${o.ref} · ${o.merchantName ?? "—"} · ${o.customerName ?? "—"} · ${fmtMoney(o.amount)}`],
        ["สถานะ", `${STATUS[o.status] ?? o.status}${o.completedAt ? ` (${when(o.completedAt)})` : ""}`],
        ["สลิป", `โอนเมื่อ ${when(o.transferredAt)} · ยอด ${slipAmt(o)} · เลขอ้างอิง ${o.transRef ?? "—"}`],
        ["เกิดอะไรขึ้น", "ร้านค้าส่งสลิปเดียวกันมาที่รายการนี้ 2 ครั้งในเวลาเดียวกัน — ครั้งแรกตรวจผ่านและอนุมัติแล้ว ครั้งที่สองถูกปฏิเสธเพราะสลิปถูกใช้ไปแล้ว (กับรายการนี้เอง)"],
        ["ผลต่อรายการ", o.status === "approved" ? "ไม่มีผล — รายการนี้ชำระสำเร็จ ข้อความ “ใช้ซ้ำไม่ได้” มาจากการส่งครั้งที่สอง" : `สถานะ ${STATUS[o.status] ?? o.status}`],
        ["แจ้งร้านค้า (callback)", cbText(o)],
      ]} />
    </>
  );
}

/** Carry-over: a = this order (its transfer was used elsewhere), b = the newer order it paid. */
function Carry({ a, b }: { a: DupOrder; b: DupOrder }) {
  return (
    <>
      <H>เปรียบเทียบสองรายการ</H>
      <Compare a={b} b={a} aLabel="ใช้เงินโอนนี้ชำระ" bLabel="รายการนี้" rows={[...baseRows(b, a), ...slipRows(b, a, false), ...endRows(b, a)]} />
      <H>ลำดับเหตุการณ์</H>
      <Timeline a={a} b={b} />
      <H>ทำไมเงินโอนของรายการนี้ไปชำระ {b.ref}</H>
      <Checks title="เงื่อนไขการใช้เงินโอนข้ามออเดอร์ (carry-over)" result={`เงินโอนชำระ ${b.ref} แทน — ${a.ref} ${STATUS[a.status] ?? a.status}`} rows={[
        ["ลูกค้าคนเดียวกัน", sameCustomer(a, b), [b.customerName, b.senderLast4 && `บัญชีผู้โอน ${sender(b)}`].filter(Boolean).join(", ")],
        ["บัญชีรับเงินเดียวกัน", a.accountLast4 != null && a.accountLast4 === b.accountLast4, account(b)],
        [`โอนหลังสร้าง ${a.ref}`, b.transferredAt ? ms(b.transferredAt) >= ms(a.createdAt) : null, `โอน ${when(b.transferredAt)} · ${a.ref} สร้าง ${when(a.createdAt)}`],
        [`${a.ref} ยังไม่ได้ชำระ`, a.status !== "approved", `${a.ref} ${STATUS[a.status] ?? a.status}`],
        [`เงินโอนนี้ใช้ชำระ ${b.ref}`, b.status === "approved", `${b.ref} ${STATUS[b.status] ?? b.status}${b.completedAt ? ` เมื่อ ${when(b.completedAt)}` : ""}`],
      ]} />
      <H>สรุป</H>
      <Summary rows={[
        ["เงินโอนที่ใช้ชำระ", `${slipAmt(b)}${b.transferredAt ? ` เวลา ${when(b.transferredAt)}` : ""}${b.transRef ? ` (เลขอ้างอิง ${b.transRef})` : ""} → ใช้ชำระ ${b.ref}`],
        ...(a.hasSlip && !sameTransfer(a, b) ? [[`สลิปที่ส่งให้ ${a.ref} เอง`, `โอน ${when(a.transferredAt)}${a.transRef ? ` (เลขอ้างอิง ${a.transRef})` : ""} — เป็นคนละการโอน ไม่ได้ใช้ชำระ ${a.ref}`] as [string, string]] : []),
        [`${a.ref} ได้รับเงินหรือไม่`, `ไม่ได้รับ — เงินโอนไปชำระ ${b.ref} แทน`],
        ["เงินหายหรือไม่", `ไม่มี — เงินโอนถูกบันทึกกับ ${b.ref} ครั้งเดียว`],
        ["ร้านค้าได้รับแจ้งครบหรือไม่", notified(a, b)],
      ]} />
    </>
  );
}

/** "📋 …" link under the สถานะ note; opens the side-by-side dialog. */
export function RelationLink({ refNo, label }: { refNo: string; label: string }) {
  const [data, setData] = useState<Relation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const show = () => {
    setOpen(true);
    start(async () => {
      const r = await loadRelation(refNo);
      if (r.ok) { setData(r); setError(null); } else setError(r.error);
    });
  };
  const title = !data ? `ความเกี่ยวข้องของ ${refNo}`
    : data.kind === "reused" && data.sameOrder ? `${refNo} — ส่งสลิปเดียวกันซ้ำ`
    : data.other ? `ความเกี่ยวข้องระหว่าง ${data.other.ref} และ ${refNo}` : `ความเกี่ยวข้องของ ${refNo}`;
  return (
    <>
      <button type="button" onClick={show} className="mt-1 block text-left text-[11.5px] font-semibold text-primary underline underline-offset-2 hover:opacity-80">
        📋 {label}
      </button>
      {open && (
        <Modal title={title} width={960} onClose={() => setOpen(false)}
          footer={<button className={`${btn.base} ${btn.md} ${btn.primary}`} onClick={() => setOpen(false)}>ปิด</button>}>
          <div className="text-ink">
            {pending && !data ? <p className="text-muted">กำลังโหลด…</p>
              : error ? <p className="text-danger">{error}</p>
              : !data ? null
              : data.kind === "reused" && data.sameOrder ? <SentTwice o={data.order} />
              : !data.other ? <p className="text-muted">ไม่พบรายการที่เกี่ยวข้อง</p>
              : data.kind === "duplicate" ? <Duplicate a={data.other} b={data.order} />
              : data.kind === "reused" ? <Reused a={data.other} b={data.order} />
              : <Carry a={data.order} b={data.other} />}
          </div>
        </Modal>
      )}
    </>
  );
}
