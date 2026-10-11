"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

/** Code with a copy button (curl commands, JSON). */
export function CodeBlock({ code, light = false }: { code: string; light?: boolean }) {
  const [done, setDone] = useState(false);
  return (
    <div className="group relative">
      <pre className={`overflow-x-auto rounded-lg border px-4 py-3 font-mono text-[12.5px] leading-[1.55] whitespace-pre ${light ? "border-line bg-surface-alt text-muted" : "border-line bg-bg text-ink"}`}>{code}</pre>
      {!light && (
        <button type="button" aria-label="คัดลอกคำสั่ง" onClick={() => { void navigator.clipboard?.writeText(code); setDone(true); setTimeout(() => setDone(false), 1500); }}
          className="absolute top-2 right-2 inline-flex items-center gap-1 rounded-md border border-line bg-surface px-2 py-1 text-[11.5px] text-muted opacity-80 hover:text-ink group-hover:opacity-100">
          {done ? <><Check size={12} /> คัดลอกแล้ว</> : <><Copy size={12} /> คัดลอก</>}
        </button>
      )}
    </div>
  );
}
