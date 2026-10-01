"use client";

import { useState, useTransition } from "react";
import { Eye, EyeOff } from "lucide-react";
import { btn, field, fieldLabel } from "@/components/interactive/Modal";
import type { ActionResult } from "@/lib/api";

export { btn, field, fieldLabel };
export const select = `${field} [color-scheme:dark]`;
export const hint = "mt-1.5 text-xs leading-relaxed text-muted";
export const row = "grid gap-4 md:grid-cols-2";
export const B = (v: keyof typeof btn = "ghost", size: "sm" | "md" = "md") => `${btn.base} ${btn[size]} ${btn[v]}`;

export function SCard({ title, note, children, id }: { title: string; note?: React.ReactNode; children: React.ReactNode; id?: string }) {
  return (
    <section id={id} className="mb-[22px] rounded-xl border border-line bg-surface shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-[22px] py-[18px]">
        <h2 className="text-lg font-semibold">{title}</h2>
        {note && <span className="text-[12.5px] text-muted">{note}</span>}
      </div>
      <div className="px-[22px] py-5">{children}</div>
    </section>
  );
}

export function Switch({ on, onChange, disabled, title, label }: { on: boolean; onChange?: (v: boolean) => void; disabled?: boolean; title?: string; label?: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label ?? title}
      title={title}
      disabled={disabled}
      onClick={() => onChange?.(!on)}
      className={`relative inline-block h-[22px] w-10 shrink-0 rounded-full transition disabled:cursor-not-allowed disabled:opacity-60 ${on ? "bg-primary" : "bg-line"}`}
    >
      <span className={`absolute top-[3px] size-4 rounded-full bg-white shadow transition-all ${on ? "left-[21px]" : "left-[3px]"}`} />
    </button>
  );
}

export function Check({ id, checked, onChange, children }: { id: string; checked: boolean; onChange: (v: boolean) => void; children: React.ReactNode }) {
  return (
    <div className="mb-3.5 flex items-start gap-2.5">
      <input id={id} type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-[3px] size-4 accent-(--color-primary)" />
      <label htmlFor={id} className="cursor-pointer text-[13px] leading-relaxed">{children}</label>
    </div>
  );
}

export function Secret({ id, label, value, onChange, placeholder }: { id: string; label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  const [show, setShow] = useState(false);
  return (
    <div className={label ? "mb-4" : ""}>
      {label && <label htmlFor={id} className={fieldLabel}>{label}</label>}
      <div className="relative">
        <input id={id} aria-label={label ? undefined : placeholder} type={show ? "text" : "password"} autoComplete="off" className={`${field} pr-10`} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} onFocus={(e) => { if (e.target.value.startsWith("••••")) e.target.select(); }} />
        <button type="button" tabIndex={-1} onClick={() => setShow((v) => !v)} aria-label={show ? "ซ่อน" : "แสดง"} className="absolute top-1/2 right-1.5 grid size-7.5 -translate-y-1/2 place-items-center rounded-lg text-muted hover:bg-surface-alt hover:text-ink">
          {show ? <EyeOff size={17} /> : <Eye size={17} />}
        </button>
      </div>
    </div>
  );
}

export function Num({ id, label, value, onChange, min, max, step, help }: { id: string; label: React.ReactNode; value: number; onChange: (v: number) => void; min: number; max: number; step?: number; help?: React.ReactNode }) {
  return (
    <div className="mb-4">
      <label htmlFor={id} className={fieldLabel}>{label}</label>
      <input id={id} type="number" className={field} value={Number.isFinite(value) ? value : ""} min={min} max={max} step={step ?? 1} onChange={(e) => onChange(e.target.value === "" ? NaN : Number(e.target.value))} />
      {help && <div className={hint}>{help}</div>}
    </div>
  );
}

export function Msg({ r, okText = "บันทึกเรียบร้อย" }: { r: ActionResult | null; okText?: string }) {
  if (!r) return null;
  return r.ok ? (
    <div role="status" className="mb-3 rounded-lg border border-emerald-500/30 bg-emerald-500/15 px-3.5 py-2.5 text-[13px] text-emerald-300">{okText}</div>
  ) : (
    <div role="alert" className="mb-3 rounded-lg border border-red-500/30 bg-red-500/15 px-3.5 py-2.5 text-[13px] text-red-300">{r.error}</div>
  );
}

/** Wraps a server action: pending flag + last result. */
export function useRun() {
  const [r, setR] = useState<ActionResult | null>(null);
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<ActionResult>, after?: (res: ActionResult) => void) =>
    start(async () => {
      const res = await fn();
      setR(res);
      after?.(res);
    });
  return { r, setR, pending, run };
}

export function readFile(file: File): Promise<{ mime: string; data: string; name: string }> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve({ mime: file.type, data: String(fr.result).split(",")[1] ?? "", name: file.name.replace(/\.[^.]+$/, "").slice(0, 40) });
    fr.onerror = () => reject(fr.error);
    fr.readAsDataURL(file);
  });
}
