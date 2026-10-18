"use client";

import { useState, useTransition } from "react";
import { Megaphone, Pencil, Plus, Trash2 } from "lucide-react";
import { btn, field, fieldLabel, Modal } from "@/components/interactive/Modal";
import type { ActionResult } from "@/lib/api";
import { fmtDateTime } from "@/lib/format";
import { DeleteDialog } from "@/components/interactive/DeleteDialog";
import { deleteAnnouncement, saveAnnouncement, type AnnouncementInput } from "./actions";

export type Announcement = AnnouncementInput & {
  id: number; updatedAt: string; updatedBy: string | null; nextRuns: string[];
  lastRun: { slotAt: string; manual: boolean; sent: number; failed: number; createdAt: string } | null;
};
export type BotChat = { chatId: string; title: string | null; type: string | null; status: string; updatedAt: string };

const B = (v: keyof typeof btn, s: "sm" | "md" = "md") => `${btn.base} ${btn[s]} ${btn[v]}`;
const card = "rounded-xl border border-line bg-surface shadow-sm";
const head = "flex flex-wrap items-center justify-between gap-3 border-b border-line px-[22px] py-[18px]";
const UNITS = [{ v: 1, l: "วินาที" }, { v: 60, l: "นาที" }, { v: 3600, l: "ชั่วโมง" }] as const;
const ACTIVE = new Set(["member", "administrator", "creator"]);

/** Bangkok wall clock <-> ISO (+07:00), independent of the browser's time zone. */
const bkkParts = (iso: string | null) => {
  const d = new Date(iso ?? Date.now() + 5 * 60_000);
  const t = new Date(d.getTime() + 7 * 3_600_000).toISOString();
  return { date: t.slice(0, 10), time: t.slice(11, 16) };
};
const toIso = (date: string, time: string) => `${date}T${time}:00+07:00`;
const unitOf = (s: number | null) => (!s ? 60 : s % 3600 === 0 ? 3600 : s % 60 === 0 ? 60 : 1);
const every = (s: number) => { const u = unitOf(s); return `ทุก ${s / u} ${UNITS.find((x) => x.v === u)!.l}`; };
const todayBkk = () => bkkParts(new Date().toISOString()).date;
const fmtDay = (d: string) => new Date(`${d}T00:00:00+07:00`).toLocaleDateString("th-TH", { timeZone: "Asia/Bangkok", day: "numeric", month: "short", year: "numeric" });
const schedule = (a: AnnouncementInput) =>
  a.mode === "now" ? "1.3 ส่งครั้งเดียว — ส่งทันทีเมื่อบันทึก"
    : a.mode === "times" ? `เวลา ${a.times.join(", ")} น. ${a.onDate ? `เฉพาะวันที่ ${fmtDay(a.onDate)}` : "ทุกวัน"}`
      : `${every(a.intervalSeconds ?? 0)} เริ่ม ${fmtDateTime(a.startAt!)}`;

type Draft = { id: number | null; title: string; message: string; mode: "times" | "interval" | "now"; times: string[]; daily: boolean; amount: number; unit: number; date: string; time: string; enabled: boolean };
const draftOf = (a?: Announcement): Draft => {
  const p = bkkParts(a?.startAt ?? null);
  const u = unitOf(a?.intervalSeconds ?? null);
  return { id: a?.id ?? null, title: a?.title ?? "", message: a?.message ?? "", mode: a?.mode ?? "times", times: a?.times?.length ? a.times : ["09:00"], daily: !a?.onDate,
    amount: a?.intervalSeconds ? a.intervalSeconds / u : 4, unit: a?.intervalSeconds ? u : 3600, date: p.date, time: p.time, enabled: a?.enabled ?? true };
};

export function AnnouncementsEditor({ announcements, chats, slots }: { announcements: Announcement[]; chats: BotChat[]; slots: string[] }) {
  const [edit, setEdit] = useState<Draft | null>(null);
  const [r, setR] = useState<ActionResult | null>(null);
  const [pending, start] = useTransition();
  const [del, setDel] = useState<{ id: number; title: string } | null>(null);
  const run = (fn: () => Promise<ActionResult>, after?: (x: ActionResult) => void) => start(async () => { const x = await fn(); setR(x); after?.(x); });
  const active = chats.filter((c) => ACTIVE.has(c.status));
  const input = (d: Draft): AnnouncementInput => ({
    title: d.title, message: d.message, mode: d.mode, enabled: d.mode === "now" || d.enabled,
    times: d.mode === "times" ? d.times : [], onDate: d.mode === "times" && !d.daily ? todayBkk() : null, intervalSeconds: d.mode === "interval" ? Math.round(d.amount * d.unit) : null,
    startAt: d.mode === "interval" ? toIso(d.date, d.time) : null,
  });
  const err = r && !r.ok ? <div role="alert" className="mb-3 rounded-lg border border-red-500/30 bg-red-500/15 px-3.5 py-2.5 text-[13px] text-red-300">{r.error}</div> : null;

  return (
    <div className="grid gap-5">
      {del && (
        <DeleteDialog
          title="ยืนยันการลบประชาสัมพันธ์"
          what={<>ลบ <strong>{del.title}</strong>? ประกาศจะหยุดส่งทันที</>}
          placeholder="เช่น ประกาศหมดอายุ / ข้อความผิด"
          onConfirm={(reason) => deleteAnnouncement(del.id, reason)}
          onDone={setR}
          onClose={() => setDel(null)}
        />
      )}
      <section className={card}>
        <div className={head}>
          <h2 className="text-lg font-semibold">ข้อความประชาสัมพันธ์ ({announcements.length})</h2>
          <button type="button" className={B("primary")} onClick={() => { setR(null); setEdit(draftOf()); }}><Plus size={15} /> เพิ่มประชาสัมพันธ์</button>
        </div>
        <div className="px-[22px] py-4 text-[13px]">
          {!edit && err}
          {r?.ok && "sent" in r && <div role="status" className="mb-3 text-emerald-300">ส่งแล้ว {String(r.sent)} กลุ่ม{Number(r.failed) ? ` · ไม่สำเร็จ ${String(r.failed)}` : ""}</div>}
          {announcements.length === 0 ? (
            <div className="py-10 text-center text-muted">ยังไม่มีประชาสัมพันธ์ — กด <strong>เพิ่มประชาสัมพันธ์</strong> เพื่อเริ่ม</div>
          ) : (
            <div className="divide-y divide-line rounded-lg border border-line">
              {announcements.map((a) => (
                <div key={a.id} className={`flex flex-wrap items-start gap-3 px-3.5 py-3 ${a.enabled ? "" : "opacity-55"}`}>
                  <Megaphone size={16} className="mt-1 text-muted" />
                  <div className="min-w-0 flex-1">
                    <div className="font-medium">{a.title}{!a.enabled && <span className="ml-2 text-[11.5px] text-muted">(ปิดอยู่)</span>}</div>
                    <div className="mt-0.5 text-[12px] text-primary">{schedule(a)}</div>
                    <div className="mt-1.5 rounded-md bg-surface-alt px-2.5 py-1.5 text-[12.5px] whitespace-pre-wrap">{a.message}</div>
                    <div className="mt-1 text-[11.5px] text-soft">
                      {a.enabled && a.nextRuns.length > 0 && <>รอบถัดไป: {a.nextRuns.map((t) => fmtDateTime(t)).join(" · ")} · </>}
                      {a.lastRun ? <>ส่งล่าสุด {fmtDateTime(a.lastRun.createdAt)}{a.lastRun.manual ? " (1.3 ส่งทันที)" : ""} — สำเร็จ {a.lastRun.sent}{a.lastRun.failed ? ` · ไม่สำเร็จ ${a.lastRun.failed}` : ""} กลุ่ม</> : "ยังไม่เคยส่ง"}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {a.mode !== "now" && <button type="button" disabled={pending} className={B("ghost", "sm")} onClick={() => run(() => saveAnnouncement(a.id, { ...a, enabled: !a.enabled }))}>{a.enabled ? "ปิด" : "เปิด"}</button>}
                    <button type="button" className={B("ghost", "sm")} onClick={() => { setR(null); setEdit(draftOf(a)); }}><Pencil size={13} /> แก้ไข</button>
                    <button type="button" disabled={pending} className={B("dangerGhost", "sm")} onClick={() => setDel({ id: a.id, title: a.title })}><Trash2 size={13} /> ลบ</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className={card}>
        <div className={head}><h2 className="text-lg font-semibold">กลุ่มที่บอทอยู่ ({active.length})</h2><span className="text-[12.5px] text-muted">ประชาสัมพันธ์จะถูกโพสต์ไปทุกกลุ่มในรายการนี้</span></div>
        <div className="px-[22px] py-4 text-[13px]">
          {chats.length === 0 ? <div className="text-muted">ยังไม่มีกลุ่ม — เพิ่ม @OptionPaySupportBot เข้ากลุ่ม Telegram แล้วกลุ่มจะแสดงที่นี่อัตโนมัติ</div> : (
            <div className="divide-y divide-line rounded-lg border border-line">
              {chats.map((c) => (
                <div key={c.chatId} className={`flex flex-wrap items-center gap-3 px-3.5 py-2.5 ${ACTIVE.has(c.status) ? "" : "opacity-55"}`}>
                  <div className="min-w-0 flex-1"><div className="font-medium">{c.title ?? c.chatId}</div><div className="font-mono text-[11.5px] text-muted">{c.chatId}</div></div>
                  <span className={`text-[12px] ${ACTIVE.has(c.status) ? "text-emerald-300" : "text-muted"}`}>{ACTIVE.has(c.status) ? "อยู่ในกลุ่ม" : "ออกจากกลุ่มแล้ว"}</span>
                </div>
              ))}
            </div>
          )}
          <p className="mt-2 text-[12px] text-muted">เพิ่มบอทเข้ากลุ่มใหม่ หรือนำออก — รายการอัปเดตเองเมื่อ Telegram แจ้ง</p>
        </div>
      </section>

      {edit && (
        <Modal title={edit.id ? "แก้ไขประชาสัมพันธ์" : "เพิ่มประชาสัมพันธ์"} onClose={() => setEdit(null)} width={680}
          footer={<><button type="button" className={B("ghost")} onClick={() => setEdit(null)}>ยกเลิก</button>
            <button type="submit" form="ann-form" disabled={pending || (edit.mode === "now" && active.length === 0)} className={B("primary")}>{pending ? "กำลังบันทึก..." : edit.mode === "now" ? "บันทึกและส่งทันที" : "บันทึก"}</button></>}>
          <form id="ann-form" className="grid gap-3 text-[13px]" onSubmit={(e) => { e.preventDefault(); if (edit.mode === "now" && !confirm(`ส่ง “${edit.title}” ไป ${active.length} กลุ่มตอนนี้เลย?`)) return; run(() => saveAnnouncement(edit.id, input(edit)), (x) => x.ok && setEdit(null)); }}>
            {err}
            <div><label htmlFor="an-t" className={fieldLabel}>หัวข้อ (เห็นเฉพาะผู้ดูแล) *</label>
              <input id="an-t" required maxLength={120} className={field} value={edit.title} onChange={(e) => setEdit({ ...edit, title: e.target.value })} placeholder="เช่น แจ้งเวลาทำการ" /></div>
            <div><label htmlFor="an-m" className={fieldLabel}>ข้อความที่จะโพสต์ *</label>
              <textarea id="an-m" required maxLength={4000} rows={6} className={field} value={edit.message} onChange={(e) => setEdit({ ...edit, message: e.target.value })} placeholder="ข้อความที่บอทจะโพสต์ในกลุ่ม" /></div>

            <div className={fieldLabel}>เวลาโพสต์ (เวลาไทย) — เลือกได้อย่างใดอย่างหนึ่ง: 1.1, 1.2 หรือ 1.3</div>
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2"><input type="radio" name="mode" checked={edit.mode === "times"} onChange={() => setEdit({ ...edit, mode: "times" })} /> 1.1 ตามเวลาที่เลือก</label>
              <label className="flex items-center gap-2"><input type="radio" name="mode" checked={edit.mode === "interval"} onChange={() => setEdit({ ...edit, mode: "interval" })} /> 1.2 ทุกช่วงเวลา</label>
              <label className="flex items-center gap-2"><input type="radio" name="mode" checked={edit.mode === "now"} onChange={() => setEdit({ ...edit, mode: "now" })} /> 1.3 ส่งครั้งเดียว ส่งทันที</label>
            </div>
            {edit.mode === "now" ? (
              <div className="rounded-lg border border-line bg-surface-alt px-3.5 py-2.5 text-[12.5px] text-muted">
                กด <strong className="text-ink">บันทึกและส่งทันที</strong> แล้วบอทจะโพสต์ข้อความนี้ 1 ครั้งไปทุกกลุ่มทันที — ไม่มีรอบถัดไป
                <br />ต้องการส่งซ้ำ: กด <strong className="text-ink">แก้ไข</strong> แล้วบันทึกอีกครั้ง (ส่งใหม่ทุกครั้งที่บันทึก)
              </div>
            ) : edit.mode === "times" ? (
              <div>
                <div className="mb-2 flex flex-wrap gap-4">
                  <label className="flex items-center gap-2"><input type="radio" name="daily" checked={edit.daily} onChange={() => setEdit({ ...edit, daily: true })} /> ทุกวัน</label>
                  <label className="flex items-center gap-2"><input type="radio" name="daily" checked={!edit.daily} onChange={() => setEdit({ ...edit, daily: false })} /> เฉพาะวันนี้ ({fmtDay(todayBkk())})</label>
                </div>
                <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-6">
                  {slots.map((t) => {
                    const on = edit.times.includes(t);
                    return (
                      <button type="button" key={t} aria-pressed={on} onClick={() => setEdit({ ...edit, times: on ? edit.times.filter((x) => x !== t) : [...edit.times, t].sort() })}
                        className={`rounded-md border px-2 py-1.5 font-mono text-[12.5px] ${on ? "border-primary bg-primary-50 text-primary" : "border-line text-muted hover:text-ink"}`}>{t}</button>
                    );
                  })}
                </div>
                <div className="mt-1.5 text-[12px] text-muted">เลือกแล้ว: {edit.times.length ? edit.times.join(", ") : "—"} · เลือกได้หลายเวลา{edit.daily ? "" : " · เวลาที่ผ่านไปแล้ววันนี้จะไม่ถูกส่ง"}</div>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                <div><label htmlFor="an-n" className={fieldLabel}>ทุก</label>
                  <div className="flex gap-2">
                    <input id="an-n" type="number" min={1} required className={field} value={edit.amount} onChange={(e) => setEdit({ ...edit, amount: Number(e.target.value) })} />
                    <select aria-label="หน่วย" className={field} value={edit.unit} onChange={(e) => setEdit({ ...edit, unit: Number(e.target.value) })}>
                      {UNITS.map((u) => <option key={u.v} value={u.v}>{u.l}</option>)}
                    </select>
                  </div>
                  <div className="mt-1 text-[11.5px] text-soft">อย่างน้อย 10 วินาที (Telegram จำกัดความถี่การโพสต์)</div>
                </div>
                <div><label htmlFor="an-d" className={fieldLabel}>เริ่ม (วันที่ และเวลา)</label>
                  <div className="flex gap-2">
                    <input id="an-d" type="date" required className={field} value={edit.date} onChange={(e) => setEdit({ ...edit, date: e.target.value })} />
                    <input aria-label="เวลาเริ่ม" type="time" required className={field} value={edit.time} onChange={(e) => setEdit({ ...edit, time: e.target.value })} />
                  </div>
                </div>
              </div>
            )}
            {edit.mode !== "now" && <label className="flex items-center gap-2"><input type="checkbox" checked={edit.enabled} onChange={(e) => setEdit({ ...edit, enabled: e.target.checked })} /> เปิดใช้งาน</label>}
            <div className="text-[12px] text-muted">จะโพสต์ไป {active.length} กลุ่ม: {active.map((c) => c.title ?? c.chatId).join(", ") || "—"}</div>
          </form>
        </Modal>
      )}
    </div>
  );
}
