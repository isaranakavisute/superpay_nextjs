"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { LogoMark } from "@/components/Logo";
import { DeleteDialog } from "@/components/interactive/DeleteDialog";
import { deleteAsset, saveSection, uploadAsset } from "./actions";
import { B, Msg, SCard, Switch, field, fieldLabel, hint, readFile, row, useRun } from "./parts";

export type Brand = { siteName: string; tagline: string; loginHeadline: string; loginSubtext: string; loginInfo?: boolean; logoScale: number; logoAsset: string | null; faviconAsset: string | null };

function ImagePick({ id, label, current, help, onPick, empty }: { id: string; label: string; current: string | null; help: string; onPick: (f: File | null) => void; empty: React.ReactNode }) {
  const input = useRef<HTMLInputElement>(null);
  return (
    <>
      <label className={fieldLabel}>{label}</label>
      <div className="relative grid h-[120px] place-items-center overflow-hidden rounded-xl border border-dashed border-line bg-surface-alt">
        {/* eslint-disable-next-line @next/next/no-img-element -- local preview / uploaded asset */}
        {current ? <img src={current} alt="" className="max-h-[84px] max-w-[85%] object-contain" /> : empty}
        <button type="button" onClick={() => input.current?.click()} className={`${B("ghost", "sm")} absolute right-2 bottom-2 bg-surface`}>เลือกไฟล์</button>
      </div>
      <input ref={input} id={id} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => onPick(e.target.files?.[0] ?? null)} />
      <div className={hint}>{help}</div>
    </>
  );
}

export function BrandCard({ brand }: { brand: Brand }) {
  const router = useRouter();
  const logoUrl = brand.logoAsset ? `/branding/logo?v=${brand.logoAsset}` : null;
  const favUrl = brand.faviconAsset || brand.logoAsset ? `/branding/favicon?v=${brand.faviconAsset ?? brand.logoAsset}` : null;
  const [logo, setLogo] = useState<{ file: File; url: string } | null>(null);
  const [fav, setFav] = useState<{ file: File; url: string } | null>(null);
  const [scale, setScale] = useState(brand.logoScale);
  const [text, setText] = useState({ siteName: brand.siteName, tagline: brand.tagline, loginHeadline: brand.loginHeadline, loginSubtext: brand.loginSubtext, loginInfo: !!brand.loginInfo });
  const img = useRun();
  const txt = useRun();
  const base = { ...text, logoScale: scale };

  const pick = (set: typeof setLogo) => (f: File | null) => {
    if (!f) return;
    if (f.size > 8 << 20) return img.setR({ ok: false, error: "ไฟล์ต้องไม่เกิน 8 MB" });
    set({ file: f, url: URL.createObjectURL(f) });
  };
  const upload = (kind: "logo" | "favicon", f: { file: File } | null, clear: () => void) =>
    f && img.run(async () => uploadAsset(kind, await readFile(f.file)), (r) => { if (r.ok) { clear(); router.refresh(); } });
  const [del, setDel] = useState<"logo" | "favicon" | null>(null);
  const remove = (kind: "logo" | "favicon") => setDel(kind);
  const saveScale = (v: number) => img.run(() => saveSection("brand", { ...base, logoScale: v }), (r) => r.ok && router.refresh());

  const previewLogo = logo?.url ?? logoUrl;
  return (
    <SCard title="โลโก้และชื่อเว็บไซต์" note="ใช้กับ sidebar, หน้าเข้าสู่ระบบ และ favicon บนแท็บ">
      {del && (
        <DeleteDialog
          title={del === "logo" ? "ยืนยันการลบโลโก้" : "ยืนยันการล้าง favicon"}
          what={del === "logo" ? "ลบโลโก้ปัจจุบัน? เว็บจะกลับไปใช้โลโก้เริ่มต้น" : "ล้าง favicon ปัจจุบัน? แท็บจะกลับไปใช้ไอคอนเริ่มต้น"}
          placeholder="เช่น เปลี่ยนแบรนด์ / ไฟล์ผิด"
          onConfirm={(reason) => deleteAsset(del, reason)}
          onDone={() => router.refresh()}
          onClose={() => setDel(null)}
        />
      )}
      <Msg r={img.r} />
      <div className={`${row} items-start`}>
        <div>
          <ImagePick id="logoFile" label="โลโก้" current={previewLogo} help="PNG / JPG / WEBP · แนะนำสัดส่วนแนวนอน ประมาณ 400×80 px · ไม่เกิน 8 MB" onPick={pick(setLogo)} empty={<div className="flex items-center gap-2 text-soft"><LogoMark size={32} /> ยังไม่ได้ตั้งโลโก้</div>} />
          <div className="mt-2.5 flex gap-2">
            <button type="button" className={B("primary")} disabled={!logo || img.pending} onClick={() => upload("logo", logo, () => setLogo(null))}>บันทึกโลโก้</button>
            <button type="button" className={B()} disabled={(!logoUrl && !logo) || img.pending} onClick={() => (logo ? setLogo(null) : remove("logo"))}>ลบโลโก้</button>
          </div>
          <div className="mt-4">
            <label htmlFor="logoScale" className={fieldLabel}>ขนาดโลโก้ <strong>{scale}%</strong></label>
            <div className="flex items-center gap-2.5">
              <input id="logoScale" type="range" min={50} max={200} step={5} value={scale} onChange={(e) => setScale(Number(e.target.value))} onPointerUp={() => saveScale(scale)} onKeyUp={() => saveScale(scale)} className="flex-1 accent-(--color-primary)" />
              <button type="button" className={B("ghost", "sm")} title="กลับเป็นขนาดปกติ" onClick={() => { setScale(100); saveScale(100); }}>100%</button>
            </div>
            <div className={hint}>ใช้กับ sidebar และหน้าเข้าสู่ระบบ · ลากแล้วดูผลที่ตัวอย่างได้ทันที · ปล่อยแล้วบันทึกอัตโนมัติ</div>
          </div>
        </div>
        <div>
          <label className={fieldLabel}>ตัวอย่าง</label>
          <div className="overflow-hidden rounded-xl border border-line">
            <div className="flex items-center gap-3 bg-linear-to-b from-sidebar to-sidebar-2 px-4 py-4">
              {previewLogo ? (
                /* eslint-disable-next-line @next/next/no-img-element -- preview */
                <img src={previewLogo} alt="" style={{ height: Math.round(36 * (scale / 100)) }} className="w-auto max-w-[70%] object-contain" />
              ) : (
                <div className="flex items-center gap-2.5"><LogoMark size={Math.round(36 * (scale / 100))} /><div><div className="font-bold text-white">{text.siteName || "—"}</div><div className="text-[11px] text-soft">{text.tagline}</div></div></div>
              )}
              <div className="flex-1" />
              <div className="text-[11px] text-soft">sidebar</div>
            </div>
            <div className="flex items-center gap-2.5 border-t border-line bg-surface-alt px-4 py-3">
              {/* eslint-disable-next-line @next/next/no-img-element -- preview */}
              <img src={fav?.url ?? favUrl ?? "/icon.svg"} alt="" className="size-4 rounded-sm object-contain" />
              <div className="text-[13px]">{text.siteName || "—"} — เข้าสู่ระบบ</div>
              <div className="flex-1" />
              <div className="text-[11px] text-soft">แท็บเบราว์เซอร์</div>
            </div>
          </div>
        </div>
      </div>

      <hr className="my-[22px] border-line" />

      <div className={`${row} items-start`}>
        <div>
          <ImagePick id="favFile" label="Favicon (ไอคอนบนแท็บเบราว์เซอร์)" current={fav?.url ?? (brand.faviconAsset ? favUrl : null)} help="PNG จัตุรัส 64×64 px หรือใหญ่กว่า · ถ้าไม่ตั้ง จะใช้โลโก้แทน" onPick={pick(setFav)} empty={<span className="text-[13px] text-soft">ใช้โลโก้แทน</span>} />
          <div className="mt-2.5 flex gap-2">
            <button type="button" className={B("primary")} disabled={!fav || img.pending} onClick={() => upload("favicon", fav, () => setFav(null))}>บันทึก Favicon</button>
            <button type="button" className={B()} disabled={(!brand.faviconAsset && !fav) || img.pending} onClick={() => (fav ? setFav(null) : remove("favicon"))}>ล้างค่า</button>
          </div>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); txt.run(() => saveSection("brand", base), (r) => r.ok && router.refresh()); }}>
          <label className={fieldLabel}>ชื่อและข้อความ</label>
          <Msg r={txt.r} />
          <div className="mb-4"><label htmlFor="siteName" className={fieldLabel}>ชื่อเว็บไซต์</label><input id="siteName" className={field} maxLength={40} required value={text.siteName} onChange={(e) => setText({ ...text, siteName: e.target.value })} /><div className={hint}>ใช้ใน sidebar, ชื่อแท็บ และหน้าเข้าสู่ระบบ</div></div>
          <div className="mb-4"><label htmlFor="tagline" className={fieldLabel}>คำอธิบายใต้ชื่อ</label><input id="tagline" className={field} maxLength={60} value={text.tagline} onChange={(e) => setText({ ...text, tagline: e.target.value })} /></div>
          <div className="mb-4 flex items-start gap-2.5 text-[13px]">
            <Switch on={text.loginInfo} label="แสดงข้อความแนะนำในหน้าเข้าสู่ระบบ" onChange={(loginInfo) => setText({ ...text, loginInfo })} />
            <div><div className="font-medium text-ink">แสดงข้อความแนะนำในหน้าเข้าสู่ระบบ</div><div className={hint}>หัวข้อ คำอธิบาย รายการจุดเด่น 4 ข้อ และ “© … Console” ด้านซ้ายของหน้าเข้าสู่ระบบ — ปิด = แสดงเฉพาะโลโก้ · กด บันทึกข้อความ เพื่อใช้งาน</div></div>
          </div>
          <div className="mb-4"><label htmlFor="loginHeadline" className={fieldLabel}>หัวข้อหน้าเข้าสู่ระบบ</label><textarea id="loginHeadline" className={field} rows={2} maxLength={120} placeholder={"จัดการรับ–จ่ายเงิน\nครบในที่เดียว"} value={text.loginHeadline} onChange={(e) => setText({ ...text, loginHeadline: e.target.value })} /><div className={hint}>ขึ้นบรรทัดใหม่ได้ — หน้าเข้าสู่ระบบจะแสดงตามที่ขึ้นบรรทัดไว้</div></div>
          <div className="mb-4"><label htmlFor="loginSubtext" className={fieldLabel}>คำอธิบายหน้าเข้าสู่ระบบ</label><textarea id="loginSubtext" className={field} rows={2} maxLength={240} placeholder="เว้นว่างไว้เพื่อใช้ข้อความเริ่มต้น" value={text.loginSubtext} onChange={(e) => setText({ ...text, loginSubtext: e.target.value })} /></div>
          <div className="flex justify-end"><button type="submit" className={B("primary")} disabled={txt.pending}>บันทึกข้อความ</button></div>
        </form>
      </div>
    </SCard>
  );
}
