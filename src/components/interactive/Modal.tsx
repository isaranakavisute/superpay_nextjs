"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

/**
 * Centered dialog with a dimmed backdrop; Esc and the backdrop close it.
 * Rendered into <body> (portal): inside a card that moves on hover (transform), a fixed overlay would be
 * positioned against the card instead of the screen — the dialog jumped and flickered.
 */
export function Modal({
  title,
  onClose,
  children,
  footer,
  width = 520,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  width?: number;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const dialog = (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-black/60 p-4 backdrop-blur-[2px]" onMouseDown={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="max-h-[90vh] w-full overflow-auto rounded-2xl border border-line bg-surface shadow-lift"
        style={{ maxWidth: width }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-line px-[22px] py-4">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button onClick={onClose} className="grid size-8 place-items-center rounded-lg text-muted hover:bg-surface-alt hover:text-ink" aria-label="ปิด">
            <X size={18} />
          </button>
        </div>
        <div className="px-[22px] py-5">{children}</div>
        {footer && <div className="flex justify-end gap-2.5 border-t border-line px-[22px] py-3.5">{footer}</div>}
      </div>
    </div>
  );
  return typeof document === "undefined" ? dialog : createPortal(dialog, document.body);
}

/** Button styles matching the console (.btn variants). */
export const btn = {
  base: "inline-flex items-center justify-center gap-1.5 rounded-lg border font-medium whitespace-nowrap transition disabled:cursor-not-allowed disabled:opacity-50",
  sm: "px-3 py-1.5 text-[12.5px]",
  md: "px-[18px] py-2.5 text-sm",
  primary: "border-primary bg-primary text-primary-fg hover:border-primary-600 hover:bg-primary-600",
  success: "border-[#10b981] bg-[#10b981] text-white hover:border-[#059669] hover:bg-[#059669]",
  danger: "border-[#ef4444] bg-[#ef4444] text-white hover:border-[#dc2626] hover:bg-[#dc2626]",
  ghost: "border-line bg-transparent text-ink hover:bg-surface-alt",
  dangerGhost: "border-[#fecaca]/40 bg-transparent text-danger hover:bg-danger/10",
};

export const field =
  "w-full rounded-lg border border-line bg-surface px-3.5 py-[11px] text-sm text-ink outline-none transition placeholder:text-soft focus:border-primary focus:shadow-ring";
export const fieldLabel = "mb-1.5 block text-[13px] font-medium text-ink";
