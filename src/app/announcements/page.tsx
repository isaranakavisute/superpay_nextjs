import type { Metadata } from "next";
import { AlertTriangle } from "lucide-react";
import { ConsoleShell } from "@/components/shell/ConsoleShell";
import { Card, PageHeader } from "@/components/ui";
import { consoleHeaders } from "@/lib/api";
import { AnnouncementsEditor, type Announcement, type BotChat } from "./AnnouncementsEditor";

export const metadata: Metadata = { title: "ประชาสัมพันธ์ — Option Pay Admin" };

const BASE = process.env.BACKEND_URL ?? "http://localhost:3001";

export default async function AnnouncementsPage() {
  let data: { announcements: Announcement[]; chats: BotChat[]; slots: string[] } | string;
  try {
    const r = await fetch(`${BASE}/api/console/support-bot/announcements`, { headers: consoleHeaders(), cache: "no-store" });
    if (!r.ok) throw new Error(`announcements → HTTP ${r.status}`);
    data = await r.json();
  } catch (err) {
    data = err instanceof Error ? err.message : String(err);
  }
  return (
    <ConsoleShell title="ประชาสัมพันธ์" path="/announcements">
      <PageHeader title="ประชาสัมพันธ์ (Telegram)" subtitle="ข้อความที่ @OptionPaySupportBot โพสต์ไปทุกกลุ่มที่บอทอยู่ ตามเวลาที่กำหนด หรือทุกช่วงเวลา (เวลาไทย)" />
      {typeof data === "string" ? (
        <Card className="flex items-start gap-3 p-5"><AlertTriangle className="mt-0.5 shrink-0 text-danger" size={20} /><div className="text-[13px] text-muted">{data}</div></Card>
      ) : (
        <AnnouncementsEditor announcements={data.announcements} chats={data.chats} slots={data.slots} />
      )}
    </ConsoleShell>
  );
}
