"use client";

import { useState, useTransition } from "react";
import { Check, ClipboardCopy, Clock } from "lucide-react";
import { extendLeftover } from "./actions";

const btn = "inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-1.5 text-[12px] font-medium text-ink transition hover:bg-surface-alt disabled:opacity-50";

/** Copy the message for the shop; for a left-over that is still unused, extend its deadline. */
export function RowActions({ id, message, canExtend }: { id: number | string; message: string; canExtend: boolean }) {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <div className="flex flex-col items-start gap-1.5">
      <button
        type="button"
        className={btn}
        onClick={() => navigator.clipboard?.writeText(message).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); })}
      >
        {copied ? <Check size={14} /> : <ClipboardCopy size={14} />} {copied ? "คัดลอกแล้ว" : "คัดลอกข้อความถึงร้าน"}
      </button>
      {canExtend && (
        <button
          type="button"
          className={btn}
          disabled={pending}
          onClick={() => start(async () => {
            setError(null);
            const r = await extendLeftover(id, 24);
            if (!r.ok) setError(r.error);
          })}
        >
          <Clock size={14} /> {pending ? "กำลังขยาย…" : "ขยายเวลา 24 ชม."}
        </button>
      )}
      {error && <span className="text-[11.5px] text-danger">{error}</span>}
    </div>
  );
}
