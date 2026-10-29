import type { Metadata } from "next";
import { AutoRefresh } from "@/components/interactive/AutoRefresh";
import { AllShopsFees, MerchantView } from "@/components/merchant/MerchantView";
import { ConsoleShell } from "@/components/shell/ConsoleShell";
import { PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "แดชบอร์ดร้านค้า — Option Pay Admin" };

export default async function MerchantDashboardPage({ searchParams }: PageProps<"/merchant-dashboard">) {
  const params = await searchParams;
  // "ทุกร้านค้า": fee totals in the header's top-right corner, and the page refreshes itself every 10 s.
  const all = !params.merchantId || params.merchantId === "all";   // "ทุกร้านค้า" is the default
  return (
    <ConsoleShell title="แดชบอร์ดร้านค้า" path="/merchant-dashboard">
      {all && <AutoRefresh seconds={10} />}
      <PageHeader title="แดชบอร์ดร้านค้า" subtitle="ตัวเลขของร้านเดียว แยกจากภาพรวมระบบ — เป็นมุมมองเดียวกับที่ร้านค้าเห็นใน portal" actions={all ? <AllShopsFees params={params} /> : undefined} />
      <MerchantView params={params} pickerPath="/merchant-dashboard" />
    </ConsoleShell>
  );
}
