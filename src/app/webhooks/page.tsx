import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, Inbox } from "lucide-react";
import { Pager, pageState } from "@/components/list/Pager";
import { param, withParams, type Params } from "@/components/list/query";
import { ConsoleShell } from "@/components/shell/ConsoleShell";
import { Card } from "@/components/ui";
import { consoleHeaders, listResource } from "@/lib/api";
import { fmtDateTime } from "@/lib/format";
import { requestTime } from "@/lib/request-time";
import type { MerchantRow, WebhookRow } from "@/lib/rows";
import { FilterCard } from "../payments/FilterCard";
import { DeliveryTable } from "./DeliveryTable";

export const metadata: Metadata = { title: "Webhook ร้านค้า — Option Pay Admin" };

const PATH = "/webhooks";
const BASE = process.env.BACKEND_URL ?? "http://localhost:3001";
const RANGES = [
  { value: "1d", label: "วันนี้", days: 1 },
  { value: "7d", label: "7 วัน", days: 7 },
  { value: "30d", label: "30 วัน", days: 30 },
  { value: "90d", label: "90 วัน", days: 90 },
  { value: "all", label: "ทั้งหมด", days: 0 },
];
const EVENTS = ["payment.approved", "payment.rejected", "payment.expired", "payment.refunded", "payout.completed", "payout.failed", "withdrawal.approved", "withdrawal.completed", "withdrawal.rejected"];
type Missing = { id: number; name: string; orders: number; firstAt: string; lastAt: string };

function Head({ title, edge, badge, hint, children }: { title: string; edge: string; badge?: { text: string; bg: string; fg: string }; hint?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-line px-[22px] py-[18px]" style={{ borderLeftColor: edge }}>
      <h2 className="text-lg font-semibold whitespace-nowrap">{title}</h2>
      <span className="text-[12.5px] text-muted">
        {badge && <span className="mr-1.5 inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase" style={{ background: badge.bg, color: badge.fg }}>{badge.text}</span>}
        {hint}
      </span>
      {children}
    </div>
  );
}

export default async function WebhooksPage({ searchParams }: PageProps<"/webhooks">) {
  const params: Params = await searchParams;
  const now = await requestTime();
  const range = RANGES.find((r) => r.value === param(params, "wr")) ?? RANGES[1];
  const from = range.days ? new Date(now - range.days * 86_400_000).toISOString() : undefined;
  const common = { q: param(params, "q"), merchantId: param(params, "merchantId"), event: param(params, "event"), from };
  const dp = pageState(params, "d");

  let data;
  try {
    const missingQ = new URLSearchParams(from ? { from } : {});
    const [failed, pending, delivered, merchants, missing] = await Promise.all([
      listResource<WebhookRow>("webhooks", { ...common, state: "failed", limit: 200 }),
      listResource<WebhookRow>("webhooks", { ...common, state: "pending", limit: 200 }),
      listResource<WebhookRow>("webhooks", { ...common, state: "delivered", limit: dp.size, offset: (dp.page - 1) * dp.size }),
      listResource<MerchantRow>("merchants"),
      fetch(`${BASE}/api/console/webhooks/missing?${missingQ}`, { headers: consoleHeaders(), cache: "no-store" }).then(async (r) => {
        if (!r.ok) throw new Error(`webhooks/missing → HTTP ${r.status}`);
        return ((await r.json()) as { data: Missing[] }).data;
      }),
    ]);
    data = { failed, pending, delivered, merchants: merchants.data, missing };
  } catch (err) {
    data = err instanceof Error ? err.message : String(err);
  }

  const shown = (t: number) => (t ? `แสดง ${((dp.page - 1) * dp.size + 1).toLocaleString()}–${Math.min(t, dp.page * dp.size).toLocaleString()} จาก ${t.toLocaleString()} รายการ` : "ไม่มีรายการ");

  return (
    <ConsoleShell title="Webhook ร้านค้า" path={PATH} search={{ placeholder: "ค้นหา TXN / เลขถอน WD / Order ID / ชื่อร้าน / URL...", params }}>
      <div className="mb-5 flex flex-wrap gap-1 border-b border-line">
        {RANGES.map((r) => (
          <Link
            key={r.value}
            href={withParams(PATH, params, { wr: r.value === "7d" ? null : r.value })}
            className={`-mb-px border-b-2 px-[18px] py-2.5 text-sm font-medium transition-colors ${range.value === r.value ? "border-primary text-primary" : "border-transparent text-muted hover:text-ink"}`}
          >
            {r.label}
          </Link>
        ))}
      </div>

      {typeof data === "string" ? (
        <Card className="flex items-start gap-3 p-5">
          <AlertTriangle className="mt-0.5 shrink-0 text-danger" size={20} />
          <div className="text-[13px] text-muted">{data}</div>
        </Card>
      ) : (
        <>
          <section className="mb-4 overflow-hidden rounded-xl border border-l-4 border-line border-l-[#0284c7] bg-surface">
            <Head
              title="ร้านที่ไม่ได้ตั้ง Webhook"
              edge="#0284c7"
              badge={{ text: `${data.missing.length} ร้าน`, bg: "#e0f2fe", fg: "#075985" }}
              hint="ระบบไม่เคยส่งอะไรไปหาร้านเหล่านี้ — ไม่ใช่ error ถ้าร้านตั้งใจดึงสถานะเอง แต่ถ้าร้านบอกว่าเครดิตไม่เข้า ให้ตั้ง Webhook ให้ร้าน"
            />
            {data.missing.length === 0 ? (
              <div className="px-5 py-10 text-center text-[13px] text-muted">ทุกออเดอร์ที่อนุมัติในช่วงนี้เป็นของร้านที่ตั้งปลายทางไว้แล้ว ✓</div>
            ) : (
              <table className="w-full border-collapse text-[12.5px]">
                <thead><tr>{["ร้านค้า", "ออเดอร์ที่อนุมัติแล้ว", "ช่วงเวลา", "จัดการ"].map((h) => <th key={h} className="border-b border-line bg-surface-alt px-[18px] py-[13px] text-left text-xs font-semibold text-muted uppercase">{h}</th>)}</tr></thead>
                <tbody className="divide-y divide-line">
                  {data.missing.map((m) => (
                    <tr key={m.id}>
                      <td className="px-[18px] py-[13px]"><strong>{m.name}</strong></td>
                      <td className="px-[18px] py-[13px]"><span className="rounded-full bg-[#e0f2fe] px-2.5 py-1 text-[11px] font-semibold text-[#075985]">{m.orders} ออเดอร์</span></td>
                      <td className="px-[18px] py-[13px] text-xs text-muted">{fmtDateTime(m.firstAt)} – {fmtDateTime(m.lastAt)}</td>
                      <td className="px-[18px] py-[13px]"><Link href="/merchants" className="rounded-lg border border-line px-3 py-1.5 text-[12.5px] hover:bg-surface-alt">ตั้งค่าร้าน</Link></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          <FilterCard
            searchPlaceholder="ค้นหา TXN / Order ID / ชื่อร้าน / URL..."
            filters={[
              { name: "merchantId", options: [{ value: "", label: "ทุกร้านค้า" }, ...[...data.merchants].sort((a, b) => a.name.localeCompare(b.name, "th")).map((m) => ({ value: String(m.id), label: m.name }))] },
              { name: "event", options: [{ value: "", label: "ทุก event" }, ...EVENTS.map((e) => ({ value: e, label: e }))] },
            ]}
          />

          <section className="mb-4 overflow-hidden rounded-xl border border-l-4 border-line border-l-danger bg-surface">
            <Head
              title="ส่งไม่สำเร็จ"
              edge="var(--color-danger)"
              badge={{ text: `${data.failed.pagination.total} รายการ`, bg: "#fee2e2", fg: "#b91c1c" }}
              hint="ระบบลองครบ 5 ครั้งแล้วหยุดถาวร — ร้านไม่ได้รับแจ้ง ต้องกดยิงซ้ำเอง"
            />
            <DeliveryTable rows={data.failed.data} selectable onSelectionHeader empty="ไม่มี webhook ที่ส่งไม่สำเร็จ ✓" />
          </section>

          <section className="mb-4 overflow-hidden rounded-xl border border-l-4 border-line border-l-[#d97706] bg-surface">
            <Head
              title="กำลังส่ง / รอลองใหม่"
              edge="#d97706"
              badge={{ text: `${data.pending.pagination.total} รายการ`, bg: "#fef3c7", fg: "#92400e" }}
              hint="ระบบกำลังลองใหม่อัตโนมัติ — ไม่ต้องทำอะไร จะย้ายไปสำเร็จหรือล้มเหลวเอง"
            />
            <DeliveryTable rows={data.pending.data} empty="ไม่มี webhook ที่กำลังรอส่ง ✓" />
          </section>

          <section className="mb-4 overflow-hidden rounded-xl border border-l-4 border-line border-l-success bg-surface">
            <Head title="ส่งสำเร็จ" edge="var(--color-success)" hint={shown(data.delivered.pagination.total)}>
              <span className="ml-auto text-[12.5px] text-muted">ร้านตอบ 2xx แล้ว — ถ้าร้านยังบอกว่าเครดิตไม่เข้า กดที่แถวเพื่อดูว่าร้านตอบอะไรกลับมา</span>
            </Head>
            {data.delivered.data.length === 0 ? (
              <div className="px-5 py-[60px] text-center text-muted">
                <div className="mb-3.5 inline-grid size-16 place-items-center rounded-full bg-surface-alt text-soft"><Inbox size={26} /></div>
                <div>ยังไม่มี webhook ที่ส่งสำเร็จในช่วงนี้</div>
              </div>
            ) : (
              <DeliveryTable rows={data.delivered.data} empty="ยังไม่มี webhook ที่ส่งสำเร็จในช่วงนี้" />
            )}
            <Pager path={PATH} params={params} bucket="d" page={dp.page} size={dp.size} total={data.delivered.pagination.total} />
          </section>
        </>
      )}
    </ConsoleShell>
  );
}
