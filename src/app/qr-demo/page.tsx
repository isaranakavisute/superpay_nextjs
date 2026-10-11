import type { Metadata } from "next";
import { ConsoleShell } from "@/components/shell/ConsoleShell";
import { listResource } from "@/lib/api";
import type { AccountRow } from "@/lib/rows";
import { QrDemo } from "./QrDemo";

export const metadata: Metadata = { title: "ตัวอย่าง QR + สลิป — Option Pay Admin" };

export default async function QrDemoPage() {
  const accounts = (await listResource<AccountRow & { promptpayId: string | null }>("accounts", { limit: 200 }).catch(() => null))?.data ?? [];
  return (
    <ConsoleShell title="ตัวอย่าง QR + สลิป" path="/qr-demo">
      <h1 className="mb-1 text-[26px] font-bold">ตัวอย่าง QR + แนบสลิป</h1>
      <p className="mb-5 max-w-[960px] text-muted">สร้าง QR พร้อมเพย์ให้ลูกค้าสแกนจ่าย แล้วแนบสลิปกลับเข้าระบบเพื่อตรวจ/จับคู่ — จำลองรอบการชำระเงินครบวงจรในหน้าเดียว</p>
      <QrDemo
        accounts={accounts
          .filter((a) => a.status === "active" && a.accountType !== "send")
          .map((a) => ({ id: a.id, label: `${a.accountName ?? a.label} · ${a.bankCode} ${a.accountNo ?? ""}`.trim(), bankCode: a.bankCode, accountNo: a.accountNo, promptpayId: a.promptpayId }))}
      />
    </ConsoleShell>
  );
}
