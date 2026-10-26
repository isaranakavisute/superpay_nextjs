"use client";

import { useState, useTransition } from "react";
import { useCan } from "@/components/shell/perms-context";
import { DollarSign, Eye, ShieldAlert, ShieldCheck, ShieldQuestion } from "lucide-react";
import { Modal, btn } from "@/components/interactive/Modal";
import { StatGrid, StatTile } from "@/components/ui";
import { fmtDateTime, fmtMoney } from "@/lib/format";
import type { DoubleCreditRow } from "@/lib/rows";
import { resolveCases } from "./actions";

const GROUPS: { key: DoubleCreditRow["confidence"]; title: string; hint: string; edge: string; tone: "rose" | "amber" | "sky"; icon: React.ReactNode }[] = [
  { key: "confirmed", title: "ยืนยันแล้ว", hint: "เลขอ้างอิงธนาคารของสลิปตรงกับที่อีกออเดอร์ได้เงินไปแล้ว", edge: "var(--color-danger)", tone: "rose", icon: <ShieldAlert size={24} /> },
  { key: "likely", title: "น่าจะใช่", hint: "ยอดและเวลาโอนตรงกับอีกออเดอร์ แต่ไม่มีเลขอ้างอิงให้เทียบ", edge: "#d97706", tone: "amber", icon: <ShieldQuestion size={24} /> },
  { key: "review", title: "ต้องดูด้วยตา", hint: "หลักฐานไม่พอให้ระบบตัดสิน — เปิดเทียบสลิปก่อนตัดสินใจ", edge: "var(--color-muted)", tone: "sky", icon: <ShieldCheck size={24} /> },
];

const net = (d: DoubleCreditRow) => Number(d.amount) - Number(d.creditedFee ?? 0);
const th = "border-b border-line bg-surface-alt px-[18px] py-[13px] text-left text-xs font-semibold tracking-[0.5px] text-muted uppercase whitespace-nowrap";
const td = "px-[18px] py-[13px] align-top";
const check = "size-4 accent-[var(--color-primary)]";

export function Board({ rows }: { rows: DoubleCreditRow[] }) {
  const canAct = useCan()("payment.double_credit");   // สิทธิ์การเข้าถึง
  const [selected, setSelected] = useState<Set<DoubleCreditRow["id"]>>(new Set());
  const [compare, setCompare] = useState<DoubleCreditRow | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const live = new Set(rows.map((r) => r.id));
  const sel = new Set([...selected].filter((id) => live.has(id)));
  const toggle = (ids: DoubleCreditRow["id"][], on: boolean) =>
    setSelected((prev) => {
      const next = new Set(prev);
      for (const id of ids) {
        if (on) next.add(id);
        else next.delete(id);
      }
      return next;
    });

  const run = (action: "clawback" | "dismiss", ids: DoubleCreditRow["id"][]) =>
    start(async () => {
      setError(null);
      const r = await resolveCases(action, ids);
      if (r.ok) toggle(ids, false);
      else setError(r.error);
    });

  const picked = rows.filter((r) => sel.has(r.id));
  const shops = new Set(rows.map((r) => r.merchantId)).size;

  return (
    <>
      <StatGrid>
        {GROUPS.map((g) => {
          const xs = rows.filter((r) => r.confidence === g.key);
          return <StatTile key={g.key} tone={g.tone} icon={g.icon} label={g.title} value={`${xs.length} คู่`} note={`ยอดสุทธิ ${fmtMoney(xs.reduce((n, r) => n + net(r), 0))}`} />;
        })}
        <StatTile tone="emerald" icon={<DollarSign size={24} />} label="รวมที่ร้านได้เกิน" value={fmtMoney(rows.reduce((n, r) => n + net(r), 0))} note={`${rows.length} ออเดอร์ · ${shops} ร้าน`} />
      </StatGrid>

      <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-line bg-surface px-[18px] py-2.5">
        <label className="inline-flex cursor-pointer items-center gap-2 font-semibold">
          {canAct && <input type="checkbox" className={check} checked={rows.length > 0 && sel.size === rows.length} onChange={(e) => toggle(rows.map((r) => r.id), e.target.checked)} />}
          เลือกทั้งหมดทุกกลุ่ม ({rows.length} คู่)
        </label>
        <span className="text-[12.5px] text-muted">
          {sel.size === 0
            ? "ยังไม่ได้เลือก"
            : `เลือก ${sel.size} คู่ · ยอดสุทธิ ${fmtMoney(picked.reduce((n, r) => n + net(r), 0))} · ยอดเต็ม ${fmtMoney(picked.reduce((n, r) => n + Number(r.amount), 0))}`}
        </span>
        {error && <span className="text-[12.5px] text-danger">{error}</span>}
        <span className="flex-auto" />
        {canAct && <button className={`${btn.base} ${btn.sm} ${btn.danger}`} disabled={!sel.size || pending} onClick={() => run("clawback", [...sel])}>ดึงเงินคืนที่เลือก</button>}
        {canAct && <button className={`${btn.base} ${btn.sm} ${btn.ghost}`} disabled={!sel.size || pending} onClick={() => run("dismiss", [...sel])}>ไม่ใช่ซ้ำที่เลือก</button>}
        {canAct && <button className={`${btn.base} ${btn.sm} ${btn.ghost}`} disabled={!sel.size || pending} onClick={() => setSelected(new Set())}>ล้างที่เลือก</button>}
      </div>

      {GROUPS.map((g) => {
        const xs = rows.filter((r) => r.confidence === g.key);
        if (xs.length === 0) return null;
        const ids = xs.map((r) => r.id);
        return (
          <section key={g.key} className="mb-4 overflow-hidden rounded-xl border border-l-4 border-line bg-surface" style={{ borderLeftColor: g.edge }}>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-line px-[22px] py-[18px]">
              <h2 className="text-lg font-semibold whitespace-nowrap">
                {g.title}
                <span className="ml-1.5 inline-flex rounded-full bg-surface-alt px-2.5 py-1 align-middle text-[11px] font-semibold text-muted">{xs.length}</span>
              </h2>
              <span className="text-[12.5px] text-muted">{g.hint}</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-[12.5px]">
                <thead>
                  <tr>
                    <th className={`${th} w-8 pr-0`} title={`เลือกทั้งหมดในกลุ่ม ${g.title}`}>
                      {canAct && <input type="checkbox" className={check} checked={ids.every((id) => sel.has(id))} onChange={(e) => toggle(ids, e.target.checked)} aria-label={`เลือกทั้งหมดในกลุ่ม ${g.title}`} />}
                    </th>
                    {["ร้าน", "ออเดอร์ที่ได้เงินซ้ำ", "ยอด", "อนุมัติเอง", "ออเดอร์ที่ถือสลิป", "เหตุผล", "จัดการ"].map((h) => (
                      <th key={h} className={`${th} ${h === "ยอด" || h === "จัดการ" ? "text-right" : ""}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {xs.map((d) => (
                    <tr key={d.id} className="hover:bg-surface-alt">
                      <td className={`${td} w-8 pr-0`}>
                        {canAct && <input type="checkbox" className={check} checked={sel.has(d.id)} onChange={(e) => toggle([d.id], e.target.checked)} title={`เลือก ${d.creditedRef}`} aria-label={`เลือก ${d.creditedRef}`} />}
                      </td>
                      <td className={`${td} whitespace-nowrap`}>{d.merchantName ?? <span className="text-soft">house</span>}</td>
                      <td className={td}>
                        <strong>{d.creditedRef}</strong>
                        {d.creditedOrderId && <div className="max-w-[200px] font-mono text-[11px] break-all text-muted">{d.creditedOrderId}</div>}
                        {d.creditedCreatedAt && <div className="text-[11px] text-muted">สร้าง {fmtDateTime(d.creditedCreatedAt)}</div>}
                      </td>
                      <td className={`${td} text-right whitespace-nowrap`}>
                        <strong className="tabular-nums">{fmtMoney(d.amount)}</strong>
                        <div className="text-[11px] text-muted">สุทธิ {fmtMoney(net(d))} · ค่าธรรมเนียม {fmtMoney(d.creditedFee)}</div>
                      </td>
                      <td className={`${td} text-[12.5px] whitespace-nowrap`}>
                        {d.approvedAt ? fmtDateTime(d.approvedAt) : "—"}
                        {d.approvedBy && <div className="text-[11px] text-muted">โดย {d.approvedBy}</div>}
                      </td>
                      <td className={td}>
                        <strong>{d.slipHolderRef}</strong>
                        {d.slipHolderOrderId && <div className="max-w-[200px] font-mono text-[11px] break-all text-muted">{d.slipHolderOrderId}</div>}
                        {d.slipHolderPaidAt && <div className="text-[11px] text-muted">ได้เงิน {fmtDateTime(d.slipHolderPaidAt)} · slip</div>}
                      </td>
                      <td className={`${td} max-w-[260px] text-[12px]`}>
                        {d.reason}
                        {d.bankRef && <div className="font-mono text-[11px] text-muted">อ้างอิง {d.bankRef}</div>}
                      </td>
                      <td className={td}>
                        <div className="flex flex-nowrap justify-end gap-1.5">
                          <button className={`${btn.base} ${btn.sm} ${btn.ghost}`} onClick={() => setCompare(d)} title="เปิดสลิปของทั้งสองออเดอร์เทียบกัน"><Eye size={13} /> เทียบสลิป</button>
                          {canAct && <button className={`${btn.base} ${btn.sm} ${btn.danger}`} disabled={pending} onClick={() => run("clawback", [d.id])}>ดึงเงินคืน</button>}
                          {canAct && <button className={`${btn.base} ${btn.sm} ${btn.ghost}`} disabled={pending} onClick={() => run("dismiss", [d.id])}>ไม่ใช่ซ้ำ</button>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        );
      })}

      {compare && (
        <Modal title={`เทียบสลิป ${compare.creditedRef} ↔ ${compare.slipHolderRef}`} onClose={() => setCompare(null)} width={900}>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              { ref: compare.creditedRef, has: compare.creditedHasSlip, label: "ออเดอร์ที่ได้เงินซ้ำ" },
              { ref: compare.slipHolderRef, has: compare.slipHolderHasSlip, label: "ออเดอร์ที่ถือสลิป" },
            ].map((s) => (
              <div key={s.ref} className="rounded-lg border border-line bg-surface-alt p-3 text-center">
                <div className="mb-2 text-[13px] text-muted">{s.label} · <strong className="text-ink">{s.ref}</strong></div>
                {s.has ? (
                  /* eslint-disable-next-line @next/next/no-img-element -- private, auth-gated image route */
                  <img src={`/payments/${s.ref}/slip`} alt={`สลิปของ ${s.ref}`} className="mx-auto max-h-[60vh] rounded bg-white" />
                ) : (
                  <div className="py-16 text-[13px] text-muted">ไม่มีรูปสลิปแนบไว้</div>
                )}
              </div>
            ))}
          </div>
        </Modal>
      )}
    </>
  );
}
