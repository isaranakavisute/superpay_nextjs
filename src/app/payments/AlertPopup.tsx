"use client";

import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Modal, btn } from "@/components/interactive/Modal";
import { playSound } from "@/components/shell/sounds";

/**
 * A warning that pops up only once per `key` while `active` — the caller puts the period in the key
 * (server bill: the due date → once a month; slip quota: the package → once when it reaches the limit).
 * Shown in one tab only (localStorage), with a chime and a Thai voice message.
 */
export function useOnceAlert(key: string | null, active: boolean) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!active || !key) return;
    const k = `sp_alert_${key}`;
    const t = setTimeout(() => {
      if (localStorage.getItem(k)) return;
      localStorage.setItem(k, new Date().toISOString());
      setOpen(true);
    }, 0);
    return () => clearTimeout(t);
  }, [key, active]);
  return { open, close: () => setOpen(false) };
}

/** Chime, then the voice file. Browsers block sound until the page has been clicked once: then it plays on that click. */
export function playWarning(voice: string) {
  const go = () => {
    playSound("builtin:chime");
    const el = new Audio(voice);
    setTimeout(() => void el.play().catch(() => {}), 1300);
  };
  if (navigator.userActivation?.hasBeenActive ?? true) go();
  else window.addEventListener("pointerdown", go, { once: true });
}

export function AlertPopup({ title, voice, onClose, children }: { title: string; voice: string; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => { playWarning(voice); }, [voice]);
  return (
    <Modal title={title} onClose={onClose} width={480}
      footer={<>
        <button className={`${btn.base} ${btn.md} border-line`} onClick={() => playWarning(voice)}>🔊 ฟังอีกครั้ง</button>
        <button className={`${btn.base} ${btn.md} ${btn.primary}`} onClick={onClose}>รับทราบ</button>
      </>}>
      <div className="flex gap-4">
        <div className="grid size-14 shrink-0 place-items-center rounded-full bg-danger/15 text-danger"><AlertTriangle size={30} /></div>
        <div className="grid gap-2 text-[14.5px] whitespace-normal">{children}</div>
      </div>
    </Modal>
  );
}
