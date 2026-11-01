"use client";

import { useState, useTransition } from "react";
import { LoadingDialog } from "./LoadingDialog";
import { LoadingCountdown } from "../shell/LoadingCountdown";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { RANGE_OPTIONS, rangeParams, type RangeSel } from "../dashboard/range";

/**
 * วันนี้ / เมื่อวาน / 7 วัน / เดือนนี้ / ทั้งหมด tabs, then "จาก [date] ถึง [date]"
 * and the resolved label, as on the original. Writes ?range=&from=&to= and
 * keeps the page's other params (status, q, …); paging resets.
 * With `page` (payments, outflows — user, 2 Nov 2026) the wait shows the menus' countdown popup, timed per page + tab
 * (e.g. "payments-all"; "today" falls back to the menu's own time); without it, the plain "โปรดคอยสักครู่" dialog.
 */
export function RangeBar({ sel, label, page }: { sel: RangeSel; label: string; page?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [target, setTarget] = useState<{ href: string; mode: RangeSel["mode"] }>({ href: pathname, mode: sel.mode });

  const go = (next: RangeSel) => {
    const q = new URLSearchParams(search.toString());
    q.delete("page");
    for (const [k, v] of Object.entries(rangeParams(next))) {
      if (v == null) q.delete(k);
      else q.set(k, v);
    }
    setTarget({ href: `${pathname}?${q}`, mode: next.mode });
    startTransition(() => router.push(`${pathname}?${q}`, { scroll: false }));
  };

  const custom = sel.mode === "custom";
  const date =
    "rounded-md border border-line bg-surface-alt px-2 py-1 text-[13px] text-ink outline-none [color-scheme:dark] focus:border-primary";

  return (
    <div className={`mb-5 flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-line transition-opacity ${pending ? "opacity-60" : ""}`}>
      {page ? (
        <LoadingCountdown pending={pending} page={`${page}-${target.mode}`} fallbackPage={target.mode === "today" ? page : undefined} href={target.href}
          title={`กำลังโหลดรายการ “${RANGE_OPTIONS.find((o) => o.mode === target.mode)?.label ?? "ช่วงวันที่ที่เลือก"}”`} />
      ) : (
        <LoadingDialog open={pending} text="กำลังโหลดรายการตามช่วงเวลาที่เลือก…" />
      )}
      <div className="flex flex-wrap gap-1">
        {RANGE_OPTIONS.map((o) => (
          <button
            key={o.mode}
            type="button"
            onClick={() => go({ ...sel, mode: o.mode })}
            className={`-mb-px border-b-2 px-[18px] py-2.5 text-sm font-medium transition-colors ${
              !custom && sel.mode === o.mode ? "border-primary text-primary" : "border-transparent text-muted hover:text-ink"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2 pb-1.5 text-[13px] text-muted">
        จาก
        <input
          type="date"
          aria-label="ตั้งแต่วันที่"
          value={custom ? sel.from : ""}
          onChange={(e) => e.target.value && go({ mode: "custom", from: e.target.value, to: custom && sel.to >= e.target.value ? sel.to : e.target.value })}
          className={date}
        />
        ถึง
        <input
          type="date"
          aria-label="ถึงวันที่"
          value={custom ? sel.to : ""}
          onChange={(e) => e.target.value && go({ mode: "custom", from: custom && sel.from <= e.target.value ? sel.from : e.target.value, to: e.target.value })}
          className={date}
        />
        <span className="ml-1">{label}</span>
      </div>
    </div>
  );
}
