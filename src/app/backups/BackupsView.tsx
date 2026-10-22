"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Clock, DatabaseBackup, HardDriveDownload, Loader2, RotateCcw, ShieldAlert, XCircle } from "lucide-react";
import { Modal, btn, field, fieldLabel } from "@/components/interactive/Modal";
import { Card, CardHead } from "@/components/ui";
import { fmtDateTime, fmtMoney } from "@/lib/format";
import { backupNow, loadBackups, loadImpact, restoreBackup } from "./actions";
import { ChangesView } from "./ChangesView";
import type { BackupFile, BackupJob, BackupOverview, RestoreImpact } from "./types";

const size = (b: string | number) => {
  const n = Number(b);
  return n >= 1 << 30 ? `${(n / (1 << 30)).toFixed(2)} GB` : `${(n / (1 << 20)).toFixed(0)} MB`;
};
const CONFIRM_WORD = "กู้คืน";

function JobBadge({ j }: { j: BackupJob }) {
  if (j.status === "done") return <span className="inline-flex items-center gap-1 text-success"><CheckCircle2 size={14} /> สำเร็จ</span>;
  if (j.status === "failed") return <span className="inline-flex items-center gap-1 text-danger"><XCircle size={14} /> ไม่สำเร็จ</span>;
  return <span className="inline-flex items-center gap-1 text-warning"><Loader2 size={14} className="animate-spin" /> {j.status === "requested" ? "รอเริ่ม" : "กำลังทำ"}</span>;
}

/** The full-restore dialog: what will be lost, a reason, the confirm word, and the user's own password (+ 2FA). */
function RestoreDialog({ file, onClose, onQueued }: { file: BackupFile; onClose: () => void; onQueued: () => void }) {
  const [impact, setImpact] = useState<RestoreImpact | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [word, setWord] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [needCode, setNeedCode] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => { loadImpact(file.name).then((r) => (r.ok ? setImpact(r) : setErr(r.error))); }, [file.name]);
  const i = impact?.impact;
  const ready = reason.trim().length >= 5 && word.trim() === CONFIRM_WORD && password.length > 0 && (!needCode || code.trim().length >= 6);
  const submit = async () => {
    setBusy(true); setErr(null);
    const r = await restoreBackup(file.name, reason, password, needCode ? code : undefined);
    setBusy(false);
    if (!r.ok) { setErr(r.error); if (r.needCode) setNeedCode(true); return; }
    onQueued();
  };
  return (
    <Modal title="กู้คืนฐานข้อมูลทั้งหมด" onClose={onClose} width={620}
      footer={<>
        <button type="button" className={`${btn.base} ${btn.md} ${btn.ghost}`} onClick={onClose}>ยกเลิก</button>
        <button type="button" disabled={!ready || busy} className={`${btn.base} ${btn.md} ${btn.danger}`} onClick={submit}>
          {busy ? <Loader2 size={14} className="animate-spin" /> : <RotateCcw size={14} />} กู้คืนจากไฟล์นี้
        </button>
      </>}>
      <div className="grid gap-4 text-[14px]">
        <div className="rounded-lg border border-line bg-surface-alt p-3">
          <div className="font-mono text-[13px]">{file.name}</div>
          <div className="text-muted">สำรองเมื่อ <b className="text-ink">{fmtDateTime(file.takenAt)}</b> · {size(file.sizeBytes)} · {file.tables ?? "—"} ตาราง</div>
        </div>
        <div className="rounded-lg border border-danger/50 bg-danger/10 p-3">
          <div className="mb-1.5 flex items-center gap-2 font-semibold text-danger"><ShieldAlert size={16} /> ข้อมูลทั้งระบบจะย้อนกลับไปเป็นของเวลา {fmtDateTime(file.takenAt)}</div>
          {!i && !err && <div className="text-muted"><Loader2 size={13} className="mr-1 inline animate-spin" /> กำลังนับข้อมูลที่จะหายไป…</div>}
          {i && (
            <ul className="grid gap-1 text-ink">
              <li>• รายการชำระเงินที่สร้างหลังเวลานั้น <b>{i.paymentsCreated.toLocaleString("th-TH")}</b> รายการ จะหายไป</li>
              <li>• รายการเดิมที่ถูกอนุมัติ / ปฏิเสธหลังเวลานั้น <b>{i.paymentsDecided.toLocaleString("th-TH")}</b> รายการ จะกลับเป็นสถานะเดิม (ยอดอนุมัติหลังเวลานั้นรวม {fmtMoney(i.approvedAmount)})</li>
              <li>• รายการเงินออกหลังเวลานั้น <b>{i.payoutsCreated.toLocaleString("th-TH")}</b> รายการ ({fmtMoney(i.payoutAmount)}) และคำขอถอน <b>{i.withdrawalsCreated}</b> รายการ จะหายไป</li>
              <li>• ประวัติ callback {i.callbacksSent.toLocaleString("th-TH")} ครั้ง และบันทึกการตรวจสอบ {i.auditEntries.toLocaleString("th-TH")} รายการหลังเวลานั้น จะหายไป</li>
              <li>• ผู้ใช้ ร้านค้า บัญชี และการตั้งค่าที่เพิ่ม/แก้หลังเวลานั้น จะกลับเป็นแบบเดิม</li>
            </ul>
          )}
          <div className="mt-2 text-[12.5px] text-muted">
            เงินที่โอนจริงในธนาคารหลังเวลานั้นจะไม่ถูกย้อนคืน — ต้องตามบันทึกเองภายหลัง · ระบบหยุดใช้งานไม่กี่วินาทีระหว่างสลับฐานข้อมูล ·
            ฐานข้อมูลปัจจุบันจะ<b className="text-ink">เก็บสำรองไว้</b> (ไม่ลบ) เพื่อย้อนกลับได้ถ้ากู้คืนผิดไฟล์
          </div>
        </div>
        <label className="block">
          <span className={fieldLabel}>เหตุผลที่กู้คืน *</span>
          <input className={field} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="เช่น ผู้ดูแลลบรายการผิดเมื่อ 10:30" />
        </label>
        <label className="block">
          <span className={fieldLabel}>พิมพ์คำว่า <b className="text-danger">{CONFIRM_WORD}</b> เพื่อยืนยัน *</span>
          <input className={field} value={word} onChange={(e) => setWord(e.target.value)} placeholder={CONFIRM_WORD} />
        </label>
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

export function BackupsView({ initial, error }: { initial: BackupOverview | null; error: string | null }) {
  const [data, setData] = useState<BackupOverview | null>(initial);
  const [loadErr, setLoadErr] = useState<string | null>(error);
  const [restoring, setRestoring] = useState<BackupFile | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const open = data?.jobs.find((j) => j.status === "requested" || j.status === "running") ?? null;

  // Poll while a job runs (every 4 s) — during the database swap the backend is down for a few seconds.
  useEffect(() => {
    const id = setInterval(() => {
      loadBackups().then((r) => { if (r.ok) { setData(r); setLoadErr(null); } else if (open) setLoadErr(r.error); }).catch(() => {});
    }, open ? 4000 : 30000);
    return () => clearInterval(id);
  }, [open]);
  const refresh = () => loadBackups().then((r) => (r.ok ? setData(r) : setLoadErr(r.error)));

  const runNow = async () => {
    const r = await backupNow();
    setNotice(r.ok ? "เริ่มสำรองข้อมูลแล้ว — ใช้เวลาประมาณ 3 นาที" : r.error);
    refresh();
  };

  if (!data) return <Card className="p-5 text-danger">โหลดข้อมูลสำรองไม่ได้: {loadErr}</Card>;
  const latest = data.files[0];
  const lastJobs = data.jobs.slice(0, 10);
  return (
    <div className="grid gap-5">
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-5">
          <div className="flex items-center gap-2 text-[13px] text-muted"><Clock size={15} /> รอบสำรองอัตโนมัติ</div>
          <div className="mt-1 text-[22px] font-bold">ทุกคืน {data.schedule.time} น.</div>
          <div className="text-[12.5px] text-muted">{data.schedule.keepDays ? `เก็บย้อนหลัง ${data.schedule.keepDays} วัน` : "เก็บถาวร (ไม่ลบอัตโนมัติ)"} · บันทึกระหว่างวันเก็บ {data.schedule.changesKeepDays} วัน · บนเซิร์ฟเวอร์</div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-2 text-[13px] text-muted"><DatabaseBackup size={15} /> สำรองล่าสุด</div>
          <div className="mt-1 text-[22px] font-bold">{latest ? fmtDateTime(latest.takenAt) : "—"}</div>
          <div className="text-[12.5px] text-muted">{latest ? `${size(latest.sizeBytes)} · ${latest.tables ?? "—"} ตาราง` : "ยังไม่มีไฟล์สำรอง"}</div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-2 text-[13px] text-muted"><HardDriveDownload size={15} /> ไฟล์ที่เก็บอยู่</div>
          <div className="mt-1 text-[22px] font-bold">{data.files.length} ไฟล์</div>
          <div className="text-[12.5px] text-muted">รวม {size(data.files.reduce((t, f) => t + Number(f.sizeBytes), 0))}</div>
          {data.canManage && (
            <button type="button" disabled={!!open} onClick={runNow} className={`${btn.base} ${btn.sm} ${btn.ghost} mt-2`}>
              <DatabaseBackup size={14} /> สำรองข้อมูลตอนนี้
            </button>
          )}
        </Card>
      </div>

      {notice && <Card className="p-4 text-[14px]">{notice}</Card>}
      {open && (
        <Card className="flex items-start gap-3 border-warning/50 p-4">
          <Loader2 size={18} className="mt-0.5 animate-spin text-warning" />
          <div className="text-[14px]">
            <div className="font-semibold">{open.kind === "restore" ? `กำลังกู้คืนจาก ${open.file}` : "กำลังสำรองข้อมูล"} — โดย {open.requestedBy}</div>
            <div className="text-muted">{open.step ?? "รอระบบเริ่มทำงาน (ภายใน 10 วินาที)…"}</div>
            {loadErr && <div className="text-[12.5px] text-soft">{loadErr}</div>}
          </div>
        </Card>
      )}

      <Card>
        <CardHead title="ไฟล์สำรองข้อมูล" />
        <div className="overflow-x-auto">
          <table className="w-full text-[14px]">
            <thead className="border-b border-line bg-surface-alt text-left text-[12px] text-muted uppercase">
              <tr><th className="px-4 py-2.5">สำรองเมื่อ</th><th className="px-4 py-2.5">ไฟล์</th><th className="px-4 py-2.5 text-right">ขนาด</th><th className="px-4 py-2.5 text-right">ตาราง</th><th className="px-4 py-2.5 text-right">กู้คืน</th></tr>
            </thead>
            <tbody>
              {data.files.map((f, idx) => (
                <tr key={f.name} className="border-b border-line/60 last:border-0">
                  <td className="px-4 py-3 font-semibold whitespace-nowrap">{fmtDateTime(f.takenAt)}{idx === 0 && <span className="ml-2 rounded-full bg-success/15 px-2 py-0.5 text-[11px] text-success">ล่าสุด</span>}</td>
                  <td className="px-4 py-3 font-mono text-[12.5px] text-muted">{f.name}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{size(f.sizeBytes)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{f.tables ?? "—"}</td>
                  <td className="px-4 py-3 text-right">
                    {data.canManage ? (
                      <button type="button" disabled={!!open} onClick={() => setRestoring(f)} className={`${btn.base} ${btn.sm} ${btn.dangerGhost}`}>
                        <RotateCcw size={13} /> กู้คืนจากไฟล์นี้
                      </button>
                    ) : <span className="text-[12px] text-soft">เฉพาะ Super Admin</span>}
                  </td>
                </tr>
              ))}
              {!data.files.length && <tr><td colSpan={5} className="px-4 py-8 text-center text-soft">ยังไม่มีไฟล์สำรอง — รอบแรกจะสำรองคืนนี้ {data.schedule.time} น.</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>

      <Card>
        <CardHead title="ประวัติการสำรอง / กู้คืน" />
        <div className="divide-y divide-line">
          {lastJobs.map((j) => (
            <div key={j.id} className="grid gap-1 px-5 py-3 text-[13.5px] md:grid-cols-[150px_120px_1fr]">
              <div className="text-muted">{fmtDateTime(j.requestedAt)}</div>
              <div><JobBadge j={j} /></div>
              <div>
                <b>{j.kind === "restore" ? `กู้คืนจาก ${j.file}` : "สำรองข้อมูลทันที"}</b> · โดย {j.requestedBy}
                {j.reason && <div className="text-muted">เหตุผล: {j.reason}</div>}
                {(j.step || j.message) && <div className="text-[12.5px] break-words text-soft">{j.step ?? j.message}</div>}
              </div>
            </div>
          ))}
          {!lastJobs.length && <div className="px-5 py-6 text-center text-soft">ยังไม่มีการสำรองด้วยมือหรือการกู้คืน (รอบอัตโนมัติทุกคืนบันทึกในรายการไฟล์ด้านบน)</div>}
        </div>
        {data.keptDatabases.length > 0 && (
          <div className="border-t border-line px-5 py-3 text-[12.5px] text-muted">
            ฐานข้อมูลก่อนกู้คืนที่เก็บไว้ (ย้อนกลับได้ ติดต่อผู้ดูแลเซิร์ฟเวอร์): {data.keptDatabases.join(", ")}
          </div>
        )}
      </Card>

      <ChangesView canManage={data.canManage} />

      {restoring && (
        <RestoreDialog file={restoring} onClose={() => setRestoring(null)}
          onQueued={() => { setRestoring(null); setNotice("ส่งคำขอกู้คืนแล้ว — ระบบจะเริ่มภายใน 10 วินาที ติดตามความคืบหน้าได้ที่หน้านี้"); refresh(); }} />
      )}
    </div>
  );
}
