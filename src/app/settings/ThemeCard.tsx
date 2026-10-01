"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { applyTheme } from "@/components/shell/ThemeButton";
import { saveSection } from "./actions";
import { B, Msg, SCard, Switch, useRun } from "./parts";

type Theme = { default: string; allowUser: boolean; enabled: string[] };
const SWATCH: Record<string, { bg: string; side: string; surface: string; line: string; primary: string; soft: string }> = {
  "royal-gold": { bg: "#08080a", side: "#050506", surface: "#141317", line: "#302a20", primary: "#d4af37", soft: "#756c5b" },
  midnight: { bg: "#0a0f1c", side: "#060a14", surface: "#111827", line: "#253049", primary: "#60a5fa", soft: "#64748b" },
};

function Preview({ id, onTry }: { id: string; onTry: () => void }) {
  const s = SWATCH[id];
  return (
    <button type="button" title="ลองใช้ธีมนี้" onClick={onTry} className="flex h-[118px] w-full overflow-hidden rounded-lg border text-left" style={{ background: s.bg, borderColor: s.line }}>
      <div className="flex w-[30%] flex-col gap-1.5 p-2" style={{ background: s.side }}>
        <span className="mb-1 h-2.5 w-3/4 rounded" style={{ background: s.primary }} />
        <span className="h-2 rounded" style={{ background: s.primary, opacity: 0.85 }} />
        {[0, 1, 2].map((i) => <span key={i} className="h-2 rounded" style={{ background: s.soft, opacity: 0.4 }} />)}
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-2">
        <div className="flex justify-between"><span className="h-2 w-1/3 rounded" style={{ background: s.soft, opacity: 0.5 }} /><span className="h-2.5 w-4 rounded-full" style={{ background: s.primary }} /></div>
        <div className="grid grid-cols-3 gap-1">{[0, 1, 2].map((i) => <i key={i} className="h-6 rounded" style={{ background: s.surface, border: `1px solid ${s.line}` }} />)}</div>
        <div className="flex flex-1 flex-col gap-1 rounded p-1" style={{ background: s.surface, border: `1px solid ${s.line}` }}>{[0, 1, 2, 3].map((i) => <span key={i} className="h-1.5 rounded" style={{ background: s.soft, opacity: 0.35 }} />)}</div>
      </div>
    </button>
  );
}

export function ThemeCard({ theme, themes }: { theme: Theme; themes: { id: string; name: string; mode: string }[] }) {
  const router = useRouter();
  const [t, setT] = useState(theme);
  const { r, pending, run } = useRun();
  const save = (next: Theme) => { setT(next); run(() => saveSection("theme", next), (res) => (res.ok ? router.refresh() : setT(t))); };
  const tryOn = (id: string) => {
    applyTheme(id);
    router.refresh();
  };
  return (
    <SCard title="ธีม" note="เลือกธีมเริ่มต้นของระบบ และธีมที่ผู้ใช้เลือกเองได้">
      <Msg r={r && !r.ok ? r : null} />
      <div className="mb-4 flex flex-wrap items-start gap-3.5">
        <div className="min-w-[260px] flex-1 text-[13px] leading-[1.7] text-muted">
          • <strong className="text-ink">ค่าเริ่มต้น</strong> คือธีมที่ทุกคนเห็นตอนยังไม่เคยเลือกเอง (รวมถึงหน้าเข้าสู่ระบบ)<br />
          • ปิดสวิตช์ธีมไหน ธีมนั้นจะหายไปจากปุ่มเลือกธีมบนแถบบน — ค่าเริ่มต้นปิดไม่ได้<br />
          • กดที่ภาพตัวอย่างเพื่อ<strong className="text-ink">ลองใช้ทันที</strong> (มีผลกับเครื่องคุณคนเดียว)
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-line bg-surface-alt px-3.5 py-2.5 text-[13px]">
          <Switch on={t.allowUser} disabled={pending} label="ให้ผู้ใช้เลือกธีมเองได้" onChange={(v) => save({ ...t, allowUser: v })} /> ให้ผู้ใช้เลือกธีมเองได้
        </div>
      </div>
      <div className="grid gap-3.5 sm:grid-cols-[repeat(auto-fill,minmax(230px,1fr))]">
        {themes.map((th) => {
          const isDefault = t.default === th.id;
          const on = isDefault || t.enabled.includes(th.id);
          return (
            <div key={th.id} className={`rounded-xl border p-3 ${isDefault ? "border-primary shadow-active" : "border-line"} bg-surface-alt`}>
              <div className="mb-2.5 flex items-center gap-2">
                <span className="size-3.5 rounded-full border border-white/20" style={{ background: SWATCH[th.id].primary }} />
                <span className="font-semibold">{th.name}</span>
                <span className="ml-auto rounded-full bg-surface px-2 py-0.5 text-[11px] text-muted">{th.mode}</span>
              </div>
              <Preview id={th.id} onTry={() => tryOn(th.id)} />
              <div className="mt-2.5 flex items-center gap-2">
                {isDefault ? (
                  <span className="rounded-full bg-primary-50 px-2.5 py-1 text-[11px] font-semibold text-primary">ค่าเริ่มต้น</span>
                ) : (
                  <button type="button" className={B("ghost", "sm")} disabled={pending} onClick={() => save({ ...t, default: th.id, enabled: Array.from(new Set([...t.enabled, th.id])) })}>ตั้งเป็นค่าเริ่มต้น</button>
                )}
                <span className="flex-1" />
                <Switch on={on} disabled={isDefault || pending} title={isDefault ? "ธีมค่าเริ่มต้นต้องเปิดไว้เสมอ" : "เปิด/ปิดให้ผู้ใช้เลือกธีมนี้"} onChange={(v) => save({ ...t, enabled: v ? [...t.enabled, th.id] : t.enabled.filter((x) => x !== th.id) })} />
              </div>
            </div>
          );
        })}
      </div>
    </SCard>
  );
}
