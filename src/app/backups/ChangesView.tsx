"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ChevronDown, ChevronRight, Loader2, Redo2, Search, Undo2 } from "lucide-react";
import { Modal, btn, field, fieldLabel } from "@/components/interactive/Modal";
import { Card, CardHead } from "@/components/ui";
import { fmtDateTime } from "@/lib/format";
import { applyChanges, loadChange, loadChangeDays, loadChanges, previewChanges } from "./actions";
import type { ApplyBody, ApplyResult, ChangeDay, ChangeRow, ChangeTx } from "./types";

const OP: Record<ChangeRow["op"], [string, string]> = {
  I: ["เพิ่ม", "bg-emerald-500/15 text-emerald-300"],
  U: ["แก้ไข", "bg-sky-500/15 text-sky-300"],
  D: ["ลบ", "bg-red-500/15 text-red-300"],
};
const TABLE_TH: Record<string, string> = {
  payments: "รายการชำระเงิน", payment_slips: "สลิป", outflows: "รายการเงินออก", outflow_slips: "สลิปเงินออก", withdrawal_requests: "คำขอถอน",
  merchants: "ร้านค้า", merchant_api_keys: "API key", merchant_portal_users: "ผู้ใช้ร้านค้า", bank_accounts: "บัญชีธนาคาร",
  bank_account_merchants: "บัญชี↔ร้าน", fee_splits: "ส่วนแบ่งค่าธรรมเนียม", slip_transfers: "เงินโอนจากสลิป", slip_transfer_uses: "การใช้เงินโอน",
  webhook_endpoints: "Webhook", user_password: "ผู้ใช้ console", console_user_profiles: "โปรไฟล์ผู้ใช้", console_config: "ตั้งค่าระบบ",
  console_settings: "ตั้งค่า", alert_channels: "บอทแจ้งเตือน", announcements: "ประชาสัมพันธ์", demo_records: "รายการหน้า demo",
  double_credits: "เติมเงินซ้ำ", p2p_matches: "จับคู่ P2P", merchant_credit_adjustments: "ปรับยอดร้าน", support_faqs: "คำถามบอท",
};
const tableName = (t: string) => TABLE_TH[t] ?? t;
const bkkToday = () => new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 10);

function TxDetail({ tx }: { tx: ChangeTx }) {
  const [open, setOpen] = useState<string | null>(null);
  const [rows, setRows] = useState<Record<string, { oldRow: Record<string, unknown> | null; newRow: Record<string, unknown> | null }>>({});
  const show = async (id: string) => {
    setOpen(open === id ? null : id);
    if (!rows[id]) { const r = await loadChange(id); if (r.ok) setRows((m) => ({ ...m, [id]: r.change })); }
  };
  return (
    <div className="mt-2 grid gap-1.5">
      {tx.changes.map((c) => {
        const d = rows[c.id];
        const keys = d ? Array.from(new Set([...Object.keys(d.oldRow ?? {}), ...Object.keys(d.newRow ?? {})])) : [];
        return (
          <div key={c.id} className="rounded-lg border border-line bg-surface-alt/60">
            <button type="button" onClick={() => show(c.id)} className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[12.5px]">
              {open === c.id ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
              <span className={`rounded px-1.5 py-0.5 text-[11px] font-semibold ${OP[c.op][1]}`}>{OP[c.op][0]}</span>
              <span className="text-muted">{tableName(c.tbl)}</span>
              <span className="font-mono">{c.label ?? JSON.stringify(c.pk)}</span>
              {c.op === "U" && c.changed && <span className="truncate text-soft">แก้: {c.changed.join(", ")}</span>}
              {c.statusBefore && c.status && c.statusBefore !== c.status && <span className="text-soft">สถานะ {c.statusBefore} → {c.status}</span>}
            </button>
            {open === c.id && (
              <div className="overflow-x-auto border-t border-line px-3 py-2">
                {!d ? <Loader2 size={13} className="animate-spin" /> : (
                  <table className="w-full text-[12px]">
                    <thead className="text-left text-soft"><tr><th className="pr-3">ช่อง</th><th className="pr-3">ก่อน</th><th>หลัง</th></tr></thead>
                    <tbody>
                      {keys.map((k) => {
                        const a = JSON.stringify(d.oldRow?.[k] ?? null), b = JSON.stringify(d.newRow?.[k] ?? null);
                        return (
                          <tr key={k} className={a !== b ? "text-ink" : "text-soft"}>
                            <td className="pr-3 align-top font-mono">{k}</td>
                            <td className={`max-w-[320px] pr-3 align-top break-all ${a !== b ? "text-red-300" : ""}`}>{d.oldRow ? a : "—"}</td>
                            <td className={`max-w-[320px] align-top break-all ${a !== b ? "text-emerald-300" : ""}`}>{d.newRow ? b : "—"}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/** Preview (dry run) → confirm with password → apply. */
function ApplyDialog({ body, label, onClose, onDone }: { body: ApplyBody; label: string; onClose: () => void; onDone: (r: ApplyResult) => void }) {
  const [pre, setPre] = useState<ApplyResult | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [needCode, setNeedCode] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => { previewChanges(body).then((r) => (r.ok ? setPre(r) : setErr(r.error))); }, [body]);
  const undo = body.mode === "undo";
  const go = async () => {
    setBusy(true); setErr(null);
    const r = await applyChanges(body, password, needCode ? code : undefined);
    setBusy(false);
    if (!r.ok) { setErr(r.error); if (r.needCode) setNeedCode(true); return; }
    onDone(r);
  };
  return (
    <Modal title={undo ? "ย้อนกลับการเปลี่ยนแปลง (Undo)" : "ทำซ้ำการเปลี่ยนแปลง (Replay)"} onClose={onClose} width={620}
      footer={<>
        <button type="button" className={`${btn.base} ${btn.md} ${btn.ghost}`} onClick={onClose}>ยกเลิก</button>
        <button type="button" disabled={!pre || pre.summary.ok === 0 || !password || busy || (needCode && code.length < 6)} onClick={go} className={`${btn.base} ${btn.md} ${undo ? btn.danger : btn.primary}`}>
          {busy ? <Loader2 size={14} className="animate-spin" /> : undo ? <Undo2 size={14} /> : <Redo2 size={14} />} {undo ? "ย้อนกลับ" : "ทำซ้ำ"} {pre ? `${pre.summary.ok.toLocaleString("th-TH")} แถว` : ""}
        </button>
      </>}>
      <div className="grid gap-3 text-[14px]">
        <div className="rounded-lg border border-line bg-surface-alt p-3">
          <div className="font-semibold">{label}</div>
          <div className="text-[12.5px] text-muted">
            {undo ? "ทำให้ข้อมูลกลับไปเป็นเหมือนก่อนการเปลี่ยนแปลงเหล่านี้ (ทำจากใหม่ไปเก่า) — การเปลี่ยนแปลงอื่นไม่ถูกแตะต้อง"
              : "ใส่การเปลี่ยนแปลงเหล่านี้อีกครั้ง (ทำจากเก่าไปใหม่) — ใช้หลังกู้คืนจากไฟล์สำรองรายคืน"}
          </div>
        </div>
        {!pre && !err && <div className="text-muted"><Loader2 size={13} className="mr-1 inline animate-spin" /> กำลังตรวจสอบล่วงหน้า (ยังไม่บันทึกอะไร)…</div>}
        {pre && (
          <div className="rounded-lg border border-line p-3">
            <div className="mb-1 font-semibold">ผลตรวจล่วงหน้า</div>
            <div>ทำได้ <b className="text-success">{pre.summary.ok.toLocaleString("th-TH")}</b> จาก {pre.summary.total.toLocaleString("th-TH")} แถว
              {pre.summary.conflicts > 0 && <> · ชนกัน (ข้าม) <b className="text-warning">{pre.summary.conflicts}</b></>}
              {pre.summary.errors > 0 && <> · ผิดพลาด (ข้าม) <b className="text-danger">{pre.summary.errors}</b></>}
            </div>
            {pre.skipped.length > 0 && (
              <ul className="mt-2 max-h-40 overflow-auto text-[12px] text-muted">
                {pre.skipped.map((s) => <li key={s.id}>• {tableName(s.tbl ?? "")} <span className="font-mono">{s.label}</span> — {s.result.replace(/^conflict: |^error: /, "")}</li>)}
              </ul>
            )}
            <div className="mt-2 text-[12px] text-soft">แถวที่ “ชนกัน” คือข้อมูลที่ถูกแก้อีกหลังจากนั้น — ระบบข้ามให้ ไม่เขียนทับ · ไม่มีการส่ง webhook / Telegram / โอนเงินจริงจากการย้อนกลับหรือทำซ้ำ</div>
          </div>
        )}
        <label className="block">
          <span className={fieldLabel}>รหัสผ่านของคุณ *</span>
          <input className={field} type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        {needCode && (
          <label className="block">
            <span className={fieldLabel}>รหัส 2FA *</span>
            <input className={field} inputMode="numeric" value={code} onChange={(e) => setCode(e.target.value)} placeholder="123456" />
          </label>
        )}
        {err && <div className="flex items-center gap-2 text-danger"><AlertTriangle size={15} /> {err}</div>}
      </div>
    </Modal>
  );
}

export function ChangesView({ canManage }: { canManage: boolean }) {
  const [days, setDays] = useState<ChangeDay[] | null>(null);
  const [tables, setTables] = useState<string[]>([]);
  const [day, setDay] = useState(bkkToday());
  const [from, setFrom] = useState("00:00");
  const [to, setTo] = useState("23:59");
  const [table, setTable] = useState("");
  const [q, setQ] = useState("");
  const [list, setList] = useState<{ transactions: ChangeTx[]; total: number; limit: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [openTx, setOpenTx] = useState<string | null>(null);
  const [dialog, setDialog] = useState<{ body: ApplyBody; label: string } | null>(null);
  const [done, setDone] = useState<string | null>(null);

  useEffect(() => { loadChangeDays().then((r) => { if (r.ok) { setDays(r.days); setTables(r.tables); } }); }, []);
  const search = async () => {
    setLoading(true); setErr(null); setPicked(new Set());
    const r = await loadChanges({ day, from, to, table: table || undefined, q: q.trim() || undefined });
    setLoading(false);
    if (r.ok) setList(r); else setErr(r.error);
  };
  // A new day: show its changes (state set only when the answer arrives).
  useEffect(() => {
    loadChanges({ day, from, to, table: table || undefined, q: q.trim() || undefined }).then((r) => { if (r.ok) { setList(r); setPicked(new Set()); } else setErr(r.error); });
  }, [day]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = (t: string) => setPicked((s) => { const n = new Set(s); if (n.has(t)) n.delete(t); else n.add(t); return n; });
  const rangeLabel = `ทุกการเปลี่ยนแปลงวันที่ ${day} เวลา ${from}–${to}${table ? ` ตาราง ${tableName(table)}` : ""}`;
  const dayInfo = useMemo(() => days?.find((d) => d.day === day), [days, day]);

  return (
    <Card>
      <CardHead title="บันทึกการเปลี่ยนแปลงระหว่างวัน (Real-time)" />
      <div className="grid gap-4 p-5">
        <p className="text-[13px] text-muted">
          ทุกการเพิ่ม / แก้ไข / ลบข้อมูลสำคัญถูกบันทึกทันทีที่เกิดขึ้น (เก็บเป็นไฟล์รายวันบนเซิร์ฟเวอร์ 7 วัน แล้วลบอัตโนมัติ) — เลือกวัน ช่วงเวลา แล้ว
          <b className="text-ink"> ย้อนกลับ</b> (กรณีลบ/แก้ผิด) หรือ <b className="text-ink">ทำซ้ำ</b> (หลังกู้คืนจากไฟล์สำรองรายคืน) ได้ทั้งรายการที่เลือก หรือทั้งช่วงเวลา
        </p>
        <div className="flex flex-wrap items-end gap-3">
          <label><span className={fieldLabel}>วัน</span>
            <select className={field} value={day} onChange={(e) => setDay(e.target.value)}>
              {!days?.some((d) => d.day === bkkToday()) && <option value={bkkToday()}>{bkkToday()} (วันนี้)</option>}
              {days?.map((d) => <option key={d.day} value={d.day}>{d.day} · {d.transactions.toLocaleString("th-TH")} รายการ</option>)}
            </select>
          </label>
          <label><span className={fieldLabel}>ตั้งแต่</span><input type="time" className={field} value={from} onChange={(e) => setFrom(e.target.value)} /></label>
          <label><span className={fieldLabel}>ถึง</span><input type="time" className={field} value={to} onChange={(e) => setTo(e.target.value)} /></label>
          <label><span className={fieldLabel}>ตาราง</span>
            <select className={field} value={table} onChange={(e) => setTable(e.target.value)}>
              <option value="">ทั้งหมด</option>
              {tables.map((t) => <option key={t} value={t}>{tableName(t)}</option>)}
            </select>
          </label>
          <label className="min-w-[200px] flex-1"><span className={fieldLabel}>ค้นหา (เลขที่รายการ / ร้าน / ผู้ทำ)</span>
            <input className={field} value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && search()} placeholder="TXN174634, my-shop, admin…" />
          </label>
          <button type="button" onClick={search} className={`${btn.base} ${btn.md} ${btn.primary}`}>{loading ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />} แสดง</button>
        </div>

        {dayInfo && <div className="text-[12.5px] text-soft">วันที่ {day}: {dayInfo.transactions.toLocaleString("th-TH")} รายการ ({dayInfo.changes.toLocaleString("th-TH")} แถว) · {fmtDateTime(dayInfo.firstAt)} – {fmtDateTime(dayInfo.lastAt)}</div>}
        {done && <div className="rounded-lg border border-success/40 bg-success/10 p-3 text-[14px] text-success">{done}</div>}
        {err && <div className="text-danger">{err}</div>}

        {canManage && list && list.total > 0 && (
          <div className="flex flex-wrap items-center gap-2 rounded-lg border border-line bg-surface-alt p-3 text-[13px]">
            <span className="text-muted">เลือกแล้ว {picked.size} รายการ:</span>
            <button type="button" disabled={!picked.size} onClick={() => setDialog({ body: { mode: "undo", txids: [...picked] }, label: `${picked.size} รายการที่เลือก` })} className={`${btn.base} ${btn.sm} ${btn.dangerGhost}`}><Undo2 size={13} /> ย้อนกลับที่เลือก</button>
            <button type="button" disabled={!picked.size} onClick={() => setDialog({ body: { mode: "replay", txids: [...picked] }, label: `${picked.size} รายการที่เลือก` })} className={`${btn.base} ${btn.sm} ${btn.ghost}`}><Redo2 size={13} /> ทำซ้ำที่เลือก</button>
            <span className="mx-2 text-soft">|</span>
            <span className="text-muted">ทั้งช่วง {from}–{to} ({list.total.toLocaleString("th-TH")} รายการ):</span>
            <button type="button" onClick={() => setDialog({ body: { mode: "undo", range: { day, from, to, ...(table ? { table } : {}) } }, label: rangeLabel })} className={`${btn.base} ${btn.sm} ${btn.dangerGhost}`}><Undo2 size={13} /> ย้อนกลับทั้งช่วง</button>
            <button type="button" onClick={() => setDialog({ body: { mode: "replay", range: { day, from, to, ...(table ? { table } : {}) } }, label: rangeLabel })} className={`${btn.base} ${btn.sm} ${btn.ghost}`}><Redo2 size={13} /> ทำซ้ำทั้งช่วง</button>
          </div>
        )}
        {!canManage && <div className="text-[12.5px] text-soft">ดูได้ทุกคน · ย้อนกลับ / ทำซ้ำ ได้เฉพาะ Super Admin</div>}

        <div className="divide-y divide-line rounded-lg border border-line">
          {list?.transactions.map((t) => (
            <div key={t.txid} className="px-4 py-2.5">
              <div className="flex items-start gap-3">
                {canManage && <input type="checkbox" className="mt-1 size-4" checked={picked.has(t.txid)} onChange={() => toggle(t.txid)} aria-label="เลือกรายการ" />}
                <button type="button" onClick={() => setOpenTx(openTx === t.txid ? null : t.txid)} className="min-w-0 flex-1 text-left">
                  <div className="flex flex-wrap items-center gap-2 text-[13.5px]">
                    <span className="font-mono text-muted tabular-nums">{fmtDateTime(t.at)}</span>
                    {t.audits?.length
                      ? <span><b>{t.audits[0].actor}</b> · {t.audits[0].action} {t.audits[0].ref && <span className="font-mono text-muted">{t.audits[0].ref}</span>}</span>
                      : <span className="text-muted">ระบบ (อัตโนมัติ)</span>}
                    {t.source && <span className="rounded bg-warning/15 px-1.5 text-[11px] text-warning">{t.source}</span>}
                    <span className="text-soft">· {t.changeCount} แถว: {Array.from(new Set(t.changes.map((c) => tableName(c.tbl)))).join(", ")}</span>
                  </div>
                  {t.audits?.[0]?.detail && <div className="truncate text-[12px] text-soft">{t.audits[0].detail}</div>}
                </button>
              </div>
              {openTx === t.txid && <TxDetail tx={t} />}
            </div>
          ))}
          {list && !list.transactions.length && <div className="px-4 py-8 text-center text-soft">ไม่มีการเปลี่ยนแปลงในช่วงนี้</div>}
          {!list && <div className="px-4 py-8 text-center text-soft"><Loader2 size={14} className="mr-1 inline animate-spin" /> กำลังโหลด…</div>}
        </div>
        {list && list.total > list.transactions.length && <div className="text-[12.5px] text-soft">แสดง {list.transactions.length} จาก {list.total.toLocaleString("th-TH")} รายการ (ล่าสุดก่อน) — ระบุช่วงเวลาให้แคบลงเพื่อดูทั้งหมด · ปุ่ม “ทั้งช่วง” ใช้กับทุกรายการในช่วง</div>}
      </div>
      {dialog && (
        <ApplyDialog body={dialog.body} label={dialog.label} onClose={() => setDialog(null)}
          onDone={(r) => { setDialog(null); setDone(`${r.dry ? "" : "เสร็จแล้ว: "}${r.summary.ok.toLocaleString("th-TH")} จาก ${r.summary.total.toLocaleString("th-TH")} แถว${r.summary.conflicts ? ` · ข้าม ${r.summary.conflicts} แถวที่ชนกัน` : ""}`); search(); }} />
      )}
    </Card>
  );
}
