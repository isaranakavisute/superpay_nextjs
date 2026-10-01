import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, Eye, Inbox } from "lucide-react";
import { rangeFromParams, rangeWindow, resolveRange } from "@/components/dashboard/range";
import { Pager, pageState } from "@/components/list/Pager";
import { param, type Params } from "@/components/list/query";
import { RangeBar } from "@/components/list/RangeBar";
import { ConsoleShell } from "@/components/shell/ConsoleShell";
import { Card, PageHeader, StatusBadge } from "@/components/ui";
import { listResource } from "@/lib/api";
import { bkkDayStart } from "@/lib/domain";
import { fmtDateTime, fmtMoney } from "@/lib/format";
import { requestTime } from "@/lib/request-time";
import type { MerchantRow, WithdrawalRow } from "@/lib/rows";
import { FilterCard } from "../payments/FilterCard";
import { WithdrawalActions } from "./WithdrawalActions";

export const metadata: Metadata = { title: "คำขอถอนเงิน — SuperPay Admin" };

const PATH = "/withdrawals";
const th = "border-b border-line bg-surface-alt px-[18px] py-[13px] text-left text-xs font-semibold tracking-[0.5px] text-muted uppercase whitespace-nowrap";
const td = "px-[18px] py-[13px] align-middle";
const HEADERS = ["เลขที่", "ร้านค้า", "ปลายทาง", "ยอด", "หมายเหตุ", "สถานะ", "ผู้อนุมัติ", "Outflow", "วันที่", "จัดการ"];

/** One status pill next to the badge (P2P state, auto-approval, waiting time). */
function Pill({ w, now }: { w: WithdrawalRow; now: number }) {
  const pill = (text: string, cls: string) => <span className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${cls}`}>{text}</span>;
  if (w.p2pStatus === "disputed") return pill("P2P ติดปัญหา", "bg-[#fee2e2] text-[#b91c1c]");
  if (w.p2pStatus === "reserved") return pill(`P2P จองอยู่ · ${w.p2pRef}`, "bg-[#dbeafe] text-[#1e40af]");
  if (w.approvedBy === "system" && w.status === "approved") return pill(w.outflowStatus === "pending" ? "อนุมัติอัตโนมัติ · รอโอน" : "อนุมัติอัตโนมัติ", "bg-[#dcfce7] text-[#166534]");
  if (w.status === "pending") {
    const mins = Math.floor((now - new Date(w.createdAt).getTime()) / 60000);
    if (mins >= 30) {
      const t = mins < 60 ? `${mins} นาที` : mins < 1440 ? `${Math.floor(mins / 60)} ชม.` : `${Math.floor(mins / 1440)} วัน`;
      return pill(`รอนาน ${t}`, "bg-[#fef3c7] text-[#92400e]");
    }
  }
  return null;
}

function Row({ w, now }: { w: WithdrawalRow; now: number }) {
  const before = Number(w.merchantBalance);
  const after = before - Number(w.amount);
  return (
    <tr className="hover:bg-surface-alt">
      <td className={`${td} whitespace-nowrap`}>
        <strong>{w.ref}</strong>
        {w.merchantRef && <div className="mt-0.5 text-[10.5px] text-muted">{w.merchantRef}</div>}
      </td>
      <td className={`${td} whitespace-nowrap`}>{w.merchantName}</td>
      <td className={`${td} whitespace-nowrap`}>
        <div>{w.receiverName}</div>
        <div className="mt-0.5 text-[10.5px] text-muted">{w.receiverBankCode} • {w.receiverAccount}</div>
      </td>
      <td className={`${td} whitespace-nowrap`}>
        <strong className="text-danger tabular-nums">- {fmtMoney(w.amount)}</strong>
        {w.status === "pending" && (
          <>
            <div className="mt-0.5 text-[10.5px] text-muted">ก่อนถอน {fmtMoney(before)}</div>
            <div className={`text-[10.5px] ${after < 0 ? "text-danger" : "text-success"}`}>
              คงเหลือ {fmtMoney(after)}{after < 0 && " ⚠ เกินยอด"}
            </div>
          </>
        )}
      </td>
      <td className={`${td} max-w-[220px] truncate text-muted`} title={w.note ?? undefined}>{w.note ?? <span className="text-soft">—</span>}</td>
      <td className={td}>
        <StatusBadge status={w.status} kind="outflow" />
        <div><Pill w={w} now={now} /></div>
        {w.rejectReason && <div className="mt-1 max-w-[200px] text-[11px] text-muted">{w.rejectReason}</div>}
        {w.outflowStatus === "rejected" && <div className="mt-1 text-[11px] text-danger">รายการเงินออกถูกปฏิเสธ — ไม่ได้จ่าย</div>}
      </td>
      <td className={`${td} whitespace-nowrap`}>
        {w.approvedBy ? (w.approvedBy === "system" ? "ระบบ (อัตโนมัติ)" : w.approvedBy) : <span className="text-soft">—</span>}
      </td>
      <td className={`${td} whitespace-nowrap`}>
        {w.outflowRef ? (
          <div>
            <Link href={`/outflows?range=all&q=${w.outflowRef}`} className="font-medium text-primary hover:underline">{w.outflowRef}</Link>
            {w.hasSlipImage && (
              <span className="mt-1 flex w-fit items-center gap-1 rounded-full bg-primary-50 px-2.5 py-[3px] text-[11px] font-semibold text-primary"><Eye size={12} /> มีสลิป</span>
            )}
          </div>
        ) : (
          <span className="text-soft">—</span>
        )}
      </td>
      <td className={`${td} whitespace-nowrap text-muted`}>{fmtDateTime(w.createdAt)}</td>
      <td className={td}>
        <WithdrawalActions
          w={{
            ref: w.ref,
            status: w.status,
            amount: w.amount,
            receiverName: w.receiverName,
            outflowRef: w.outflowRef,
            hasSlipImage: w.hasSlipImage,
            p2pStatus: w.p2pStatus,
            p2pRef: w.p2pRef,
          }}
        />
      </td>
    </tr>
  );
}

function Table({ rows, empty, now }: { rows: WithdrawalRow[]; empty: string; now: number }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-[12.5px]">
        <thead>
          <tr>{HEADERS.map((h) => <th key={h} className={`${th} ${h === "จัดการ" ? "text-right" : ""}`}>{h}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.length === 0 ? (
            <tr>
              <td colSpan={HEADERS.length} className="px-5 py-[60px] text-center text-muted">
                <div className="mb-3.5 inline-grid size-16 place-items-center rounded-full bg-surface-alt text-soft"><Inbox size={26} /></div>
                <div>{empty}</div>
              </td>
            </tr>
          ) : (
            rows.map((w) => <Row key={w.ref} w={w} now={now} />)
          )}
        </tbody>
      </table>
    </div>
  );
}

function Bucket({ title, edge, badge, hint, children }: { title: string; edge: string; badge: { text: string; bg?: string; fg?: string }; hint: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="mb-4 overflow-hidden rounded-xl border border-l-4 border-line bg-surface" style={{ borderLeftColor: edge }}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-line px-[22px] py-[18px]">
        <h2 className="text-lg font-semibold whitespace-nowrap">{title}</h2>
        <span className="text-[12.5px] text-muted">
          <span
            className={`mr-1.5 inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap uppercase ${badge.bg ? "" : "bg-surface-alt text-muted"}`}
            style={badge.bg ? { background: badge.bg, color: badge.fg } : undefined}
          >
            {badge.text}
          </span>
          {hint}
        </span>
      </div>
      {children}
    </section>
  );
}

export default async function WithdrawalsPage({ searchParams }: PageProps<"/withdrawals">) {
  const params: Params = await searchParams;
  const now = await requestTime();
  const today = bkkDayStart(now);
  const sel = rangeFromParams(params, today);
  const range = resolveRange(sel, today);
  const win = rangeWindow(range);
  const common = { q: param(params, "q"), merchantId: param(params, "merchantId") };
  const dp = pageState(params, "d");
  const cp = pageState(params, "c");

  let data;
  try {
    const [action, p2p, awaiting, done, rejected, merchants] = await Promise.all([
      // Open work is live; finished buckets follow the range.
      listResource<WithdrawalRow>("withdrawals", { ...common, bucket: "action", limit: 200 }),
      listResource<WithdrawalRow>("withdrawals", { ...common, bucket: "p2p", limit: 200 }),
      listResource<WithdrawalRow>("withdrawals", { ...common, bucket: "awaiting", limit: 200 }),
      listResource<WithdrawalRow>("withdrawals", { ...common, ...win, bucket: "done", limit: dp.size, offset: (dp.page - 1) * dp.size }),
      listResource<WithdrawalRow>("withdrawals", { ...common, ...win, bucket: "rejected", limit: cp.size, offset: (cp.page - 1) * cp.size }),
      listResource<MerchantRow>("merchants"),
    ]);
    data = { action, p2p, awaiting, done, rejected, merchants: merchants.data };
  } catch (err) {
    data = err instanceof Error ? err.message : String(err);
  }

  const body =
    typeof data === "string" ? (
      <Card className="flex items-start gap-3 p-5">
        <AlertTriangle className="mt-0.5 shrink-0 text-danger" size={20} />
        <div className="text-[13px] text-muted">{data}</div>
      </Card>
    ) : (
      <>
        <RangeBar sel={sel} label={range.label} />
        <FilterCard
          searchPlaceholder="ค้นหาเลขที่ / ผู้รับ..."
          filters={[{ name: "merchantId", options: [{ value: "", label: "ทุกร้านค้า" }, ...[...data.merchants].sort((a, b) => a.name.localeCompare(b.name, "th")).map((m) => ({ value: String(m.id), label: m.name }))] }]}
        />

        <Bucket
          title="ต้องดำเนินการ"
          edge="var(--color-danger)"
          badge={{ text: `${data.action.pagination.total} รายการ`, bg: "#fee2e2", fg: "#b91c1c" }}
          hint="รอแอดมินอนุมัติ/ปฏิเสธ — รวมคู่ P2P ที่ติดปัญหา และคำขอที่ระบบอนุมัติอัตโนมัติไม่ได้"
        >
          <Table rows={data.action.data} empty="ไม่มีคำขอถอนที่ต้องดำเนินการ" now={now} />
        </Bucket>

        {data.p2p.pagination.total > 0 && (
          <Bucket
            title="กำลังจับคู่ P2P"
            edge="#3b82f6"
            badge={{ text: `${data.p2p.pagination.total} รายการ`, bg: "#dbeafe", fg: "#1e40af" }}
            hint={<>มีลูกค้าฝากกำลังโอนเข้าบัญชีผู้ถอนอยู่ — <strong>ห้ามโอนเอง</strong> จะจ่ายซ้ำ รอให้คู่จบก่อน</>}
          >
            <Table rows={data.p2p.data} empty="ไม่มีรายการ" now={now} />
          </Bucket>
        )}

        {data.awaiting.pagination.total > 0 && (
          <Bucket
            title="อนุมัติแล้ว รอโอน"
            edge="#d97706"
            badge={{ text: `${data.awaiting.pagination.total} รายการ`, bg: "#fef3c7", fg: "#92400e" }}
            hint={<>รายการเงินออกยังรออยู่ — โอนเงินแล้วกดอนุมัติที่หน้า <Link href="/outflows" className="text-primary hover:underline">รายการเงินออก</Link></>}
          >
            <Table rows={data.awaiting.data} empty="ไม่มีรายการ" now={now} />
          </Bucket>
        )}

        <Bucket title="สำเร็จ" edge="var(--color-success)" badge={{ text: `${data.done.pagination.total} รายการ` }} hint="จ่ายเงินแล้ว">
          <Table rows={data.done.data} empty="ยังไม่มีคำขอถอนที่จ่ายแล้ว" now={now} />
          <Pager path={PATH} params={params} bucket="d" page={dp.page} size={dp.size} total={data.done.pagination.total} />
        </Bucket>

        <details className="mb-4 overflow-hidden rounded-xl border border-line bg-surface">
          <summary className="cursor-pointer px-[18px] py-3.5 font-semibold">
            ปฏิเสธ
            <span className="ml-1.5 inline-flex rounded-full bg-surface-alt px-2.5 py-1 text-[11px] font-semibold text-muted uppercase">{data.rejected.pagination.total} รายการ</span>
            <span className="ml-1.5 text-[12.5px] font-normal text-muted">คำขอที่ไม่อนุมัติ — กดเพื่อดู</span>
          </summary>
          <div className="border-t border-line">
            <Table rows={data.rejected.data} empty="ไม่มีคำขอที่ถูกปฏิเสธ" now={now} />
            <Pager path={PATH} params={params} bucket="c" page={cp.page} size={cp.size} total={data.rejected.pagination.total} />
          </div>
        </details>
      </>
    );

  return (
    <ConsoleShell title="คำขอถอนเงิน" path={PATH} search={{ placeholder: "ค้นหาเลขที่ / ผู้รับ...", params }}>
      <PageHeader
        title="คำขอถอนเงิน (Withdrawals)"
        subtitle={'คำขอถอนจาก merchant portal / API — อนุมัติแล้วระบบจะสร้างรายการเงินออก (pending) ให้ไปผูกบัญชีและอนุมัติต่อที่หน้า "รายการเงินออก"'}
      />
      {body}
    </ConsoleShell>
  );
}
