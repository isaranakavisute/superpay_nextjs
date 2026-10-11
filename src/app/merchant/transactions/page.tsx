import type { Metadata } from "next";
import Link from "next/link";
import { PayerCell } from "@/components/cells";
import { DataTable, SearchForm } from "@/components/list/ListParts";
import { Pager, pageState } from "@/components/list/Pager";
import { param, withParams, type Params } from "@/components/list/query";
import { Card, PageHeader, StatusBadge } from "@/components/ui";
import { listResource } from "@/lib/api";
import { fmtDateTime, fmtMoney } from "@/lib/format";
import { portalPerms, requirePortal } from "@/lib/portal";
import type { PaymentRow } from "@/lib/rows";
import { PortalShell } from "../PortalShell";
import { CreatePortalPayment } from "./CreatePortalPayment";
import { SampleSlipButton } from "./SampleSlipButton";

export const metadata: Metadata = { title: "รายการชำระเงิน — Merchant Portal" };
const PATH = "/merchant/transactions";
const TABS = [["", "ทั้งหมด"], ["pending", "รอชำระ"], ["approved", "ชำระแล้ว"], ["expired", "หมดอายุ"], ["rejected", "ยกเลิก/ปฏิเสธ"], ["refunded", "คืนเงิน"]] as const;

export default async function PortalTransactions({ searchParams }: PageProps<"/merchant/transactions">) {
  const user = await requirePortal(PATH);
  const params: Params = await searchParams;
  const status = param(params, "status") ?? "";
  const pg = pageState(params, "t");
  const can = await portalPerms(user);
  const res = await listResource<PaymentRow>("payments", { merchantId: user.merchantId, status: status || undefined, q: param(params, "q"), limit: pg.size, offset: (pg.page - 1) * pg.size }).catch(() => null);

  return (
    <PortalShell user={user} path={PATH}>
      <PageHeader title="รายการชำระเงิน" subtitle="ออเดอร์ของร้านทั้งหมด — รวมที่สร้างผ่าน API, ที่สร้างในหน้านี้ และที่แอดมินสร้างให้" actions={can.has("create_payment") ? <CreatePortalPayment /> : undefined} />
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-[22px] py-3.5">
          <div className="flex flex-wrap gap-1.5">
            {TABS.map(([v, l]) => (
              <Link key={v} href={withParams(PATH, params, { status: v || null, tp: null })} className={`rounded-full border px-3 py-1.5 text-[12.5px] ${status === v ? "border-primary bg-primary-50 text-primary" : "border-line text-muted hover:text-ink"}`}>{l}</Link>
            ))}
          </div>
          <SearchForm params={params} placeholder="ค้นหาเลขที่ / orderId / ลูกค้า..." />
        </div>
        {!res ? (
          <div className="p-10 text-center text-muted">โหลดข้อมูลไม่สำเร็จ ลองใหม่อีกครั้ง</div>
        ) : (
          <>
            <DataTable<PaymentRow>
              rows={res.data}
              rowKey={(p) => p.ref}
              empty="ยังไม่มีรายการ"
              columns={[
                { header: "เลขที่", cell: (p) => <><strong>{p.ref}</strong>{p.merchantOrderId && <div className="text-[11.5px] text-muted">{p.merchantOrderId}</div>}</> },
                { header: "ลูกค้า", cell: (p) => <PayerCell name={p.customerName} bankCode={p.payerBankCode} masked={p.payerAccountMasked} /> },
                { header: "ยอด", align: "right", cell: (p) => <strong className="tabular-nums">{fmtMoney(p.amount)}</strong> },
                { header: "ค่าธรรมเนียม", align: "right", cell: (p) => <span className="text-muted tabular-nums">{fmtMoney(p.fee)}</span> },
                { header: "สถานะ", cell: (p) => <StatusBadge status={p.status} /> },
                { header: "เวลา", cell: (p) => <span className="whitespace-nowrap text-muted">{fmtDateTime(p.createdAt)}</span> },
                { header: "", align: "right", cell: (p) => (p.status === "pending" ? (
                  <div className="flex items-center justify-end gap-3 whitespace-nowrap">
                    <SampleSlipButton slip={{ ref: p.ref, amount: Number(p.amount), customerName: p.customerName && p.customerName !== "-" ? p.customerName : null, bankName: p.accountBankName, accountName: p.accountName, accountNo: p.accountNo }} />
                    {p.checkoutToken && <a href={`/c?t=${p.checkoutToken}`} target="_blank" rel="noreferrer" className="text-[12.5px] text-primary hover:underline">หน้าชำระเงิน ↗</a>}
                  </div>
                ) : null) },
              ]}
            />
            <div className="border-t border-line px-[22px] py-3"><Pager path={PATH} params={params} bucket="t" page={pg.page} size={pg.size} total={res.pagination.total} /></div>
          </>
        )}
      </Card>
    </PortalShell>
  );
}
