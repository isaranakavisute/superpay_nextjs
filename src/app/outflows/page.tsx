import type { Metadata } from "next";
import { AlertTriangle, Eye, Inbox, Zap } from "lucide-react";
import { BankChip } from "@/components/ui";
import { rangeFromParams, rangeWindow, resolveRange } from "@/components/dashboard/range";
import { AutoRefresh } from "@/components/interactive/AutoRefresh";
import { AllCheckbox, BulkSelect, RowCheckbox } from "@/components/interactive/BulkSelect";
import { Pager, pageState } from "@/components/list/Pager";
import { param, type Params } from "@/components/list/query";
import { RangeBar } from "@/components/list/RangeBar";
import { ConsoleShell } from "@/components/shell/ConsoleShell";
import { Card, PageHeader, StatusBadge } from "@/components/ui";
import { listResource } from "@/lib/api";
import { fmtDateTime, fmtMoney } from "@/lib/format";
import { requestTime } from "@/lib/request-time";
import { bkkDayStart } from "@/lib/domain";
import type { AccountRow, MerchantRow, OutflowRow } from "@/lib/rows";
import { FilterCard } from "../payments/FilterCard";
import { bulkOutflows } from "./actions";
import { CreateOutflow } from "./CreateOutflow";
import { OUTFLOW_CATEGORIES } from "./categories";
import { CopyButton, OutflowActions } from "./OutflowActions";

export const metadata: Metadata = { title: "รายการเงินออก — Option Pay Admin" };

const PATH = "/outflows";
const th = "border-b border-line bg-surface-alt px-[18px] py-[13px] text-left text-xs font-semibold tracking-[0.5px] text-muted uppercase whitespace-nowrap";
const td = "px-[18px] py-[13px] align-middle";
const timeOnly = new Intl.DateTimeFormat("th-TH", { timeZone: "Asia/Bangkok", hour: "2-digit", minute: "2-digit" });
const HEADERS = ["เลขที่", "ร้านค้า", "บัญชีที่หัก", "โอนไปยัง", "ยอด", "สถานะ", "ที่มา", "วันที่", "รายละเอียด", "จัดการ"];
const SOURCE: Record<string, string> = { withdrawal: "คำขอถอน", email: "แจ้งเตือนอีเมล", payout_api: "payout API" };
type Accounts = { id: number; label: string }[];

function Row({ o, selectable, accounts }: { o: OutflowRow; selectable?: boolean; accounts: Accounts }) {
  return (
    <tr className="hover:bg-surface-alt">
      {selectable && <td className={`${td} w-8 pr-0`}><RowCheckbox refId={o.ref} /></td>}
      <td className={`${td} whitespace-nowrap`}>
        <strong>{o.ref}</strong>
        {o.hasSlipImage && (
          <span className="mt-1 flex w-fit items-center gap-1 rounded-full bg-primary-50 px-2.5 py-[3px] text-[11px] font-semibold text-primary"><Eye size={12} /> มีสลิป</span>
        )}
      </td>
      <td className={`${td} whitespace-nowrap`}>{o.merchantName ?? <span className="text-soft">house</span>}</td>
      <td className={`${td} whitespace-nowrap`}>
        {o.fromAccount ? (
          <div>
            <div>{o.fromAccount}</div>
            {o.fromAccountName && <div className="text-[10.5px] text-muted">{o.fromAccountName}</div>}
          </div>
        ) : (
          <span className="text-soft">—</span>
        )}
      </td>
      <td className={td}>
        <div className="flex items-center gap-2">
          <BankChip code={o.receiverBankCode} />
          <div className="min-w-0">
            <div>{o.receiverName}</div>
            <div className="mt-0.5 text-[10.5px] text-muted">{o.receiverBankName}</div>
            <div className="mt-px text-[11.5px] whitespace-nowrap tabular-nums">{o.receiverAccount}</div>
          </div>
          <CopyButton text={o.receiverAccount} />
        </div>
      </td>
      <td className={`${td} whitespace-nowrap`}><strong className="text-danger tabular-nums">- {fmtMoney(o.amount)}</strong></td>
      <td className={td}>
        <StatusBadge status={o.status} kind="outflow" />
        {o.reviewNote && <div className="mt-1 max-w-[200px] text-[11px] text-muted">{o.reviewNote}</div>}
      </td>
      <td className={`${td} whitespace-nowrap`}>
        {o.source === "manual" ? (
          <span className="text-[11px] text-soft">manual</span>
        ) : (
          <span className="inline-flex items-center gap-1 text-[12px]"><Zap size={12} className="text-success" /> {SOURCE[o.source] ?? o.source}</span>
        )}
      </td>
      <td className={`${td} whitespace-nowrap text-muted`}>
        {fmtDateTime(o.createdAt)}
        {o.completedAt && o.status === "approved" && (
          <div className="text-[11.5px] text-success" title="เวลาที่แก้ไขล่าสุด — ปกติคือตอนอนุมัติ/จับคู่สำเร็จ">✓ สำเร็จ {timeOnly.format(new Date(o.completedAt))}</div>
        )}
      </td>
      <td className={`${td} max-w-[240px] text-muted`}>{o.description ?? <span className="text-soft">—</span>}</td>
      <td className={td}>
        <OutflowActions
          accounts={accounts}
          o={{
            ref: o.ref,
            status: o.status,
            amount: o.amount,
            category: o.category,
            bankAccountId: o.bankAccountId,
            receiverName: o.receiverName,
            receiverBankCode: o.receiverBankCode,
            receiverAccount: o.receiverAccount,
            description: o.description,
            hasSlipImage: o.hasSlipImage,
          }}
        />
      </td>
    </tr>
  );
}

function Table({ rows, selectable, empty, accounts }: { rows: OutflowRow[]; selectable?: boolean; empty: string; accounts: Accounts }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-[12.5px]">
        <thead>
          <tr>
            {selectable && <th className={`${th} w-8 pr-0`} title="เลือกทั้งหมด"><AllCheckbox refs={rows.map((r) => r.ref)} /></th>}
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
            rows.map((o) => <Row key={o.ref} o={o} selectable={selectable} accounts={accounts} />)
          )}
        </tbody>
      </table>
    </div>
  );
}

const shown = (page: number, size: number, total: number) =>
  total ? `แสดง ${((page - 1) * size + 1).toLocaleString()}–${Math.min(total, page * size).toLocaleString()} จาก ${total.toLocaleString()} รายการ` : "ไม่มีรายการ";

export default async function OutflowsPage({ searchParams }: PageProps<"/outflows">) {
  const params: Params = await searchParams;
  const today = bkkDayStart(await requestTime());
  const sel = rangeFromParams(params, today);
  const range = resolveRange(sel, today);
  const win = rangeWindow(range);
  const common = { q: param(params, "q"), category: param(params, "category"), account: param(params, "account") };
  const sp = pageState(params, "s");
  const rp = pageState(params, "r");

  let data;
  try {
    const [pending, approved, rejected, merchants, accounts] = await Promise.all([
      // The work queue is live (not limited to the range).
      listResource<OutflowRow>("outflows", { ...common, status: "pending", limit: 200 }),
      listResource<OutflowRow>("outflows", { ...common, ...win, status: "approved", limit: sp.size, offset: (sp.page - 1) * sp.size }),
      listResource<OutflowRow>("outflows", { ...common, ...win, status: "rejected", limit: rp.size, offset: (rp.page - 1) * rp.size }),
      listResource<MerchantRow>("merchants"),
      listResource<AccountRow>("accounts", { limit: 200 }),
    ]);
    data = { pending, approved, rejected, merchants: merchants.data, accounts: accounts.data };
  } catch (err) {
    data = err instanceof Error ? err.message : String(err);
  }

  const shell = (body: React.ReactNode, actions?: React.ReactNode) => (
    <ConsoleShell title="รายการเงินออก" path={PATH} search={{ placeholder: "ค้นหาเลขที่ / รายละเอียด...", params }}>
      <PageHeader title="รายการเงินออก" subtitle="จัดการรายการเงินออก คืนเงิน ค่าใช้จ่าย และรายการที่ระบบหักอัตโนมัติจากอีเมลธนาคาร" actions={actions} />
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

  const sendAccounts = data.accounts.filter((a) => a.accountType !== "receive");
  const accountOpts = sendAccounts.filter((a) => a.status === "active").map((a) => ({ id: a.id, label: `${a.bankCode} • ${a.accountNo ?? a.label} · ${a.accountName ?? ""}` }));

  return shell(
    <>
      <AutoRefresh seconds={10} />
      <RangeBar sel={sel} label={range.label} />

      <FilterCard
        searchPlaceholder="ค้นหาเลขที่ / รายละเอียด..."
        filters={[
          { name: "category", options: [{ value: "", label: "ทุกหมวดหมู่" }, ...OUTFLOW_CATEGORIES] },
          { name: "account", options: [{ value: "", label: "ทุกบัญชี" }, ...sendAccounts.map((a) => ({ value: String(a.id), label: `${a.bankCode} • ${a.accountNo ?? a.label}` }))] },
        ]}
      />

      <section className="mb-4 overflow-hidden rounded-xl border border-l-4 border-line border-l-danger bg-surface">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-line px-[22px] py-[18px]">
          <h2 className="text-lg font-semibold whitespace-nowrap">รอดำเนินการ</h2>
          <span className="text-[12.5px] text-muted">
            <span className="mr-1.5 inline-flex rounded-full bg-[#fee2e2] px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap text-[#b91c1c] uppercase">
              {data.pending.pagination.total} รายการ
            </span>
            รอโอน/รออนุมัติ — คำขอถอน, payout API, รายการที่ระบบสร้างจากแจ้งเตือนหักเงิน
          </span>
        </div>
        <BulkSelect items={data.pending.data.map((o) => ({ ref: o.ref, amount: o.amount }))} bulk={bulkOutflows} show="selected" accounts={accountOpts}>
          <Table rows={data.pending.data} selectable empty="ไม่มีรายการรอดำเนินการ" accounts={accountOpts} />
        </BulkSelect>
      </section>

      <section className="mb-4 overflow-hidden rounded-xl border border-l-4 border-line border-l-success bg-surface">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-line px-[22px] py-[18px]">
          <h2 className="text-lg font-semibold whitespace-nowrap">สำเร็จ</h2>
          <span className="text-[12.5px] text-muted">{shown(sp.page, sp.size, data.approved.pagination.total)}</span>
        </div>
        <Table rows={data.approved.data} empty="ไม่พบรายการในระบบ" accounts={accountOpts} />
        <Pager path={PATH} params={params} bucket="s" page={sp.page} size={sp.size} total={data.approved.pagination.total} />
      </section>

      <details className="mb-4 overflow-hidden rounded-xl border border-line bg-surface">
        <summary className="cursor-pointer px-[18px] py-3.5 font-semibold">
          ปฏิเสธ
          <span className="ml-1.5 inline-flex rounded-full bg-surface-alt px-2.5 py-1 text-[11px] font-semibold text-muted uppercase">{data.rejected.pagination.total} รายการ</span>
          <span className="ml-1.5 text-[12.5px] font-normal text-muted">รายการเงินออกที่ไม่อนุมัติ — กดเพื่อดู</span>
        </summary>
        <div className="border-t border-line">
          <Table rows={data.rejected.data} empty="ไม่มีรายการที่ถูกปฏิเสธ" accounts={accountOpts} />
          <Pager path={PATH} params={params} bucket="r" page={rp.page} size={rp.size} total={data.rejected.pagination.total} />
        </div>
      </details>
    </>,
    <CreateOutflow
      merchants={[...data.merchants].sort((a, b) => a.name.localeCompare(b.name, "th")).filter((m) => m.status === "active").map((m) => ({ id: m.id, label: m.name }))}
      accounts={accountOpts}
    />,
  );
}
