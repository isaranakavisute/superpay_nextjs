import type { Metadata } from "next";
import { AlertTriangle, DollarSign, Eye, Inbox } from "lucide-react";
import { BankCell, PayerCell } from "@/components/cells";
import { rangeFromParams, rangeWindow, resolveRange } from "@/components/dashboard/range";
import { AutoRefresh } from "@/components/interactive/AutoRefresh";
import { Pager, pageState } from "@/components/list/Pager";
import { param, type Params } from "@/components/list/query";
import { RangeBar } from "@/components/list/RangeBar";
import { ConsoleShell } from "@/components/shell/ConsoleShell";
import { Card, PageHeader, StatGrid, StatTile, StatusBadge } from "@/components/ui";
import { listResource, type ListResult } from "@/lib/api";
import { BANKS, bkkDayStart } from "@/lib/domain";
import { fmtDateTime, fmtMoney } from "@/lib/format";
import { requestTime } from "@/lib/request-time";
import type { AccountRow, MerchantRow, PaymentRow } from "@/lib/rows";
import { AllCheckbox, BulkSelect, RowCheckbox } from "@/components/interactive/BulkSelect";
import { bulkPayments } from "./actions";
import { CreatePayment } from "./CreatePayment";
import { FilterCard } from "./FilterCard";
import { PaymentActions } from "./PaymentActions";

export const metadata: Metadata = { title: "รายการชำระเงิน — Option Pay Admin" };

const PATH = "/payments";
const STATUS_OPTIONS = [
  { value: "", label: "ทุกสถานะ" },
  { value: "pending", label: "รอชำระ" },
  { value: "approved", label: "อนุมัติแล้ว" },
  { value: "rejected", label: "ไม่อนุมัติ" },
  { value: "refunded", label: "คืนเงิน" },
  { value: "expired", label: "หมดอายุ" },
];
const GROUP_OPTIONS = [
  { value: "", label: "ทุกประเภทช่องทาง" },
  { value: "card", label: "บัตร" },
  { value: "ewallet", label: "e-Wallet / พร้อมเพย์" },
  { value: "bank", label: "ธนาคารพาณิชย์" },
  { value: "state", label: "ธนาคารของรัฐ" },
  { value: "foreign", label: "ธนาคารต่างประเทศ" },
];

const th = "border-b border-line bg-surface-alt px-[18px] py-[13px] text-left text-xs font-semibold tracking-[0.5px] text-muted uppercase whitespace-nowrap";
const td = "px-[18px] py-[13px] align-middle";
const timeOnly = new Intl.DateTimeFormat("th-TH", { timeZone: "Asia/Bangkok", hour: "2-digit", minute: "2-digit" });
type Merchants = { id: number; name: string }[];

function Row({ p, selectable, merchants }: { p: PaymentRow; selectable?: boolean; merchants: Merchants }) {
  const done = p.completedAt && p.status === "approved";
  return (
    <tr className="hover:bg-surface-alt">
      {selectable && <td className={`${td} w-[34px] pr-0`}><RowCheckbox refId={p.ref} /></td>}
      <td className={`${td} whitespace-nowrap`}>
        <strong>{p.ref}</strong>
        {p.merchantOrderId && (
          <div className="mt-0.5 max-w-[180px] font-mono text-[11px] break-all text-muted" title="Order ID ของร้าน">{p.merchantOrderId}</div>
        )}
        {p.slipReceivedAt && (
          <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-primary-50 px-2.5 py-[3px] text-[11px] font-semibold text-primary" title={p.hasSlipImage ? "คลิกเพื่อดูสลิป" : undefined}>
            <Eye size={12} /> มีสลิป
          </span>
        )}
      </td>
      <td className={`${td} whitespace-nowrap`}>{p.merchantName ?? <span className="text-soft">house</span>}</td>
      <td className={`${td} whitespace-nowrap`}><PayerCell name={p.customerName} bankCode={p.payerBankCode} masked={p.payerAccountMasked} /></td>
      <td className={`${td} whitespace-nowrap`}><BankCell code={p.accountBankCode} bank={p.accountBankName} name={p.accountName} account={p.accountNo} /></td>
      <td className={`${td} whitespace-nowrap`}><strong className="tabular-nums">{fmtMoney(p.amount)}</strong></td>
      <td className={td}>
        <StatusBadge status={p.status} />
        {p.slipReusedRef && <div className="mt-1 max-w-[220px] text-[11px] text-muted">สลิปนี้ใช้เติมเงิน {p.slipReusedRef} ไปแล้ว</div>}
        {p.reviewNote && <div className="mt-1 max-w-[220px] text-[11px] text-muted">{p.reviewNote}</div>}
        {p.status === "refunded" && <div className="mt-1 text-[11px] text-muted">คืนเงินแล้ว {fmtMoney(p.refundedAmount)}</div>}
      </td>
      <td className={`${td} whitespace-nowrap`}>
        {p.reviewedBy ? (
          <span className="text-[12px]">{p.reviewedBy === "system" ? "ระบบอัตโนมัติ" : p.reviewedBy}</span>
        ) : (
          <span className="text-[12px] text-soft">—</span>
        )}
      </td>
      <td className={`${td} text-[13px] whitespace-nowrap text-muted`}>
        {fmtDateTime(p.createdAt)}
        {done && (
          <div className="text-[11.5px] text-success" title="เวลาที่แก้ไขล่าสุด — ปกติคือตอนอนุมัติ/จับคู่สำเร็จ">✓ สำเร็จ {timeOnly.format(new Date(p.completedAt!))}</div>
        )}
      </td>
      <td className={td}>
        <PaymentActions
          merchants={merchants}
          p={{
            ref: p.ref,
            status: p.status,
            amount: p.amount,
            refundedAmount: p.refundedAmount,
            merchantId: p.merchantId,
            merchantOrderId: p.merchantOrderId,
            hasSlipImage: p.hasSlipImage,
            customerName: p.customerName,
            reviewNote: p.reviewNote,
            slipAmount: p.slipAmount ?? null,
            slipDecision: p.slipDecision ?? null,
            slipTransferLeft: p.slipTransferLeft ?? null,
            slipTransferUsedBy: p.slipTransferUsedBy ?? null,
            customerLeftover: p.customerLeftover ?? null,
          }}
        />
      </td>
    </tr>
  );
}

const HEADERS = ["เลขที่", "ร้านค้า", "ลูกค้า", "ช่องทางรับเงิน", "ยอด", "สถานะ", "ตรวจสอบโดย", "วันที่", "จัดการ"];

function Table({ rows, selectable, empty, merchants }: { rows: PaymentRow[]; selectable?: boolean; empty: string; merchants: Merchants }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-[12.5px]">
        <thead>
          <tr>
            {selectable && <th className={`${th} w-[34px] pr-0`} title="เลือก/ยกเลิกทั้งหน้า"><AllCheckbox refs={rows.map((r) => r.ref)} /></th>}
            {HEADERS.map((h) => <th key={h} className={`${th} ${h === "จัดการ" ? "text-right" : ""}`}>{h}</th>)}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.length === 0 ? (
            <tr>
              <td colSpan={HEADERS.length + (selectable ? 1 : 0)} className="px-5 py-[60px] text-center text-muted">
                <div className="mb-3.5 inline-grid size-16 place-items-center rounded-full bg-surface-alt text-soft"><Inbox size={26} /></div>
                <div>{empty}</div>
              </td>
            </tr>
          ) : (
            rows.map((p) => <Row key={p.ref} p={p} selectable={selectable} merchants={merchants} />)
          )}
        </tbody>
      </table>
    </div>
  );
}

/** Card with a 4px coloured left edge; head = h2 + muted line starting with a count badge. */
function Bucket({
  title,
  edge,
  badge,
  hint,
  children,
}: {
  title: string;
  edge: string;
  badge?: { text: string; bg: string; fg: string };
  hint?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-4 overflow-hidden rounded-xl border border-l-4 border-line bg-surface" style={{ borderLeftColor: edge }}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-line px-[22px] py-[18px]">
        <h2 className="text-lg font-semibold whitespace-nowrap">{title}</h2>
        <span className="text-[12.5px] text-muted">
          {badge && (
            <span className="mr-1.5 inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap uppercase" style={{ background: badge.bg, color: badge.fg }}>
              {badge.text}
            </span>
          )}
          {hint}
        </span>
      </div>
      {children}
    </section>
  );
}

/** Collapsible card: summary = title, count badge, muted hint. */
function Folded({ title, count, hint, edge, children }: { title: string; count: number; hint: string; edge?: string; children: React.ReactNode }) {
  return (
    <details className="group mb-4 overflow-hidden rounded-xl border border-line bg-surface" style={edge ? { borderLeftWidth: 4, borderLeftColor: edge } : undefined}>
      <summary className="cursor-pointer px-[18px] py-3.5 font-semibold">
        {title}
        <span className="ml-1.5 inline-flex rounded-full bg-surface-alt px-2.5 py-1 text-[11px] font-semibold text-muted uppercase">{count} รายการ</span>
        <span className="ml-1.5 text-[12.5px] font-normal text-muted">{hint}</span>
      </summary>
      <div className="border-t border-line">{children}</div>
    </details>
  );
}

const shown = (page: number, size: number, total: number) =>
  total ? `แสดง ${((page - 1) * size + 1).toLocaleString()}–${Math.min(total, page * size).toLocaleString()} จาก ${total.toLocaleString()} รายการ` : "ไม่มีรายการ";

export default async function PaymentsPage({ searchParams }: PageProps<"/payments">) {
  const params: Params = await searchParams;
  const today = bkkDayStart(await requestTime());
  const sel = rangeFromParams(params, today);
  const range = resolveRange(sel, today);
  const win = rangeWindow(range);
  const status = param(params, "status");
  const common = { q: param(params, "q"), bank: param(params, "bank"), merchantId: param(params, "merchantId"), group: param(params, "group"), status };
  const sp = pageState(params, "s");
  const dp = pageState(params, "d");
  const cp = pageState(params, "c");

  let data;
  try {
    const [stats, review, waiting, dup, success, closed, merchants, accounts] = await Promise.all([
      listResource<PaymentRow>("payments", { ...common, ...win, limit: 1 }),
      // Work queues are live: not limited by the date range, so nothing waiting drops out of view.
      listResource<PaymentRow>("payments", { ...common, bucket: "review", limit: 200 }),
      listResource<PaymentRow>("payments", { ...common, bucket: "waiting", limit: 200 }),
      listResource<PaymentRow>("payments", { ...common, ...win, bucket: "dup", limit: dp.size, offset: (dp.page - 1) * dp.size }),
      listResource<PaymentRow>("payments", { ...common, ...win, bucket: "success", limit: sp.size, offset: (sp.page - 1) * sp.size }),
      listResource<PaymentRow>("payments", { ...common, ...win, bucket: "closed", limit: cp.size, offset: (cp.page - 1) * cp.size }),
      listResource<MerchantRow>("merchants"),
      listResource<AccountRow>("accounts", { limit: 200 }),
    ]);
    data = { stats, review, waiting, dup, success, closed, merchants: merchants.data, accounts: accounts.data };
  } catch (err) {
    data = err instanceof Error ? err.message : String(err);
  }

  const shell = (body: React.ReactNode, actions?: React.ReactNode) => (
    <ConsoleShell title="รายการชำระเงิน" path={PATH} search={{ placeholder: "ค้นหาเลขที่ / ลูกค้า...", params, txn: true }}>
      <PageHeader title="รายการชำระเงิน" subtitle="จัดการและตรวจสอบรายการชำระเงินในระบบ" actions={actions} />
      {body}
    </ConsoleShell>
  );

  if (typeof data === "string") {
    return shell(
      <Card className="flex items-start gap-3 p-5">
        <AlertTriangle className="mt-0.5 shrink-0 text-danger" size={20} />
        <div className="text-[13px] text-muted">{data}</div>
      </Card>,
    );
  }

  const by = Object.fromEntries(data.stats.summary.map((s) => [s.key, s])) as Record<string, ListResult["summary"][number] & { fee?: string }>;
  const n = (k: string) => by[k]?.count ?? 0;
  const amt = (k: string) => Number(by[k]?.amount ?? 0);
  const fee = (k: string) => Number(by[k]?.fee ?? 0);
  const merchantsSorted = [...data.merchants].sort((a, b) => a.name.localeCompare(b.name, "th"));
  const pickList = merchantsSorted.map((m) => ({ id: m.id, name: m.name }));
  const receiving = data.accounts.filter((a) => a.status === "active" && a.accountType !== "send");

  return shell(
    <>
      <AutoRefresh seconds={10} />
      <RangeBar sel={sel} label={range.label} />

      <StatGrid>
        <StatTile tone="emerald" icon={<DollarSign size={24} />} label="ชำระสำเร็จ" value={fmtMoney(amt("approved"))} note={`${n("approved")} รายการ`} />
        <StatTile tone="amber" icon={<DollarSign size={24} />} label="ค่าธรรมเนียม" value={fmtMoney(fee("approved") + fee("refunded"))} note="ตามช่วง/ตัวกรองที่เลือก" />
        <StatTile tone="sky" icon={<DollarSign size={24} />} label="ยอดสุทธิ (หลังหักค่าธรรมเนียม)" value={fmtMoney(amt("approved") - fee("approved"))} note={`${n("approved")} รายการอนุมัติ`} />
        <StatTile tone="rose" icon={<DollarSign size={24} />} label="รอชำระ" value={fmtMoney(amt("pending"))} note={`${n("pending")} รายการ · ยกเลิก/หมดอายุ ${n("expired") + n("rejected")}`} />
      </StatGrid>

      <FilterCard txn
        searchPlaceholder="ค้นหาเลขที่ / ลูกค้า..."
        filters={[
          { name: "status", options: STATUS_OPTIONS },
          { name: "group", options: GROUP_OPTIONS },
          { name: "bank", options: [{ value: "", label: "ทุกธนาคาร/ช่องทาง" }, ...BANKS.map((b) => ({ value: b.code, label: b.name }))] },
          { name: "merchantId", options: [{ value: "", label: "ทุกร้านค้า" }, ...merchantsSorted.map((m) => ({ value: String(m.id), label: m.name })), { value: "house", label: "— ไม่ผูกร้าน (house) —" }] },
        ]}
      />

      <Bucket
        title="รอตรวจสอบ"
        edge="var(--color-danger)"
        badge={{ text: `${data.review.pagination.total} รายการ`, bg: "#fee2e2", fg: "#b91c1c" }}
        hint="ต้องมีคนดู — มีสลิป/แจ้งเตือนที่ระบบจับคู่เองไม่ได้, เงินเข้าโดยไม่มีออเดอร์, หรือ P2P ติด"
      >
        <BulkSelect items={data.review.data.map((p) => ({ ref: p.ref, amount: p.amount, customerName: p.customerName, status: p.status, hasSlipImage: p.hasSlipImage, slipAmount: p.slipAmount ?? null, slipDecision: p.slipDecision ?? null, slipTransferLeft: p.slipTransferLeft ?? null, slipTransferUsedBy: p.slipTransferUsedBy ?? null, customerLeftover: p.customerLeftover ?? null, reviewNote: p.reviewNote }))} bulk={bulkPayments} confirmApprove>
          <Table rows={data.review.data} selectable empty="ไม่มีรายการที่ต้องตรวจสอบ ✓" merchants={pickList} />
        </BulkSelect>
      </Bucket>

      {data.waiting.pagination.total > 0 && (
        <Bucket
          title="รอลูกค้าชำระ"
          edge="#d97706"
          badge={{ text: `${data.waiting.pagination.total} รายการ`, bg: "#fef3c7", fg: "#92400e" }}
          hint="สร้างออเดอร์แล้ว ลูกค้ายังไม่ได้โอน / ยังไม่มีสลิป — ไม่ต้องทำอะไร ระบบจับคู่ให้เองเมื่อเงินเข้า"
        >
          <Table rows={data.waiting.data} empty="ไม่มีรายการ" merchants={pickList} />
        </Bucket>
      )}

      {data.dup.pagination.total > 0 && (
        <Folded
          title="ส่งสลิปซ้ำ — ใช้กับออเดอร์อื่นแล้ว"
          count={data.dup.pagination.total}
          edge="var(--color-soft)"
          hint="สลิปที่ส่งมาเคยเติมเงินออเดอร์อื่นไปแล้ว ร้านได้คำตอบว่าสลิปถูกใช้แล้ว — ไม่ต้องทำอะไร ออเดอร์จะหมดอายุเอง"
        >
          <Table rows={data.dup.data} empty="ไม่มีรายการ" merchants={pickList} />
          <Pager path={PATH} params={params} bucket="d" page={dp.page} size={dp.size} total={data.dup.pagination.total} />
        </Folded>
      )}

      <Bucket title="สำเร็จ" edge="var(--color-success)" hint={shown(sp.page, sp.size, data.success.pagination.total)}>
        <Table rows={data.success.data} empty="ไม่พบรายการในระบบ" merchants={pickList} />
        <Pager path={PATH} params={params} bucket="s" page={sp.page} size={sp.size} total={data.success.pagination.total} />
      </Bucket>

      <Folded title="หมดอายุ / ยกเลิก" count={data.closed.pagination.total} hint="ออเดอร์ที่ไม่มีเงินเข้าและไม่มีอะไรต้องตรวจ — กดเพื่อดู">
        <Table rows={data.closed.data} empty="ไม่มีรายการ" merchants={pickList} />
        <Pager path={PATH} params={params} bucket="c" page={cp.page} size={cp.size} total={data.closed.pagination.total} />
      </Folded>
    </>,
    <CreatePayment
      merchants={merchantsSorted.filter((m) => m.status === "active").map((m) => ({ id: m.id, label: m.name }))}
      accounts={receiving.map((a) => ({ id: a.id, label: `${a.bankCode} · ${a.accountName ?? a.label} · ${a.accountNo ?? ""}` }))}
    />,
  );
}
