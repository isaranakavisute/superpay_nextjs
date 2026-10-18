"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArchiveRestore, Search, Trash2 } from "lucide-react";
import { Modal, btn, field } from "@/components/interactive/Modal";
import { Card } from "@/components/ui";
import { fmtDateTime } from "@/lib/format";
import { restoreDeleted } from "./actions";

export type DeletedRow = {
  type: string; typeLabel: string; key: string; title: string; detail: string | null;
  deletedAt: string; deletedBy: string | null; deleteReason: string | null; restoreNote: string;
};

const th = "border-b border-line bg-surface-alt px-[14px] py-3 text-left text-xs font-semibold tracking-[0.5px] text-muted uppercase whitespace-nowrap";
const td = "border-b border-line px-[14px] py-3 align-top";

export function DeletedList({ rows, counts, types, type, q }: { rows: DeletedRow[]; counts: Record<string, number>; types: Record<string, string>; type: string; q: string }) {
  const router = useRouter();
  const [text, setText] = useState(q);
  const [restore, setRestore] = useState<DeletedRow | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const go = (t: string, query = text) => {
    const p = new URLSearchParams({ ...(t ? { type: t } : {}), ...(query.trim() ? { q: query.trim() } : {}) });
    router.push(`/deleted${p.size ? `?${p}` : ""}`);
  };
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const chip = (active: boolean) => `rounded-full border px-3 py-1.5 text-[12.5px] transition ${active ? "border-primary bg-primary/15 text-primary" : "border-line text-muted hover:text-ink"}`;

  return (
    <div className="grid gap-4">
      <Card className="grid gap-3 p-4">
        <form className="relative" onSubmit={(e) => { e.preventDefault(); go(type); }}>
          <Search size={16} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted" />
          <input className={`${field} pl-9`} value={text} onChange={(e) => setText(e.target.value)} placeholder="ค้นหาเลขที่ / ชื่อ / เหตุผล / ผู้ลบ…" />
        </form>
        <div className="flex flex-wrap gap-2">
          <button type="button" className={chip(!type)} onClick={() => go("")}>ทั้งหมด{!type ? ` (${total})` : ""}</button>
          {Object.entries(types).map(([k, label]) => (
            <button key={k} type="button" className={chip(type === k)} onClick={() => go(k)}>
              {label}{counts[k] !== undefined ? ` (${counts[k]})` : ""}
            </button>
          ))}
        </div>
      </Card>

      {msg && <div className={`rounded-lg border px-4 py-2.5 text-[13px] ${msg.ok ? "border-success/30 bg-success/10 text-success" : "border-danger/30 bg-danger/10 text-danger"}`}>{msg.text}</div>}

      <Card className="overflow-x-auto p-0">
        {rows.length === 0 ? (
          <div className="grid place-items-center gap-2 px-6 py-14 text-center text-muted">
            <Trash2 size={28} className="opacity-50" />
            <div className="text-sm">ไม่มีรายการที่ลบ{type ? `ในหมวด ${types[type]}` : ""}{q ? ` ที่ตรงกับ “${q}”` : ""}</div>
          </div>
        ) : (
          <table className="w-full min-w-[900px] border-collapse text-[13px]">
            <thead>
              <tr><th className={th}>ลบเมื่อ</th><th className={th}>ประเภท</th><th className={th}>รายการ</th><th className={th}>ผู้ลบ</th><th className={th}>เหตุผล</th><th className={th} /></tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={`${r.type}:${r.key}`} className="hover:bg-surface-alt/40">
                  <td className={`${td} whitespace-nowrap text-muted`}>{fmtDateTime(r.deletedAt)}</td>
                  <td className={td}><span className="rounded-full bg-surface-alt px-2.5 py-1 text-[11.5px] whitespace-nowrap text-muted">{r.typeLabel}</span></td>
                  <td className={td}>
                    <div className="font-semibold">{r.title}</div>
                    {r.detail && <div className="mt-0.5 text-[12px] text-muted">{r.detail}</div>}
                    <div className="mt-1 inline-block rounded bg-danger/10 px-1.5 py-0.5 text-[10.5px] font-semibold tracking-wide text-danger">ลบแล้ว</div>
                  </td>
                  <td className={`${td} whitespace-nowrap`}>{r.deletedBy ?? "—"}</td>
                  <td className={`${td} max-w-[320px]`}>{r.deleteReason ?? <span className="text-muted">—</span>}</td>
                  <td className={`${td} text-right`}>
                    <button className={`${btn.base} ${btn.sm} ${btn.ghost} whitespace-nowrap`} onClick={() => { setMsg(null); setRestore(r); }}>
                      <ArchiveRestore size={14} /> กู้คืน
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {restore && (
        <Modal
          title="ยืนยันการกู้คืน"
          onClose={() => setRestore(null)}
          footer={
            <>
              <button className={`${btn.base} ${btn.md} ${btn.ghost}`} onClick={() => setRestore(null)} disabled={pending}>ยกเลิก</button>
              <button
                className={`${btn.base} ${btn.md} ${btn.primary}`}
                disabled={pending}
                onClick={() => start(async () => {
                  const r = await restoreDeleted(restore.type, restore.key);
                  setRestore(null);
                  setMsg(r.ok ? { ok: true, text: `กู้คืน ${restore.title} แล้ว — ${restore.restoreNote}` } : { ok: false, text: r.error });
                  if (r.ok) router.refresh();
                })}
              >
                {pending ? "กำลังกู้คืน…" : "ยืนยันกู้คืน"}
              </button>
            </>
          }
        >
          <p className="text-sm">กู้คืน <strong>{restore.title}</strong> ({restore.typeLabel})? รายการจะกลับไปแสดงในหน้าปกติ</p>
          <p className="mt-2 rounded-lg border border-line bg-surface-alt/60 px-3 py-2 text-[12.5px] text-muted">{restore.restoreNote}</p>
          <p className="mt-2 text-[12px] text-muted">ลบโดย {restore.deletedBy ?? "—"} · {fmtDateTime(restore.deletedAt)} · เหตุผล: {restore.deleteReason ?? "—"}</p>
        </Modal>
      )}
    </div>
  );
}
