"use client";

import { createPortal } from "react-dom";
import { Loader2 } from "lucide-react";

/**
 * "โปรดคอยสักครู่" while a list reloads for a new timeframe (วันนี้ / เมื่อวาน / … / ทั้งหมด can take a while).
 * Rendered into <body> so it covers the whole screen even inside a transformed card.
 */
export function LoadingDialog({ open, text = "กำลังโหลดข้อมูล…", title = "โปรดคอยสักครู่" }: { open: boolean; text?: string; title?: string }) {
  if (!open || typeof document === "undefined") return null;
  return createPortal(
    <div role="alertdialog" aria-busy="true" aria-live="polite" className="fixed inset-0 z-[100] grid place-items-center bg-black/45 backdrop-blur-[2px]">
      <div className="flex min-w-[260px] flex-col items-center gap-3 rounded-2xl border border-line bg-surface px-8 py-6 text-center shadow-(--shadow-lift)">
        <Loader2 size={32} className="animate-spin text-primary" />
        <div className="text-[17px] font-semibold text-ink">{title}</div>
        <div className="text-[13px] text-muted">{text}</div>
      </div>
    </div>,
    document.body,
  );
}
