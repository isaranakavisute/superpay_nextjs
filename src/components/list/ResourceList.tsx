import { AlertTriangle } from "lucide-react";
import { listResource, type ListResult } from "@/lib/api";
import { bkkDayStart } from "@/lib/domain";
import { requestTime } from "@/lib/request-time";
import { rangeFromParams, rangeWindow, resolveRange, type RangeMode } from "../dashboard/range";
import { ConsoleShell } from "../shell/ConsoleShell";
import { Card, CardHead, PageHeader } from "../ui";
import { DataTable, Pagination, QueryTabs, type Column } from "./ListParts";
import { PAGE_SIZE, pageFrom, param, type Params } from "./query";
import { RangeBar } from "./RangeBar";

export type ResourceListProps<T> = {
  resource: string;
  path: string;
  title: string;
  subtitle?: string;
  params: Params;
  columns: Column<T>[];
  rowKey: (row: T) => string | number;
  /** Status-style tabs: which query param they set and the options ("" = all). */
  tabs?: { name: string; options: { value: string; label: string }[] };
  /** Show the date range bar, opening on this mode. */
  range?: RangeMode;
  searchPlaceholder?: string;
  /** Fixed backend filters, e.g. { category: "withdraw" }. */
  fixed?: Record<string, string>;
  cardTitle?: string;
  empty?: string;
  /** Optional block above the list (stat tiles), given the loaded result. */
  stats?: (result: ListResult<T>, rangeLabel: string) => React.ReactNode;
  pageSize?: number;
};

/** A console list page: header, optional stats, tabs, search, range, table, paging. */
export async function ResourceList<T>(props: ResourceListProps<T>) {
  const { resource, path, title, subtitle, params, columns, rowKey, tabs, range, searchPlaceholder, fixed, cardTitle, empty, stats } = props;
  const pageSize = props.pageSize ?? PAGE_SIZE;
  const page = pageFrom(params);

  let window: { from: string | null; to: string | null } = { from: null, to: null };
  let rangeUi: React.ReactNode = null;
  let rangeLabel = "ทั้งหมด";
  if (range) {
    const today = bkkDayStart(await requestTime());
    const sel = rangeFromParams(params, today, range);
    const resolved = resolveRange(sel, today);
    window = rangeWindow(resolved);
    rangeLabel = resolved.label;
    rangeUi = <RangeBar sel={sel} label={resolved.label} />;
  }

  let result: ListResult<T> | null = null;
  let error: string | null = null;
  try {
    result = await listResource<T>(resource, {
      ...fixed,
      q: param(params, "q"),
      ...(tabs ? { [tabs.name]: param(params, tabs.name) } : {}),
      ...window,
      limit: pageSize,
      offset: (page - 1) * pageSize,
    });
  } catch (err) {
    error = err instanceof Error ? err.message : String(err);
  }

  const counts = result ? Object.fromEntries(result.summary.map((s) => [s.key, s.count])) : undefined;

  return (
    <ConsoleShell title={title} path={path} search={searchPlaceholder !== undefined ? { placeholder: searchPlaceholder || "ค้นหา...", params } : undefined}>
      <PageHeader title={title} subtitle={subtitle} />
      {rangeUi}
      {error ? (
        <Card className="flex items-start gap-3 p-5">
          <AlertTriangle className="mt-0.5 shrink-0 text-danger" size={20} />
          <div>
            <div className="font-semibold">โหลดข้อมูลไม่สำเร็จ</div>
            <div className="mt-1 text-[13px] text-muted">{error}</div>
          </div>
        </Card>
      ) : (
        result && (
          <>
            {stats?.(result, rangeLabel)}
            {tabs && <QueryTabs path={path} params={params} name={tabs.name} tabs={tabs.options} counts={counts} />}
            <Card>
              <CardHead title={cardTitle ?? title} />
              <DataTable columns={columns} rows={result.data} rowKey={rowKey} empty={empty} />
              <Pagination path={path} params={params} page={page} total={result.pagination.total} pageSize={pageSize} />
            </Card>
          </>
        )
      )}
    </ConsoleShell>
  );
}
