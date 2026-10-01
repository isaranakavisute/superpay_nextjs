"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import QR from "qrcode";
import { btn, field, fieldLabel } from "@/components/interactive/Modal";
import { fmtDateTime, fmtMoney } from "@/lib/format";
import { bankAccountPayload, promptPayPayload } from "@/lib/promptpay";
import { checkSlip } from "./actions";

export type DemoAccount = { id: number; label: string; bankCode: string; accountNo: string | null; promptpayId: string | null };
type Result = { verified: boolean | null; provider?: string; amount?: number; transRef?: string | null; date?: string | null; message?: string; matches: { ref: string; amount: string; createdAt: string; merchantName: string | null }[] };
const B = (v: keyof typeof btn) => `${btn.base} ${btn.md} ${btn[v]}`;

export function QrDemo({ accounts }: { accounts: DemoAccount[] }) {
  const [acctId, setAcctId] = useState("");
  const [ppid, setPpid] = useState("");
  const [bankQr, setBankQr] = useState(false);
  const [amount, setAmount] = useState("100.00");
  const [qr, setQr] = useState<{ img: string; payload: string; amount: number; target: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [slip, setSlip] = useState<File | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [pending, start] = useTransition();
  const acct = accounts.find((a) => String(a.id) === acctId);

  useEffect(() => () => { if (qr?.img.startsWith("blob:")) URL.revokeObjectURL(qr.img); }, [qr]);

  const generate = async () => {
    setError(null); setResult(null);
    const amt = Number(amount);
    if (!(amt > 0)) return setError("กรอกจำนวนเงินมากกว่า 0");
    const payload = bankQr && acct?.accountNo ? bankAccountPayload(acct.bankCode, acct.accountNo, amt) : promptPayPayload(ppid, amt);
    if (!payload) return setError(bankQr ? "บัญชีนี้สร้าง QR เลขบัญชีไม่ได้" : "PromptPay ID ต้องเป็นเบอร์ 10 หลัก / เลขบัตร 13 หลัก / e-wallet 15 หลัก");
    setQr({ img: await QR.toDataURL(payload, { width: 280, margin: 2 }), payload, amount: amt, target: bankQr && acct ? `${acct.bankCode} ${acct.accountNo}` : ppid });
  };

  const verify = () => slip && start(async () => {
    setError(null);
    const data = await new Promise<string>((res, rej) => { const fr = new FileReader(); fr.onload = () => res(String(fr.result).split(",")[1] ?? ""); fr.onerror = () => rej(fr.error); fr.readAsDataURL(slip); });
    const r = await checkSlip({ mime: slip.type, data }, acct?.id);
    if (!r.ok) return setError(r.error);
    setResult(r.result as Result);
  });

  return (
    <div className="grid max-w-[960px] items-start gap-5 md:grid-cols-2">
      <div className="rounded-xl border border-line bg-surface p-5 shadow-sm">
        <div className="mb-3.5 font-bold">1) สร้าง QR</div>
        <div className="mb-4">
          <label htmlFor="acctSel" className={fieldLabel}>บัญชีรับเงิน</label>
          <select id="acctSel" className={`${field} [color-scheme:dark]`} value={acctId} onChange={(e) => { setAcctId(e.target.value); const a = accounts.find((x) => String(x.id) === e.target.value); setPpid(a?.promptpayId ?? ""); }}>
            <option value="">— ไม่ผูกบัญชี (กรอก PromptPay เอง) —</option>
            {accounts.map((a) => <option key={a.id} value={a.id}>{a.label} · {a.promptpayId ? `PromptPay ${a.promptpayId}` : "(ไม่มี PromptPay)"}</option>)}
          </select>
          <div className="mt-1 text-[11.5px] text-muted">เลือกบัญชีแล้วระบบจะเติม PromptPay ID ให้ (ถ้าตั้งไว้) และใช้บัญชีนั้นจับคู่สลิป — บัญชีที่ยังไม่มี แนะนำไปผูกพร้อมเพย์ในแอปธนาคารก่อน (ฟรี ครั้งเดียว)</div>
        </div>
        <div className="mb-4">
          <label htmlFor="ppid" className={fieldLabel}>PromptPay ID</label>
          <input id="ppid" className={field} placeholder="เบอร์ 10 หลัก / เลขบัตร 13 หลัก / e-wallet 15 หลัก" value={ppid} onChange={(e) => setPpid(e.target.value)} disabled={bankQr} />
        </div>
        <div className="mb-4 flex items-start gap-2.5">
          <input id="tryBankQr" type="checkbox" className="mt-[3px] size-4 accent-(--color-primary)" checked={bankQr} disabled={!acct?.accountNo} onChange={(e) => setBankQr(e.target.checked)} />
          <label htmlFor="tryBankQr" className="cursor-pointer text-[12.5px] text-muted">ไม่มี PromptPay — ลองใช้ <b>QR เลขบัญชี</b> (ทดลอง: <b>แอปธนาคารส่วนใหญ่ไม่รองรับ</b> ใช้ได้เฉพาะบางแอป · ต้องเลือกบัญชีก่อน)</label>
        </div>
        <div className="mb-4">
          <label htmlFor="amount" className={fieldLabel}>จำนวนเงิน (บาท)</label>
          <input id="amount" className={field} type="number" step="0.01" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </div>
        {error && <div role="alert" className="mb-3 rounded-lg border border-red-500/30 bg-red-500/15 px-3.5 py-2.5 text-[13px] text-red-300">{error}</div>}
        <button type="button" className={`${B("primary")} mt-1.5 w-full`} onClick={generate}>สร้าง QR</button>
      </div>

      <div className="rounded-xl border border-line bg-surface p-5 text-center shadow-sm">
        {!qr ? (
          <div className="py-10 text-muted">ยังไม่มี QR — กรอกข้อมูลแล้วกด &ldquo;สร้าง QR&rdquo;</div>
        ) : (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element -- generated data: URL */}
            <img src={qr.img} alt="QR พร้อมเพย์" width={240} height={240} className="mx-auto rounded-xl bg-white p-2" />
            <div className="mt-3 text-2xl font-bold text-primary">{fmtMoney(qr.amount)}</div>
            <div className="text-[12.5px] text-muted">{bankQr ? "QR เลขบัญชี" : "PromptPay"} · {qr.target}</div>
            <details className="mt-2 text-left text-[11.5px] text-soft"><summary className="cursor-pointer">payload (EMVCo)</summary><code className="break-all">{qr.payload}</code></details>

            <div className="mt-5 border-t border-line pt-4 text-left">
              <div className="mb-2.5 font-bold">2) แนบสลิป</div>
              <input type="file" accept="image/png,image/jpeg,image/webp" className="text-[13px]" onChange={(e) => { setSlip(e.target.files?.[0] ?? null); setResult(null); }} />
              <button type="button" className={`${B("primary")} mt-3 w-full`} disabled={!slip || pending} onClick={verify}>{pending ? "กำลังตรวจสลิป..." : "ตรวจสลิป + หาออเดอร์ที่ตรงกัน"}</button>
              {result && (
                <div className={`mt-3 rounded-lg border px-3.5 py-3 text-[13px] ${result.verified ? "border-emerald-500/30 bg-emerald-500/10" : result.verified === false ? "border-red-500/30 bg-red-500/10" : "border-line bg-surface-alt"}`}>
                  {result.verified ? (
                    <>
                      <div className="font-semibold text-emerald-300">สลิปถูกต้อง ({result.provider})</div>
                      <div className="mt-1 text-muted">ยอด {fmtMoney(result.amount)}{result.transRef && <> · ref {result.transRef}</>}{result.date && <> · {fmtDateTime(result.date)}</>}</div>
                      {result.amount != null && Math.abs(result.amount - qr.amount) > 0.009 && <div className="mt-1 text-warning">ยอดในสลิปไม่ตรงกับ QR ({fmtMoney(qr.amount)})</div>}
                      <div className="mt-2 font-medium">ออเดอร์รอชำระที่ยอดตรงกัน{acct ? ` ในบัญชี ${acct.label}` : ""}:</div>
                      {result.matches.length ? result.matches.map((m) => (
                        <div key={m.ref} className="mt-1"><Link href={`/payments?q=${m.ref}`} className="text-primary hover:underline">{m.ref}</Link> · {m.merchantName ?? "ไม่ระบุร้าน"} · {fmtDateTime(m.createdAt)}</div>
                      )) : <div className="mt-1 text-muted">ไม่พบ — เงินเข้าจริงจะไปรอที่ &ldquo;รอตรวจสอบ&rdquo;</div>}
                    </>
                  ) : (
                    <div className={result.verified === false ? "text-red-300" : "text-muted"}>{result.message}{result.verified === null && <> · ตั้งผู้ให้บริการได้ที่ <Link href="/settings" className="text-primary">ตั้งค่าระบบ</Link></>}</div>
                  )}
                </div>
              )}
              <div className="mt-2 text-[11.5px] text-soft">หน้านี้แค่ตรวจและหาออเดอร์ — ไม่อนุมัติรายการใด ๆ</div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
