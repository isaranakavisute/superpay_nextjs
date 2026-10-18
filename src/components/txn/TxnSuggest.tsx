"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Building2, Loader2, Search } from "lucide-react";
import { fmtDateTime, fmtMoney } from "@/lib/format";
import { searchTxn } from "./actions";
import { TxnDetail } from "./TxnDetail";
import { StatusBadge } from "./StatusBadge";
import type { TxnHit } from "./types";
import { KIND, bankText } from "./meta";

const MIN = 3;

function Highlight({ text, q }: { text: string; q: string }) {
  const i = text.toLowerCase().indexOf(q.toLowerCase());
  if (!q || i < 0) return <>{text}</>;
  return <>{text.slice(0, i)}<mark className="rounded bg-primary/25 px-0.5 text-primary">{text.slice(i, i + q.length)}</mark>{text.slice(i + q.length)}</>;
}

/**
 * Transaction search popup (18 Oct 2026): attached to a search <input>, it lists refs CONTAINING what is typed
 * (TXN172 → TXN1721, TXN1722 …) with customer, banks, amount, shop and time; arrow keys / click open the full history.
 * Enter with nothing highlighted keeps the box's own behaviour (filtering the list).
 */
export function TxnSuggest({ inputRef, align = "left" }: { inputRef: React.RefObject<HTMLInputElement | null>; align?: "left" | "right" }) {
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<TxnHit[]>([]);
  const [total, setTotal] = useState(0);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [active, setActive] = useState(-1);
  const [detail, setDetail] = useState<string | null>(null);
  const seq = useRef(0);
  const box = useRef<HTMLDivElement>(null);

  const run = useCallback((value: string) => {
    const v = value.trim();
    setQ(v);
    setActive(-1);
    if (v.length < MIN) { setHits([]); setTotal(0); setLoading(false); setError(null); return; }
    const n = ++seq.current;
    setLoading(true);
    window.setTimeout(async () => {
      if (n !== seq.current) return;
      const r = await searchTxn(v);
      if (n !== seq.current) return;
      setLoading(false);
      if (r.ok) { setHits(r.data.data); setTotal(r.data.total); setError(null); } else { setHits([]); setError(r.error); }
    }, 220);
  }, []);

  const pick = useCallback((ref: string) => { setOpen(false); setDetail(ref); }, []);

  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.setAttribute("autocomplete", "off");
    const onInput = () => { setOpen(true); run(el.value); };
    const onFocus = () => { if (el.value.trim().length >= MIN) { setOpen(true); run(el.value); } };
    const onKey = (e: KeyboardEvent) => {
      if (!open && e.key === "ArrowDown") { setOpen(true); return; }
      if (e.key === "Escape") { setOpen(false); return; }
      if (!open || !hits.length) return;
      if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => (a + 1) % hits.length); }
      else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => (a <= 0 ? hits.length - 1 : a - 1)); }
      else if (e.key === "Enter" && active >= 0) { e.preventDefault(); e.stopPropagation(); pick(hits[active].ref); }
    };
    el.addEventListener("input", onInput);
    el.addEventListener("focus", onFocus);
    el.addEventListener("keydown", onKey);
    return () => { el.removeEventListener("input", onInput); el.removeEventListener("focus", onFocus); el.removeEventListener("keydown", onKey); };
  }, [inputRef, run, open, hits, active, pick]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (box.current?.contains(e.target as Node) || inputRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open, inputRef]);

  const show = open && q.length >= MIN;
  return (
    <>
      {show && (
        <div
          ref={box}
          role="listbox"
          className={`absolute top-[calc(100%+8px)] z-[55] w-[min(760px,calc(100vw-32px))] overflow-hidden rounded-xl border border-line bg-surface text-left shadow-[0_18px_50px_rgba(0,0,0,0.45)] ${align === "right" ? "right-0" : "left-0"}`}
        >
          <div className="flex items-center justify-between border-b border-line bg-surface-alt/70 px-4 py-2.5 text-[12px] text-muted">
            <span className="flex items-center gap-1.5"><Search size={13} /> รายการที่มี “<strong className="text-ink">{q}</strong>” ในเลขที่</span>
            <span>{loading ? <Loader2 size={13} className="animate-spin" /> : total > hits.length ? `แสดง ${hits.length} จาก ${total}` : `${hits.length} รายการ`}</span>
          </div>
          {error ? (
            <div className="px-4 py-6 text-center text-[13px] text-danger">{error}</div>
          ) : !hits.length && !loading ? (
            <div className="px-4 py-8 text-center text-[13px] text-muted">ไม่พบเลขที่รายการที่มี “{q}”</div>
          ) : (
            <ul className="max-h-[min(460px,60vh)] overflow-y-auto">
              {hits.map((h, i) => {
                const K = KIND[h.kind];
                const purged = h.status === "purged";
                return (
                  <li key={`${h.kind}:${h.ref}`}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={i === active}
                      onMouseEnter={() => setActive(i)}
                      onClick={() => pick(h.ref)}
                      className={`grid w-full grid-cols-[auto_minmax(0,1.25fr)_minmax(0,1.4fr)_auto] items-center gap-3 border-b border-line/60 px-4 py-2.5 text-left transition ${i === active ? "bg-primary/10" : "hover:bg-surface-alt/60"}`}
                    >
                      <span className={`grid size-8 place-items-center rounded-lg ${K.tone}`} title={K.label}><K.icon size={15} /></span>
                      <span className="min-w-0">
                        <span className="flex items-center gap-2">
                          <span className="font-mono text-[13.5px] font-semibold"><Highlight text={h.ref} q={q} /></span>
                          <StatusBadge status={h.status} deleted={!!h.deletedAt && !purged} small />
                        </span>
                        <span className="mt-0.5 block truncate text-[12px] text-muted">{purged ? "ลบถาวร (ก่อนมีระบบเก็บข้อมูลที่ลบ) — ดูประวัติได้" : h.name || "—"}</span>
                      </span>
                      <span className="min-w-0 text-[12px] text-muted">
                        {!purged && (
                          <>
                            <span className="flex items-center gap-1 truncate">
                              <Building2 size={12} className="shrink-0" />
                              {h.kind === "payment" ? <>{bankText(h.payerBankCode, h.payerAccount)} → {bankText(h.accountBankCode, h.accountLast4)}</> : <>→ {bankText(h.payerBankCode, h.payerAccount)}</>}
                            </span>
                            <span className="mt-0.5 block truncate">{h.merchantName ?? "—"}{h.orderId ? <> · <Highlight text={h.orderId} q={q} /></> : null}</span>
                          </>
                        )}
                      </span>
                      <span className="text-right">
                        <span className="block text-[13.5px] font-semibold tabular-nums">{h.amount ? fmtMoney(h.amount) : "—"}</span>
                        <span className="block text-[11.5px] whitespace-nowrap text-muted">{fmtDateTime(h.createdAt)}</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          <div className="flex items-center justify-between bg-surface-alt/50 px-4 py-2 text-[11.5px] text-soft">
            <span>↑ ↓ เลือก · Enter เปิดประวัติ · Esc ปิด</span>
            <span>Enter (ไม่เลือก) = กรองรายการตามคำค้น</span>
          </div>
        </div>
      )}
      {detail && <TxnDetail txnRef={detail} onClose={() => setDetail(null)} />}
    </>
  );
}
