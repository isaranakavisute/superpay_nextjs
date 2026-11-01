"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { estimateFor, recordLoad, recordStuck } from "@/lib/load-times";

/**
 * "กำลังโหลด" popup while a page opens (user, 31 Oct 2026) — menus (useLinkStatus) and, since 2 Nov 2026, the วันนี้ …
 * ทั้งหมด tabs of payments / outflows (their transition). It never blocks. Counts down from how long this page usually
 * takes (lib/load-times.ts); with no history yet it shows the time elapsed instead. Each finished load is remembered.
 * Stuck (1 Nov 2026 — no more "press F5"): at 3× the usual time (at least 15 s) it reloads that page by itself — the same
 * as F5, done for the user (a router retry would end this click's loading state and with it the popup). Only page
 * opening is retried — never a save / approve.
 */
const STUCK_MIN_MS = 15_000;
export function LoadingCountdown({ pending, page, href, title, fallbackPage }: {
  pending: boolean; page: string; href: string; title: string; fallbackPage?: string;
}) {
  const [t, setT] = useState<{ start: number; est: number | null; now: number } | null>(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!pending) return;
    const start = Date.now();
    const est = estimateFor(page) ?? (fallbackPage ? estimateFor(fallbackPage) : null);
    const stuckAt = Math.max(STUCK_MIN_MS, (est ?? 5_000) * 3);
    const first = setTimeout(() => setT({ start, est, now: Date.now() }), 0);
    const id = setInterval(() => setT((x) => (x ? { ...x, now: Date.now() } : x)), 250);
    const retry = setTimeout(() => { recordStuck(page, Date.now() - start, 1); setAttempt(1); setTimeout(() => window.location.assign(href), 800); }, stuckAt);
    return () => { clearTimeout(first); clearInterval(id); clearTimeout(retry); recordLoad(page, Date.now() - start); setT(null); setAttempt(0); };
  }, [pending, page, href, fallbackPage]);
  if (!pending || !t) return null;
  const secs = Math.floor((t.now - t.start) / 1000);
  const left = t.est == null ? null : Math.ceil((t.est - (t.now - t.start)) / 1000);
  const late = t.est == null ? secs >= 8 : secs * 1000 > t.est + 5000;
  // Rendered on <body>: the sidebar's own styling would otherwise keep a fixed popup inside the sidebar.
  return createPortal(
    <span role="status" aria-live="polite" className="nav-loading pointer-events-none fixed inset-0 z-[100] grid place-items-center bg-black/35">
      <span className="flex w-[min(92vw,360px)] flex-col items-center gap-3 rounded-2xl border border-line bg-surface px-6 py-5 text-center text-ink shadow-lift">
        <span className="size-9 animate-spin rounded-full border-[3px] border-primary/25 border-t-primary" aria-hidden />
        <span className="text-[15px] font-bold">{title}</span>
        {attempt > 0 ? (
          <span className="text-[13px] text-warning">หน้านี้โหลดช้าผิดปกติ — ระบบกำลังโหลดหน้าใหม่ให้อัตโนมัติ… ไม่ต้องกดอะไร</span>
        ) : left != null && left > 0 ? (
          <>
            <span className="text-[13px] text-muted">น่าจะเสร็จในอีกประมาณ</span>
            <span className="text-[30px] leading-none font-bold tabular-nums text-primary">{left} <span className="text-[14px] font-semibold">วินาที</span></span>
            <span className="h-1.5 w-full overflow-hidden rounded-full bg-surface-alt">
              <span className="block h-full rounded-full bg-primary transition-[width] duration-200" style={{ width: `${Math.min(100, ((t.now - t.start) / (t.est ?? 1)) * 100)}%` }} />
            </span>
          </>
        ) : left != null ? (
          <span className="text-[13px] text-muted">เกือบเสร็จแล้ว… (ผ่านไปแล้ว {secs} วินาที)</span>
        ) : (
          <span className="text-[13px] text-muted">กรุณารอสักครู่ ระบบกำลังโหลดข้อมูล… ผ่านไปแล้ว <b className="tabular-nums">{secs}</b> วินาที</span>
        )}
        {attempt === 0 && late && <span className="text-[12.5px] text-warning">ข้อมูลมีจำนวนมาก อาจใช้เวลานานกว่าปกติเล็กน้อย</span>}
      </span>
    </span>,
    document.body,
  );
}
