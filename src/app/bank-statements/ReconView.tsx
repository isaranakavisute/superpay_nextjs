"use client";

import { useRef, useState } from "react";
import { FileSpreadsheet, FileText, KeyRound, Loader2, Lock, Plus, Upload, X } from "lucide-react";
import { pdfLines, PdfPasswordError } from "@/lib/recon/pdf-lines";
import { parseStatement, type BankKey, type Parsed } from "@/lib/recon/parse";
import { BANK_NAME, dmy, PAYOUTS_SINCE, reconcile, type Payout, type Result } from "@/lib/recon/match";
import { reportWorkbook } from "@/lib/recon/report-xlsx";
import { Report } from "./Report";
import { REPORT_CSS } from "./report-css";

const SLOTS: BankKey[] = ["SCB", "KBANK", "BBL"];
const HINT: Record<BankKey, string> = { SCB: "ไฟล์ AcctSt_….pdf", KBANK: "ไฟล์ STM_SA….pdf", BBL: "ไฟล์ Statement of 511….PDF" };
// Any number of accounts per bank (user, 31 Oct 2026): each slot = one statement PDF + its own password.
type Slot = { id: number; bank: BankKey; file: File | null; password: string; parsed: Parsed | null; error: string };
let nextId = 1;
const empty = (bank: BankKey): Slot => ({ id: nextId++, bank, file: null, password: "", parsed: null, error: "" });

// pdf.js is loaded only on this page, in the browser; the worker file is served from /pdfjs.
async function loadPdfJs() {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  pdfjs.GlobalWorkerOptions.workerSrc = "/pdfjs/pdf.worker.min.mjs";
  return pdfjs;
}

/** เปรียบเทียบกับ bank statement — PDFs and passwords stay in this browser tab; only the payout list is fetched. */
export function ReconView() {
  const [slots, setSlots] = useState<Slot[]>(() => SLOTS.map(empty));
  const [busy, setBusy] = useState<string>("");
  const [testing, setTesting] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [range, setRange] = useState<{ from: string; to: string } | null>(null);
  const [out, setOut] = useState<{ r: Result; payouts: Payout[]; at: string } | null>(null);
  const reportRef = useRef<HTMLDivElement>(null);
  const set = (id: number, p: Partial<Slot>) => setSlots((s) => s.map((x) => (x.id === id ? { ...x, ...p } : x)));
  const addSlot = (b: BankKey) => { setSlots((s) => [...s, empty(b)]); setOut(null); };
  const removeSlot = (id: number) => { setSlots((s) => s.filter((x) => x.id !== id)); setOut(null); };

  /** Read ONE statement with its password (the per-file "ทดสอบรหัสผ่าน" button and "compare" both use it). */
  async function readSlot(s: Slot, others: Slot[], pdfjs: Awaited<ReturnType<typeof loadPdfJs>>): Promise<Slot> {
    if (!s.file) return s;
    try {
      const lines = await pdfLines(pdfjs as never, new Uint8Array(await s.file.arrayBuffer()), s.password);
      const p = parseStatement(lines);
      if (!p) return { ...s, parsed: null, error: "อ่านไฟล์ได้ แต่ไม่ใช่รูปแบบสเตทเมนต์ที่รองรับ (ไทยพาณิชย์ / กสิกรไทย / กรุงเทพ)" };
      if (p.info.bank !== s.bank) return { ...s, parsed: null, error: `ไฟล์นี้เป็นสเตทเมนต์${BANK_NAME[p.info.bank]} — กรุณาใส่ในช่อง${BANK_NAME[p.info.bank]}` };
      if (!p.rows.length) return { ...s, parsed: null, error: "ไม่พบรายการในสเตทเมนต์" };
      const dup = others.find((o) => o.id !== s.id && o.parsed && o.parsed.info.bank === p.info.bank && o.parsed.info.accountNo === p.info.accountNo
        && o.parsed.info.periodFrom === p.info.periodFrom && o.parsed.info.periodTo === p.info.periodTo);
      if (dup) return { ...s, parsed: null, error: `ไฟล์ซ้ำ — สเตทเมนต์บัญชี ${p.info.accountNo} ช่วงเดียวกันนี้ใส่ไว้แล้ว` };
      return { ...s, parsed: p, error: "", password: "" };   // the password is not kept once the file is read
    } catch (e) {
      return { ...s, parsed: null, error: e instanceof PdfPasswordError ? (s.password ? "รหัสผ่านไม่ถูกต้อง" : "ไฟล์นี้มีรหัสผ่าน — กรุณาใส่รหัสผ่าน") : `เปิดไฟล์ไม่ได้: ${e instanceof Error ? e.message : e}` };
    }
  }

  /** "ทดสอบรหัสผ่าน": open just this one PDF now. */
  async function testOne(id: number) {
    const s = slots.find((x) => x.id === id); if (!s?.file) return;
    setTesting(id);
    try { const r = await readSlot(s, slots, await loadPdfJs()); setSlots((all) => all.map((x) => (x.id === id ? r : x))); }
    finally { setTesting(null); }
  }

  async function readAll() {
    setError(""); setOut(null);
    const pdfjs = await loadPdfJs();
    const next = [...slots];
    for (let i = 0; i < next.length; i++) {
      if (!next[i].file || next[i].parsed) continue;
      setBusy(`กำลังอ่านสเตทเมนต์${BANK_NAME[next[i].bank]} (${next[i].file!.name})…`);
      next[i] = await readSlot(next[i], next, pdfjs);
    }
    setSlots(next); setBusy("");
    const ok = next.map((x) => x.parsed).filter((p): p is Parsed => !!p);
    if (!ok.length || next.some((x) => x.file && !x.parsed)) return null;
    const from = [PAYOUTS_SINCE, ...ok.map((p) => p.info.periodFrom || p.rows[0].date)].sort().at(-1)!;
    const to = ok.map((p) => p.info.periodTo || p.rows.at(-1)!.date).sort().at(-1)!;
    const rg = range && range.from >= PAYOUTS_SINCE ? range : { from, to };
    setRange(rg);
    return { parsed: ok, rg };
  }

  async function compare() {
    const ready = slots.every((x) => !x.file || x.parsed) && slots.some((x) => x.parsed) && range ? { parsed: slots.map((x) => x.parsed).filter((p): p is Parsed => !!p), rg: range } : await readAll();
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

  const anyFile = slots.some((x) => x.file);
  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-line bg-surface p-5">
        <div className="mb-1 text-[15px] font-bold">1. อัปโหลดสเตทเมนต์ธนาคาร (PDF) และใส่รหัสผ่านของแต่ละไฟล์</div>
        <p className="mb-4 text-[12.5px] text-muted">ไฟล์และรหัสผ่านถูกอ่านในเบราว์เซอร์นี้เท่านั้น — ไม่ถูกส่งไปที่เซิร์ฟเวอร์และไม่ถูกบันทึก · แต่ละธนาคารเพิ่มได้หลายบัญชี (กด “เพิ่มบัญชี”) แต่ละไฟล์ใส่รหัสผ่านของตัวเอง</p>
        <div className="grid gap-4 md:grid-cols-3">
          {SLOTS.map((b) => { const mine = slots.filter((x) => x.bank === b); return (
            <div key={b} className="rounded-lg border border-line p-4">
              <div className="mb-2 flex items-center justify-between"><span className="font-semibold">{BANK_NAME[b]}</span><span className="text-[12px] text-muted">{mine.length} บัญชี</span></div>
              <div className="space-y-3">
                {mine.map((s, i) => (
                  <div key={s.id} className={`rounded-md border p-3 ${s.parsed ? "border-success/60" : s.error ? "border-danger/60" : "border-line/70"}`}>
                    <div className="mb-2 flex items-center justify-between text-[12px] text-muted">
                      <span>บัญชีที่ {i + 1}</span>
                      {mine.length > 1 && <button type="button" onClick={() => removeSlot(s.id)} className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 hover:bg-white/5 hover:text-danger" aria-label="ลบบัญชีนี้"><X size={13} /> ลบ</button>}
                    </div>
                    <label className="mb-2 flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-line px-3 py-2 text-[13px] hover:border-primary">
                      <Upload size={15} className="shrink-0 text-muted" />
                      <span className="truncate">{s.file ? s.file.name : `เลือกไฟล์ PDF (${HINT[b]})`}</span>
                      <input type="file" accept="application/pdf,.pdf,.PDF" className="hidden" onChange={(e) => { set(s.id, { file: e.target.files?.[0] ?? null, parsed: null, error: "" }); setOut(null); setRange(null); }} />
                    </label>
                    <div className="flex gap-2">
                      <label className="flex min-w-0 flex-1 items-center gap-2 rounded-md border border-line px-3 py-2 text-[13px]">
                        <Lock size={14} className="shrink-0 text-muted" />
                        <input type="password" autoComplete="off" placeholder={s.parsed ? "อ่านไฟล์แล้ว" : "รหัสผ่านเปิดไฟล์ PDF"} value={s.password} disabled={!!s.parsed}
                          onChange={(e) => set(s.id, { password: e.target.value, error: "" })}
                          onKeyDown={(e) => { if (e.key === "Enter" && s.file && !s.parsed) { e.preventDefault(); void testOne(s.id); } }}
                          className="w-full bg-transparent outline-none" />
                      </label>
                      {!s.parsed && (
                        <button type="button" disabled={!s.file || testing === s.id} onClick={() => void testOne(s.id)}
                          title={s.file ? "เปิดไฟล์นี้ด้วยรหัสผ่านที่ใส่ เพื่อตรวจว่าถูกต้อง" : "เลือกไฟล์ก่อน"}
                          className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-line px-3 text-[12.5px] font-semibold hover:border-primary disabled:opacity-40">
                          {testing === s.id ? <Loader2 size={13} className="animate-spin" /> : <KeyRound size={13} />} ทดสอบรหัสผ่าน
                        </button>
                      )}
                    </div>
                    {s.parsed && <p className="mt-2 text-[12px] text-success">✓ อ่านได้ · บัญชี {s.parsed.info.accountNo} · {dmy(s.parsed.info.periodFrom)} – {dmy(s.parsed.info.periodTo)} · โอนเงินออก {s.parsed.rows.filter((r) => r.dir === "out" && r.kind !== "other").length} รายการ</p>}
                    {s.error && <p className="mt-2 text-[12px] text-danger">{s.error}</p>}
                  </div>
                ))}
              </div>
              <button type="button" onClick={() => addSlot(b)} className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-md border border-dashed border-line px-3 py-2 text-[13px] text-muted hover:border-primary hover:text-ink">
                <Plus size={14} /> เพิ่มบัญชี{BANK_NAME[b].replace("ธนาคาร", "")}
              </button>
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
