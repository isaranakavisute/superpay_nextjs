import type { Metadata } from "next";
import { Download } from "lucide-react";
import { ConsoleShell } from "@/components/shell/ConsoleShell";
import { PageHeader } from "@/components/ui";
import { CHAPTERS, type Part } from "./content";

export const metadata: Metadata = { title: "คู่มือผู้ดูแลระบบ — Option Pay Admin" };

/** One part of a chapter (content is fixed, written by us — not user input). */
function Piece({ p }: { p: Part }) {
  if (typeof p === "string") return <div className="manual-html" dangerouslySetInnerHTML={{ __html: p }} />;
  if ("img" in p) return (
    <figure className="my-4" style={{ breakInside: "avoid" }}>
      {/* eslint-disable-next-line @next/next/no-img-element -- static screenshot */}
      <img src={`/admin-manual/${p.img}`} alt={p.cap} loading="lazy" className="w-full rounded-lg border border-line" />
      <figcaption className="mt-1.5 text-center text-[12px] text-soft">{p.cap}</figcaption>
    </figure>
  );
  if ("steps" in p) return (
    <ol className="my-3 space-y-2">
      {p.steps.map((s, i) => (
        <li key={i} className="flex gap-3"><span className="grid size-6 shrink-0 place-items-center rounded-full bg-primary text-[12px] font-bold text-primary-fg">{i + 1}</span><span dangerouslySetInnerHTML={{ __html: s }} /></li>
      ))}
    </ol>
  );
  if ("tbl" in p) return (
    <div className="my-3 overflow-x-auto rounded-lg border border-line" style={{ breakInside: "avoid" }}>
      <table className="w-full border-collapse text-[13px]">
        <thead><tr>{p.tbl[0].map((h) => <th key={h} className="border-b border-line bg-surface-alt px-3 py-2 text-left font-semibold text-muted">{h}</th>)}</tr></thead>
        <tbody>{p.tbl[1].map((r, i) => <tr key={i} className="border-b border-line last:border-0">{r.map((c, j) => <td key={j} className="px-3 py-2 align-top" dangerouslySetInnerHTML={{ __html: c }} />)}</tr>)}</tbody>
      </table>
    </div>
  );
  const tone = "tip" in p ? "border-sky-400 bg-sky-400/10" : "border-warning bg-warning/10";
  return <div className={`my-3 rounded-lg border-l-[3px] px-4 py-2.5 text-[13.5px] ${tone}`} dangerouslySetInnerHTML={{ __html: "tip" in p ? p.tip : p.warn }} />;
}

export default function AdminManualPage() {
  return (
    <ConsoleShell title="คู่มือผู้ดูแลระบบ" path="/manual">
      <PageHeader
        title="คู่มือการใช้งานสำหรับผู้ดูแลระบบ"
        subtitle={`Admin Console — ${CHAPTERS.length} บท ครบทุกเมนู พร้อมภาพหน้าจอ (ฉบับ PDF เนื้อหาเดียวกัน)`}
        actions={<a href="/manual/pdf?download=1" className="inline-flex items-center gap-2 rounded-lg border border-line px-3.5 py-2 text-[13px] hover:bg-surface-alt"><Download size={15} /> ดาวน์โหลด PDF</a>}
      />
      <div className="grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
        <nav aria-label="สารบัญ" className="manual-toc self-start rounded-xl border border-line bg-surface p-4 text-[13px] lg:sticky lg:top-24">
          <div className="mb-2 font-semibold">สารบัญ</div>
          <ol className="space-y-1.5">{CHAPTERS.map((c) => <li key={c.id}><a href={`#${c.id}`} className="text-muted hover:text-primary">{c.title}</a></li>)}</ol>
        </nav>
        <article className="manual-body min-w-0 rounded-xl border border-line bg-surface px-6 py-5 text-[14px] leading-relaxed [&_.manual-html_code]:rounded [&_.manual-html_code]:bg-surface-alt [&_.manual-html_code]:px-1 [&_.manual-html_h3]:mt-5 [&_.manual-html_h3]:mb-1 [&_.manual-html_h3]:font-semibold [&_.manual-html_li]:my-0.5 [&_.manual-html_p]:my-2 [&_.manual-html_ul]:list-disc [&_.manual-html_ul]:pl-5 [&_td_code]:rounded [&_td_code]:bg-surface-alt [&_td_code]:px-1">
          {CHAPTERS.map((c) => (
            <section key={c.id} id={c.id} className="mb-10 scroll-mt-28">
              <h2 className="mb-3 border-b-2 border-primary pb-1.5 text-[19px] font-semibold">{c.title}</h2>
              {c.parts.map((p, i) => <Piece key={i} p={p} />)}
            </section>
          ))}
        </article>
      </div>
    </ConsoleShell>
  );
}
