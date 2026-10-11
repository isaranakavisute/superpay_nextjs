import type { Metadata } from "next";
import { MerchantView } from "@/components/merchant/MerchantView";
import { ConsoleShell } from "@/components/shell/ConsoleShell";
import { PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "แดชบอร์ดร้านค้า — Option Pay Admin" };

export default async function MerchantDashboardPage({ searchParams }: PageProps<"/merchant-dashboard">) {
  return (
    <ConsoleShell title="แดชบอร์ดร้านค้า" path="/merchant-dashboard">
      <PageHeader title="แดชบอร์ดร้านค้า" subtitle="ตัวเลขของร้านเดียว แยกจากภาพรวมระบบ — เป็นมุมมองเดียวกับที่ร้านค้าเห็นใน portal" />
      <MerchantView params={await searchParams} pickerPath="/merchant-dashboard" />
    </ConsoleShell>
  );
}
