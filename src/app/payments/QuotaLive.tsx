"use client";

import { useEffect, useState } from "react";
import type { LiveQuota } from "@/lib/api";
import { fmtDate, fmtDateTime } from "@/lib/format";
import { AlertPopup, useOnceAlert } from "./AlertPopup";

const EVERY = 30_000;
const ALERT_AT = 1000;   // red counter at or below this many checks left; popup + Thai voice once per package when reached
const NAMES: Record<string, string> = { thunder: "Thunder Solution", slipok: "SlipOK", easyslip: "EasySlip", slip2go: "Slip2Go" };

/** Live slip-checker quota in the payments page header: usage / total, refreshed every 30 s. */
export function QuotaLive() {
  const [q, setQ] = useState<LiveQuota | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let stop = false;
    const load = async () => {
      try {
        const r = await fetch("/poll/quota", { cache: "no-store" });
        const j = (await r.json()) as { quota: LiveQuota | null };
        if (stop) return;
        if (j.quota) { setQ(j.quota); setFailed(false); } else setFailed(true);
      } catch {
        if (!stop) setFailed(true);
      }
    };
    void load();
    const id = setInterval(load, EVERY);
    const onShow = () => { if (document.visibilityState === "visible") void load(); };
    document.addEventListener("visibilitychange", onShow);
    return () => { stop = true; clearInterval(id); document.removeEventListener("visibilitychange", onShow); };
  }, []);

  const name = q?.provider ? NAMES[q.provider] ?? q.provider : "ตรวจสลิป";
  const d = q?.ok ? q.quota : null;
  const low = d?.remaining != null && d.remaining <= Math.max(q?.threshold ?? 0, ALERT_AT);
  const alert = useOnceAlert(d ? `slip-quota-${q?.provider}-${d.expiresAt ?? d.total}` : null, low);
  const bad = (q && !q.ok) || (failed && !q);
  // Stands out on purpose: solid gold normally, solid red (pulsing) when low or unavailable.
  const alarm = bad || low;
  const tone = alarm ? "bg-danger text-white ring-4 ring-danger/30 animate-pulse" : "bg-primary text-primary-fg ring-4 ring-primary/25";

  return (
    <>
    {alert.open && d && (
      <AlertPopup title="แจ้งเตือนโควตาตรวจสลิปใกล้หมด" voice="/sounds/quota-low.mp3" onClose={alert.close}>
        <p className="text-[16px] font-bold">โควตาตรวจสลิป {name} เหลือเพียง {d.remaining?.toLocaleString()} ครั้ง</p>
        <p>ใช้ไปแล้ว {d.used?.toLocaleString() ?? "—"} จาก {d.total?.toLocaleString() ?? "—"} ครั้ง{d.expiresAt && <> · แพ็กเกจหมดอายุ {fmtDate(d.expiresAt)}</>}</p>
        <p className="text-muted">กรุณาเติมแพ็กเกจก่อนโควตาหมด เมื่อโควตาหมด ระบบจะตรวจสลิปอัตโนมัติไม่ได้ และทุกสลิปต้องรอผู้ดูแลตรวจเอง</p>
      </AlertPopup>
    )}
    <div className={`min-w-[280px] rounded-[14px] px-5 py-2.5 text-center shadow-lg ${tone}`} title="อัปเดตอัตโนมัติทุก 30 วินาที">
      <div className="text-[13px] font-extrabold tracking-[0.08em] uppercase">{name} quota usage</div>
      {d ? (
        <>
          <div className="text-[32px] leading-tight font-black tabular-nums">
            {d.used != null ? d.used.toLocaleString() : "—"} / {d.total != null ? d.total.toLocaleString() : "—"}
          </div>
          <div className="text-[13px] font-semibold">
            {d.remaining != null && <>เหลือ {d.remaining.toLocaleString()} ครั้ง{low && " — ใกล้หมด!"} · </>}
            {d.expiresAt && <>หมดอายุ {fmtDate(d.expiresAt)}</>}
          </div>
          <div className="text-[11px] opacity-80">อัปเดต {fmtDateTime(q!.checkedAt)}</div>
        </>
      ) : (
        <div className="py-1 text-[15px] font-bold">{q ? q.message : failed ? "ดึงโควตาไม่ได้" : "กำลังโหลด…"}</div>
      )}
    </div>
    </>
  );
}
