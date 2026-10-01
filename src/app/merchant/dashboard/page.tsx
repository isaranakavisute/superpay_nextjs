import type { Metadata } from "next";
import { MerchantView } from "@/components/merchant/MerchantView";
import type { Params } from "@/components/list/query";
import { PageHeader } from "@/components/ui";
import { requirePortal } from "@/lib/portal";
import { PortalShell } from "../PortalShell";

export const metadata: Metadata = { title: "แดชบอร์ด — Merchant Portal" };

export default async function PortalDashboard({ searchParams }: PageProps<"/merchant/dashboard">) {
  const user = await requirePortal("/merchant/dashboard");
  const params: Params = await searchParams;
  return (
    <PortalShell user={user} path="/merchant/dashboard">
      <PageHeader title={`ร้าน ${user.merchantName}`} subtitle="ยอดขาย ค่าธรรมเนียม และยอดที่ถอนได้ของร้านคุณ" />
      <MerchantView params={params} merchantId={user.merchantId} portal />
    </PortalShell>
  );
}
