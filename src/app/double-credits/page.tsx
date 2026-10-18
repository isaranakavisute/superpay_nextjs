import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, Check, CheckCircle2, Download, Inbox } from "lucide-react";
import { rangeFromParams, rangeWindow, resolveRange } from "@/components/dashboard/range";
import { param, withParams, type Params } from "@/components/list/query";
import { RangeBar } from "@/components/list/RangeBar";
import { ConsoleShell } from "@/components/shell/ConsoleShell";
import { Badge, Card, PageHeader } from "@/components/ui";
import { listResource } from "@/lib/api";
import { bkkDayStart } from "@/lib/domain";
import { fmtDateTime, fmtMoney } from "@/lib/format";
import { requestTime } from "@/lib/request-time";
import type { DoubleCreditRow } from "@/lib/rows";
import { FilterCard } from "../payments/FilterCard";
import { Board } from "./Board";

export const metadata: Metadata = { title: "ตรวจเติมเงินซ้ำ — Option Pay Admin" };

const PATH = "/double-credits";
const th = "border-b border-line bg-surface-alt px-[18px] py-[13px] text-left text-xs font-semibold tracking-[0.5px] text-muted uppercase whitespace-nowrap";
const td = "px-[18px] py-[13px] align-top";

export default async function DoubleCreditsPage({ searchParams }: PageProps<"/double-credits">) {
  const params: Params = await searchParams;
  const today = bkkDayStart(await requestTime());
  const sel = rangeFromParams(params, today, "all");
  const range = resolveRange(sel, today);
  const win = rangeWindow(range);
  const tab = param(params, "tab") === "resolved" ? "resolved" : "open";
  const merchantId = param(params, "merchantId");

  let data;
  try {
    const [list, everything] = await Promise.all([
      listResource<DoubleCreditRow>("double-credits", { ...win, merchantId, status: tab, limit: 200 }),
      // Unfiltered by status, for the tab counts and the shop list.
      listResource<DoubleCreditRow>("double-credits", { ...win, limit: 200 }),
    ]);
    data = { list: list.data, counts: Object.fromEntries(list.summary.map((s) => [s.key, s.count])), shops: everything.data };
  } catch (err) {
    data = err instanceof Error ? err.message : String(err);
  }

  const csvHref = `${PATH}/csv?${new URLSearchParams(Object.entries({ merchantId, from: win.from, to: win.to }).filter((e): e is [string, string] => !!e[1]))}`;

  return (
    <ConsoleShell title="ตรวจเติมเงินซ้ำ" path={PATH}>
      <PageHeader
        title="ตรวจเติมเงินซ้ำ"
        subtitle="เงินโอนครั้งเดียวที่ถูกเติมให้สองออเดอร์ — ออเดอร์ที่อนุมัติเองโดยไม่มีสลิปของตัวเอง แต่สลิปที่ส่งมากับมันไปเติมเงินอีกออเดอร์แล้ว"
        actions={
          tab === "open" ? (
            <a href={csvHref} className="inline-flex items-center gap-2 rounded-lg border border-line bg-surface px-[18px] py-2.5 text-sm font-medium text-ink transition hover:bg-surface-alt">
              <Download size={16} /> ดาวน์โหลด CSV
            </a>
          ) : (
            <span className="inline-flex cursor-not-allowed items-center gap-2 rounded-lg border border-line bg-surface px-[18px] py-2.5 text-sm font-medium text-muted opacity-60">
              <Download size={16} /> ดาวน์โหลด CSV
            </span>
          )
        }
      />
      <RangeBar sel={sel} label={range.label} />

      {typeof data === "string" ? (
        <Card className="flex items-start gap-3 p-5">
          <AlertTriangle className="mt-0.5 shrink-0 text-danger" size={20} />
          <div className="text-[13px] text-muted">{data}</div>
        </Card>
      ) : (
        <>
          <div className="mb-5 flex flex-wrap gap-1 border-b border-line">
            {(
              [
                ["open", "รอตรวจ", <AlertTriangle key="i" size={15} />],
                ["resolved", "จัดการแล้ว", <CheckCircle2 key="i" size={15} />],
              ] as const
            ).map(([value, label, icon]) => (
              <Link
                key={value}
                href={withParams(PATH, params, { tab: value === "open" ? null : value })}
                className={`-mb-px inline-flex items-center gap-1.5 border-b-2 px-[18px] py-2.5 text-sm font-medium transition-colors ${tab === value ? "border-primary text-primary" : "border-transparent text-muted hover:text-ink"}`}
              >
                {icon} {label} <span>({data.counts[value] ?? 0})</span>
              </Link>
            ))}
          </div>

          <FilterCard txn
            searchPlaceholder="ค้นหาเลขที่ / อ้างอิง..."
            filters={[
              {
                name: "merchantId",
                options: [
                  { value: "", label: "ทุกร้านค้า" },
                  ...[...new Map(data.shops.filter((d) => d.merchantId).map((d) => [d.merchantId, d.merchantName ?? ""])).entries()]
                    .sort((a, b) => a[1].localeCompare(b[1], "th"))
                    .map(([id, name]) => ({ value: String(id), label: name })),
                ],
              },
            ]}
          />
          <p className="-mt-3 mb-5 max-w-[640px] text-[12.5px] text-muted">
            <strong className="text-ink">ดึงเงินคืน</strong> = ปฏิเสธออเดอร์ที่อนุมัติเอง: ยอดร้านลดลงเท่ายอดสุทธิ และค่าธรรมเนียม/คอมมิชชันของออเดอร์นี้ถูกยกเลิกตาม ·{" "}
            <strong className="text-ink">ไม่ใช่ซ้ำ</strong> = ปิดเคสโดยไม่แตะยอดเงิน
          </p>

          {tab === "open" ? (
            data.list.length === 0 ? (
              <Card className="px-5 py-[60px] text-center text-muted">
                <div className="mb-3.5 inline-grid size-16 place-items-center rounded-full bg-surface-alt text-success"><Check size={28} /></div>
                <div>ไม่พบออเดอร์ที่สงสัยว่าเติมเงินซ้ำในช่วงนี้ ✓</div>
              </Card>
            ) : (
              <Board rows={data.list} />
            )
          ) : (
            <Card>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-[12.5px]">
                  <thead>
                    <tr>{["เมื่อ", "ร้าน", "ออเดอร์", "ยอด", "ผล", "คู่กับ", "โดย", "หมายเหตุ"].map((h) => <th key={h} className={th}>{h}</th>)}</tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {data.list.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-5 py-[60px] text-center text-muted">
                          <div className="mb-3.5 inline-grid size-16 place-items-center rounded-full bg-surface-alt text-soft"><Inbox size={26} /></div>
                          <div>ยังไม่มีคู่ที่จัดการแล้วในช่วงนี้</div>
                        </td>
                      </tr>
                    ) : (
                      data.list.map((d) => (
                        <tr key={d.id} className="hover:bg-surface-alt">
                          <td className={`${td} whitespace-nowrap text-muted`}>{fmtDateTime(d.resolvedAt ?? d.detectedAt)}</td>
                          <td className={`${td} whitespace-nowrap`}>{d.merchantName ?? "house"}</td>
                          <td className={td}>
                            <strong>{d.creditedRef}</strong>
                            {d.creditedOrderId && <div className="font-mono text-[11px] text-muted">{d.creditedOrderId}</div>}
                          </td>
                          <td className={`${td} whitespace-nowrap`}>
                            <strong className="tabular-nums">{fmtMoney(d.amount)}</strong>
                            <div className="text-[11px] text-muted">สุทธิ {fmtMoney(Number(d.amount) - Number(d.creditedFee ?? 0))}</div>
                          </td>
                          <td className={td}>
                            {d.resolutionKind === "clawback" ? (
                              <Badge className="bg-[rgba(239,68,68,0.15)] text-[#fca5a5]">ดึงเงินคืนแล้ว</Badge>
                            ) : (
                              <Badge className="bg-surface-alt text-muted">ไม่ใช่ซ้ำ</Badge>
                            )}
                          </td>
                          <td className={`${td} whitespace-nowrap`}>{d.slipHolderRef}</td>
                          <td className={`${td} whitespace-nowrap`}>{d.resolvedBy ?? "—"}</td>
                          <td className={`${td} max-w-[260px] text-muted`}>{d.resolution ?? "—"}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </>
      )}
    </ConsoleShell>
  );
}
