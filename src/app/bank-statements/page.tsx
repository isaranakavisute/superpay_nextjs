import type { Metadata } from "next";
import { ConsoleShell } from "@/components/shell/ConsoleShell";
import { PageHeader } from "@/components/ui";
import { ReconView } from "./ReconView";

export const metadata: Metadata = { title: "เปรียบเทียบกับ bank statement — Option Pay Admin" };

/** เงินเข้า–เงินออก → เปรียบเทียบกับ bank statement: statement PDFs (read in the browser) vs the payouts of the same days. */
export default function BankStatementsPage() {
  return (
    <ConsoleShell title="เปรียบเทียบกับ bank statement" path="/bank-statements">
      <PageHeader title="เปรียบเทียบกับ bank statement" subtitle="อัปโหลดสเตทเมนต์ธนาคาร (ไทยพาณิชย์ · กสิกรไทย · กรุงเทพ) เพื่อจับคู่รายการโอนเงินออกกับรายการเงินออก (payout) ในระบบ — แสดงรายการที่จับคู่ไม่ได้ พร้อมรายละเอียดสำหรับตรวจสอบ" />
      <ReconView />
    </ConsoleShell>
  );
}
