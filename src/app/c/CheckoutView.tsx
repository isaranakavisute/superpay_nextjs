"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Clock, Copy, Download, Upload, XCircle } from "lucide-react";
import { renderSampleSlip, type SampleSlip } from "@/lib/sample-slip";
import { uploadSlip } from "./actions";

type Props = { token: string; status: string; amount: number; expiresAt: string | null; hasSlip: boolean; slipLocked: boolean; slipProblems: string[] | null; order: SampleSlip };
const money = (n: number) => n.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function CopyButton({ text, label }: { text: string; label: string }) {
  const [done, setDone] = useState(false);
  return (
    <button type="button" aria-label={`คัดลอก${label}`} onClick={() => { void navigator.clipboard?.writeText(text); setDone(true); setTimeout(() => setDone(false), 1500); }} className="inline-flex items-center gap-1 rounded-md border border-line px-2 py-1 text-[11.5px] text-muted hover:text-ink">
      <Copy size={12} /> {done ? "คัดลอกแล้ว" : "คัดลอก"}
    </button>
  );
}

/** Countdown, live status (polls every 5 s) and slip upload for a pending order. */
export function CheckoutLive({ token, status, amount, expiresAt, hasSlip, slipLocked, slipProblems, order }: Props) {
  const router = useRouter();
  const [now, setNow] = useState(() => Date.now());
  const [slip, setSlip] = useState<File | null>(null);
  // One slip per order: once one is accepted or under review, uploading is closed (a rejected slip may be replaced).
  const [locked, setLocked] = useState(slipLocked);
  const [msg, setMsg] = useState<{ ok: boolean; text: string; list?: string[] } | null>(hasSlip && !slipLocked
    ? { ok: false, text: slipProblems?.length === 1 ? `สลิปที่แนบก่อนหน้าไม่ผ่าน: ${slipProblems[0]}` : "สลิปที่แนบก่อนหน้าไม่ผ่าน — แนบสลิปที่ถูกต้องอีกครั้ง:", list: slipProblems && slipProblems.length > 1 ? slipProblems : undefined }
    : null);
  const [pending, start] = useTransition();

  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), 1000);
    const poll = setInterval(async () => {
      const r = await fetch(`/c/status?t=${token}`, { cache: "no-store" }).then((x) => x.json()).catch(() => null);
      if (r?.status && r.status !== status) router.refresh();
    }, 5000);
    return () => { clearInterval(tick); clearInterval(poll); };
  }, [token, status, router]);

  const left = expiresAt ? Math.max(0, new Date(expiresAt).getTime() - now) : null;
  useEffect(() => { if (left === 0) router.refresh(); }, [left, router]);
  const mm = left != null ? `${String(Math.floor(left / 60000)).padStart(2, "0")}:${String(Math.floor((left % 60000) / 1000)).padStart(2, "0")}` : null;

  const send = () => slip && start(async () => {
    const data = await new Promise<string>((res, rej) => { const fr = new FileReader(); fr.onload = () => res(String(fr.result).split(",")[1] ?? ""); fr.onerror = () => rej(fr.error); fr.readAsDataURL(slip); });
    const r = await uploadSlip(token, { mime: slip.type, data });
    if (!r.ok) {
      if ("code" in r && r.code === "SLIP_ALREADY_UPLOADED") setLocked(true);
      return setMsg({ ok: false, text: r.error });
    }
    if (r.result !== "INVALID_SLIP") setLocked(true);
    const invalid = r.result === "INVALID_SLIP";
    setMsg({ ok: !invalid, text: r.result === "PAID" ? "ชำระเงินสำเร็จ" : invalid ? (r.mismatches.length > 1 ? "สลิปไม่ผ่าน — ไม่ตรงกับรายการนี้:" : `สลิปไม่ผ่าน: ${r.mismatches[0] ?? r.message ?? ""}`) : "ได้รับสลิปแล้ว — รอเจ้าหน้าที่ตรวจสอบ", list: invalid && r.mismatches.length > 1 ? r.mismatches : undefined });
    if (r.result === "PAID") router.refresh();
  });

  return (
    <>
      {mm && (
        <div className={`mt-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12.5px] ${left! < 60_000 ? "bg-red-500/15 text-red-300" : "bg-surface-alt text-muted"}`}>
          <Clock size={13} /> ชำระภายใน <strong className="tabular-nums">{mm}</strong>
        </div>
      )}
      <div className="mt-5 rounded-xl border border-dashed border-line p-4 text-left">
        {locked ? (
          <div role="status" className="flex items-start gap-2 text-[13px]">
            <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-300" />
            <div><div className="font-semibold text-emerald-300">ได้รับสลิปแล้ว — กำลังตรวจสอบ</div>
              <div className="mt-0.5 text-[12px] text-muted">รายการนี้แนบสลิปได้ครั้งเดียว ไม่ต้องส่งซ้ำ · หน้านี้จะอัปเดตเองเมื่อยืนยันเสร็จ หากมีปัญหาโปรดติดต่อร้านค้า</div></div>
          </div>
        ) : (<>
        <div className="mb-1 text-[13px] font-semibold">โอนแล้ว? แนบสลิปเพื่อยืนยัน</div>
        <div className="mb-2.5 text-[12px] text-muted">ระบบตรวจสลิปกับธนาคารทันที — ข้อมูลตรงครบ ยืนยันการชำระอัตโนมัติ · ยอดในสลิปต้องเป็น ฿{money(amount)} · แนบได้ครั้งเดียว</div>
        <div className="flex flex-wrap items-center gap-2">
          <input type="file" accept="image/png,image/jpeg,image/webp" aria-label="เลือกรูปสลิป" className="min-w-0 flex-1 text-[12.5px]" onChange={(e) => { setSlip(e.target.files?.[0] ?? null); setMsg(null); }} />
          <button type="button" disabled={!slip || pending} onClick={send} className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-[13px] font-medium text-primary-fg disabled:opacity-50"><Upload size={14} /> {pending ? "กำลังส่ง..." : "ส่งสลิป"}</button>
        </div>
        {msg && (
          <div role="status" className={`mt-2.5 flex items-center gap-1.5 text-[12.5px] ${msg.ok ? "text-emerald-300" : "text-red-300"}`}>
            {msg.ok ? <CheckCircle2 size={14} className="shrink-0" /> : <XCircle size={14} className="shrink-0" />} {msg.text}
          </div>
        )}
        {msg?.list && (
          <ul className="mt-1.5 list-disc space-y-1 pl-9 text-[12.5px] text-red-300">{msg.list.map((x) => <li key={x}>{x}</li>)}</ul>
        )}
        <SlipGuideline order={order} />
        </>)}
      </div>
    </>
  );
}

/** Slip upload guideline under the upload button: what must match this order exactly, and what the slip must show. */
function SlipGuideline({ order }: { order: SampleSlip }) {
  const { amount, customerName } = order;
  const receiver = `${order.bankName}${order.accountNo ? ` ${order.accountNo}` : ""}${order.accountName ? ` (${order.accountName})` : ""}`;
  const [busy, setBusy] = useState(false);
  // Watermarked guide built from this order; the backend refuses it on upload.
  const download = async () => {
    setBusy(true);
    try {
      const a = document.createElement("a");
      a.href = (await renderSampleSlip(order)).toDataURL("image/jpeg", 0.92);
      a.download = `ตัวอย่างสลิป-${order.ref}.jpg`;
      a.click();
    } finally { setBusy(false); }
  };
  const h = "mb-1 text-[12px] font-semibold text-ink";
  return (
    <div className="mt-4 border-t border-line pt-3.5 text-[12px] leading-relaxed text-muted">
      <div className="mb-2 text-[13px] font-semibold text-ink">แนวทางการแนบสลิป</div>
      <div className={h}>ระบบตรวจกับธนาคาร — ยอดเงิน บัญชีผู้รับ และวันเวลาที่โอนต้องตรง ไม่ตรงข้อใด สลิปไม่ผ่าน</div>
      <ul className="mb-3 list-disc space-y-0.5 pl-5">
        <li>ยอดเงิน <strong className="text-ink">฿{money(amount)}</strong> — ตรงทุกสตางค์ ห้ามปัดเศษ</li>
        <li>บัญชีผู้รับ <strong className="text-ink">{receiver}</strong> — ธนาคารและเลขบัญชีต้องตรง</li>
        {customerName
          ? <li>ชื่อผู้โอน <strong className="text-ink">{customerName}</strong> — ผู้อื่นโอนแทนได้ (เช่น ครอบครัว) ระบบจะแจ้งร้านค้าไว้</li>
          : <li>ชื่อผู้โอน — รายการนี้ไม่ได้ระบุ จึงไม่ตรวจ</li>}
        <li>วันเวลาที่โอน — <strong className="text-ink">หลังสร้างรายการนี้</strong> และไม่ใช่สลิปเก่า</li>
      </ul>
      <div className={h}>สลิปต้องแสดงข้อมูลเหล่านี้ให้ครบและชัด</div>
      <ul className="mb-3 list-disc space-y-0.5 pl-5">
        <li>สถานะโอนสำเร็จ พร้อมวันและเวลาที่โอน</li>
        <li>ชื่อและเลขบัญชี (บางส่วน) ของผู้โอนและผู้รับ พร้อมชื่อธนาคาร</li>
        <li>จำนวนเงิน และเลขที่รายการ</li>
        <li><strong className="text-ink">QR สำหรับตรวจสอบสลิป</strong> — ครบทั้งรูป ไม่ถูกบัง</li>
      </ul>
      <div className={h}>ข้อห้ามและข้อจำกัด</div>
      <ul className="list-disc space-y-0.5 pl-5">
        <li>ใช้ภาพสลิปจากแอปธนาคารโดยตรง — ห้ามครอป แต่งภาพ หรือถ่ายจากหน้าจออื่น</li>
        <li>ไฟล์ JPG, PNG หรือ WEBP ขนาดไม่เกิน 8 MB</li>
        <li>สลิป 1 ใบใช้ได้กับรายการเดียว และแนบได้ครั้งเดียว (แนบใหม่ได้เฉพาะเมื่อสลิปก่อนหน้าไม่ผ่าน)</li>
        <li>ภาพตัวอย่างสลิปใช้แนบไม่ได้</li>
      </ul>
      <button type="button" disabled={busy} onClick={download} className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-[12.5px] text-ink hover:bg-surface-alt disabled:opacity-50">
        <Download size={14} /> {busy ? "กำลังสร้าง..." : "ดาวน์โหลดตัวอย่างสลิปของรายการนี้ (JPG)"}
      </button>
      <div className="mt-1 text-[11.5px] text-soft">ภาพตัวอย่างแสดงข้อมูลที่สลิปจริงต้องมี — ไม่ใช่หลักฐานการโอน และอัปโหลดไม่ได้</div>
    </div>
  );
}
