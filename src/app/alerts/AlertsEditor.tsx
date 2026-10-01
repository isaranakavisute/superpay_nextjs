"use client";

import { useState, useTransition } from "react";
import { Plus, Trash2, Zap } from "lucide-react";
import { btn, field, fieldLabel } from "@/components/interactive/Modal";
import { saveAlerts, testBot, type BotInput } from "./actions";

export type Bot = { id: number; name: string; enabled: boolean; botChannelId: number | null; hasOwnToken: boolean; chatIds: string; events: string[] };
type Thresholds = { repeatMinutes: number; slipFailCount: number; slipDownMinutes: number };
type Draft = BotInput & { key: string; hasOwnToken: boolean; test?: { chat: string; ok: boolean; detail: string }[] | string };

const KIND: Record<string, [string, string]> = {
  "withdrawal.pending": ["คำขอถอนรออนุมัติ", "แจ้งเมื่อมีคำขอถอนใหม่ที่ต้องอนุมัติเอง"],
  "outflow.pending": ["เงินออกรออนุมัติ", "รายการเงินออกที่รอแอดมินโอน/อนุมัติ"],
  "double_credit.detected": ["พบการเติมเงินซ้ำ", "สลิปเดียวถูกใช้เติมเงินสองออเดอร์"],
  low_balance: ["ยอดร้านต่ำกว่าขั้นต่ำ", "ร้านที่ยอดคงเหลือต่ำกว่าขั้นต่ำจนถอนไม่ได้"],
  "device.offline": ["อุปกรณ์ Forwarder ออฟไลน์", "มือถือเงียบเกินเวลาที่กำหนด"],
  "channel.error": ["ช่องทางรับข้อมูลขัดข้อง", "bot / อีเมล / webhook รับข้อมูลไม่ได้"],
  "webhook.failed": ["ส่ง webhook ไม่สำเร็จ", "ลองครบ 5 ครั้งแล้วร้านยังไม่ได้รับ"],
  "slip.provider_down": ["ระบบตรวจสลิปขัดข้อง", "ผู้ให้บริการตรวจสลิปไม่ตอบตามเกณฑ์ด้านล่าง"],
};

const draftOf = (b: Bot): Draft => ({ key: `b${b.id}`, id: b.id, name: b.name, enabled: b.enabled, botChannelId: b.botChannelId, botToken: "", chatIds: b.chatIds, events: b.events, hasOwnToken: b.hasOwnToken });

export function AlertsEditor({ bots, channels, kinds, thresholds }: { bots: Bot[]; channels: { id: number; name: string }[]; kinds: string[]; thresholds: Thresholds }) {
  const [list, setList] = useState<Draft[]>(bots.map(draftOf));
  const [deleted, setDeleted] = useState<number[]>([]);
  const [th, setTh] = useState(thresholds);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const patch = (key: string, p: Partial<Draft>) => setList((l) => l.map((d) => (d.key === key ? { ...d, ...p } : d)));

  const save = () =>
    start(async () => {
      setMsg(null);
      const r = await saveAlerts(
        list.map(({ id, name, enabled, botChannelId, botToken, chatIds, events }) => ({ id, name, enabled, botChannelId, botToken: botToken || undefined, chatIds, events })),
        deleted,
        th,
      );
      setMsg(r.ok ? { ok: true, text: "บันทึกการแจ้งเตือนแล้ว" } : { ok: false, text: r.error });
      if (r.ok) setDeleted([]);
    });

  return (
    <>
      {list.length === 0 && (
        <div className="mb-4 rounded-xl border border-line bg-surface px-5 py-10 text-center text-[13px] text-muted">ยังไม่มี bot — ยังไม่มีการแจ้งเตือนใด ๆ กด &ldquo;เพิ่ม bot&rdquo; ด้านล่าง</div>
      )}
      {list.map((d) => {
        const ready = (d.botChannelId || d.hasOwnToken || d.botToken) && d.chatIds.trim();
        return (
          <section key={d.key} className="mb-4 rounded-xl border border-line bg-surface">
            <div className="flex flex-wrap items-center gap-2.5 border-b border-line px-[22px] py-4">
              <input aria-label="ชื่อ bot" className={`${field} max-w-[260px] font-semibold`} value={d.name} onChange={(e) => patch(d.key, { name: e.target.value })} />
              <button type="button" role="switch" aria-checked={d.enabled} onClick={() => patch(d.key, { enabled: !d.enabled })} className={`relative h-6 w-11 rounded-full transition ${d.enabled ? "bg-primary" : "bg-[#cbd5e1]"}`}>
                <span className={`absolute top-0.5 size-5 rounded-full bg-white shadow transition-all ${d.enabled ? "left-[22px]" : "left-0.5"}`} />
              </button>
              <span className="text-[13px] text-muted">{d.enabled ? "เปิด" : "ปิด"}</span>
              {ready ? (
                <span className="rounded-full bg-[#dcfce7] px-2.5 py-1 text-[11px] font-semibold text-[#166534]">พร้อมส่ง</span>
              ) : (
                <span className="rounded-full bg-[#fef3c7] px-2.5 py-1 text-[11px] font-semibold text-[#92400e]">ยังไม่ครบ — ต้องมี bot + chat id</span>
              )}
              <span className="ml-auto flex gap-2">
                <button
                  className={`${btn.base} ${btn.sm} ${btn.ghost}`}
                  disabled={pending || !d.id}
                  title={d.id ? "ส่งข้อความทดสอบเข้า chat" : "บันทึกก่อนทดสอบ"}
                  onClick={() => start(async () => { const r = await testBot(d.id!); patch(d.key, { test: r.ok ? (r.results as Draft["test"]) : r.error }); })}
                >
                  <Zap size={13} /> ทดสอบ
                </button>
                <button
                  className={`${btn.base} ${btn.sm} border-line bg-transparent text-danger hover:bg-danger/10`}
                  aria-label="ลบ bot"
                  onClick={() => { if (d.id) setDeleted((x) => [...x, d.id!]); setList((l) => l.filter((x) => x.key !== d.key)); }}
                >
                  <Trash2 size={14} />
                </button>
              </span>
            </div>
            <div className="grid gap-4 px-[22px] py-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={fieldLabel} htmlFor={`bc-${d.key}`}>ใช้ bot จาก Telegram channel ที่มีอยู่</label>
                  <select id={`bc-${d.key}`} className={field} value={d.botChannelId ?? ""} onChange={(e) => patch(d.key, { botChannelId: e.target.value ? Number(e.target.value) : null })}>
                    <option value="">— ไม่ใช้ / ระบุ token เอง —</option>
                    {channels.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  <div className="mt-1 text-[11.5px] text-muted">ใช้ token ของ bot ที่ตั้งไว้ในหน้าช่องทางตรวจสอบ</div>
                </div>
                <div>
                  <label className={fieldLabel} htmlFor={`bt-${d.key}`}>หรือ Bot Token เฉพาะ</label>
                  <input id={`bt-${d.key}`} type="password" className={field} value={d.botToken ?? ""} onChange={(e) => patch(d.key, { botToken: e.target.value })} placeholder={d.hasOwnToken ? "•••••••• (ตั้งค่าแล้ว — เว้นว่างเพื่อใช้ค่าเดิม)" : "1234567890:ABC-DEF..."} autoComplete="off" />
                  <div className="mt-1 text-[11.5px] text-muted">ถ้าระบุ จะใช้ token นี้แทน bot ของช่องทาง</div>
                </div>
              </div>
              <div>
                <label className={fieldLabel} htmlFor={`ci-${d.key}`}>Chat ID (คั่นด้วย , ได้หลายห้อง)</label>
                <input id={`ci-${d.key}`} className={field} value={d.chatIds} onChange={(e) => patch(d.key, { chatIds: e.target.value })} placeholder="-1001234567890" />
                <div className="mt-1 text-[11.5px] text-muted">เพิ่ม bot เข้ากลุ่มก่อน แล้วใช้ chat id ของกลุ่ม (ขึ้นต้นด้วย -100)</div>
              </div>
              <div>
                <div className="mb-2 text-[13px] font-semibold">แจ้งเตือนที่ bot นี้รับ</div>
                <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-x-[18px] gap-y-2">
                  {kinds.map((k) => (
                    <label key={k} className="flex cursor-pointer items-start gap-2 text-[13px]">
                      <input type="checkbox" className="mt-0.5 size-4 accent-[var(--color-primary)]" checked={d.events.includes(k)} onChange={(e) => patch(d.key, { events: e.target.checked ? [...d.events, k] : d.events.filter((x) => x !== k) })} />
                      <span><span className="text-ink">{KIND[k]?.[0] ?? k}</span><span className="block text-[11.5px] text-muted">{KIND[k]?.[1]}</span></span>
                    </label>
                  ))}
                </div>
              </div>
              {d.test && (
                <div className="rounded-lg bg-surface-alt p-3 text-[12.5px]">
                  {typeof d.test === "string" ? (
                    <span className="text-danger">{d.test}</span>
                  ) : (
                    d.test.map((t) => <div key={t.chat} className={t.ok ? "text-success" : "text-danger"}>{t.ok ? "✓" : "✗"} chat {t.chat} — {t.detail}</div>)
                  )}
                </div>
              )}
            </div>
          </section>
        );
      })}

      <button className={`${btn.base} ${btn.md} ${btn.ghost} mb-[22px]`} onClick={() => setList((l) => [...l, { key: `n${Date.now()}`, name: "bot ใหม่", enabled: true, botChannelId: null, botToken: "", chatIds: "", events: [], hasOwnToken: false }])}>
        <Plus size={15} /> เพิ่ม bot
      </button>

      <section className="mb-4 rounded-xl border border-line bg-surface">
        <div className="border-b border-line px-[22px] py-[18px]"><h2 className="text-lg font-semibold">เกณฑ์แจ้งเตือนเมื่อระบบตรวจสลิปขัดข้อง</h2></div>
        <div className="grid gap-4 px-[22px] py-5 sm:grid-cols-3">
          {([
            ["repeatMinutes", "ส่งซ้ำอย่างมากทุก (นาที)", "กันการแจ้งเตือนรัวเกินไป"],
            ["slipFailCount", "พลาดติดกันกี่ใบก่อนแจ้ง", "นับสลิปที่ตรวจไม่ผ่านติดกัน"],
            ["slipDownMinutes", "หรือขัดข้องต่อเนื่องกี่นาที", "แจ้งเมื่อผู้ให้บริการไม่ตอบนานเกินนี้"],
          ] as const).map(([k, label, hint]) => (
            <div key={k}>
              <label className={fieldLabel} htmlFor={`th-${k}`}>{label}</label>
              <input id={`th-${k}`} type="number" min={1} className={field} value={th[k]} onChange={(e) => setTh({ ...th, [k]: Number(e.target.value) })} />
              <div className="mt-1 text-[11.5px] text-muted">{hint}</div>
            </div>
          ))}
        </div>
      </section>

      <div className="flex items-center justify-end gap-3">
        {msg && <span className={`text-[13px] ${msg.ok ? "text-success" : "text-danger"}`}>{msg.text}</span>}
        <button className={`${btn.base} ${btn.md} ${btn.primary}`} disabled={pending} onClick={save}>บันทึกการแจ้งเตือน</button>
      </div>
    </>
  );
}
