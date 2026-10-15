import type { Metadata } from "next";
import Link from "next/link";
import { BankCell } from "@/components/cells";
import { DataTable, SearchForm } from "@/components/list/ListParts";
import { Pager, pageState } from "@/components/list/Pager";
import { param, withParams, type Params } from "@/components/list/query";
import { Badge, Card, PageHeader } from "@/components/ui";
import { listResource } from "@/lib/api";
import { fmtDateTime, fmtMoney } from "@/lib/format";
import { portalPerms, requirePortal } from "@/lib/portal";
import type { OutflowRow } from "@/lib/rows";
import { PortalShell } from "../PortalShell";
import { balanceOf, PAYOUT_STATUS, SOURCE_LABEL, STATUS_PARAM, toView, type PayoutView } from "./data";

export const metadata: Metadata = { title: "รายการโอนออก — Merchant Portal" };
const PATH = "/merchant/payouts";
const TABS = [["", "ทั้งหมด"], ["completed", "อนุมัติแล้ว"], ["pending", "รออนุมัติ"], ["failed", "ไม่สำเร็จ"]] as const;

/**
 * Every payout of the shop (API /payout/create, approved withdrawal requests, transfers by the Option Pay team) with
 * its status — read-only. A parent shop sees a sub-merchant's payouts through the shop switcher.
 */
export default async function PortalPayouts({ searchParams }: PageProps<"/merchant/payouts">) {
  const user = await requirePortal(PATH);
  const params: Params = await searchParams;
  const tab = param(params, "status") ?? "";
  const q = param(params, "q");
  const pg = pageState(params, "o");
  const can = await portalPerms(user);
  if (!can.has("view_transactions")) {
    return (
      <PortalShell user={user} path={PATH}>
        <PageHeader title="รายการโอนออก" subtitle="" />
        <Card className="p-5 text-[13px] text-muted">ระดับผู้ใช้ของคุณไม่มีสิทธิ์ดูรายการ — ติดต่อเจ้าของร้าน</Card>
      </PortalShell>
    );
  }
  const [res, bal] = await Promise.all([
    listResource<OutflowRow>("outflows", { merchantId: String(user.merchantId), status: STATUS_PARAM[tab], q, limit: pg.size, offset: (pg.page - 1) * pg.size }).catch(() => null),
    balanceOf(user.merchantId),
  ]);
  const rows = res?.data.map(toView) ?? [];
  const csv = withParams(`${PATH}/csv`, params, {});

  return (
    <PortalShell user={user} path={PATH}>
      <PageHeader
        title="รายการโอนออก"
        subtitle="เงินที่ออกจากยอดของร้าน — โอนออกผ่าน API (/payout/create) อนุมัติทันที และหักยอดร้านตอนสร้าง · คำขอถอนเงินรอผู้ดูแลอนุมัติ"
      />
      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <Card className="p-4"><div className="text-[12.5px] text-muted">ยอดคงเหลือ</div><div className="text-xl font-semibold tabular-nums">{fmtMoney(bal.balance)}</div></Card>
        <Card className="p-4"><div className="text-[12.5px] text-muted">กันไว้สำหรับรายการรออนุมัติ ({bal.pendingCount} รายการ)</div><div className="text-xl font-semibold text-[#fcd34d] tabular-nums">{fmtMoney(bal.reserved)}</div><div className="text-[11.5px] text-muted">ยอด + ค่าธรรมเนียม ของคำขอถอนที่รออนุมัติ</div></Card>
        <Card className="p-4"><div className="text-[12.5px] text-muted">ยอดใช้ได้</div><div className="text-xl font-semibold text-[#6ee7b7] tabular-nums">{fmtMoney(bal.available)}</div><div className="text-[11.5px] text-muted">ยอดคงเหลือ − กันไว้</div></Card>
      </div>
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-[22px] py-3.5">
          <div className="flex flex-wrap gap-1.5">
            {TABS.map(([v, l]) => (
              <Link key={v} href={withParams(PATH, params, { status: v || null, op: null })} className={`rounded-full border px-3 py-1.5 text-[12.5px] ${tab === v ? "border-primary bg-primary-50 text-primary" : "border-line text-muted hover:text-ink"}`}>{l}</Link>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <SearchForm params={params} placeholder="ค้นหาเลขที่ OUT / merchantRef / ผู้รับ / เลขบัญชี..." />
            <a href={csv} className="rounded-lg border border-line px-3 py-2 text-[12.5px] whitespace-nowrap text-muted hover:text-ink">ดาวน์โหลด CSV</a>
          </div>
        </div>
        {!res ? <div className="p-10 text-center text-muted">โหลดข้อมูลไม่สำเร็จ ลองใหม่อีกครั้ง</div> : (
          <>
            <DataTable<PayoutView>
              rows={rows}
              rowKey={(o) => o.ref}
              empty={q || tab ? "ไม่พบรายการตามเงื่อนไข" : "ยังไม่มีรายการโอนออก"}
              columns={[
                { header: "เลขที่", cell: (o) => <><strong>{o.ref}</strong>{o.merchantRef && <div className="text-[11.5px] text-muted">{o.merchantRef}</div>}</> },
                { header: "ประเภท", cell: (o) => <span className="text-[12.5px] whitespace-nowrap">{SOURCE_LABEL[o.source] ?? o.source}</span> },
                { header: "โอนไปยัง", cell: (o) => <BankCell code={o.receiverBankCode} bank={o.receiverBankName} name={o.receiverName} account={o.receiverAccount} /> },
                { header: "ยอด", align: "right", cell: (o) => (<>
                  <strong className="tabular-nums">{fmtMoney(o.amount)}</strong>
                  {Number(o.fee) > 0 && <div className="text-[11px] whitespace-nowrap text-muted">+ ค่าธรรมเนียม {fmtMoney(o.fee)}</div>}
                  <div className="text-[11px] whitespace-nowrap text-muted">หักจากร้าน {fmtMoney(Number(o.amount) + Number(o.fee))}</div>
                </>) },
                { header: "สถานะ", cell: (o) => (<>
                  <Badge className={PAYOUT_STATUS[o.status]?.[1] ?? ""}>{PAYOUT_STATUS[o.status]?.[0] ?? o.status}</Badge>
                  {o.failureReason && <div className="mt-1 max-w-[240px] text-[11.5px] whitespace-normal text-danger">{o.failureReason}</div>}
                  {o.status === "rejected" && <div className="mt-0.5 text-[11px] text-muted">ไม่หักยอด</div>}
                </>) },
                { header: "สร้าง", cell: (o) => <span className="whitespace-nowrap text-muted">{fmtDateTime(o.createdAt)}</span> },
                { header: "อนุมัติ / ปิด", cell: (o) => <span className="whitespace-nowrap text-muted">{o.completedAt ? fmtDateTime(o.completedAt) : "—"}</span> },
              ]}
            />
            <div className="border-t border-line px-[22px] py-3"><Pager path={PATH} params={params} bucket="o" page={pg.page} size={pg.size} total={res.pagination.total} /></div>
          </>
        )}
      </Card>
    </PortalShell>
  );
}
