import type { Metadata } from "next";
import { AlertTriangle } from "lucide-react";
import { ConsoleShell } from "@/components/shell/ConsoleShell";
import { Card, PageHeader } from "@/components/ui";
import { consoleHeaders } from "@/lib/api";
import { AnnouncementsEditor, type Announcement, type BotChat } from "./AnnouncementsEditor";

export const metadata: Metadata = { title: "ประชาสัมพันธ์ — Option Pay Admin" };

const BASE = process.env.BACKEND_URL ?? "http://localhost:3001";

export default async function AnnouncementsPage() {
  let data: { announcements: Announcement[]; chats: BotChat[]; slots: string[]; posting?: { canPost: boolean; faqEnabled: boolean } } | string;
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
        <>
          {data.posting && !data.posting.canPost && (
            <Card className="mb-5 flex items-start gap-3 border-danger/40 p-4">
              <AlertTriangle className="mt-0.5 shrink-0 text-danger" size={20} />
              <div className="text-[13px]">ส่งประชาสัมพันธ์ไม่ได้ — ยังไม่ได้ตั้ง Bot token ของ @OptionPaySupportBot (ตั้งได้ที่หน้า บอทตอบคำถาม)</div>
            </Card>
          )}
          {data.posting?.canPost && !data.posting.faqEnabled && (
            <div className="mb-4 text-[12.5px] text-muted">บอทตอบคำถามปิดอยู่ — ไม่มีผลกับประชาสัมพันธ์: ข้อความตามเวลาที่ตั้งไว้ยังโพสต์ตามปกติ</div>
          )}
          <AnnouncementsEditor announcements={data.announcements} chats={data.chats} slots={data.slots} />
        </>
      )}
    </ConsoleShell>
  );
}
