import type { Metadata } from "next";
import { AlertTriangle } from "lucide-react";
import { ConsoleShell } from "@/components/shell/ConsoleShell";
import { Card, PageHeader } from "@/components/ui";
import { consoleHeaders } from "@/lib/api";
import { SupportBotEditor, type Faq } from "./SupportBotEditor";
import type { BotSettings } from "./actions";

export const metadata: Metadata = { title: "บอทตอบคำถาม — Option Pay Admin" };

const BASE = process.env.BACKEND_URL ?? "http://localhost:3001";

export default async function SupportBotPage() {
  let data: { faqs: Faq[]; settings: BotSettings } | string;
  try {
    const r = await fetch(`${BASE}/api/console/support-bot`, { headers: consoleHeaders(), cache: "no-store" });
    if (!r.ok) throw new Error(`support-bot → HTTP ${r.status}`);
    data = (await r.json()) as { faqs: Faq[]; settings: BotSettings };
  } catch (err) {
    data = err instanceof Error ? err.message : String(err);
  }
  return (
    <ConsoleShell title="บอทตอบคำถาม" path="/support-bot">
      <PageHeader title="บอทตอบคำถาม (Telegram)" subtitle="ชุดคำถาม–คำตอบที่ @OptionPaySupportBot ใช้ตอบในกลุ่ม Telegram — เพิ่ม แก้ไข ปิด หรือลบได้ มีผลทันที" />
      {typeof data === "string" ? (
        <Card className="flex items-start gap-3 p-5">
          <AlertTriangle className="mt-0.5 shrink-0 text-danger" size={20} />
          <div className="text-[13px] text-muted">{data}</div>
        </Card>
      ) : (
        <SupportBotEditor faqs={data.faqs} settings={data.settings} />
      )}
    </ConsoleShell>
  );
}
