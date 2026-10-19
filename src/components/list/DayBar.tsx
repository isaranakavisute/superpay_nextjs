"use client";

import { useTransition } from "react";
import { LoadingDialog } from "./LoadingDialog";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { RANGE_OPTIONS, rangeParams, type RangeSel } from "../dashboard/range";

const DAY = 86_400_000;
const shift = (key: string, days: number) => new Date(Date.parse(`${key}T00:00:00Z`) + days * DAY).toISOString().slice(0, 10);

/**
 * วันนี้ / เมื่อวาน / 7 วัน / เดือนนี้ / ทั้งหมด, then ◀ [date] ▶ for a single day,
 * then the resolved label — the merchants pages' picker on the original.
 */
export function DayBar({ sel, label, today }: { sel: RangeSel; label: string; today: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  const [pending, start] = useTransition();

  const go = (next: RangeSel) => {
    const q = new URLSearchParams(search.toString());
    for (const [k, v] of Object.entries(rangeParams(next))) {
      if (v == null) q.delete(k);
      else q.set(k, v);
    }
    start(() => router.push(`${pathname}?${q}`, { scroll: false }));
  };
  const day = (key: string) => go({ mode: "custom", from: key, to: key });

  const single = sel.mode === "custom" && sel.from === sel.to;
  const current = single ? sel.from : sel.mode === "yesterday" ? shift(today, -1) : today;
  const ghost = "rounded-lg border border-line px-3 py-1.5 text-[12.5px] text-ink transition hover:bg-surface-alt disabled:cursor-not-allowed disabled:opacity-40";

  return (
    <div className={`mb-[18px] flex flex-wrap items-center gap-2.5 transition-opacity ${pending ? "opacity-60" : ""}`}>
      <LoadingDialog open={pending} text="กำลังโหลดข้อมูลตามวันที่เลือก…" />
      <div className="flex flex-wrap gap-1">
        {RANGE_OPTIONS.map((o) => (
          <button
            key={o.mode}
            type="button"
            onClick={() => go({ ...sel, mode: o.mode })}
            className={`border-b-2 px-[18px] py-2.5 text-sm font-medium transition-colors ${
              sel.mode === o.mode ? "border-primary text-primary" : "border-transparent text-muted hover:text-ink"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-1">
        <button type="button" className={ghost} title="วันก่อนหน้า" onClick={() => day(shift(current, -1))}>◀</button>
        <input
          type="date"
          aria-label="เลือกวัน"
          max={today}
          value={single ? sel.from : ""}
          onChange={(e) => e.target.value && day(e.target.value)}
          className="w-[150px] rounded-md border border-line bg-surface-alt px-2 py-1 text-[13px] text-ink outline-none [color-scheme:dark] focus:border-primary"
        />
        <button type="button" className={ghost} title="วันถัดไป" disabled={current >= today} onClick={() => day(shift(current, 1))}>▶</button>
      </div>
      <span className="text-[12.5px] text-muted">{label}</span>
    </div>
  );
}
