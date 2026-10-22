import type { Metadata } from "next";
import { ConsoleShell } from "@/components/shell/ConsoleShell";
import { PageHeader } from "@/components/ui";
import { loadBackups } from "./actions";
import { BackupsView } from "./BackupsView";

export const metadata: Metadata = { title: "สำรองข้อมูล — Option Pay Admin" };

/** Nightly database backups (01:00, kept forever), the real-time change log (7 days) and restore — Super Admin only. */
export default async function BackupsPage() {
  const first = await loadBackups();
  return (
    <ConsoleShell title="สำรองข้อมูล" path="/backups">
      <PageHeader title="สำรองข้อมูล" subtitle="ระบบสำรองฐานข้อมูลทั้งหมดอัตโนมัติทุกคืน — กู้คืนได้เมื่อมีการลบหรือแก้ข้อมูลผิดพลาด (เฉพาะ Super Admin)" />
      <BackupsView initial={first.ok ? first : null} error={first.ok ? null : first.error} />
    </ConsoleShell>
  );
}
