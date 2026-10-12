"use client";

import { useState, useTransition } from "react";
import { MessageSquare, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { btn, field, fieldLabel, Modal } from "@/components/interactive/Modal";
import type { ActionResult } from "@/lib/api";
import { fmtDateTime } from "@/lib/format";
import { deleteFaq, saveFaq, saveSettings, testQuestion, type BotSettings, type FaqInput } from "./actions";

export type Faq = FaqInput & { id: number; hits: number; lastHitAt: string | null; updatedAt: string; updatedBy: string | null };
type Test = { match: { id: number; question: string; answer: string; score: number; by: string } | null; minScore: number; top: { id: number; question: string; score: number }[] };

const B = (v: keyof typeof btn, s: "sm" | "md" = "md") => `${btn.base} ${btn[s]} ${btn[v]}`;
const card = "rounded-xl border border-line bg-surface shadow-sm";
const head = "flex flex-wrap items-center justify-between gap-3 border-b border-line px-[22px] py-[18px]";
const EMPTY: FaqInput = { question: "", keywords: "", answer: "", enabled: true, sort: 0 };
const pct = (n: number) => `${Math.round(n * 100)}%`;

function Err({ r }: { r: ActionResult | null }) {
  return r && !r.ok ? <div role="alert" className="mb-3 rounded-lg border border-red-500/30 bg-red-500/15 px-3.5 py-2.5 text-[13px] text-red-300">{r.error}</div> : null;
}

export function SupportBotEditor({ faqs, settings }: { faqs: Faq[]; settings: BotSettings }) {
  const [edit, setEdit] = useState<{ id: number | null; v: FaqInput } | null>(null);
  const [r, setR] = useState<ActionResult | null>(null);
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<ActionResult>, after?: (x: ActionResult) => void) => start(async () => { const x = await fn(); setR(x); after?.(x); });

  return (
    <div className="grid gap-5">
      <section className={card}>
        <div className={head}>
          <h2 className="text-lg font-semibold">คำถาม–คำตอบ ({faqs.length})</h2>
          <button type="button" className={B("primary")} onClick={() => { setR(null); setEdit({ id: null, v: { ...EMPTY, sort: (faqs.at(-1)?.sort ?? 0) + 10 } }); }}><Plus size={15} /> เพิ่มคำถาม</button>
        </div>
        <div className="px-[22px] py-4">
          {!edit && <Err r={r} />}
          {faqs.length === 0 ? (
            <div className="py-10 text-center text-[13px] text-muted">ยังไม่มีคำถาม — กด <strong>เพิ่มคำถาม</strong> เพื่อเริ่ม</div>
          ) : (
            <div className="divide-y divide-line rounded-lg border border-line">
              {faqs.map((f, i) => (
                <div key={f.id} className={`flex flex-wrap items-start gap-3 px-3.5 py-3 ${f.enabled ? "" : "opacity-55"}`}>
                  <span className="mt-0.5 w-6 text-right text-[12px] text-soft">{i + 1}.</span>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium">{f.question}{!f.enabled && <span className="ml-2 text-[11.5px] text-muted">(ปิดอยู่)</span>}</div>
                    {f.keywords && <div className="mt-0.5 text-[12px] text-muted">คำสำคัญ: {f.keywords}</div>}
                    <div className="mt-1.5 rounded-md bg-surface-alt px-2.5 py-1.5 text-[12.5px] whitespace-pre-wrap">{f.answer}</div>
                    <div className="mt-1 text-[11.5px] text-soft">ตอบไปแล้ว {f.hits} ครั้ง{f.lastHitAt ? ` · ล่าสุด ${fmtDateTime(f.lastHitAt)}` : ""} · แก้ไขล่าสุด {fmtDateTime(f.updatedAt)}{f.updatedBy ? ` โดย ${f.updatedBy}` : ""}</div>
                  </div>
                  <div className="flex gap-1.5">
                    <button type="button" disabled={pending} className={B("ghost", "sm")} onClick={() => run(() => saveFaq(f.id, { ...f, enabled: !f.enabled }))}>{f.enabled ? "ปิด" : "เปิด"}</button>
                    <button type="button" className={B("ghost", "sm")} onClick={() => { setR(null); setEdit({ id: f.id, v: { question: f.question, keywords: f.keywords, answer: f.answer, enabled: f.enabled, sort: f.sort } }); }}><Pencil size={13} /> แก้ไข</button>
                    <button type="button" disabled={pending} className={B("dangerGhost", "sm")} onClick={() => { if (confirm(`ลบคำถาม “${f.question}”?`)) run(() => deleteFaq(f.id)); }}><Trash2 size={13} /> ลบ</button>
                  </div>
                </div>
              ))}
            </div>
          )}
          <p className="mt-3 text-[12px] text-muted">บอทตอบเมื่อข้อความในกลุ่ม<strong className="text-ink">คล้ายคำถาม</strong> หรือ<strong className="text-ink">มีคำสำคัญ</strong>ข้อใดข้อหนึ่ง (คั่นด้วยจุลภาค เช่น <code>ถอนเงิน,เงินถอน</code>) — ข้อความทั่วไปบอทจะเงียบ · พิมพ์ <code>/faq</code> ในกลุ่มเพื่อดูรายการคำถาม · ลำดับน้อยแสดงก่อน</p>
        </div>
      </section>

      <TestBox />
      <SettingsCard settings={settings} />

      {edit && (
        <Modal title={edit.id ? "แก้ไขคำถาม" : "เพิ่มคำถาม"} onClose={() => setEdit(null)} width={620}
          footer={<><button type="button" className={B("ghost")} onClick={() => setEdit(null)}>ยกเลิก</button>
            <button type="submit" form="faq-form" disabled={pending} className={B("primary")}>{pending ? "กำลังบันทึก..." : "บันทึก"}</button></>}>
          <form id="faq-form" className="grid gap-3" onSubmit={(e) => { e.preventDefault(); run(() => saveFaq(edit.id, edit.v), (x) => x.ok && setEdit(null)); }}>
            <Err r={r} />
            <div><label htmlFor="fq-q" className={fieldLabel}>คำถาม *</label>
              <input id="fq-q" required maxLength={500} autoFocus className={field} value={edit.v.question} onChange={(e) => setEdit({ ...edit, v: { ...edit.v, question: e.target.value } })} placeholder="เช่น ถอนเงินได้เมื่อไหร่" /></div>
            <div><label htmlFor="fq-k" className={fieldLabel}>คำสำคัญ (ไม่บังคับ — คั่นด้วยจุลภาค)</label>
              <input id="fq-k" maxLength={1000} className={field} value={edit.v.keywords} onChange={(e) => setEdit({ ...edit, v: { ...edit.v, keywords: e.target.value } })} placeholder="เช่น ถอนเงิน,เงินถอน,ถอนได้" /></div>
            <div><label htmlFor="fq-a" className={fieldLabel}>คำตอบ *</label>
              <textarea id="fq-a" required maxLength={3500} rows={6} className={field} value={edit.v.answer} onChange={(e) => setEdit({ ...edit, v: { ...edit.v, answer: e.target.value } })} placeholder="ข้อความที่บอทจะตอบในกลุ่ม" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label htmlFor="fq-s" className={fieldLabel}>ลำดับ</label>
                <input id="fq-s" type="number" min={0} className={field} value={edit.v.sort} onChange={(e) => setEdit({ ...edit, v: { ...edit.v, sort: Number(e.target.value) || 0 } })} /></div>
              <label className="mt-6 flex items-center gap-2 text-[13px]"><input type="checkbox" checked={edit.v.enabled} onChange={(e) => setEdit({ ...edit, v: { ...edit.v, enabled: e.target.checked } })} /> เปิดใช้งาน</label>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

function TestBox() {
  const [text, setText] = useState("");
  const [res, setRes] = useState<Test | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <section className={card}>
      <div className={head}><h2 className="text-lg font-semibold">ทดสอบคำถาม</h2><span className="text-[12.5px] text-muted">ดูว่าข้อความนี้บอทจะตอบอะไร (ไม่ส่งไป Telegram)</span></div>
      <div className="px-[22px] py-4 text-[13px]">
        <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); start(async () => { const x = await testQuestion(text); if (x.ok) { setRes(x as unknown as Test); setErr(null); } else setErr(x.error); }); }}>
          <input aria-label="ข้อความทดสอบ" required className={field} value={text} onChange={(e) => setText(e.target.value)} placeholder="พิมพ์เหมือนลูกค้าถามในกลุ่ม เช่น ถอนเงินได้กี่โมงครับ" />
          <button type="submit" disabled={pending} className={B("primary")}><Search size={15} /> ทดสอบ</button>
        </form>
        {err && <div className="mt-3 text-red-300">{err}</div>}
        {res && (
          <div className="mt-3 rounded-lg border border-line p-3">
            {res.match ? (
              <>
                <div className="mb-1 flex items-center gap-1.5 font-semibold text-emerald-300"><MessageSquare size={14} /> บอทจะตอบ — “{res.match.question}” (ตรง {pct(res.match.score)} จาก{res.match.by})</div>
                <div className="rounded-md bg-surface-alt px-2.5 py-1.5 whitespace-pre-wrap">{res.match.answer}</div>
              </>
            ) : <div className="text-muted">บอทจะ<strong className="text-ink">ไม่ตอบ</strong> — ไม่ตรงกับคำถามใด (ต้องตรงอย่างน้อย {pct(res.minScore)})</div>}
            {res.top.length > 0 && <div className="mt-2 text-[12px] text-soft">ใกล้เคียงที่สุด: {res.top.map((t) => `${t.question} (${pct(t.score)})`).join(" · ")}</div>}
          </div>
        )}
      </div>
    </section>
  );
}

function SettingsCard({ settings }: { settings: BotSettings }) {
  const [v, setV] = useState(settings);
  const [r, setR] = useState<ActionResult | null>(null);
  const [pending, start] = useTransition();
  return (
    <section className={card}>
      <div className={head}><h2 className="text-lg font-semibold">ตั้งค่าบอท</h2><span className="text-[12.5px] text-muted">@OptionPaySupportBot</span></div>
      <form className="grid gap-3 px-[22px] py-4 text-[13px] md:grid-cols-2" onSubmit={(e) => { e.preventDefault(); start(async () => setR(await saveSettings(v))); }}>
        <div className="md:col-span-2"><Err r={r} />{r?.ok && <div role="status" className="text-emerald-300">บันทึกแล้ว</div>}</div>
        <label className="flex items-center gap-2 md:col-span-2"><input type="checkbox" checked={v.enabled} onChange={(e) => setV({ ...v, enabled: e.target.checked })} /> เปิดใช้งานบอท</label>
        <label className="flex items-center gap-2 md:col-span-2"><input type="checkbox" checked={v.allGroups ?? true} onChange={(e) => setV({ ...v, allGroups: e.target.checked })} /> ตอบในทุกกลุ่มที่บอทอยู่ (ไม่ต้องอนุมัติทีละกลุ่ม — ถ้าไม่ติ๊ก ตอบเฉพาะกลุ่มในรายการที่อนุญาต)</label>
        <label className="flex items-center gap-2 md:col-span-2"><input type="checkbox" checked={v.allowPrivate ?? true} onChange={(e) => setV({ ...v, allowPrivate: e.target.checked })} /> ตอบในแชทส่วนตัว (ทุกคนที่เพิ่มบอทเป็นเพื่อนถามได้)</label>
        <div><label htmlFor="sb-t" className={fieldLabel}>Bot token</label>
          <input id="sb-t" className={`${field} font-mono`} value={v.botToken} onChange={(e) => setV({ ...v, botToken: e.target.value })} placeholder="จาก @BotFather" /></div>
        <div><label htmlFor="sb-c" className={fieldLabel}>Chat id ของกลุ่มที่อนุญาต (ใช้เมื่อไม่ได้ติ๊ก “ตอบในทุกกลุ่ม”)</label>
          <input id="sb-c" className={`${field} font-mono`} value={v.allowedChatIds} onChange={(e) => setV({ ...v, allowedChatIds: e.target.value })} placeholder="-1001234567890" /></div>
        <div><label htmlFor="sb-m" className={fieldLabel}>ความใกล้เคียงขั้นต่ำ ({Math.round(v.minScore * 100)}%) — ต่ำ = ตอบง่าย, สูง = ตอบเฉพาะที่ถามตรง</label>
          <input id="sb-m" type="range" min={0.3} max={1} step={0.05} className="w-full" value={v.minScore} onChange={(e) => setV({ ...v, minScore: Number(e.target.value) })} /></div>
        <div className="flex items-end justify-end"><button type="submit" disabled={pending} className={B("primary")}>บันทึกการตั้งค่า</button></div>
      </form>
    </section>
  );
}
