"use client";

import { useState } from "react";
import { Moon } from "lucide-react";

export type ThemeOption = { id: string; name: string };
const COOKIE = "sp_theme";

/** Switch this browser's theme now and remember it (cookie read by the root layout). */
export function applyTheme(id: string) {
  document.documentElement.dataset.theme = id;
  document.cookie = `${COOKIE}=${id}; path=/; max-age=31536000; samesite=lax`;
}

/** Top-bar theme switch: cycles the themes enabled in settings; the choice is kept in a cookie. */
export function ThemeButton({ current, options, allowUser }: { current: string; options: ThemeOption[]; allowUser: boolean }) {
  const [theme, setTheme] = useState(current);
  const active = options.find((o) => o.id === theme) ?? options[0];
  const canSwitch = allowUser && options.length > 1;
  const next = () => {
    if (!canSwitch) return;
    const i = options.findIndex((o) => o.id === theme);
    const n = options[(i + 1) % options.length];
    applyTheme(n.id);
    setTheme(n.id);
  };
  return (
    <button
      type="button"
      onClick={next}
      disabled={!canSwitch}
      className="inline-flex items-center gap-2 rounded-full border border-line bg-surface-alt px-3.5 py-2 text-[13px] text-muted transition enabled:hover:border-primary enabled:hover:text-ink"
      title={canSwitch ? "เปลี่ยนธีม" : "ผู้ดูแลกำหนดธีมไว้"}
    >
      <Moon size={16} />
      {active?.name}
    </button>
  );
}
