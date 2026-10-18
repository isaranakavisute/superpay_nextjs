import Link from "next/link";
import { ArrowLeft, Download } from "lucide-react";

/** Two-column reading layout: sticky section menu on the left, document on the right. */
export type TocItem = { id: string; label: string; children?: { id: string; label: string; method?: string }[] };

const METHOD_TONE: Record<string, string> = { GET: "text-[#10b981]", POST: "text-[#3b82f6]", PATCH: "text-[#f59e0b]", PUT: "text-[#f59e0b]", DELETE: "text-[#ef4444]" };

export function DocLayout({ title, subtitle, pdf, toc, children }: { title: string; subtitle: string; pdf: string; toc: TocItem[]; children: React.ReactNode }) {
  return (
    <div className="grid items-start gap-6 lg:grid-cols-[230px_1fr]">
      <nav className="rounded-xl border border-line bg-surface p-4 lg:sticky lg:top-28 lg:max-h-[calc(100vh-8rem)] lg:overflow-y-auto">
        <Link href="/merchant/docs" className="mb-3 inline-flex items-center gap-1.5 text-[12.5px] text-muted hover:text-ink"><ArrowLeft size={13} /> คู่มือทั้งหมด</Link>
        <div className="mb-2 text-[11px] font-semibold tracking-[1px] text-soft uppercase">สารบัญ</div>
        <ol className="space-y-0.5 text-[13px]">
          {toc.map((t, i) => (
            <li key={t.id}>
              <a href={`#${t.id}`} className="flex gap-1.5 rounded-md px-2 py-1.5 text-muted hover:bg-surface-alt hover:text-ink"><span className="text-soft tabular-nums">{i + 1}.</span><span>{t.label}</span></a>
              {!!t.children?.length && (
                <ol className="mb-1 ml-5 space-y-px border-l border-line pl-2">
                  {t.children.map((c) => (
                    <li key={c.id}>
                      <a href={`#${c.id}`} className="flex items-baseline gap-1.5 rounded px-1.5 py-1 font-mono text-[11.5px] text-muted hover:bg-surface-alt hover:text-ink">
                        {c.method && <span className={`w-[42px] shrink-0 text-[10px] font-bold ${METHOD_TONE[c.method] ?? ""}`}>{c.method}</span>}
                        <span className="break-all">{c.label}</span>
                      </a>
                    </li>
                  ))}
                </ol>
              )}
            </li>
          ))}
        </ol>
        <a href={`/merchant/docs/${pdf}?download=1`} className="mt-3 inline-flex items-center gap-1.5 border-t border-line pt-3 text-[12.5px] text-primary hover:underline"><Download size={13} /> ดาวน์โหลด PDF</a>
      </nav>
      <article className="min-w-0 text-[14px] leading-[1.75] [&_code]:rounded [&_code]:bg-surface-alt [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[12.5px] [&_code]:text-primary-alt [&_strong]:text-ink">
        <h1 className="text-[26px] font-bold">{title}</h1>
        <p className="mb-6 text-muted">{subtitle}</p>
        {children}
      </article>
    </div>
  );
}

export function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="mb-10 scroll-mt-28">
      <h2 className="mb-3 border-b-2 border-primary pb-1.5 text-[19px] font-semibold">{title}</h2>
      {children}
    </section>
  );
}

export const Shot = ({ src, caption, narrow = false }: { src: string; caption: string; narrow?: boolean }) => (
  <figure className={`my-4 ${narrow ? "mx-auto max-w-[300px]" : ""}`}>
    {/* eslint-disable-next-line @next/next/no-img-element -- static screenshot */}
    <img src={`/merchant-manual/${src}`} alt={caption} loading="lazy" className="w-full rounded-lg border border-line" />
    <figcaption className="mt-1.5 text-center text-[12px] text-soft">{caption}</figcaption>
  </figure>
);

export const Steps = ({ items }: { items: React.ReactNode[] }) => (
  <ol className="my-3 space-y-2">
    {items.map((it, i) => (
      <li key={i} className="flex gap-3"><span className="grid size-6 shrink-0 place-items-center rounded-full bg-primary text-[12px] font-bold text-primary-fg">{i + 1}</span><span>{it}</span></li>
    ))}
  </ol>
);

export const Note = ({ tone = "info", children }: { tone?: "info" | "warn"; children: React.ReactNode }) => (
  <div className={`my-3 rounded-lg border-l-[3px] px-4 py-2.5 text-[13.5px] ${tone === "warn" ? "border-warning bg-warning/10" : "border-sky-400 bg-sky-400/10"}`}>{children}</div>
);

export function Table({ head, rows }: { head: string[]; rows: React.ReactNode[][] }) {
  return (
    <div className="my-3 overflow-x-auto rounded-lg border border-line">
      <table className="w-full border-collapse text-[13px]">
        <thead><tr>{head.map((h) => <th key={h} className="border-b border-line bg-surface-alt px-3 py-2 text-left font-semibold text-muted">{h}</th>)}</tr></thead>
        <tbody>{rows.map((r, i) => <tr key={i} className="border-b border-line last:border-0">{r.map((c, j) => <td key={j} className="px-3 py-2 align-top">{c}</td>)}</tr>)}</tbody>
      </table>
    </div>
  );
}
