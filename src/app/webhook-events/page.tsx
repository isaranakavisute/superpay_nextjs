import type { Metadata } from "next";
import { AlertTriangle } from "lucide-react";
import { ConsoleShell } from "@/components/shell/ConsoleShell";
import { Card, PageHeader } from "@/components/ui";
import { consoleHeaders } from "@/lib/api";
import { OtherShops, type Shop } from "./OtherShops";
import { WebhookEventsEditor, type Endpoint, type EventDef } from "./WebhookEventsEditor";

export const metadata: Metadata = { title: "ตั้งค่าการส่ง Webhook — Option Pay" };
const BASE = process.env.BACKEND_URL ?? "http://localhost:3001";

/** Per shop endpoint and per event: post it to the shop's system, and/or alert Telegram. Everything starts off. */
export default async function WebhookEventsPage() {
  let data: { events: EventDef[]; endpoints: Endpoint[]; shops: Shop[] } | string;
  try {
    const r = await fetch(`${BASE}/api/console/webhooks/settings`, { headers: consoleHeaders(), cache: "no-store" });
    if (!r.ok) throw new Error(`webhooks/settings → HTTP ${r.status}`);
    data = await r.json();
  } catch (err) {
    data = err instanceof Error ? err.message : String(err);
  }

  return (
    <ConsoleShell title="ตั้งค่าการส่ง Webhook" path="/webhook-events">
      <PageHeader
        title="ตั้งค่าการส่ง Webhook"
        subtitle="เลือกต่อปลายทาง ต่อ event: ส่งข้อมูลไปยังระบบของร้าน (เช่น prismapays) และ/หรือ แจ้งเตือน Telegram — ค่าเริ่มต้นปิดทั้งหมด"
      />
      {typeof data === "string" ? (
        <Card className="flex items-start gap-3 p-5"><AlertTriangle className="mt-0.5 shrink-0 text-danger" size={20} /><div className="text-[13px] text-muted">{data}</div></Card>
      ) : (
        <>
          {data.endpoints.map((e) => <WebhookEventsEditor key={e.id} events={data.events} endpoint={e} />)}
          {data.shops.length > 0 && <OtherShops shops={data.shops} />}
        </>
      )}
    </ConsoleShell>
  );
}
