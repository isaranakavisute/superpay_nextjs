import Link from "next/link";
import { PageSizeSelect } from "./PageSizeSelect";
import { withParams, type Params } from "./query";

export const PAGE_SIZES = [25, 50, 100, 200] as const;

/** Reads a bucket's page/size from ?{key}p= and ?{key}s= (default 50, as on the original). */
export function pageState(params: Params, key: string) {
  const p = Number.parseInt(String(params[`${key}p`] ?? "1"), 10);
  const s = Number.parseInt(String(params[`${key}s`] ?? "50"), 10);
  const size = (PAGE_SIZES as readonly number[]).includes(s) ? s : 50;
  return { page: Number.isFinite(p) && p > 0 ? p : 1, size };
}

/** "หน้า X / Y · แสดง [n] แถว" on the left, « ‹ 1 2 3 › » on the right. */
export function Pager({ path, params, bucket, page, size, total }: { path: string; params: Params; bucket: string; page: number; size: number; total: number }) {
  const pages = Math.max(1, Math.ceil(total / size));
  if (total === 0) return null;
  const href = (n: number) => withParams(path, params, { [`${bucket}p`]: n === 1 ? null : n, page: null });
  const start = Math.max(1, Math.min(page - 2, pages - 4));
  const nums = Array.from({ length: Math.min(5, pages) }, (_, i) => start + i);
  const btn = "inline-grid h-8 min-w-8 place-items-center rounded-lg border px-2 text-[12.5px] transition";
  const cell = (n: number, label: React.ReactNode, key: string, disabled = false, current = false) =>
    disabled || current ? (
      <span key={key} className={`${btn} ${current ? "border-primary bg-primary font-semibold text-primary-fg" : "border-line text-muted opacity-40"}`}>{label}</span>
    ) : (
      <Link key={key} href={href(n)} scroll={false} className={`${btn} border-line text-muted hover:bg-surface-alt hover:text-ink`}>{label}</Link>
    );

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-3.5 py-2.5 text-[12.5px] text-muted">
      <div className="flex items-center gap-3">
        <span>หน้า {page} / {pages}</span>
        {total > 25 && <PageSizeSelect name={`${bucket}s`} value={size} pageKey={`${bucket}p`} />}
      </div>
      <div className="flex items-center gap-1">
        {cell(1, "«", "first", page === 1)}
        {cell(page - 1, "‹", "prev", page === 1)}
        {nums.map((n) => cell(n, n, `n${n}`, false, n === page))}
        {cell(page + 1, "›", "next", page === pages)}
        {cell(pages, "»", "last", page === pages)}
      </div>
    </div>
  );
}
