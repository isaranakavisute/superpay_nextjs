"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Bell, ChevronRight } from "lucide-react";

export type BellItem = { key: string; label: string; note: string; count: number; href: string };

const SEEN_KEY = "op-bell-seen";
type Seen = Record<string, number>;
// "Seen" counts live in localStorage (per browser); read through useSyncExternalStore, written on open / re-base.
const subscribe = (cb: () => void) => {
  window.addEventListener("storage", cb);
  window.addEventListener(SEEN_KEY, cb);
  return () => { window.removeEventListener("storage", cb); window.removeEventListener(SEEN_KEY, cb); };
};
const writeSeen = (s: Seen) => { localStorage.setItem(SEEN_KEY, JSON.stringify(s)); window.dispatchEvent(new Event(SEEN_KEY)); };
const parse = (raw: string | null): Seen => { try { return raw ? (JSON.parse(raw) as Seen) : {}; } catch { return {}; } };

/**
 * The bell: what is waiting on an admin, per queue, each linking to its page. The red number counts what is NEW
 * since this browser last opened the bell — opening it marks everything seen; it comes back only when more arrives.
 * (A queue that went down is re-based, so a later rise shows again.) The list always shows the full counts.
 */
export function BellMenu({ items, total }: { items: BellItem[]; total: number }) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  // null on the server / first paint — no badge flash before the browser's "seen" counts are known
  const raw = useSyncExternalStore(subscribe, () => localStorage.getItem(SEEN_KEY) ?? "{}", () => null);
  const seen = raw === null ? null : parse(raw);
  useEffect(() => {
    const s = parse(localStorage.getItem(SEEN_KEY));
    if (items.some((i) => (s[i.key] ?? 0) > i.count)) writeSeen(Object.fromEntries(Object.entries(s).map(([k, v]) => [k, Math.min(v, items.find((i) => i.key === k)?.count ?? v)])));
  }, [items]);
  const markSeen = () => writeSeen(Object.fromEntries(items.map((i) => [i.key, i.count])));
  const fresh = seen ? items.reduce((n, i) => n + Math.max(0, i.count - (seen[i.key] ?? 0)), 0) : 0;
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !box.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", close); };
  }, [open]);
  const waiting = items.filter((i) => i.count > 0);
  return (
    <div ref={box} className="relative">
      <button
        type="button"
        onClick={() => { if (!open) markSeen(); setOpen(!open); }}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={total ? `งานรอดำเนินการ ${total} รายการ${fresh ? ` (ใหม่ ${fresh})` : ""}` : "ไม่มีงานรอดำเนินการ"}
        title="งานรอดำเนินการ"
        className={`relative grid size-[38px] place-items-center rounded-full border bg-surface-alt transition hover:bg-surface hover:text-ink ${total ? "border-warning text-warning" : "border-line text-muted hover:border-primary"}`}
      >
        <Bell size={18} />
        {fresh > 0 && (
          <span className="absolute -top-[5px] -right-[5px] h-[18px] min-w-[18px] rounded-full bg-danger px-[5px] text-center text-[11px] leading-[18px] font-bold text-white shadow-[0_0_0_2px_var(--color-surface)]">{fresh}</span>
        )}
      </button>
      {open && (
        <div role="dialog" aria-label="งานรอดำเนินการ" className="absolute right-0 z-40 mt-2 w-[340px] overflow-hidden rounded-xl border border-line bg-surface shadow-2xl">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <div className="font-semibold">งานรอดำเนินการ</div>
            <span className="text-[12px] text-muted">{total ? `${total} รายการ` : "ไม่มี"}</span>
          </div>
          {waiting.length === 0 ? (
            <div className="px-4 py-8 text-center text-[13px] text-muted">ไม่มีงานรอดำเนินการ 🎉</div>
          ) : (
            <ul className="divide-y divide-line">
              {waiting.map((i) => (
                <li key={i.key}>
                  <Link href={i.href} onClick={() => setOpen(false)} className="flex items-center gap-3 px-4 py-3 hover:bg-surface-alt">
                    <span className="grid h-6 min-w-6 place-items-center rounded-full bg-danger px-1.5 text-[11.5px] font-bold text-white">{i.count}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[13.5px] font-medium">{i.label}</span>
                      <span className="block text-[11.5px] text-muted">{i.note}</span>
                    </span>
                    <ChevronRight size={16} className="text-soft" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
