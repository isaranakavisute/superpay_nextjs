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
  const tot = data.days.reduce((a, d) => ({ calls: a.calls + d.calls, found: a.found + d.found, notFound: a.notFound + d.notFound, other: a.other + d.pending + d.errors, errors: a.errors + d.errors }), { calls: 0, found: 0, notFound: 0, other: 0, errors: 0 });
  // "รวม" = what EasySlip itself counts on the package (2 Nov 2026: the totals must match EasySlip). The rows above are
  // this system's own log (why each call was made); the line between them shows the difference.
  const diff = used != null ? tot.calls - used : null;
  // The package (2 Nov 2026: "show the EasySlip package I am using") — EasySlip's own figures + a forecast from recent use.
  const pk = data.quota?.ok ? data.quota.quota : null;
  const recent = data.days.slice(0, 7).filter((d) => d.day !== data.days[0]?.day || data.days.length === 1);
  const perDay = recent.length ? Math.round(recent.reduce((a, d) => a + d.calls, 0) / recent.length) : null;
  const daysLeft = pk?.expiresAt ? Math.max(0, Math.ceil((new Date(pk.expiresAt).getTime() - new Date(data.quota!.checkedAt).getTime()) / 86_400_000)) : null;
  const lastsDays = pk?.remaining != null && perDay ? Math.floor(pk.remaining / perDay) : null;
  return (
    <Modal title="การใช้งาน EasySlip รายวัน" onClose={onClose} width={Math.min(1100, 560 + cols.length * 90)}>
      {pk && (
        <div className="mb-4 rounded-xl border border-primary/40 bg-primary/5 px-4 py-3 text-[13px]">
          <div className="mb-2 font-semibold">แพ็กเกจ EasySlip ที่ใช้อยู่{pk.plan ? ` — ${pk.plan}` : ""}</div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 sm:grid-cols-3">
            <div><span className="text-muted">ขนาดแพ็กเกจ</span> <b className="tabular-nums">{pk.total?.toLocaleString() ?? "—"}</b> ครั้ง</div>
            <div><span className="text-muted">ใช้ไป</span> <b className="tabular-nums">{pk.used?.toLocaleString() ?? "—"}</b>{pk.total && pk.used != null ? <span className="text-muted"> ({Math.round((pk.used / pk.total) * 100)}%)</span> : null}</div>
            <div><span className="text-muted">เหลือ</span> <b className="tabular-nums text-primary">{pk.remaining?.toLocaleString() ?? "—"}</b> ครั้ง</div>
            <div><span className="text-muted">หมดอายุ</span> <b>{pk.expiresAt ? fmtDateTime(pk.expiresAt) : "—"}</b>{daysLeft != null ? <span className="text-muted"> (อีก {daysLeft} วัน)</span> : null}</div>
            {pk.credit != null && <div><span className="text-muted">เครดิตคงเหลือ</span> <b className="tabular-nums">{pk.credit.toLocaleString()}</b></div>}
            {perDay != null && <div><span className="text-muted">ใช้เฉลี่ย</span> <b className="tabular-nums">{perDay.toLocaleString()}</b> ครั้ง/วัน</div>}
          </div>
          {lastsDays != null && daysLeft != null && (
            <div className={`mt-2 text-[12.5px] ${lastsDays < daysLeft ? "text-warning" : "text-muted"}`}>
              {lastsDays < daysLeft
                ? `⚠️ ที่อัตราใช้ปัจจุบัน โควตาจะหมดในประมาณ ${lastsDays} วัน — ก่อนแพ็กเกจหมดอายุ ${daysLeft - lastsDays} วัน`
                : `ที่อัตราใช้ปัจจุบัน โควตาพอใช้ประมาณ ${lastsDays} วัน — เกินวันหมดอายุของแพ็กเกจ`}
            </div>
          )}
          <div className="mt-1 text-[11.5px] text-soft">ข้อมูลจาก EasySlip โดยตรง · ตรวจเมื่อ {fmtDateTime(data.quota!.checkedAt)}</div>
        </div>
      )}
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
            <tfoot>
              <tr className={used != null ? "text-muted" : "bg-surface-alt font-bold"}>
                <td className={`${td} text-left whitespace-nowrap`}>{used != null ? "ระบบบันทึก" : "รวม"}</td><td className={td}>{tot.calls.toLocaleString()}</td><td className={td}>{tot.found.toLocaleString()}</td>
                <td className={td}>{tot.notFound.toLocaleString()}</td><td className={td}>{tot.other.toLocaleString()}</td>
                {cols.map(([k]) => <td key={k} className={td}>{data.days.reduce((a, d) => a + (d.byPurpose?.[k] ?? 0), 0).toLocaleString()}</td>)}
              </tr>
              {used != null && diff != null && (
                <tr className="text-muted">
                  <td className={`${td} text-left whitespace-nowrap`}>{diff >= 0 ? "EasySlip ไม่นับ" : "นับก่อนเริ่มบันทึก"}</td>
                  <td className={td}>{diff >= 0 ? `−${diff.toLocaleString()}` : `+${(-diff).toLocaleString()}`}</td>
                  <td className={`${td} text-left`} colSpan={3 + cols.length}>{diff >= 0 ? `การเรียกที่ EasySlip ไม่คิดโควตา — ส่วนใหญ่เป็นครั้งที่ไม่ได้คำตอบ (หมดเวลา/เชื่อมต่อไม่ได้ ${tot.errors.toLocaleString()} ครั้ง)` : "แพ็กเกจเริ่มก่อนวันที่ระบบเริ่มบันทึก"}</td>
                </tr>
              )}
              {used != null && (
                <tr className="bg-surface-alt font-bold">
                  <td className={`${td} text-left`}>รวม (ตาม EasySlip)</td><td className={td}>{used.toLocaleString()}</td>
                  <td className={`${td} text-left font-normal text-muted`} colSpan={3 + cols.length}>ตรงกับโควตาที่ EasySlip นับ (อัปเดต {data.quota?.ok && data.quota.checkedAt ? fmtDateTime(data.quota.checkedAt) : "ล่าสุด"})</td>
                </tr>
              )}
            </tfoot>
          </table>
        </div>
      )}
      {used != null && (
        <div className="mt-3 text-[12.5px] text-muted">
          รวมด้านบนเป็นตัวเลขของ EasySlip (แพ็กเกจปัจจุบันใช้ไป <strong className="text-ink">{used.toLocaleString()}</strong> ครั้ง) · รายวันเป็นบันทึกของระบบเอง ({tot.calls.toLocaleString()} ครั้ง พบสลิป {tot.found.toLocaleString()}) ซึ่งรวมครั้งที่ EasySlip ไม่คิดโควตาด้วย
        </div>
      )}
    </Modal>
  );
}
