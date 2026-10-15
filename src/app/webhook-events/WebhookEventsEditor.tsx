"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { btn } from "@/components/interactive/Modal";
import { Switch } from "../settings/parts";
import { saveWebhookEvents } from "./actions";

export type EventDef = { code: string; group: string; label: string; when: string };
export type Endpoint = {
  id: number; merchantId: number; merchantName: string; url: string; status: "active" | "disabled"; signed: boolean;
  events: string[]; alertEvents: string[]; alertBots: { id: number; name: string }[];
};

const th = "border-b border-line bg-surface-alt px-4 py-2.5 text-left text-xs font-semibold text-muted";
const td = "border-b border-line px-4 py-3 align-top";

/** One card per shop endpoint: each event has two switches — post to the shop, alert Telegram. */
export function WebhookEventsEditor({ events, endpoint }: { events: EventDef[]; endpoint: Endpoint }) {
  const [send, setSend] = useState(new Set(endpoint.events));
  const [alert, setAlert] = useState(new Set(endpoint.alertEvents));
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const dirty = [...events].some((e) => send.has(e.code) !== endpoint.events.includes(e.code) || alert.has(e.code) !== endpoint.alertEvents.includes(e.code));
  const flip = (set: Set<string>, put: (s: Set<string>) => void, code: string, on: boolean) => {
    const next = new Set(set);
    if (on) next.add(code); else next.delete(code);
    put(next);
    setMsg(null);
  };
  const save = () =>
    start(async () => {
      const r = await saveWebhookEvents(endpoint.id, [...send], [...alert]);
      setMsg(r.ok ? { ok: true, text: "บันทึกแล้ว — มีผลทันที" } : { ok: false, text: r.error });
    });

  const groups = [...new Set(events.map((e) => e.group))];
  const noBot = alert.size > 0 && endpoint.alertBots.length === 0;

  return (
    <section className="mb-6 overflow-hidden rounded-xl border border-line bg-surface">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-5 py-4">
        <div>
          <div className="text-[15px] font-semibold">{endpoint.merchantName}</div>
          <div className="mt-0.5 break-all font-mono text-[12px] text-muted">{endpoint.url}</div>
          <div className="mt-1 text-[12px] text-muted">
            {endpoint.status === "active" ? "ปลายทางเปิดใช้งาน" : <span className="text-danger">ปลายทางปิดอยู่ — ไม่ส่งและไม่แจ้งเตือนจนกว่าจะเปิด</span>}
            {" · "}{endpoint.signed ? "ลงลายเซ็น X-Signature" : "ไม่มี secret — ส่งโดยไม่มีลายเซ็น"}
          </div>
        </div>
        <div className="text-right text-[12px] text-muted">
          แจ้ง Telegram ไปที่:{" "}
          {endpoint.alertBots.length
            ? endpoint.alertBots.map((b) => b.name).join(", ")
            : <span className="text-warning">ยังไม่มี bot</span>}
          <div><Link href="/alerts" className="text-primary hover:underline">ตั้งค่า bot ที่ แจ้งเตือน Telegram →</Link></div>
        </div>
      </header>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-[13px]">
          <thead><tr><th className={th}>Event</th><th className={th}>เกิดขึ้นเมื่อ</th><th className={`${th} text-center`}>ส่งไปยังปลายทาง</th><th className={`${th} text-center`}>แจ้ง Telegram</th></tr></thead>
          <tbody>
            {groups.map((g) => [
              <tr key={g}><td colSpan={4} className="bg-surface-alt/60 px-4 py-1.5 text-[11.5px] font-semibold text-muted">{g}</td></tr>,
              ...events.filter((e) => e.group === g).map((e) => (
                <tr key={e.code}>
                  <td className={`${td} whitespace-nowrap`}><div className="font-medium">{e.label}</div><code className="text-[11.5px] text-muted">{e.code}</code></td>
                  <td className={`${td} text-muted`}>{e.when}</td>
                  <td className={`${td} text-center`}><Switch on={send.has(e.code)} label={`ส่ง ${e.code}`} onChange={(v) => flip(send, setSend, e.code, v)} /></td>
                  <td className={`${td} text-center`}><Switch on={alert.has(e.code)} label={`แจ้ง Telegram ${e.code}`} onChange={(v) => flip(alert, setAlert, e.code, v)} /></td>
                </tr>
              )),
            ])}
          </tbody>
        </table>
      </div>
      <footer className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5">
        <div className="text-[12px] text-muted">
          ส่ง + แจ้ง = แจ้งผลการส่งทุกครั้ง (รวมการลองใหม่) · แจ้งอย่างเดียว = แจ้งว่าเกิด event แต่ไม่ได้ส่งไปยังปลายทาง
          {noBot && <div className="mt-1 text-warning">เปิดแจ้ง Telegram แล้ว แต่ยังไม่มี bot ที่รับ “ผลการส่ง webhook ไปยังร้าน” ของร้านนี้</div>}
          {msg && <div className={`mt-1 ${msg.ok ? "text-success" : "text-danger"}`}>{msg.text}</div>}
        </div>
        <button className={`${btn.base} ${btn.md} ${btn.primary}`} disabled={pending || !dirty} onClick={save}>{pending ? "กำลังบันทึก…" : "บันทึก"}</button>
      </footer>
    </section>
  );
}
