import type { Metadata } from "next";
import { AlertTriangle } from "lucide-react";
import { ConsoleShell } from "@/components/shell/ConsoleShell";
import { Card, PageHeader } from "@/components/ui";
import { consoleHeaders, listResource } from "@/lib/api";
import type { ChannelRow } from "@/lib/rows";
import { AlertsEditor, type Bot } from "./AlertsEditor";

export const metadata: Metadata = { title: "แจ้งเตือน Telegram — SuperPay Admin" };

const BASE = process.env.BACKEND_URL ?? "http://localhost:3001";

export default async function AlertsPage() {
  let data;
  try {
    const [cfg, channels] = await Promise.all([
      fetch(`${BASE}/api/console/alert-bots`, { headers: consoleHeaders(), cache: "no-store" }).then(async (r) => {
        if (!r.ok) throw new Error(`alert-bots → HTTP ${r.status}`);
        return (await r.json()) as { bots: Bot[]; kinds: string[]; thresholds: { repeatMinutes: number; slipFailCount: number; slipDownMinutes: number } };
      }),
      listResource<ChannelRow>("channels", { type: "telegram", limit: 50 }),
    ]);
    data = { ...cfg, channels: channels.data.map((c) => ({ id: c.id, name: c.name })) };
  } catch (err) {
    data = err instanceof Error ? err.message : String(err);
  }

  return (
    <ConsoleShell title="แจ้งเตือน Telegram" path="/alerts">
      <PageHeader title="แจ้งเตือน Telegram" subtitle="เพิ่มได้หลาย bot — แต่ละตัวเลือกเองว่าจะรับแจ้งเตือนเรื่องอะไร" />
      {typeof data === "string" ? (
        <Card className="flex items-start gap-3 p-5">
          <AlertTriangle className="mt-0.5 shrink-0 text-danger" size={20} />
          <div className="text-[13px] text-muted">{data}</div>
        </Card>
      ) : (
        <AlertsEditor bots={data.bots} channels={data.channels} kinds={data.kinds} thresholds={data.thresholds} />
      )}
    </ConsoleShell>
  );
}
