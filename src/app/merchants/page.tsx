import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, ArrowUp, DollarSign, Inbox, Landmark } from "lucide-react";
import { rangeFromParams, rangeWindow, resolveRange, toDayKey } from "@/components/dashboard/range";
import { DayBar } from "@/components/list/DayBar";
import { param, type Params } from "@/components/list/query";
import { ConsoleShell } from "@/components/shell/ConsoleShell";
import { Badge, Card, PageHeader, SectionLabel, StatGrid, StatTile } from "@/components/ui";
import { listResource } from "@/lib/api";
import { bkkDayStart } from "@/lib/domain";
import { fmtDate, fmtMoney } from "@/lib/format";
import { requestTime } from "@/lib/request-time";
import type { MerchantRow } from "@/lib/rows";
import { FilterCard } from "../payments/FilterCard";
import { MerchantActions, NewMerchantButton } from "./MerchantActions";

export const metadata: Metadata = { title: "Merchants — SuperPay Admin" };

const th = "border-b border-line bg-surface-alt px-[18px] py-[13px] text-left text-xs font-semibold tracking-[0.5px] text-muted uppercase whitespace-nowrap";
const td = "px-[18px] py-[13px] align-middle";
const num = (s: string | number | null | undefined) => Number(s ?? 0);

const STATUS: Record<string, [string, string]> = {
  active: ["ใช้งาน", "bg-[#dcfce7] text-[#166534]"],
  suspended: ["ระงับ", "bg-[#fee2e2] text-[#b91c1c]"],
};
const KYC: Record<string, [string, string]> = {
  verified: ["ผ่าน", "bg-[#dcfce7] text-[#166534]"],
  pending: ["รอ", "bg-[#fef3c7] text-[#92400e]"],
  rejected: ["ไม่ผ่าน", "bg-[#fee2e2] text-[#b91c1c]"],
};

export default async function MerchantsPage({ searchParams }: PageProps<"/merchants">) {
  const params: Params = await searchParams;
  const today = bkkDayStart(await requestTime());
  const sel = rangeFromParams(params, today);
  const range = resolveRange(sel, today);
  const win = rangeWindow(range);
  const q = param(params, "q");

  let all: MerchantRow[] | string;
  try {
    all = (await listResource<MerchantRow>("merchants", win)).data;
  } catch (err) {
    all = err instanceof Error ? err.message : String(err);
  }

  const body =
    typeof all === "string" ? (
      <Card className="flex items-start gap-3 p-5">
        <AlertTriangle className="mt-0.5 shrink-0 text-danger" size={20} />
        <div className="text-[13px] text-muted">{all}</div>
      </Card>
    ) : (
      (() => {
        const needle = q?.toLowerCase();
        const rows = all.filter((m) => !needle || m.name.toLowerCase().includes(needle) || m.slug.includes(needle)).sort((a, b) => a.id - b.id);
        const sum = (f: (m: MerchantRow) => number) => rows.reduce((n, m) => n + f(m), 0);
        return (
          <>
            <SectionLabel>ยอดในช่วงที่เลือก — {range.label}</SectionLabel>
            <StatGrid>
              <StatTile tone="emerald" icon={<DollarSign size={24} />} label="ยอดฝาก" value={fmtMoney(sum((m) => num(m.depositTotal)))} note={`${sum((m) => m.depositCount)} รายการสำเร็จ`} />
              <StatTile tone="rose" icon={<ArrowUp size={24} />} label="ยอดถอน" value={fmtMoney(sum((m) => num(m.withdrawTotal)))} note={`${sum((m) => m.withdrawCount)} รายการอนุมัติ`} />
              <StatTile tone="sky" icon={<Landmark size={24} />} label="ยอดคงเหลือรวม (ตอนนี้)" value={fmtMoney(sum((m) => num(m.currentBalance)))} note="คงเหลือในระบบทั้งหมด ไม่ขึ้นกับวันที่เลือก" />
              <StatTile tone="amber" icon={<DollarSign size={24} />} label="ค่าธรรมเนียม" value={fmtMoney(sum((m) => num(m.feeTotal)))} note="รายได้ gateway" />
            </StatGrid>

            <Card>
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line">
                <div className="-mb-5 flex-1 [&>div]:mb-0 [&>div]:rounded-none [&>div]:border-0">
                  <FilterCard searchPlaceholder="ค้นหาชื่อ / slug..." filters={[]} />
                </div>
                <div className="px-[22px] text-[13px] text-muted">แสดง {rows.length} จาก {all.length} ราย</div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-[12.5px]">
                  <thead>
                    <tr>
                      {[
                        ["ชื่อ", ""], ["สถานะ", ""], ["KYC", ""], ["ยอดคงเหลือ (ตอนนี้)", "text-right"], ["ยอดฝาก", "text-right"], ["ยอดถอน", "text-right"],
                        ["ค่าธรรมเนียม", "text-right"], ["อัตราค่าธรรมเนียม", ""], ["API Keys", ""], ["วันที่", ""], ["จัดการ", "text-right"],
                      ].map(([h, cls]) => <th key={h} className={`${th} ${cls}`}>{h}</th>)}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {rows.length === 0 ? (
                      <tr>
                        <td colSpan={11} className="px-5 py-[60px] text-center text-muted">
                          <div className="mb-3.5 inline-grid size-16 place-items-center rounded-full bg-surface-alt text-soft"><Inbox size={26} /></div>
                          <div>ยังไม่มี merchant</div>
                        </td>
                      </tr>
                    ) : (
                      rows.map((m) => {
                        const bal = num(m.currentBalance);
                        const min = num(m.minBalance);
                        const low = bal < 0 || bal < min;
                        return (
                          <tr key={m.id} className="hover:bg-surface-alt">
                            <td className={`${td} whitespace-nowrap`}>
                              <Link href={`/merchant-dashboard?merchantId=${m.id}`}><strong className="hover:text-primary">{m.name}</strong></Link>
                              <div className="text-[11px] text-muted"><code>{m.slug}</code></div>
                            </td>
                            <td className={td}><Badge className={STATUS[m.status][1]}>{STATUS[m.status][0]}</Badge></td>
                            <td className={td}><Badge className={KYC[m.kycStatus][1]}>{KYC[m.kycStatus][0]}</Badge></td>
                            <td className={`${td} text-right whitespace-nowrap`}>
                              <strong className={`tabular-nums ${low ? "text-danger" : ""}`}>{fmtMoney(bal)}</strong>
                              {min > 0 &&
                                (bal < min ? (
                                  <div className="mt-0.5 text-[10.5px] text-danger" title={`ต่ำกว่าขั้นต่ำ ${fmtMoney(min)} — ร้านนี้ถอนไม่ได้`}>⚠ ต่ำกว่าขั้นต่ำ {fmtMoney(min)}</div>
                                ) : (
                                  <div className="mt-0.5 text-[10.5px] text-muted">ขั้นต่ำ {fmtMoney(min)}</div>
                                ))}
                            </td>
                            <td className={`${td} text-right whitespace-nowrap`}>
                              <strong className="tabular-nums">{fmtMoney(m.depositTotal)}</strong>
                              <div className="text-[10.5px] text-muted">{m.depositCount} รายการ</div>
                            </td>
                            <td className={`${td} text-right whitespace-nowrap`}>
                              <strong className="tabular-nums">{fmtMoney(m.withdrawTotal)}</strong>
                              <div className="text-[10.5px] text-muted">{m.withdrawCount} รายการ</div>
                            </td>
                            <td className={`${td} text-right whitespace-nowrap`}>
                              {num(m.feeTotal) ? <strong className="tabular-nums">{fmtMoney(m.feeTotal)}</strong> : <span className="text-soft">—</span>}
                            </td>
                            <td className={`${td} whitespace-nowrap`}>
                              {num(m.feePercent) || num(m.feeFlat) ? (
                                <><strong>{num(m.feePercent)}%</strong> + {fmtMoney(m.feeFlat)}</>
                              ) : (
                                <span className="text-soft">ฟรี</span>
                              )}
                            </td>
                            <td className={`${td} whitespace-nowrap`}>{m.apiKeysActive}/{m.apiKeysTotal}</td>
                            <td className={`${td} whitespace-nowrap text-muted`}>{fmtDate(m.createdAt)}</td>
                            <td className={td}>
                              <MerchantActions
                                m={{ id: m.id, name: m.name, slug: m.slug, feePercent: m.feePercent, feeFlat: m.feeFlat, minBalance: m.minBalance, status: m.status, kycStatus: m.kycStatus, contactEmail: m.contactEmail, contactPhone: m.contactPhone }}
                              />
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                  {rows.length > 0 && (
                    <tfoot>
                      <tr className="bg-surface-alt text-xs font-semibold">
                        <td className={td} colSpan={3}>รวม {rows.length} ร้าน (ตามตัวกรอง):</td>
                        <td className={`${td} text-right tabular-nums`}>{fmtMoney(sum((m) => num(m.currentBalance)))}</td>
                        <td className={`${td} text-right tabular-nums`}>{fmtMoney(sum((m) => num(m.depositTotal)))}</td>
                        <td className={`${td} text-right tabular-nums`}>{fmtMoney(sum((m) => num(m.withdrawTotal)))}</td>
                        <td className={`${td} text-right tabular-nums`}>{fmtMoney(sum((m) => num(m.feeTotal)))}</td>
                        <td className={td} colSpan={4} />
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </Card>
          </>
        );
      })()
    );

  return (
    <ConsoleShell title="Merchants" path="/merchants" search={{ placeholder: "ค้นหา merchant...", params }}>
      <PageHeader title="Merchants" subtitle="ร้านค้าที่ใช้บริการ Public Payment API ของคุณ (invite-only)" actions={<NewMerchantButton />} />
      <DayBar sel={sel} label={range.label} today={toDayKey(today)} />
      {body}
    </ConsoleShell>
  );
}
