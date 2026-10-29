"use client";

import { useEffect, useState } from "react";
import type { EasySlipDaily, LiveQuota } from "@/lib/api";
import { Modal } from "@/components/interactive/Modal";
import { fmtDate, fmtDateTime } from "@/lib/format";
import { AlertPopup, useOnceAlert } from "./AlertPopup";

const EVERY = 30_000;
const ALERT_AT = 1000;   // red counter at or below this many checks left; popup + Thai voice once per package when reached
const NAMES: Record<string, string> = { thunder: "Thunder Solution", slipok: "SlipOK", easyslip: "EasySlip", slip2go: "Slip2Go" };

/** Live slip-checker quota in the payments page header: usage / total, refreshed every 30 s. */
export function QuotaLive() {
  const [q, setQ] = useState<LiveQuota | null>(null);
  const [failed, setFailed] = useState(false);
  const [daily, setDaily] = useState<EasySlipDaily | "loading" | "error" | null>(null);
  const openDaily = async () => {
    setDaily("loading");
    try {
      const r = await fetch("/poll/quota-daily", { cache: "no-store" });
      setDaily(r.ok ? ((await r.json()) as EasySlipDaily) : "error");
    } catch { setDaily("error"); }
  };
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
    {daily && <DailyModal data={daily} onClose={() => setDaily(null)} />}
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
          <button type="button" onClick={openDaily} className="mt-1.5 rounded-md border border-current/40 px-2.5 py-0.5 text-[12px] font-semibold hover:bg-black/10">ดูการใช้งานรายวัน</button>
        </>
      ) : (
        <div className="py-1 text-[15px] font-bold">{q ? q.message : failed ? "ดึงโควตาไม่ได้" : "กำลังโหลด…"}</div>
      )}
    </div>
    </>
  );
}

const PURPOSE: [string, string][] = [
  ["slip_api", "สลิปผ่าน API ร้าน"], ["slip_checkout", "สลิปจากหน้าชำระเงิน"], ["slip_admin", "ผู้ดูแลแนบสลิป"], ["slip_recheck", "ตรวจซ้ำอัตโนมัติ"],
  ["telegram_bot", "บอทตรวจสลิป"], ["validation_report", "รายงานผลตรวจ"], ["settings_test", "ทดสอบในตั้งค่า"], ["transfer_backfill", "เติมเลขอ้างอิง"], ["other", "อื่น ๆ"],
];
const bkkDay = (d: string) => new Date(`${d}T00:00:00+07:00`).toLocaleDateString("th-TH", { timeZone: "Asia/Bangkok", weekday: "short", day: "numeric", month: "short" });

/** EasySlip calls per day: what made the "used" number in the card (from the backend's call log, since logging began). */
function DailyModal({ data, onClose }: { data: EasySlipDaily | "loading" | "error"; onClose: () => void }) {
  const th = "border-b border-line bg-surface-alt px-2.5 py-2 text-right text-[11.5px] font-semibold text-muted whitespace-nowrap";
  const td = "border-b border-line px-2.5 py-1.5 text-right tabular-nums text-[12.5px]";
  if (data === "loading" || data === "error") {
    return <Modal title="การใช้งาน EasySlip รายวัน" onClose={onClose} width={560}><div className="py-6 text-center text-muted">{data === "loading" ? "กำลังโหลด…" : "โหลดข้อมูลไม่สำเร็จ ลองใหม่อีกครั้ง"}</div></Modal>;
  }
  const used = data.quota?.ok ? data.quota.quota?.used ?? null : null;
  const cols = PURPOSE.filter(([k]) => data.days.some((d) => d.byPurpose?.[k]));
  const tot = data.days.reduce((a, d) => ({ calls: a.calls + d.calls, found: a.found + d.found, notFound: a.notFound + d.notFound, other: a.other + d.pending + d.errors }), { calls: 0, found: 0, notFound: 0, other: 0 });
  return (
    <Modal title="การใช้งาน EasySlip รายวัน" onClose={onClose} width={Math.min(1100, 560 + cols.length * 90)}>
      <div className="mb-3 text-[12.5px] text-muted">
        นับทุกครั้งที่ระบบเรียก EasySlip ตรวจสลิป (1 สลิปอาจเรียกมากกว่า 1 ครั้ง เช่น ธนาคารยังประมวลผล — ระบบถามซ้ำหลัง 3 และ 5 วินาที)
        {data.loggingSince && <> · เริ่มบันทึก {fmtDateTime(data.loggingSince)}</>}
      </div>
      {data.days.length === 0 ? <div className="py-6 text-center text-muted">ยังไม่มีการเรียก EasySlip ตั้งแต่เริ่มบันทึก</div> : (
        <div className="overflow-x-auto rounded-lg border border-line">
          <table className="w-full border-collapse">
            <thead><tr>
              <th className={`${th} text-left`}>วันที่</th><th className={th}>เรียกทั้งหมด</th><th className={th}>พบสลิป</th><th className={th}>ไม่พบ / สลิปไม่ถูกต้อง</th><th className={th}>รอธนาคาร / ผิดพลาด</th>
              {cols.map(([k, l]) => <th key={k} className={th}>{l}</th>)}
            </tr></thead>
            <tbody>
              {data.days.map((d) => (
                <tr key={d.day}>
                  <td className={`${td} text-left whitespace-nowrap`}>{bkkDay(d.day)}</td>
                  <td className={`${td} font-semibold`}>{d.calls.toLocaleString()}</td>
                  <td className={td}>{d.found.toLocaleString()}</td>
                  <td className={td}>{d.notFound.toLocaleString()}</td>
                  <td className={td}>{(d.pending + d.errors).toLocaleString()}</td>
                  {cols.map(([k]) => <td key={k} className={`${td} text-muted`}>{(d.byPurpose?.[k] ?? 0).toLocaleString()}</td>)}
                </tr>
              ))}
            </tbody>
            <tfoot><tr className="bg-surface-alt font-bold">
              <td className={`${td} text-left`}>รวม</td><td className={td}>{tot.calls.toLocaleString()}</td><td className={td}>{tot.found.toLocaleString()}</td>
              <td className={td}>{tot.notFound.toLocaleString()}</td><td className={td}>{tot.other.toLocaleString()}</td>
              {cols.map(([k]) => <td key={k} className={td}>{data.days.reduce((a, d) => a + (d.byPurpose?.[k] ?? 0), 0).toLocaleString()}</td>)}
            </tr></tfoot>
          </table>
        </div>
      )}
      {used != null && (
        <div className="mt-3 text-[12.5px] text-muted">
          EasySlip รายงานว่าแพ็กเกจปัจจุบันใช้ไป <strong className="text-ink">{used.toLocaleString()}</strong> ครั้ง · ระบบบันทึกการเรียกได้ <strong className="text-ink">{tot.calls.toLocaleString()}</strong> ครั้ง
          (พบสลิป {tot.found.toLocaleString()}) — ตัวเลขอาจต่างกันได้ ถ้าแพ็กเกจเริ่มก่อนวันที่เริ่มบันทึก หรือ EasySlip นับโควตาเฉพาะบางผลลัพธ์
        </div>
      )}
    </Modal>
  );
}
