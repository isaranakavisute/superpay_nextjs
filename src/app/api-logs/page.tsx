import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { RangeBar } from "@/components/list/RangeBar";
import { Pager, pageState } from "@/components/list/Pager";
import { param, withParams, type Params } from "@/components/list/query";
import { rangeFromParams, rangeWindow, resolveRange } from "@/components/dashboard/range";
import { ConsoleShell } from "@/components/shell/ConsoleShell";
import { Card, PageHeader } from "@/components/ui";
import { listResource } from "@/lib/api";
import { bkkDayStart } from "@/lib/domain";
import { fmtDateTime } from "@/lib/format";
import { requestTime } from "@/lib/request-time";
import type { ApiLogRow, MerchantRow } from "@/lib/rows";
import { FilterCard } from "../payments/FilterCard";
import { CopyButton } from "../outflows/OutflowActions";
import { curlFor } from "@/lib/curl-for-log";

export const metadata: Metadata = { title: "บันทึกการเรียก API — Option Pay Admin" };
const PATH = "/api-logs";
const th = "border-b border-line bg-surface-alt px-[14px] py-3 text-left text-xs font-semibold tracking-[0.5px] text-muted uppercase whitespace-nowrap";
const td = "border-b border-line px-[14px] py-2.5 align-top";
const tone = (s: number) => (s < 300 ? "bg-[rgba(16,185,129,0.15)] text-[#6ee7b7]" : s < 500 ? "bg-[rgba(245,158,11,0.15)] text-[#fcd34d]" : "bg-[rgba(239,68,68,0.15)] text-[#fca5a5]");

/** Every merchant API (/api/v1) call — who, what, result. Kept 90 days; never keys, secrets, signatures or bodies. */
export default async function ApiLogsPage({ searchParams }: PageProps<"/api-logs">) {
  const params: Params = await searchParams;
  const today = bkkDayStart(await requestTime());
  const sel = rangeFromParams(params, today);
  const range = resolveRange(sel, today);
  const win = rangeWindow(range);
  const pg = pageState(params, "l");
  const filters = { q: param(params, "q"), merchantId: param(params, "merchantId"), method: param(params, "method"), result: param(params, "result"), source: param(params, "source") };
  let data;
  try {
    const [logs, merchants] = await Promise.all([
      listResource<ApiLogRow>("apiLogs", { ...filters, ...win, limit: pg.size, offset: (pg.page - 1) * pg.size }),
      listResource<MerchantRow>("merchants"),
    ]);
    data = { logs, merchants: merchants.data };
  } catch (err) {
    data = err instanceof Error ? err.message : String(err);
  }
  const csv = withParams(`${PATH}/csv`, params, {});
  return (
    <ConsoleShell title="บันทึกการเรียก API" path={PATH} search={{ placeholder: "ค้นหา path / OUT / TXN / IP / error...", params }}>
      <PageHeader title="บันทึกการเรียก API" subtitle="ทุกคำขอที่ร้านค้าเรียก API (/api/v1) และการกระทำของผู้ดูแลระบบ (อนุมัติ / ปฏิเสธ / admin ดำเนินการ ฯลฯ) — เวลา ผู้เรียก ผล และระยะเวลา · เก็บ 90 วัน · ไม่บันทึก key เต็ม secret ลายเซ็น หรือข้อมูลใน body" />
      <RangeBar sel={sel} label={range.label} />
      {typeof data === "string" ? (
        <Card className="flex items-start gap-3 p-5"><AlertTriangle className="mt-0.5 shrink-0 text-danger" size={20} /><div className="text-[13px] text-muted">{data}</div></Card>
      ) : (
        <>
          <FilterCard
            searchPlaceholder="ค้นหา path / OUT / TXN / IP / error..."
            filters={[
              { name: "merchantId", options: [{ value: "", label: "ทุกร้าน" }, ...[...data.merchants].sort((a, b) => a.name.localeCompare(b.name, "th")).map((m) => ({ value: String(m.id), label: m.name }))] },
              { name: "source", options: [{ value: "", label: "ทุกประเภท" }, { value: "api", label: "API ร้านค้า" }, { value: "console", label: "ผู้ดูแลระบบ" }] },
              { name: "result", options: [{ value: "", label: "ทุกผลลัพธ์" }, { value: "ok", label: "สำเร็จ (2xx)" }, { value: "client", label: "ผิดพลาดฝั่งผู้เรียก (4xx)" }, { value: "server", label: "ผิดพลาดฝั่งระบบ (5xx)" }] },
              { name: "method", options: [{ value: "", label: "ทุก method" }, ...["GET", "POST", "PATCH", "DELETE"].map((m) => ({ value: m, label: m }))] },
            ]}
          />
          <Card className="overflow-hidden p-0">
            <div className="flex items-center justify-between border-b border-line px-[18px] py-3">
              <span className="text-[13px] text-muted">{data.logs.pagination.total.toLocaleString()} คำขอ</span>
              <a href={csv} className="rounded-lg border border-line px-3 py-1.5 text-[12.5px] text-muted hover:text-ink">ดาวน์โหลด CSV</a>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1100px] border-collapse text-[12.5px]">
                <thead><tr>{["เวลา", "ร้าน", "API key", "คำขอ", "ผล", "เวลาที่ใช้", "IP / โปรแกรม", "คำสั่ง curl"].map((h) => <th key={h} className={th}>{h}</th>)}</tr></thead>
                <tbody>
                  {data.logs.data.length === 0 ? (
                    <tr><td colSpan={8} className="px-5 py-12 text-center text-muted">ไม่มีคำขอในช่วงนี้</td></tr>
                  ) : data.logs.data.map((r) => (
                    <tr key={r.id} className="hover:bg-surface-alt">
                      <td className={`${td} whitespace-nowrap`}>{fmtDateTime(r.createdAt)}</td>
                      <td className={td}>
                        {r.source === "console" ? <span className="rounded bg-primary-50 px-1.5 py-0.5 text-[11px] font-semibold text-primary">ผู้ดูแลระบบ: {r.actor ?? "—"}</span> : (r.merchantName ?? <span className="text-soft">—</span>)}
                        {r.keyMerchantId != null && r.keyMerchantId !== r.merchantId && <div className="text-[10.5px] text-muted">ผ่าน key ของ {r.keyMerchantName} (X-Sub-Merchant)</div>}
                      </td>
                      <td className={`${td} font-mono text-[11.5px]`}>{r.keyPrefix ?? <span className="text-soft">ไม่มี</span>}{r.keyUser && <div className="font-sans text-[10.5px] text-muted">{r.keyUser}</div>}</td>
                      <td className={`${td} max-w-[420px]`}>
                        <span className="mr-1.5 rounded bg-surface-alt px-1.5 py-0.5 font-mono text-[11px] font-semibold">{r.method}</span>
                        <span className="font-mono text-[12px] break-all">{r.path}</span>
                        {r.query && <div className="mt-0.5 font-mono text-[11px] break-all text-muted">?{r.query}</div>}
                      </td>
                      <td className={`${td} whitespace-nowrap`}>
                        <span className={`rounded px-2 py-0.5 font-mono text-[11.5px] font-semibold ${tone(r.status)}`}>{r.status}</span>
                        {r.errorCode && <div className="mt-1 font-mono text-[11px] text-muted">{r.errorCode}</div>}
                      </td>
                      <td className={`${td} whitespace-nowrap text-muted tabular-nums`}>{r.durationMs.toLocaleString()} ms</td>
                      <td className={`${td} text-[11.5px] text-muted`}><div className="font-mono">{r.ip ?? "—"}</div>{r.userAgent && <div className="max-w-[200px] truncate" title={r.userAgent}>{r.userAgent}</div>}</td>
                      <td className={td}>
                        <details>
                          <summary className="cursor-pointer text-[12px] text-primary">ดูคำสั่ง</summary>
                          <div className="mt-1 flex items-start gap-1.5">
                            <pre className="max-w-[440px] overflow-x-auto rounded-md bg-[#1b1a20] p-2 font-mono text-[10.5px] whitespace-pre text-[#f1ece1]">{curlFor(r)}</pre>
                            <CopyButton text={curlFor(r)} label="คัดลอกคำสั่ง curl" />
                          </div>
                        </details>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="border-t border-line px-[18px] py-3"><Pager path={PATH} params={params} bucket="l" page={pg.page} size={pg.size} total={data.logs.pagination.total} /></div>
          </Card>
          <p className="mt-2.5 text-xs text-muted">รายละเอียดของแต่ละการกระทำ (เช่น เหตุผล ยอดที่คืน) ดูได้ที่ <Link href="/audit" className="text-primary hover:underline">บันทึกการตรวจสอบ</Link></p>
        </>
      )}
    </ConsoleShell>
  );
}
