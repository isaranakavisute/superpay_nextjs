"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Clock, Copy, Upload, XCircle } from "lucide-react";
import { uploadSlip } from "./actions";

type Props = { token: string; status: string; amount: number; expiresAt: string | null; hasSlip: boolean };
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
export function CheckoutLive({ token, status, amount, expiresAt, hasSlip }: Props) {
  const router = useRouter();
  const [now, setNow] = useState(() => Date.now());
  const [slip, setSlip] = useState<File | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(hasSlip ? { ok: true, text: "ได้รับสลิปแล้ว — กำลังตรวจสอบ" } : null);
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
    if (!r.ok) return setMsg({ ok: false, text: r.error });
    setMsg({ ok: r.result !== "INVALID_SLIP", text: r.result === "PAID" ? "ชำระเงินสำเร็จ" : r.result === "INVALID_SLIP" ? `สลิปไม่ผ่าน: ${r.message ?? ""}` : "ได้รับสลิปแล้ว — รอเจ้าหน้าที่ตรวจสอบ" });
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
        <div className="mb-1 text-[13px] font-semibold">โอนแล้ว? แนบสลิปเพื่อยืนยัน</div>
        <div className="mb-2.5 text-[12px] text-muted">ระบบตรวจเงินเข้าอัตโนมัติ — แนบสลิปช่วยให้ยืนยันได้เร็วขึ้น ยอดในสลิปต้องเป็น ฿{money(amount)}</div>
        <div className="flex flex-wrap items-center gap-2">
          <input type="file" accept="image/png,image/jpeg,image/webp" aria-label="เลือกรูปสลิป" className="min-w-0 flex-1 text-[12.5px]" onChange={(e) => { setSlip(e.target.files?.[0] ?? null); setMsg(null); }} />
          <button type="button" disabled={!slip || pending} onClick={send} className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-[13px] font-medium text-primary-fg disabled:opacity-50"><Upload size={14} /> {pending ? "กำลังส่ง..." : "ส่งสลิป"}</button>
        </div>
        {msg && (
          <div role="status" className={`mt-2.5 flex items-center gap-1.5 text-[12.5px] ${msg.ok ? "text-emerald-300" : "text-red-300"}`}>
            {msg.ok ? <CheckCircle2 size={14} /> : <XCircle size={14} />} {msg.text}
          </div>
        )}
      </div>
    </>
  );
}
