import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { AlertTriangle, Radio, ShieldCheck } from "lucide-react";
import { param, withParams, type Params } from "@/components/list/query";
import { ConsoleShell } from "@/components/shell/ConsoleShell";
import { Card, PageHeader } from "@/components/ui";
import { listResource } from "@/lib/api";
import type { AccountRow, ChannelRow } from "@/lib/rows";
import { AddChannel } from "./AddChannel";
import { ChannelCard } from "./ChannelCard";
import { TYPES } from "./fields";

export const metadata: Metadata = { title: "ช่องทางตรวจสอบ — SuperPay Admin" };

type Endpoint = { id: number; merchantName: string; url: string; status: string };

export default async function ChannelsPage({ searchParams }: PageProps<"/channels">) {
  const params: Params = await searchParams;
  const tab = TYPES.find((t) => t.type === param(params, "type")) ?? TYPES[0];
  const h = await headers();
  const hookBase = `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host") ?? "localhost"}`;

  let data;
  try {
    const [channels, accounts, endpoints] = await Promise.all([
      listResource<ChannelRow>("channels", { limit: 200 }),
      listResource<AccountRow>("accounts", { limit: 200 }),
      listResource<Endpoint>("webhook-endpoints", { limit: 200 }),
    ]);
    data = { channels: channels.data, accounts: accounts.data, endpoints: endpoints.data };
  } catch (err) {
    data = err instanceof Error ? err.message : String(err);
  }

  return (
    <ConsoleShell title="ช่องทางตรวจสอบ" path="/channels">
      <PageHeader title="ช่องทางตรวจสอบการรับเงิน" subtitle="รองรับหลาย bot / OA / บัญชีอีเมล ในแต่ละช่องทาง" />
      {typeof data === "string" ? (
        <Card className="flex items-start gap-3 p-5">
          <AlertTriangle className="mt-0.5 shrink-0 text-danger" size={20} />
          <div className="text-[13px] text-muted">{data}</div>
        </Card>
      ) : (
        (() => {
          const list = data.channels.filter((c) => c.channelType === tab.type);
          const accounts = data.accounts.filter((a) => a.accountType !== "send").map((a) => ({ id: a.id, label: `${a.bankCode} · ${a.accountName ?? a.label}` }));
          const endpoints = data.endpoints.map((e) => ({ id: e.id, label: e.merchantName, disabled: e.status !== "active" }));
          return (
            <>
              <div className="-mt-2 mb-5 flex flex-wrap gap-1 border-b border-line">
                {TYPES.map((t) => {
                  const n = data.channels.filter((c) => c.channelType === t.type).length;
                  return (
                    <Link
                      key={t.type}
                      href={withParams("/channels", params, { type: t.type === "telegram" ? null : t.type })}
                      className={`-mb-px inline-flex items-center gap-2 border-b-2 px-[18px] py-2.5 text-sm font-medium transition-colors ${tab.type === t.type ? "border-primary text-primary" : "border-transparent text-muted hover:text-ink"}`}
                    >
                      {t.label}
                      <span className="rounded-full bg-surface-alt px-2 py-0.5 text-[11px]">{n}</span>
                    </Link>
                  );
                })}
              </div>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div className="max-w-[780px] text-[13px] text-muted">{tab.about}</div>
                <AddChannel type={tab.type} label={tab.label} />
              </div>

              {list.length === 0 ? (
                <Card className="px-5 py-[60px] text-center text-muted">
                  <div className="mb-3.5 inline-grid size-16 place-items-center rounded-full bg-surface-alt text-soft"><Radio size={26} /></div>
                  <div>ยังไม่มี {tab.label} ในระบบ — กด &ldquo;เพิ่ม&rdquo; ด้านบนเพื่อสร้างใหม่</div>
                </Card>
              ) : (
                list.map((c) => <ChannelCard key={c.id} c={c} accounts={accounts} endpoints={endpoints} hookBase={hookBase} />)
              )}

              <div className="mt-[18px] flex gap-3.5 rounded-xl border border-dashed border-line bg-surface-alt p-5">
                <div className="grid size-9 shrink-0 place-items-center rounded-[10px] bg-primary-50 text-primary"><ShieldCheck size={18} /></div>
                <div className="text-[13px]">
                  <div className="mb-1.5 font-semibold">Webhook URL สำหรับแต่ละช่องทาง</div>
                  <div className="space-y-0.5 font-mono text-[12px] text-muted">
                    {["telegram", "line", "email", "sms"].map((t) => <div key={t}>POST {hookBase}/api/webhooks/{t}/{"{channelId}"}</div>)}
                  </div>
                  <div className="mt-2 text-[12px] text-muted">แต่ละการ์ดแสดง URL ที่ต้องนำไปตั้งในระบบต้นทางของช่องทางนั้น</div>
                </div>
              </div>
            </>
          );
        })()
      )}
    </ConsoleShell>
  );
}
