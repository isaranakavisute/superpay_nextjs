import type { Metadata } from "next";
import { AlertTriangle } from "lucide-react";
import { ConsoleShell } from "@/components/shell/ConsoleShell";
import { Card, PageHeader } from "@/components/ui";
import { ShutdownForm } from "./ShutdownForm";

export const metadata: Metadata = { title: "ปิดระบบ — Option Pay Admin" };

/** ตั้งค่าระบบ → ปิดระบบ (shutdown) — Super Admin only. start: Telegram "Option Pay Controller" or https://optionpay.co/control. */
export default function SystemControlPage() {
  return (
    <ConsoleShell title="ปิดระบบ" path="/system-control">
      <PageHeader title="ปิดระบบ (shutdown)" subtitle="หยุด container ตามลำดับ: 1. เว็บไซต์ (front-end) → 2. ระบบหลังบ้าน (back-end) → 3. ฐานข้อมูล — gateway และตัวควบคุมยังทำงานอยู่ (เฉพาะ Super Admin)" />
      <Card className="mb-5 flex items-start gap-3 border-danger/40 p-5">
        <AlertTriangle className="mt-0.5 shrink-0 text-danger" size={22} />
        <div className="text-[13.5px] leading-relaxed">
          <b>ระหว่างปิดระบบ</b> ลูกค้าจะชำระเงินไม่ได้ ร้านค้าเรียก API ไม่ได้ และหน้า admin นี้จะใช้งานไม่ได้ · ข้อมูลไม่สูญหาย
          <br />หลังกดยืนยัน หน้าจอจะไปที่หน้าความคืบหน้า (<code>/control/progress</code>) และแจ้งในกลุ่ม Telegram “Option Pay Controller”
          <br /><b>เปิดระบบ (start):</b> พิมพ์ <code>start</code> ในกลุ่ม Option Pay Controller หรือเข้า <code>https://optionpay.co/control</code> (รหัสผ่านควบคุม + 2FA)
        </div>
      </Card>
      <Card className="p-5"><ShutdownForm /></Card>
    </ConsoleShell>
  );
}
