import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, Clock, Inbox, Wallet } from "lucide-react";
import { param, withParams, type Params } from "@/components/list/query";
import { ConsoleShell } from "@/components/shell/ConsoleShell";
import { Badge, Card, PageHeader } from "@/components/ui";
import { listResource } from "@/lib/api";
import { findBank } from "@/lib/domain";
import { fmtDateTime, fmtMoney } from "@/lib/format";
import type { TransferLeftoverRow } from "@/lib/rows";
import { FilterCard } from "../payments/FilterCard";
import { RowActions } from "./RowActions";

export const metadata: Metadata = { title: "ยอดคงเหลือเงินโอน — Option Pay Admin" };

const PATH = "/transfer-leftovers";
const th = "border-b border-line bg-surface-alt px-[18px] py-[13px] text-left text-xs font-semibold tracking-[0.5px] text-muted uppercase whitespace-nowrap";
const td = "px-[18px] py-[13px] align-top";

const TABS = [
  { value: "open", label: "ใช้ได้", icon: <Wallet size={15} /> },
  { value: "expired", label: "หมดเวลา", icon: <Clock size={15} /> },
  { value: "used", label: "ใช้ครบแล้ว", icon: <CheckCircle2 size={15} /> },
] as const;
type Tab = (typeof TABS)[number]["value"];

/** What the admin sends the shop: the exact amount of the new order, for which customer, by when. */
function shopMessage(t: TransferLeftoverRow) {
  const paid = (t.paidOrders ?? []).map((p) => `${p.ref}${p.orderId ? ` (${p.orderId})` : ""} ${fmtMoney(p.amount)}`).join(", ");
  return [
    `ลูกค้า${t.customerName ? ` ${t.customerName}` : ""} มียอดคงเหลือจากการโอน ${fmtMoney(t.amount)}${t.transferAt ? ` (โอนเมื่อ ${fmtDateTime(t.transferAt)})` : ""}`,
    `ใช้ชำระ ${paid} แล้ว — คงเหลือ ${fmtMoney(t.left)}`,
    `กรุณาสร้างออเดอร์ใหม่ยอดไม่เกิน ${fmtMoney(t.left)} ให้ลูกค้าคนนี้ แล้วส่งสลิปเดิม ระบบจะอนุมัติให้อัตโนมัติ (ใช้ได้หลายออเดอร์จนกว่ายอดคงเหลือจะหมด)${t.leftoverUntil ? ` (ภายใน ${fmtDateTime(t.leftoverUntil)})` : ""}`,
  ].join("\n");
}

export default async function TransferLeftoversPage({ searchParams }: PageProps<"/transfer-leftovers">) {
  const params: Params = await searchParams;
  const raw = param(params, "tab");
  const tab: Tab = raw === "expired" || raw === "used" ? raw : "open";
  const merchantId = param(params, "merchantId");
  const q = param(params, "q");

  let data;
  try {
    const [list, everything] = await Promise.all([
      listResource<TransferLeftoverRow>("transfer-leftovers", { status: tab, merchantId, q, limit: 200 }),
      // All records, for the tab counts and the shop list.
      listResource<TransferLeftoverRow>("transfer-leftovers", { limit: 200 }),
    ]);
    data = {
      list: list.data,
      counts: Object.fromEntries(everything.summary.map((s) => [s.key, s.count])),
      open: everything.data.filter((t) => t.status === "open"),
      shops: everything.data,
    };
  } catch (err) {
    data = err instanceof Error ? err.message : String(err);
  }

  return (
    <ConsoleShell title="ยอดคงเหลือเงินโอน" path={PATH}>
      <PageHeader
        title="ยอดคงเหลือเงินโอน"
        subtitle="เงินโอนที่ผู้ดูแลอนุมัติให้ออเดอร์ที่ยอดน้อยกว่าสลิป — ส่วนต่างเป็นยอดคงเหลือ ร้านสร้างออเดอร์ใหม่ยอดไม่เกินยอดคงเหลือ (ลูกค้าคนเดิม) แล้วส่งสลิปเดิม ระบบอนุมัติให้อัตโนมัติจนกว่ายอดคงเหลือจะหมด"
      />

      {typeof data === "string" ? (
        <Card className="flex items-start gap-3 p-5">
          <AlertTriangle className="mt-0.5 shrink-0 text-danger" size={20} />
          <div className="text-[13px] text-muted">{data}</div>
        </Card>
      ) : (
        <>
          {data.open.length > 0 && (
            <Card className="mb-5 flex items-start gap-3 p-5">
              <Wallet className="mt-0.5 shrink-0 text-primary" size={20} />
              <div className="text-[13px]">
                <strong>ยอดคงเหลือที่ยังใช้ได้ {data.open.length} รายการ รวม {fmtMoney(data.open.reduce((n, t) => n + Number(t.left), 0))}</strong>
                <div className="text-muted">แจ้งร้านให้สร้างออเดอร์ยอดไม่เกินคอลัมน์ “ร้านสร้างออเดอร์ได้ไม่เกิน” ก่อนหมดเวลา</div>
              </div>
            </Card>
          )}

          <div className="mb-5 flex flex-wrap gap-1 border-b border-line">
            {TABS.map((t) => (
              <Link
                key={t.value}
                href={withParams(PATH, params, { tab: t.value === "open" ? null : t.value })}
                className={`-mb-px inline-flex items-center gap-1.5 border-b-2 px-[18px] py-2.5 text-sm font-medium transition-colors ${tab === t.value ? "border-primary text-primary" : "border-transparent text-muted hover:text-ink"}`}
              >
                {t.icon} {t.label} <span>({data.counts[t.value] ?? 0})</span>
              </Link>
            ))}
          </div>

          <FilterCard
            searchPlaceholder="ค้นหาลูกค้า / เลขที่ / เลขอ้างอิงธนาคาร..."
            filters={[
              {
                name: "merchantId",
                options: [
                  { value: "", label: "ทุกร้านค้า" },
                  ...[...new Map(data.shops.filter((d) => d.merchantId).map((d) => [d.merchantId, d.merchantName ?? ""])).entries()]
                    .sort((a, b) => a[1].localeCompare(b[1], "th"))
                    .map(([id, name]) => ({ value: String(id), label: name })),
                ],
              },
            ]}
          />

          <Card>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-[12.5px]">
                <thead>
                  <tr>
                    {["ร้าน / ลูกค้า", "เงินโอน", "ใช้ชำระแล้ว", tab === "used" ? "คงเหลือ" : "ร้านสร้างออเดอร์ได้ไม่เกิน", "ใช้ได้ถึง", ""].map((h) => (
                      <th key={h} className={th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {data.list.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-[60px] text-center text-muted">
                        <div className="mb-3.5 inline-grid size-16 place-items-center rounded-full bg-surface-alt text-soft"><Inbox size={26} /></div>
                        <div>{tab === "open" ? "ไม่มียอดคงเหลือที่ค้างอยู่ ✓" : "ไม่มีรายการ"}</div>
                      </td>
                    </tr>
                  ) : (
                    data.list.map((t) => (
                      <tr key={t.id} className="hover:bg-surface-alt">
                        <td className={td}>
                          <strong>{t.customerName ?? "—"}</strong>
                          <div className="text-muted">{t.merchantName ?? "house"}</div>
                          {t.bankCode && (
                            <div className="text-[11px] text-muted">
                              เข้า {findBank(t.bankCode)?.short ?? t.bankCode} {t.accountNo} {t.accountName ? `(${t.accountName})` : ""}
                            </div>
                          )}
                        </td>
                        <td className={`${td} whitespace-nowrap`}>
                          <strong className="tabular-nums">{fmtMoney(t.amount)}</strong>
                          <div className="text-[11px] text-muted">{t.transferAt ? fmtDateTime(t.transferAt) : "—"}</div>
                          <div className="font-mono text-[10.5px] text-muted">{t.transRef}</div>
                        </td>
                        <td className={td}>
                          {(t.paidOrders ?? []).map((p) => (
                            <div key={p.ref} className="whitespace-nowrap">
                              <Link href={`/payments?q=${encodeURIComponent(p.ref)}`} className="font-medium text-primary hover:underline">{p.ref}</Link>{" "}
                              <span className="tabular-nums">{fmtMoney(p.amount)}</span>
                              {p.kind === "leftover" && <span className="text-[11px] text-muted"> · ใช้ยอดคงเหลือ</span>}
                              {p.orderId && <div className="font-mono text-[10.5px] text-muted">{p.orderId}</div>}
                            </div>
                          ))}
                        </td>
                        <td className={`${td} whitespace-nowrap`}>
                          <strong className={`text-[15px] tabular-nums ${t.status === "open" ? "text-primary" : "text-muted"}`}>{fmtMoney(t.left)}</strong>
                        </td>
                        <td className={`${td} whitespace-nowrap`}>
                          {t.status === "used" ? (
                            <Badge className="bg-surface-alt text-muted">ใช้ครบแล้ว</Badge>
                          ) : (
                            <>
                              <div>{t.leftoverUntil ? fmtDateTime(t.leftoverUntil) : "—"}</div>
                              {t.status === "expired" && <Badge className="mt-1 bg-[rgba(239,68,68,0.15)] text-[#fca5a5]">หมดเวลา</Badge>}
                            </>
                          )}
                          {t.note && <div className="mt-1 max-w-[200px] whitespace-normal text-[11px] text-muted">{t.note}</div>}
                        </td>
                        <td className={td}>
                          {t.status !== "used" && <RowActions id={t.id} message={shopMessage(t)} canExtend />}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </ConsoleShell>
  );
}
