import Link from "next/link";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { Empty } from "../ui";
import { PAGE_SIZE, param, withParams, type Params } from "./query";

/** Underlined tabs (14px/500, gold underline when active), each a link. */
export function QueryTabs({
  path,
  params,
  name,
  tabs,
  counts,
}: {
  path: string;
  params: Params;
  name: string;
  tabs: { value: string; label: string }[];
  counts?: Record<string, number>;
}) {
  const current = param(params, name) ?? "";
  return (
    <div className="mb-5 flex flex-wrap gap-1 border-b border-line">
      {tabs.map((t) => {
        const active = current === t.value;
        const n = t.value ? counts?.[t.value] : counts && Object.values(counts).reduce((a, b) => a + b, 0);
        return (
          <Link
            key={t.value || "all"}
            href={withParams(path, params, { [name]: t.value || null })}
            className={`-mb-px inline-flex items-center gap-2 border-b-2 px-[18px] py-2.5 text-sm font-medium transition-colors ${
              active ? "border-primary text-primary" : "border-transparent text-muted hover:text-ink"
            }`}
          >
            {t.label}
            {n != null && (
              <span className={`rounded-full px-2 text-[11px] font-semibold ${active ? "bg-primary-50 text-primary" : "bg-surface-alt text-muted"}`}>
                {n}
              </span>
            )}
          </Link>
        );
      })}
    </div>
  );
}

/** Plain GET search form; other params ride along as hidden fields. */
export function SearchForm({ params, placeholder = "ค้นหา..." }: { params: Params; placeholder?: string }) {
  const keep = Object.entries(params).filter(([k, v]) => typeof v === "string" && v && k !== "q" && k !== "page");
  return (
    <form className="relative" role="search">
      {keep.map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v as string} />
      ))}
      <Search size={16} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-soft" />
      <input
        name="q"
        defaultValue={param(params, "q") ?? ""}
        placeholder={placeholder}
        className="w-[280px] max-w-full rounded-full border border-line bg-surface-alt py-[9px] pr-3.5 pl-[38px] text-[13px] text-ink outline-none transition placeholder:text-soft focus:border-primary focus:bg-surface focus:shadow-ring"
      />
    </form>
  );
}

export function Pagination({
  path,
  params,
  page,
  total,
  pageSize = PAGE_SIZE,
}: {
  path: string;
  params: Params;
  page: number;
  total: number;
  pageSize?: number;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (total === 0) return null;
  const first = (page - 1) * pageSize + 1;
  const last = Math.min(total, page * pageSize);
  const btn = "inline-flex size-8 items-center justify-center rounded-lg border border-line text-muted transition hover:bg-surface-alt hover:text-ink";
  return (
    <div className="flex items-center justify-between gap-3 border-t border-line px-[18px] py-3 text-[12.5px] text-muted">
      <span>
        แสดง {first.toLocaleString()}–{last.toLocaleString()} จาก {total.toLocaleString()} รายการ
      </span>
      <div className="flex items-center gap-2">
        {page > 1 ? (
          <Link className={btn} href={withParams(path, params, { page: page - 1 })} aria-label="ก่อนหน้า">
            <ChevronLeft size={16} />
          </Link>
        ) : (
          <span className={`${btn} opacity-40`}><ChevronLeft size={16} /></span>
        )}
        <span>
          หน้า {page} / {pages}
        </span>
        {page < pages ? (
          <Link className={btn} href={withParams(path, params, { page: page + 1 })} aria-label="ถัดไป">
            <ChevronRight size={16} />
          </Link>
        ) : (
          <span className={`${btn} opacity-40`}><ChevronRight size={16} /></span>
        )}
      </div>
    </div>
  );
}

export type Column<T> = {
  header: string;
  cell: (row: T) => React.ReactNode;
  align?: "left" | "right" | "center";
  className?: string;
};

const th = "border-b border-line bg-surface-alt px-[18px] py-[13px] text-xs font-semibold tracking-[0.5px] text-muted uppercase whitespace-nowrap";
const td = "px-[18px] py-[13px] align-middle";
const alignCls = { left: "text-left", right: "text-right", center: "text-center" };

/** Table in the console style; `rowKey` must be unique per row. */
export function DataTable<T>({
  columns,
  rows,
  rowKey,
  empty = "ไม่มีรายการ",
  footer,
}: {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string | number;
  empty?: string;
  footer?: React.ReactNode;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-[12.5px]">
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.header} className={`${th} ${alignCls[c.align ?? "left"]}`}>
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length}>
                <Empty text={empty} />
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={rowKey(row)} className="hover:bg-surface-alt">
                {columns.map((c) => (
                  <td key={c.header} className={`${td} ${alignCls[c.align ?? "left"]} ${c.className ?? "whitespace-nowrap"}`}>
                    {c.cell(row)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
        {footer}
      </table>
    </div>
  );
}
