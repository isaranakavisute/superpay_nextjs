"use client";

import { useRef, useState } from "react";
import { FileSpreadsheet, FileText, Loader2, Lock, Upload } from "lucide-react";
import { pdfLines, PdfPasswordError } from "@/lib/recon/pdf-lines";
import { parseStatement, type BankKey, type Parsed } from "@/lib/recon/parse";
import { BANK_NAME, dmy, PAYOUTS_SINCE, reconcile, type Payout, type Result } from "@/lib/recon/match";
import { reportWorkbook } from "@/lib/recon/report-xlsx";
import { Report } from "./Report";
import { REPORT_CSS } from "./report-css";

const SLOTS: BankKey[] = ["SCB", "KBANK", "BBL"];
const HINT: Record<BankKey, string> = { SCB: "ไฟล์ AcctSt_….pdf", KBANK: "ไฟล์ STM_SA….pdf", BBL: "ไฟล์ Statement of 511….PDF" };
type Slot = { file: File | null; password: string; parsed: Parsed | null; error: string };
const empty = (): Slot => ({ file: null, password: "", parsed: null, error: "" });

// pdf.js is loaded only on this page, in the browser; the worker file is served from /pdfjs.
async function loadPdfJs() {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  pdfjs.GlobalWorkerOptions.workerSrc = "/pdfjs/pdf.worker.min.mjs";
  return pdfjs;
}

/** เปรียบเทียบกับ bank statement — PDFs and passwords stay in this browser tab; only the payout list is fetched. */
export function ReconView() {
  const [slots, setSlots] = useState<Record<BankKey, Slot>>({ SCB: empty(), KBANK: empty(), BBL: empty() });
  const [busy, setBusy] = useState<string>("");
  const [error, setError] = useState("");
  const [range, setRange] = useState<{ from: string; to: string } | null>(null);
  const [out, setOut] = useState<{ r: Result; payouts: Payout[]; at: string } | null>(null);
  const reportRef = useRef<HTMLDivElement>(null);
  const set = (b: BankKey, p: Partial<Slot>) => setSlots((s) => ({ ...s, [b]: { ...s[b], ...p } }));

  async function readAll() {
    setError(""); setOut(null);
    const pdfjs = await loadPdfJs();
    const next = { ...slots };
    for (const b of SLOTS) {
      const s = next[b]; if (!s.file) continue;
      setBusy(`กำลังอ่านสเตทเมนต์${BANK_NAME[b]}…`);
      try {
        const lines = await pdfLines(pdfjs as never, new Uint8Array(await s.file.arrayBuffer()), s.password);
        const p = parseStatement(lines);
        if (!p) next[b] = { ...s, parsed: null, error: "อ่านไฟล์ได้ แต่ไม่ใช่รูปแบบสเตทเมนต์ที่รองรับ (ไทยพาณิชย์ / กสิกรไทย / กรุงเทพ)" };
        else if (p.info.bank !== b) next[b] = { ...s, parsed: null, error: `ไฟล์นี้เป็นสเตทเมนต์${BANK_NAME[p.info.bank]} — กรุณาใส่ในช่อง${BANK_NAME[p.info.bank]}` };
        else if (!p.rows.length) next[b] = { ...s, parsed: null, error: "ไม่พบรายการในสเตทเมนต์" };
        else next[b] = { ...s, parsed: p, error: "", password: "" };   // the password is not kept once the file is read
      } catch (e) {
        next[b] = { ...s, parsed: null, error: e instanceof PdfPasswordError ? "รหัสผ่านไม่ถูกต้อง" : `เปิดไฟล์ไม่ได้: ${e instanceof Error ? e.message : e}` };
      }
    }
    setSlots(next); setBusy("");
    const ok = SLOTS.map((b) => next[b].parsed).filter((p): p is Parsed => !!p);
    if (!ok.length) return null;
    const from = [PAYOUTS_SINCE, ...ok.map((p) => p.info.periodFrom || p.rows[0].date)].sort().at(-1)!;
    const to = ok.map((p) => p.info.periodTo || p.rows.at(-1)!.date).sort().at(-1)!;
    const rg = range && range.from >= PAYOUTS_SINCE ? range : { from, to };
    setRange(rg);
    return { parsed: ok, rg };
  }

  async function compare() {
    const ready = SLOTS.every((b) => !slots[b].file || slots[b].parsed) && SLOTS.some((b) => slots[b].parsed) ? { parsed: SLOTS.map((b) => slots[b].parsed).filter((p): p is Parsed => !!p), rg: range! } : await readAll();
    if (!ready) return;
    setBusy("กำลังดึงรายการเงินออก (payout) ในช่วงวันที่ของสเตทเมนต์…");
    try {
      const res = await fetch(`/bank-statements/payouts?from=${ready.rg.from}&to=${ready.rg.to}`, { cache: "no-store" });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? `HTTP ${res.status}`);
      setBusy("กำลังเปรียบเทียบ…");
      await new Promise((r) => setTimeout(r, 30));
      const r = reconcile(ready.parsed, j.payouts as Payout[], ready.rg.from, ready.rg.to, j.accounts);
      setOut({ r, payouts: j.payouts, at: (() => { const d = new Date(); const p = (n: number) => String(n).padStart(2, "0"); return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`; })() });
      setTimeout(() => reportRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    } catch (e) {
      setError(`ดึงรายการเงินออกไม่ได้: ${e instanceof Error ? e.message : e}`);
    } finally { setBusy(""); }
  }

  function downloadExcel() {
    if (!out) return;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(reportWorkbook(out.r, out.payouts));
    a.download = `เปรียบเทียบ-bank-statement-${out.r.from}-${out.r.to}.xlsx`;
    a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  }
  function downloadPdf() {
    const el = document.getElementById("recon-report"); if (!el || !out) return;
    const w = window.open("", "_blank"); if (!w) { setError("เบราว์เซอร์บล็อกหน้าต่างใหม่ — กรุณาอนุญาต pop-up แล้วลองอีกครั้ง"); return; }
    w.document.write(`<!doctype html><html lang="th"><head><meta charset="utf-8"><title>เปรียบเทียบ-bank-statement-${out.r.from}-${out.r.to}</title><style>${REPORT_CSS}</style></head><body>${el.outerHTML}</body></html>`);
    w.document.close();
    setTimeout(() => { w.focus(); w.print(); }, 400);
  }

  const anyFile = SLOTS.some((b) => slots[b].file);
  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-line bg-surface p-5">
        <div className="mb-1 text-[15px] font-bold">1. อัปโหลดสเตทเมนต์ธนาคาร (PDF) และใส่รหัสผ่านของแต่ละไฟล์</div>
        <p className="mb-4 text-[12.5px] text-muted">ไฟล์และรหัสผ่านถูกอ่านในเบราว์เซอร์นี้เท่านั้น — ไม่ถูกส่งไปที่เซิร์ฟเวอร์และไม่ถูกบันทึก · ปกติอัปโหลดครบ 3 ธนาคาร</p>
        <div className="grid gap-4 md:grid-cols-3">
          {SLOTS.map((b) => { const s = slots[b]; return (
            <div key={b} className={`rounded-lg border p-4 ${s.parsed ? "border-success/60" : s.error ? "border-danger/60" : "border-line"}`}>
              <div className="mb-2 font-semibold">{BANK_NAME[b]}</div>
              <label className="mb-2 flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-line px-3 py-2 text-[13px] hover:border-primary">
                <Upload size={15} className="shrink-0 text-muted" />
                <span className="truncate">{s.file ? s.file.name : `เลือกไฟล์ PDF (${HINT[b]})`}</span>
                <input type="file" accept="application/pdf,.pdf,.PDF" className="hidden" onChange={(e) => { set(b, { file: e.target.files?.[0] ?? null, parsed: null, error: "" }); setOut(null); }} />
              </label>
              <label className="flex items-center gap-2 rounded-md border border-line px-3 py-2 text-[13px]">
                <Lock size={14} className="shrink-0 text-muted" />
                <input type="password" autoComplete="off" placeholder={s.parsed ? "อ่านไฟล์แล้ว" : "รหัสผ่านเปิดไฟล์ PDF"} value={s.password} disabled={!!s.parsed}
                  onChange={(e) => set(b, { password: e.target.value, error: "" })} className="w-full bg-transparent outline-none" />
              </label>
              {s.parsed && <p className="mt-2 text-[12px] text-success">✓ อ่านได้ · บัญชี {s.parsed.info.accountNo} · {dmy(s.parsed.info.periodFrom)} – {dmy(s.parsed.info.periodTo)} · โอนเงินออก {s.parsed.rows.filter((r) => r.dir === "out" && r.kind !== "other").length} รายการ</p>}
              {s.error && <p className="mt-2 text-[12px] text-danger">{s.error}</p>}
            </div>); })}
        </div>
        <div className="mt-4 flex flex-wrap items-end gap-3">
          {range && (<>
            <label className="text-[12.5px]"><div className="mb-1 text-muted">ตั้งแต่วันที่</div>
              <input type="date" min={PAYOUTS_SINCE} value={range.from} onChange={(e) => { setRange({ ...range, from: e.target.value < PAYOUTS_SINCE ? PAYOUTS_SINCE : e.target.value }); setOut(null); }} className="rounded-md border border-line bg-transparent px-2 py-1.5" /></label>
            <label className="text-[12.5px]"><div className="mb-1 text-muted">ถึงวันที่</div>
              <input type="date" value={range.to} onChange={(e) => { setRange({ ...range, to: e.target.value }); setOut(null); }} className="rounded-md border border-line bg-transparent px-2 py-1.5" /></label>
          </>)}
          <button type="button" disabled={!anyFile || !!busy} onClick={() => void compare()}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 font-semibold text-primary-fg disabled:opacity-40">
            {busy ? <Loader2 size={16} className="animate-spin" /> : null} เปรียบเทียบกับรายการเงินออก
          </button>
          {busy && <span className="text-[13px] text-muted">{busy}</span>}
        </div>
        <p className="mt-2 text-[12px] text-muted">ระบบเริ่มบันทึกรายการเงินออก (payout) ตั้งแต่วันที่ {dmy(PAYOUTS_SINCE)} — จึงเทียบรายการในสเตทเมนต์ตั้งแต่วันที่นี้เป็นต้นไป · เทียบเฉพาะรายการโอนเงินออก</p>
        {error && <p className="mt-2 text-[13px] text-danger">{error}</p>}
      </div>

      {out && (
        <div ref={reportRef} className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="text-[15px] font-bold">2. ผลการเปรียบเทียบ</div>
            <button type="button" onClick={downloadExcel} className="inline-flex items-center gap-2 rounded-lg border border-line px-4 py-2 text-[13px] font-semibold hover:border-primary"><FileSpreadsheet size={16} /> ดาวน์โหลด Excel</button>
            <button type="button" onClick={downloadPdf} className="inline-flex items-center gap-2 rounded-lg border border-line px-4 py-2 text-[13px] font-semibold hover:border-primary"><FileText size={16} /> ดาวน์โหลด PDF</button>
            <span className="text-[12px] text-muted">PDF: ในหน้าต่างพิมพ์ เลือก “บันทึกเป็น PDF” (Save as PDF)</span>
          </div>
          <style>{REPORT_CSS}</style>
          <Report r={out.r} payouts={out.payouts} generatedAt={out.at} />
        </div>
      )}
    </div>
  );
}
