"use client";

import { useEffect, useState } from "react";
import { AlertPopup, useOnceAlert } from "./AlertPopup";

// Monthly server bill: due on the 8th of every month (first due 8 Nov 2026), 45.95 USD shown in baht.
const DUE_DAY = 8;
const AMOUNT_USD = 45.95;
const RED_DAYS = 3;
const POPUP_DAYS = 1;   // popup + Thai voice once a month: from 1 day before the due date (on the day if missed)

const bkkToday = () => {
  const [y, m, d] = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Bangkok" }).split("-").map(Number);
  return { y, m, d };
};
const thDate = (y: number, m: number, d: number) =>
  new Date(Date.UTC(y, m - 1, d, 5)).toLocaleDateString("th-TH", { timeZone: "Asia/Bangkok", day: "numeric", month: "long", year: "numeric" });

/** Next due date (the 8th; on the 8th itself it is today) and days left, in Bangkok time. */
function nextDue() {
  const t = bkkToday();
  const [y, m] = t.d <= DUE_DAY ? [t.y, t.m] : t.m === 12 ? [t.y + 1, 1] : [t.y, t.m + 1];
  const days = Math.round((Date.UTC(y, m - 1, DUE_DAY) - Date.UTC(t.y, t.m - 1, t.d)) / 86_400_000);
  return { label: thDate(y, m, DUE_DAY), days, cycle: `${y}-${m}` };
}

const baht = (n: number) => n.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Server bill reminder in the payments page header, left of the slip-checker quota. */
export function ServerBill() {
  const [due, setDue] = useState<{ label: string; days: number; cycle: string } | null>(null);
  const [rate, setRate] = useState<number | null>(null);
  useEffect(() => {
    let stop = false;
    const load = async () => {
      setDue(nextDue());
      try {
        const j = (await (await fetch("/poll/fx", { cache: "no-store" })).json()) as { rate: number | null };
        if (!stop && j.rate) setRate(j.rate);
      } catch {
        /* keep the last rate */
      }
    };
    void load();
    const id = setInterval(load, 30 * 60_000);
    return () => { stop = true; clearInterval(id); };
  }, []);

  const soon = due != null && due.days <= RED_DAYS;
  const alert = useOnceAlert(due ? `server-bill-${due.cycle}` : null, due != null && due.days <= POPUP_DAYS);
  const amount = rate ? `฿${baht(AMOUNT_USD * rate)}` : `$${AMOUNT_USD.toFixed(2)}`;
  const tone = soon ? "bg-danger text-white ring-4 ring-danger/30 animate-pulse" : "bg-primary text-primary-fg ring-4 ring-primary/25";

  return (
    <>
    {alert.open && due && (
      <AlertPopup title="แจ้งเตือนครบกำหนดชำระค่าบริการเซิร์ฟเวอร์" voice={due.days === 0 ? "/sounds/bill-today.mp3" : "/sounds/bill-tomorrow.mp3"} onClose={alert.close}>
        <p className="text-[16px] font-bold">ค่าบริการเซิร์ฟเวอร์ครบกำหนดชำระ{due.days === 0 ? "ในวันนี้" : "ในวันพรุ่งนี้"} ({due.label})</p>
        <p>ยอดชำระ <strong className="text-[18px]">{amount}</strong> <span className="text-muted">({AMOUNT_USD.toFixed(2)} USD{rate ? ` · อัตรา 1 USD ≈ ${rate.toFixed(2)} บาท` : ""})</span></p>
        <p className="text-muted">กรุณาดำเนินการชำระเงินภายในวันครบกำหนด เพื่อให้ระบบให้บริการได้อย่างต่อเนื่อง</p>
      </AlertPopup>
    )}
    <div className={`min-w-[280px] rounded-[14px] px-5 py-2.5 text-center shadow-lg ${tone}`} title="แจ้งเตือนทุกเดือน — ครบกำหนดชำระทุกวันที่ 8">
      <div className="text-[13px] font-extrabold tracking-[0.08em]">แจ้งชำระค่าบริการเซิร์ฟเวอร์</div>
      <div className="text-[32px] leading-tight font-black tabular-nums">{amount}</div>
      <div className="text-[13px] font-semibold">
        {due ? <>ครบกำหนดชำระ {due.label} ({due.days === 0 ? "วันนี้" : `อีก ${due.days} วัน`})</> : "กำลังโหลด…"}
      </div>
      <div className="text-[11px] opacity-80">
        {AMOUNT_USD.toFixed(2)} USD{rate ? ` · อัตรา 1 USD ≈ ${rate.toFixed(2)} บาท` : " · ยังไม่ได้อัตราแลกเปลี่ยน"}
      </div>
    </div>
    </>
  );
}
