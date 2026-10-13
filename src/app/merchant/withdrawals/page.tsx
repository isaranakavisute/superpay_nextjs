import type { Metadata } from "next";
import { BankCell } from "@/components/cells";
import { DataTable } from "@/components/list/ListParts";
import { Pager, pageState } from "@/components/list/Pager";
import { param, type Params } from "@/components/list/query";
import { Card, CardHead, PageHeader, StatusBadge } from "@/components/ui";
import { listResource } from "@/lib/api";
import { fmtDateTime, fmtMoney } from "@/lib/format";
import { portalPerms, requirePortal } from "@/lib/portal";
import type { MerchantRow, WithdrawalRow } from "@/lib/rows";
import { PortalShell } from "../PortalShell";
import { WithdrawForm } from "./WithdrawForm";

export const metadata: Metadata = { title: "ถอนเงิน — Merchant Portal" };
const PATH = "/merchant/withdrawals";

export default async function PortalWithdrawals({ searchParams }: PageProps<"/merchant/withdrawals">) {
  const user = await requirePortal(PATH);
  const params: Params = await searchParams;
  const pg = pageState(params, "w");
  const [res, bal] = await Promise.all([
    listResource<WithdrawalRow>("withdrawals", { merchantId: user.merchantId, q: param(params, "q"), limit: pg.size, offset: (pg.page - 1) * pg.size }).catch(() => null),
    listResource<MerchantRow>("merchants").catch(() => null),
  ]);
  const shop = bal?.data.find((m) => m.id === user.merchantId);

  return (
    <PortalShell user={user} path={PATH}>
      <PageHeader title="ถอนเงิน" subtitle="ขอถอนเงินจากยอดของร้าน — ผู้ดูแลตรวจและโอนให้ แล้วสถานะจะอัปเดตที่นี่" />
      {user.viewing ? null : (await portalPerms(user)).has("request_withdrawal") ? (
        <Card className="mb-5">
          <CardHead title="ขอถอนเงิน">{shop && <span className="text-[13px] text-muted">ยอดคงเหลือ {fmtMoney(shop.currentBalance)}</span>}</CardHead>
          <WithdrawForm available={Number(shop?.currentBalance ?? 0)} minBalance={Number(shop?.minBalance ?? 0)} outFeePercent={Number(shop?.outFeePercent ?? 0)} outFeeFlat={Number(shop?.outFeeFlat ?? 0)} />
        </Card>
      ) : (
        <Card className="mb-5 p-5 text-[13px] text-muted">ระดับผู้ใช้ของคุณไม่มีสิทธิ์ขอถอนเงิน — ติดต่อเจ้าของร้านหรือผู้ดูแลระบบ</Card>
      )}
      <Card>
        <CardHead title="คำขอถอนของร้าน" />
        {!res ? <div className="p-10 text-center text-muted">โหลดข้อมูลไม่สำเร็จ</div> : (
          <>
            <DataTable<WithdrawalRow>
              rows={res.data}
              rowKey={(w) => w.ref}
              empty="ยังไม่มีคำขอถอน"
              columns={[
                { header: "เลขที่", cell: (w) => <><strong>{w.ref}</strong>{w.merchantRef && <div className="text-[11.5px] text-muted">{w.merchantRef}</div>}</> },
                { header: "เข้าบัญชี", cell: (w) => <BankCell code={w.receiverBankCode} bank={w.receiverBankName} name={w.receiverName} account={w.receiverAccount} /> },
                { header: "ยอด", align: "right", cell: (w) => <><strong className="tabular-nums">{fmtMoney(w.amount)}</strong>{Number(w.fee) > 0 && <div className="text-[11px] text-muted">+ ค่าธรรมเนียม {fmtMoney(w.fee)}</div>}</> },
                { header: "สถานะ", cell: (w) => <><StatusBadge status={w.status} kind="outflow" />{w.rejectReason && <div className="mt-1 text-[11.5px] text-danger">{w.rejectReason}</div>}</> },
                { header: "ขอเมื่อ", cell: (w) => <span className="whitespace-nowrap text-muted">{fmtDateTime(w.createdAt)}</span> },
              ]}
            />
            <div className="border-t border-line px-[22px] py-3"><Pager path={PATH} params={params} bucket="w" page={pg.page} size={pg.size} total={res.pagination.total} /></div>
          </>
        )}
      </Card>
    </PortalShell>
  );
}
