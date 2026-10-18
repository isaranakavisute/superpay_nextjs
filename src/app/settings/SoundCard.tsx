"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { BUILTIN_SOUNDS, playSound } from "@/components/shell/sounds";
import { DeleteDialog } from "@/components/interactive/DeleteDialog";
import { deleteAsset, saveSection, uploadAsset } from "./actions";
import { B, Msg, SCard, field, hint, readFile, select, useRun } from "./parts";

type Custom = { id: string; name: string; bytes: number };

export function SoundCard({ sequence, customs }: { sequence: string[]; customs: Custom[] }) {
  const router = useRouter();
  const [seq, setSeq] = useState(sequence);
  const [name, setName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const { r, setR, pending, run } = useRun();
  const [del, setDel] = useState<{ id: string; name: string } | null>(null);

  const all = [
    ...BUILTIN_SOUNDS.map((s) => ({ id: s.id, name: `${s.name} (${s.seconds} วิ)`, custom: false })),
    ...customs.map((c) => ({ id: `custom:${c.id}`, name: c.name, custom: true })),
  ];
  // Ticked sounds first in play order, then the rest.
  const rows = [...all].sort((a, b) => {
    const ia = seq.indexOf(a.id), ib = seq.indexOf(b.id);
    return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
  });
  const save = (next: string[]) => { const prev = seq; setSeq(next); run(() => saveSection("sounds", { sequence: next }), (res) => { if (!res.ok) setSeq(prev); else router.refresh(); }); };
  const tick = (id: string, on: boolean) => save(on ? [...seq, id] : seq.filter((s) => s !== id));
  const move = (id: string, to: number) => { const rest = seq.filter((s) => s !== id); rest.splice(to, 0, id); save(rest); };

  return (
    <SCard title="เสียงแจ้งเตือนรายการเงินออก" note="ดังทุก 10 วินาทีบนทุกหน้า ขณะที่ยังมีรายการเงินออกรอดำเนินการ จนกว่าจะหมด">
      {del && (
        <DeleteDialog
          title="ยืนยันการลบเสียง"
          what={<>ลบเสียง <strong>{del.name}</strong>? เสียงนี้จะถูกเอาออกจากลำดับเสียงแจ้งเตือน</>}
          placeholder="เช่น ไม่ใช้แล้ว / ไฟล์ผิด"
          onConfirm={(reason) => deleteAsset("sound", reason, del.id)}
          onDone={(x) => { setR(x); router.refresh(); }}
          onClose={() => setDel(null)}
        />
      )}
      <div className={`${hint} mt-0 mb-2.5`}>
        ติ๊กเสียงที่จะใช้กี่เสียงก็ได้ แล้วเลือก<strong className="text-ink">ลำดับ</strong> — ดังทีละเสียงทุก 10 วินาทีตามลำดับ ครบแล้ววนกลับเสียงแรก · รายการหมดแล้วมีใหม่เข้ามา จะเล่น<strong className="text-ink">ต่อจากเสียงล่าสุด</strong> ไม่เริ่มใหม่
      </div>
      <Msg r={r && !r.ok ? r : null} />
      <div className="flex flex-col gap-2">
        {rows.map((s) => {
          const pos = seq.indexOf(s.id);
          return (
            <div key={s.id} className={`flex flex-wrap items-center gap-2.5 rounded-[10px] border px-3 py-2 ${pos >= 0 ? "border-primary" : "border-line"}`}>
              <input type="checkbox" aria-label={`ใช้ ${s.name}`} checked={pos >= 0} disabled={pending} onChange={(e) => tick(s.id, e.target.checked)} className="size-4 accent-(--color-primary)" />
              {pos >= 0 && (
                <select aria-label="ลำดับการเล่น" title="ลำดับการเล่น" className={`${select} w-auto px-2 py-1`} value={pos} disabled={pending} onChange={(e) => move(s.id, Number(e.target.value))}>
                  {seq.map((_, i) => <option key={i} value={i}>ลำดับที่ {i + 1}</option>)}
                </select>
              )}
              <span className="min-w-[120px] flex-1"><strong>{s.name}</strong><span className="ml-1.5 rounded-full bg-surface-alt px-2 py-0.5 text-[11px] text-muted">{s.custom ? "อัปโหลด" : "สำเร็จรูป"}</span></span>
              <button type="button" className={B("ghost", "sm")} onClick={() => playSound(s.id)}>▶ ลองฟัง</button>
              {s.custom && <button type="button" className={B("ghost", "sm")} disabled={pending} onClick={() => setDel({ id: s.id.slice(7), name: s.name })}>ลบ</button>}
            </div>
          );
        })}
      </div>
      <div className="mt-4 rounded-[10px] border border-dashed border-line p-3.5">
        <div className="mb-1.5 text-[13px]"><strong>เพิ่มเสียงเอง</strong></div>
        <div className="flex flex-wrap items-center gap-2">
          <input className={`${field} max-w-[220px]`} placeholder="ชื่อเสียง (ไม่บังคับ)" maxLength={40} value={name} onChange={(e) => setName(e.target.value)} />
          <input ref={fileRef} type="file" accept="audio/mpeg,audio/wav,audio/x-wav,audio/ogg,.mp3,.wav,.ogg" className="text-[13px]" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          <button type="button" className={B("primary")} disabled={!file || pending} onClick={() => {
            if (!file) return;
            if (file.size > 2 << 20) return setR({ ok: false, error: "ไฟล์เสียงต้องไม่เกิน 2 MB" });
            run(async () => { const f = await readFile(file); return uploadAsset("sound", { ...f, mime: f.mime === "audio/mp3" ? "audio/mpeg" : f.mime, name: name.trim() || f.name }); }, (res) => {
              if (res.ok) { setFile(null); setName(""); if (fileRef.current) fileRef.current.value = ""; router.refresh(); }
            });
          }}>อัปโหลด</button>
        </div>
        <div className={hint}>MP3 / WAV / OGG · ไม่เกิน 2 MB · ยาวไม่เกิน ~9 วินาที (เสียงถัดไปเริ่มทุก 10 วินาที ส่วนที่เกินจะถูกตัด) · อัปโหลดแล้วต่อท้ายลำดับให้อัตโนมัติ</div>
      </div>
      <div className={`${hint} mt-2.5`}>ดังเฉพาะผู้ใช้ที่มีสิทธิ์อนุมัติเงินออก · เบราว์เซอร์จะไม่ยอมเล่นเสียงจนกว่าจะคลิกบนหน้าอย่างน้อย 1 ครั้ง</div>
    </SCard>
  );
}
