import type { Metadata } from "next";
import { MerchantView } from "@/components/merchant/MerchantView";
import type { Params } from "@/components/list/query";
import { PageHeader } from "@/components/ui";
import { requirePortal } from "@/lib/portal";
import Link from "next/link";
import { fmtMoney } from "@/lib/format";
import { PortalShell } from "../PortalShell";
import { balanceOf } from "../payouts/data";

export const metadata: Metadata = { title: "แดชบอร์ด — Merchant Portal" };

export default async function PortalDashboard({ searchParams }: PageProps<"/merchant/dashboard">) {
  const user = await requirePortal("/merchant/dashboard");
  const params: Params = await searchParams;
  const bal = await balanceOf(user.merchantId);
  return (
    <PortalShell user={user} path="/merchant/dashboard">
      <PageHeader title={`ร้าน ${user.merchantName}`} subtitle="ยอดขาย ค่าธรรมเนียม และยอดที่ถอนได้ของร้านคุณ" />
      {bal.reserved > 0 && (
        <Link href="/merchant/payouts?status=pending" className="mb-4 block rounded-xl border border-[#f59e0b]/40 bg-[#f59e0b]/10 px-4 py-3 text-[13px] text-ink hover:bg-[#f59e0b]/15">
          กันไว้สำหรับคำขอถอน / รายการโอนออกที่รออนุมัติ <strong className="tabular-nums">{fmtMoney(bal.reserved)}</strong> ({bal.pendingCount} รายการ) — ยอดใช้ได้ <strong className="tabular-nums">{fmtMoney(bal.available)}</strong> · ดูรายการ →
        </Link>
      )}
      <MerchantView params={params} merchantId={user.merchantId} portal />
    </PortalShell>
  );
}
