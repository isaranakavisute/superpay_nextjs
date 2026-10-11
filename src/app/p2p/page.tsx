import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, Inbox } from "lucide-react";
import { Pager, pageState } from "@/components/list/Pager";
import { param, withParams, type Params } from "@/components/list/query";
import { ConsoleShell } from "@/components/shell/ConsoleShell";
import { Badge, Card, PageHeader } from "@/components/ui";
import { listResource } from "@/lib/api";
import { fmtDateTime, fmtMoney } from "@/lib/format";
import type { P2pRow } from "@/lib/rows";
import { PairActions } from "./PairActions";

export const metadata: Metadata = { title: "จับคู่ P2P — Option Pay Admin" };

const PATH = "/p2p";
const TABS = [
  { value: "disputed", label: "ติดปัญหา" },
  { value: "reserved", label: "จองอยู่" },
  { value: "settled", label: "ปิดคู่แล้ว" },
  { value: "released", label: "ปล่อยคืนแล้ว" },
  { value: "all", label: "ทั้งหมด" },
];
const th = "border-b border-line bg-surface-alt px-[18px] py-[13px] text-left text-xs font-semibold tracking-[0.5px] text-muted uppercase whitespace-nowrap";
const td = "px-[18px] py-[13px] align-middle";

function StatusCell({ x }: { x: P2pRow }) {
  const [label, cls] =
    x.status === "reserved" ? ["จองอยู่", "bg-[rgba(59,130,246,0.15)] text-[#93c5fd]"]
    : x.status === "settled" ? ["ปิดคู่แล้ว", "bg-[rgba(16,185,129,0.15)] text-[#6ee7b7]"]
    : x.status === "disputed" ? ["ติดปัญหา", "bg-[rgba(239,68,68,0.15)] text-[#fca5a5]"]
    : x.disputeReason ? ["ปล่อยแล้ว · มีข้อโต้แย้ง", "bg-[rgba(245,158,11,0.15)] text-[#fcd34d]"]
    : ["ปล่อยคืนแล้ว", "bg-[rgba(148,163,184,0.15)] text-[#cbd5e1]"];
  return (
    <>
      <Badge className={cls}>{label}</Badge>
      {x.disputeReason && <div className="mt-[3px] max-w-[220px] text-[10.5px] text-danger">{x.disputeReason}</div>}
    </>
  );
}

export default async function P2pPage({ searchParams }: PageProps<"/p2p">) {
  const params: Params = await searchParams;
  const tab = TABS.some((t) => t.value === param(params, "status")) ? param(params, "status")! : "disputed";
  const pg = pageState(params, "p");

  let data;
  try {
    data = await listResource<P2pRow>("p2p", { status: tab === "all" ? undefined : tab, q: param(params, "q"), limit: pg.size, offset: (pg.page - 1) * pg.size });
  } catch (err) {
    data = err instanceof Error ? err.message : String(err);
  }

  return (
    <ConsoleShell title="จับคู่ P2P" path={PATH}>
      <PageHeader title="จับคู่ P2P" subtitle="ออเดอร์ฝากที่จับคู่กับคำขอถอนโดยตรง — ลูกค้าโอนเข้าบัญชีผู้ถอนเอง เงินไม่ผ่านบัญชีระบบ จึงต้องใช้สลิปยืนยัน" />

      <div className="mb-5 flex flex-wrap gap-1 border-b border-line">
        {TABS.map((t) => (
          <Link
            key={t.value}
            href={withParams(PATH, params, { status: t.value, pp: null })}
            className={`-mb-px border-b-2 px-[18px] py-2.5 text-sm font-medium transition-colors ${tab === t.value ? "border-primary text-primary" : "border-transparent text-muted hover:text-ink"}`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      <div className="mb-4 rounded-xl border border-dashed border-line bg-surface-alt px-[22px] py-5 text-[12.5px] leading-[1.7] text-muted">
        <div><strong className="text-ink">ปิดคู่ (settle)</strong> — ใช้เมื่อผู้ฝากโอนถึงผู้ถอนแล้วจริง ระบบจะอนุมัติออเดอร์ฝากและคำขอถอนพร้อมกันในครั้งเดียว</div>
        <div><strong className="text-ink">ปล่อยคู่ (release)</strong> — ใช้เมื่อ<u>ไม่มีการโอนจริง</u> คำขอถอนจะกลับเข้าพูลเพื่อจับคู่ใหม่ หรือให้แอดมินโอนเอง</div>
        <div className="mt-1 text-danger">⚠️ เลือกผิดฝั่งเท่ากับจ่ายเงินซ้ำ หรือไม่จ่ายทั้งที่ลูกค้าโอนแล้ว — ตรวจสลิปก่อนทุกครั้ง</div>
      </div>

      {typeof data === "string" ? (
        <Card className="flex items-start gap-3 p-5">
          <AlertTriangle className="mt-0.5 shrink-0 text-danger" size={20} />
          <div className="text-[13px] text-muted">{data}</div>
        </Card>
      ) : (
        <Card>
          <div className="flex items-center justify-between border-b border-line px-[22px] py-4">
            <div />
            <div className="text-[13px] text-muted">{data.pagination.total} คู่</div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[12.5px]">
              <thead>
                <tr>{["สถานะ", "ออเดอร์ฝาก", "คำขอถอน", "ยอด", "ผู้รับเงิน", "เวลา", "จัดการ"].map((h) => <th key={h} className={`${th} ${h === "จัดการ" ? "text-right" : ""}`}>{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-line">
                {data.data.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-[60px] text-center text-muted">
                      <div className="mb-3.5 inline-grid size-16 place-items-center rounded-full bg-surface-alt text-soft"><Inbox size={26} /></div>
                      <div>ไม่มีคู่ในสถานะนี้</div>
                    </td>
                  </tr>
                ) : (
                  data.data.map((x) => (
                    <tr key={x.ref} className="hover:bg-surface-alt">
                      <td className={td}><StatusCell x={x} /></td>
                      <td className={`${td} whitespace-nowrap`}>
                        <Link href={`/payments?range=all&q=${x.paymentRef}`} className="text-primary"><strong>{x.paymentRef}</strong></Link>
                        <div className="mt-0.5 text-[10.5px] text-muted">{x.paymentMerchant ?? "house"} · {x.paymentStatus ?? "—"}</div>
                      </td>
                      <td className={`${td} whitespace-nowrap`}>
                        <Link href={`/withdrawals?range=all&q=${x.withdrawalRef}`} className="text-primary"><strong>{x.withdrawalRef}</strong></Link>
                        <div className="mt-0.5 text-[10.5px] text-muted">{x.withdrawalMerchant ?? "—"} · {x.withdrawalStatus ?? "—"}</div>
                      </td>
                      <td className={`${td} whitespace-nowrap`}><strong className="tabular-nums">{fmtMoney(x.amount)}</strong></td>
                      <td className={`${td} whitespace-nowrap`}>
                        <div>{x.receiverName}</div>
                        {x.receiverAccount && <div className="text-[10.5px] text-muted tabular-nums">{x.receiverAccount}</div>}
                      </td>
                      <td className={`${td} text-[11.5px] whitespace-nowrap text-muted`}>
                        <div>จอง {fmtDateTime(x.matchedAt)}</div>
                        {x.settledAt && <div>ปิด {fmtDateTime(x.settledAt)}</div>}
                        {x.releasedAt && <div>ปล่อย {fmtDateTime(x.releasedAt)}</div>}
                      </td>
                      <td className={td}>
                        <PairActions pair={{ ref: x.ref, status: x.status, amount: x.amount, paymentRef: x.paymentRef, withdrawalRef: x.withdrawalRef }} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <Pager path={PATH} params={params} bucket="p" page={pg.page} size={pg.size} total={data.pagination.total} />
        </Card>
      )}
    </ConsoleShell>
  );
}
