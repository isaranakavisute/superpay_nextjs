import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { param, withParams, type Params } from "@/components/list/query";
import { ConsoleShell } from "@/components/shell/ConsoleShell";
import { Card, PageHeader } from "@/components/ui";
import { listResource } from "@/lib/api";
import type { AccountRow, ChannelRow, EventRow, MerchantRow } from "@/lib/rows";
import { RecheckTodayButton, SimulateButton } from "./Controls";
import { EventList } from "./EventList";

export const metadata: Metadata = { title: "กล่องรับ Event — Option Pay Admin" };

const DIRS = [
  { value: "", label: "ทั้งหมด", on: "bg-primary text-primary-fg border-primary" },
  { value: "in", label: "เงินเข้า", on: "bg-[#dcfce7] text-[#166534] border-[#dcfce7]" },
  { value: "out", label: "เงินออก", on: "bg-[#fee2e2] text-[#b91c1c] border-[#fee2e2]" },
];

function Section({ title, edge, count, badge, hint, children, right }: { title: string; edge: string; count: number; badge?: [string, string]; hint: string; children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <section className="mb-4 overflow-hidden rounded-xl border border-l-4 border-line bg-surface" style={{ borderLeftColor: edge }}>
      <div className="flex flex-wrap items-center gap-3 border-b border-line px-[22px] py-[18px]">
        <h2 className="text-lg font-semibold whitespace-nowrap">{title}</h2>
        <span className="text-[12.5px] text-muted">
          <span className="mr-1.5 inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase" style={badge ? { background: badge[0], color: badge[1] } : undefined}>{count} รายการ</span>
          {hint}
        </span>
        {right}
      </div>
      {children}
    </section>
  );
}

function Folded({ title, count, hint, children }: { title: string; count: number; hint: string; children: React.ReactNode }) {
  return (
    <details className="mb-4 overflow-hidden rounded-xl border border-l-4 border-line border-l-line bg-surface">
      <summary className="cursor-pointer px-[18px] py-3.5 font-semibold">
        {title}
        <span className="ml-1.5 inline-flex rounded-full bg-surface-alt px-2.5 py-1 text-[11px] font-semibold text-muted uppercase">{count} รายการ</span>
        <span className="ml-1.5 text-[12.5px] font-normal text-muted">{hint}</span>
      </summary>
      <div className="border-t border-line">{children}</div>
    </details>
  );
}

export default async function EventsPage({ searchParams }: PageProps<"/events">) {
  const params: Params = await searchParams;
  const direction = param(params, "direction") === "in" || param(params, "direction") === "out" ? param(params, "direction") : undefined;
  const q = param(params, "q");
  const common = { q: q && q.length >= 2 ? q : undefined, direction };

  let data;
  try {
    const [review, recheck, noorder, done, counts, channels, accounts, merchants] = await Promise.all([
      listResource<EventRow>("events", { ...common, bucket: "review", limit: 200 }),
      listResource<EventRow>("events", { ...common, bucket: "recheck", limit: 200 }),
      listResource<EventRow>("events", { ...common, bucket: "noorder", limit: 200 }),
      listResource<EventRow>("events", { ...common, bucket: "done", limit: 200 }),
      listResource<EventRow>("events", { q: common.q, limit: 1 }),
      listResource<ChannelRow>("channels", { limit: 200 }),
      listResource<AccountRow>("accounts", { limit: 200 }),
      listResource<MerchantRow>("merchants"),
    ]);
    data = { review, recheck, noorder, done, counts: Object.fromEntries(counts.summary.map((s) => [s.key, s.count])) as Record<string, number>, channels: channels.data, accounts: accounts.data, merchants: merchants.data };
  } catch (err) {
    data = err instanceof Error ? err.message : String(err);
  }

  const d = typeof data === "string" ? null : data;
  const accountOpts = d ? d.accounts.filter((a) => a.accountType !== "send").map((a) => ({ id: a.id, label: `${a.bankCode} · ${a.accountName ?? a.label}` })) : [];
  const merchantOpts = d ? [...d.merchants].sort((a, b) => a.name.localeCompare(b.name, "th")).map((m) => ({ id: m.id, label: m.name })) : [];

  return (
    <ConsoleShell title="กล่องรับ Event" path="/events" search={{ placeholder: "ค้นหา TXN, orderId, ยอด, ชื่อผู้โอน, เลขบัญชี...", params }}>
      <PageHeader
        title="กล่องรับ Event"
        subtitle="รายการ event ที่เข้ามาจากทุกช่องทาง — slip / Telegram / LINE / Email / webhook"
        actions={d ? <SimulateButton channels={d.channels.map((c) => ({ id: c.id, label: c.name }))} accounts={accountOpts} /> : undefined}
      />
      {!d ? (
        <Card className="flex items-start gap-3 p-5">
          <AlertTriangle className="mt-0.5 shrink-0 text-danger" size={20} />
          <div className="text-[13px] text-muted">{String(data)}</div>
        </Card>
      ) : (
        <>
          {common.q && (
            <div className="mb-3.5 rounded-lg bg-surface-alt px-3.5 py-2.5 text-[13px]">
              ผลค้นหา &ldquo;{common.q}&rdquo; จาก event ทั้งหมด — {d.review.pagination.total + d.recheck.pagination.total + d.noorder.pagination.total + d.done.pagination.total} รายการ
              <span className="text-muted"> · ลบคำค้นเพื่อกลับไปดูรายการล่าสุด</span>
            </div>
          )}
          <div className="mb-3.5 flex gap-2">
            {DIRS.map((dir) => {
              const n = dir.value ? d.counts[dir.value] ?? 0 : Object.values(d.counts).reduce((x: number, y: number) => x + y, 0);
              const active = (direction ?? "") === dir.value;
              return (
                <Link
                  key={dir.value || "all"}
                  href={withParams("/events", params, { direction: dir.value || null })}
                  className={`inline-flex items-center gap-2 rounded-lg border px-3.5 py-[7px] text-[13.5px] ${active ? dir.on : "border-line bg-surface text-muted hover:text-ink"}`}
                >
                  {dir.label}
                  <span className="rounded-full bg-black/10 px-1.5 text-[11.5px]">{n}</span>
                </Link>
              );
            })}
          </div>

          <Section
            title="ต้องตรวจสอบ"
            edge="var(--color-danger)"
            count={d.review.pagination.total}
            badge={["#fee2e2", "#b91c1c"]}
            hint="ต้องมีคนดู — ยอดชนหลายออเดอร์, สลิปตรวจไม่ผ่าน, หรือตรวจผ่านแต่จับคู่ไม่ได้"
            right={!common.q ? <RecheckTodayButton /> : undefined}
          >
            <EventList rows={d.review.data} empty="ไม่มีรายการที่ต้องตรวจสอบ ✓" merchants={merchantOpts} accounts={accountOpts} />
          </Section>

          <Section title="ระบบกำลังตรวจซ้ำ" edge="#d97706" count={d.recheck.pagination.total} badge={["#fef3c7", "#92400e"]} hint="ผู้ให้บริการตรวจสลิปไม่ตอบชั่วคราว — ระบบนัดตรวจซ้ำให้เอง">
            <EventList rows={d.recheck.data} empty="ไม่มี" merchants={merchantOpts} accounts={accountOpts} />
          </Section>

          <Folded title="ไม่มี OrderID" count={d.noorder.pagination.total} hint="เงินเข้าที่ไม่ได้แนบเลขออเดอร์ และหาออเดอร์ยอดตรงไม่เจอ — กดเพื่อดู">
            <EventList rows={d.noorder.data} empty="ไม่มี" merchants={merchantOpts} accounts={accountOpts} />
          </Folded>

          <Folded title="เรียบร้อย / ไม่ต้องทำ" count={d.done.pagination.total} hint="จับคู่แล้ว หรือปฏิเสธแล้ว — กดเพื่อดู">
            <EventList rows={d.done.data} empty="ไม่มี" merchants={merchantOpts} accounts={accountOpts} />
          </Folded>
        </>
      )}
    </ConsoleShell>
  );
}
