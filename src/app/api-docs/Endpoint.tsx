"use client";

import { useEffect, useState } from "react";
import type { Ep } from "./docs";

const M: Record<Ep["m"], string> = {
  GET: "bg-[rgba(16,185,129,0.15)] text-[#6ee7b7]",
  POST: "bg-[rgba(59,130,246,0.18)] text-[#93c5fd]",
  PATCH: "bg-[rgba(245,158,11,0.18)] text-[#fcd34d]",
  DELETE: "bg-[rgba(239,68,68,0.18)] text-[#fca5a5]",
};
const EVENT = "sp-docs-toggle";
const pre = "overflow-x-auto rounded-lg border border-line bg-bg px-4 py-3 font-mono text-[12.5px] leading-[1.6] text-ink";

/** One endpoint: click the head to show the spec. "เปิด/ปิดทั้งหมด" broadcast a window event. */
export function Endpoint({ ep }: { ep: Ep }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const on = (e: Event) => setOpen((e as CustomEvent<boolean>).detail);
    window.addEventListener(EVENT, on);
    return () => window.removeEventListener(EVENT, on);
  }, []);
  return (
    <div className="mb-2.5 overflow-hidden rounded-[10px] border border-line bg-surface">
      <button type="button" aria-expanded={open} onClick={() => setOpen((v) => !v)} className="flex w-full items-center gap-3.5 px-4 py-3 text-left transition hover:bg-surface-alt">
        <span className={`w-[62px] shrink-0 rounded-md py-1 text-center font-mono text-[11.5px] font-bold ${M[ep.m]}`}>{ep.m}</span>
        <span className="min-w-0 flex-1">
          <span className="block font-mono text-[13.5px] font-semibold break-all">{ep.p}</span>
          <span className="block text-[12.5px] text-muted">{ep.d}</span>
        </span>
        <span className={`text-soft transition ${open ? "rotate-90" : ""}`}>›</span>
      </button>
      {open && (
        <div className="border-t border-line px-4 py-3.5 text-[13px]">
          {ep.auth && <div className="mb-3"><span className="mr-2 rounded bg-surface-alt px-1.5 py-0.5 text-[10.5px] font-bold tracking-wider text-muted">AUTH</span><span dangerouslySetInnerHTML={{ __html: ep.auth }} /></div>}
          {ep.body && <><div className="mt-3 mb-1.5 text-xs font-semibold tracking-wide text-muted uppercase">Request body</div><pre className={pre}>{ep.body}</pre></>}
          {ep.res && <><div className="mt-3 mb-1.5 text-xs font-semibold tracking-wide text-muted uppercase">Response</div><pre className={pre}>{ep.res}</pre></>}
          {ep.note && <div className="mt-3 rounded-lg border-l-[3px] border-primary bg-primary-50 px-3.5 py-2.5 leading-relaxed [&_code]:font-mono [&_code]:text-[12px]" dangerouslySetInnerHTML={{ __html: ep.note }} />}
        </div>
      )}
    </div>
  );
}

export function ToggleAll() {
  const fire = (v: boolean) => window.dispatchEvent(new CustomEvent(EVENT, { detail: v }));
  const b = "rounded-lg border border-line bg-surface px-3 py-1.5 text-[12.5px] hover:bg-surface-alt";
  return (
    <div className="mb-3 flex justify-end gap-2">
      <button type="button" className={b} onClick={() => fire(true)}>เปิดทั้งหมด</button>
      <button type="button" className={b} onClick={() => fire(false)}>ปิดทั้งหมด</button>
    </div>
  );
}
