"use client";

import Link from "next/link";
import { ArrowUp, ArrowUpRight, Clock, Copy, DollarSign, Landmark, TrendingDown, TrendingUp, Users } from "lucide-react";
import type { DashboardSummary, TrendPoint } from "@/lib/api";
import type { PaymentStatus } from "@/lib/domain";
import { fmtDateTime, fmtMoney } from "@/lib/format";
import { BankChip, Card, CardHead, Empty, GhostLink, PageHeader, SectionLabel, StatCard, StatusBadge } from "../ui";
import { RangeBar } from "../list/RangeBar";
import { BankCell, CategoryBadge, PayerCell } from "../cells";
import { TrendChart } from "./TrendChart";
import type { RangeSel } from "./range";


const STATUSES: PaymentStatus[] = ["pending", "approved", "rejected", "refunded", "expired"];

const th = "border-b border-line px-[18px] py-[13px] text-left text-xs font-semibold tracking-[0.5px] text-muted uppercase whitespace-nowrap";
const td = "px-[18px] py-[13px] align-middle whitespace-nowrap";

// Money arrives as decimal strings (full precision); numbers are fine for display.
const num = (s: string | number | null | undefined) => Number(s ?? 0);
const sum = <T,>(xs: T[], f: (x: T) => number) => xs.reduce((a, x) => a + f(x), 0);

type Props = {
  sel: RangeSel;
  rangeLabel: string;
  isAll: boolean;
  userName: string;
  summary: DashboardSummary;
  trend: TrendPoint[];
};

export function Dashboard({ sel, rangeLabel, isAll, userName, summary, trend }: Props) {

  const pay = summary.payments;
  const byStatus = Object.fromEntries(pay.byStatus.map((b) => [b.status, b]));
  const st = (s: PaymentStatus, f: "count" | "amount" | "fee" | "commission") => num(byStatus[s]?.[f]);
  const approvedAmount = st("approved", "amount");
  const approvedCount = st("approved", "count");
  const fees = st("approved", "fee") + st("refunded", "fee");

  const outApproved = summary.outflows.byStatus.find((b) => b.status === "approved");
  const outflowTotal = num(outApproved?.amount);
  const net = approvedAmount - outflowTotal;
  const merchants = summary.merchants;

  return (
    <div>
      <PageHeader title={`สวัสดี ${userName.split(" ")[0]}`} subtitle="ภาพรวมระบบและกิจกรรมล่าสุดของคุณ" />

      <RangeBar sel={sel} label={rangeLabel} />

      <SectionLabel>ภาพรวมการเงิน — {rangeLabel}</SectionLabel>
      <div className="mb-6 grid gap-[18px] sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          href="/payments?status=approved"
          tone="emerald"
          icon={<DollarSign size={24} />}
          label="ยอดรับชำระที่อนุมัติ"
          value={fmtMoney(approvedAmount)}
          note={
            <span className="flex items-center gap-1 text-success">
              <TrendingUp size={14} /> {approvedCount} รายการ
            </span>
          }
        />
        <StatCard
          href="/payments?status=approved"
          tone="amber"
          icon={<DollarSign size={24} />}
          label="ค่าธรรมเนียม (ระบบได้)"
          value={fmtMoney(fees)}
          note={<span>จาก {approvedCount} รายการที่อนุมัติ</span>}
        />
        <StatCard
          href="/accounts"
          tone="sky"
          icon={<Landmark size={24} />}
          label="บัญชีรับเงินที่กำลังใช้งาน"
          value={`${summary.receivingAccounts} บัญชี`}
          note="บัญชีกลาง · กระจายตามยอดเงิน"
        />
        <StatCard
          href="/outflows"
          tone="sky"
          icon={<DollarSign size={24} />}
          label="กระแสเงินสุทธิ (เข้า − ออก)"
          value={`${net >= 0 ? "+ " : "- "}${fmtMoney(Math.abs(net))}`}
          valueClass={net >= 0 ? "text-success" : "text-danger"}
          note={net >= 0 ? "เป็นบวก" : "เป็นลบ"}
        />
      </div>

      <SectionLabel>กิจกรรม &amp; สถานะ</SectionLabel>
      <div className="mb-6 grid gap-[18px] sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          href="/payments?status=pending"
          tone="amber"
          icon={<Clock size={24} />}
          label="รายการรอตรวจสอบ (ตอนนี้)"
          value={pay.pendingLiveCount}
          note="รายการที่ต้องดำเนินการ"
        />
        <StatCard
          href="/outflows?status=approved"
          tone="rose"
          icon={<ArrowUp size={24} />}
          label="ยอดถอนที่อนุมัติแล้ว"
          value={`- ${fmtMoney(outflowTotal)}`}
          valueClass="text-danger"
          note={
            <span className="flex items-center gap-1 text-danger">
              <TrendingDown size={14} /> {outApproved?.count ?? 0} รายการ
            </span>
          }
        />
        <StatCard
          href="/outflows?status=pending"
          tone="amber"
          icon={<Clock size={24} />}
          label="ยอดถอนรอตรวจสอบ (รายการ)"
          value={summary.outflows.pendingLiveCount}
          note="รอ admin อนุมัติ"
        />
        <StatCard
          href="/users"
          tone="rose"
          icon={<Users size={24} />}
          label="ผู้ใช้งานในระบบ"
          value={summary.users}
          note="ใช้งานอยู่ปัจจุบัน"
        />
      </div>

      <div className="space-y-5">
        <Card>
          <CardHead title="รายการชำระเงินล่าสุด">
            <GhostLink href="/payments">ดูทั้งหมด</GhostLink>
          </CardHead>
          <div className="overflow-x-auto">
            <table className="w-full text-[12.5px]">
              <thead className="bg-surface-alt">
                <tr>
                  {["เลขที่", "ร้านค้า", "ลูกค้า", "ช่องทางรับเงิน", "ยอด", "สถานะ", "วันที่"].map((h) => (
                    <th key={h} className={th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {pay.recent.length === 0 ? (
                  <tr>
                    <td colSpan={7}><Empty text="ไม่มีรายการในช่วงนี้" /></td>
                  </tr>
                ) : (
                  pay.recent.map((p) => (
                    <tr key={p.ref} className="hover:bg-surface-alt">
                      <td className={`${td} font-semibold`}>{p.ref}</td>
                      <td className={td}>{p.merchantName ?? <span className="text-soft">house</span>}</td>
                      <td className={td}>
                        <PayerCell name={p.customerName} bankCode={p.payerBankCode} masked={p.payerAccountMasked} />
                      </td>
                      <td className={td}>
                        <BankCell code={p.accountBankCode} bank={p.accountBankName} name={p.accountName} account={p.accountNo} />
                      </td>
                      <td className={`${td} font-semibold tabular-nums`}>{fmtMoney(num(p.amount))}</td>
                      <td className={td}><StatusBadge status={p.status} /></td>
                      <td className={`${td} text-muted`}>{fmtDateTime(p.createdAt)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>

        <Card>
          <CardHead title="รายการเงินออกล่าสุด">
            <GhostLink href="/outflows">ดูทั้งหมด</GhostLink>
          </CardHead>
          <div className="overflow-x-auto">
            <table className="w-full text-[12.5px]">
              <thead className="bg-surface-alt">
                <tr>
                  {["เลขที่", "หมวดหมู่", "หักจาก", "โอนไปยัง", "ยอด", "สถานะ", "วันที่"].map((h) => (
                    <th key={h} className={th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {summary.outflows.recent.length === 0 ? (
                  <tr>
                    <td colSpan={7}><Empty text="ไม่มีรายการเงินออกในช่วงนี้" /></td>
                  </tr>
                ) : (
                  summary.outflows.recent.map((o) => {
                    return (
                      <tr key={o.ref} className="hover:bg-surface-alt">
                        <td className={`${td} font-semibold`}>{o.ref}</td>
                        <td className={td}>
                          <CategoryBadge category={o.category} />
                        </td>
                        <td className={`${td} text-muted`}>
                          {o.merchantId != null ? (<><div className="text-ink">ยอดร้าน {o.merchantName}</div>{o.fromAccount && <div className="text-[10.5px]">โอนจาก: {o.fromAccount}</div>}</>) : (o.fromAccount ?? "—")}
                        </td>
                        <td className={td}>
                          <div className="flex items-center gap-2">
                            <BankChip code={o.receiverBankCode} />
                            <div>
                              <div>{o.receiverName}</div>
                              <div className="text-[11px] text-muted tabular-nums">{o.receiverAccount}</div>
                            </div>
                            <button
                              onClick={() => navigator.clipboard?.writeText(o.receiverAccount.replace(/-/g, ""))}
                              className="grid size-6 place-items-center rounded text-soft hover:bg-primary-50 hover:text-primary"
                              title="คัดลอกเลขบัญชี"
                            >
                              <Copy size={13} />
                            </button>
                          </div>
                        </td>
                        <td className={`${td} font-semibold text-danger tabular-nums`}>- {fmtMoney(num(o.amount))}</td>
                        <td className={td}><StatusBadge status={o.status} kind="outflow" /></td>
                        <td className={`${td} text-muted`}>{fmtDateTime(o.createdAt)}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>

        <TrendChart trend={trend.map((t) => ({ day: t.day, amount: num(t.amount), count: t.count }))} />

        <Card>
          <CardHead title="สรุปตามสถานะ">
            <span className="text-[12.5px] text-muted">{rangeLabel}</span>
          </CardHead>
          <div className="grid gap-x-6 gap-y-1 px-5 py-5 sm:grid-cols-2 lg:grid-cols-5">
            {STATUSES.map((s) => {
              const count = st(s, "count");
              const pct = pay.totalCount ? Math.round((count / pay.totalCount) * 100) : 0;
              return (
                <div key={s} className="mb-3">
                  <div className="mb-1.5 flex items-center justify-between">
                    <StatusBadge status={s} />
                    <strong className="text-[13px]">
                      {count} <span className="font-normal text-muted">({pct}%)</span>
                    </strong>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-md bg-surface-alt ring-1 ring-line/60">
                    <div className="h-full bg-linear-to-r from-primary to-accent transition-[width] duration-500" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <Card className="mb-6">
          <CardHead title={`สรุปรายร้านค้า — ${rangeLabel}`}>
            <GhostLink href="/merchant-dashboard">แดชบอร์ดร้านค้า</GhostLink>
          </CardHead>
          <div className="overflow-x-auto">
            {merchants.length === 0 ? (
              <Empty text="ยังไม่มี merchant" />
            ) : (
              <table className="w-full text-[12.5px]">
                <thead className="bg-surface-alt">
                  <tr>
                    <th className={th}>ร้านค้า</th>
                    <th className={`${th} text-right`}>ยอดฝาก</th>
                    <th className={`${th} text-right`}>ค่าธรรมเนียม</th>
                    <th className={`${th} text-right`}>ยอดถอน</th>
                    {!isAll && <th className={`${th} text-right`}>สุทธิในช่วง (เข้า − ถอน)</th>}
                    <th className={`${th} text-right`}>คงเหลือถอนได้ (ตอนนี้)</th>
                    <th className={`${th} text-right`}>รอตรวจสอบ</th>
                    <th className={th}>Fee rate</th>
                    <th className={th}>สถานะ</th>
                    <th className={th} />
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {merchants.map((m) => {
                    const netInWindow = num(m.depositTotal) - num(m.feeTotal) - num(m.withdrawTotal);
                    return (
                      <tr key={m.id} className="group hover:bg-surface-alt">
                        <td className={td}>
                          <Link href={`/merchant-dashboard?merchantId=${m.id}`} className="font-semibold hover:text-primary">
                            {m.name}
                          </Link>
                          <div className="text-[10.5px] text-muted"><code>{m.slug}</code></div>
                        </td>
                        <td className={`${td} text-right tabular-nums`}>
                          <strong>{fmtMoney(num(m.depositTotal))}</strong>
                          <div className="text-[10.5px] text-muted">{m.depositCount} รายการ</div>
                        </td>
                        <td className={`${td} text-right text-muted tabular-nums`}>{fmtMoney(num(m.feeTotal))}</td>
                        <td className={`${td} text-right text-danger tabular-nums`}>
                          {num(m.withdrawTotal) ? `- ${fmtMoney(num(m.withdrawTotal))}` : "—"}
                          <div className="text-[10.5px] text-muted">{m.withdrawCount ? `${m.withdrawCount} รายการ` : ""}</div>
                        </td>
                        {!isAll && (
                          <td className={`${td} text-right tabular-nums ${netInWindow < 0 ? "text-danger" : ""}`}>{fmtMoney(netInWindow)}</td>
                        )}
                        <td className={`${td} text-right font-semibold tabular-nums ${num(m.currentBalance) < 0 ? "text-danger" : ""}`}>
                          {fmtMoney(num(m.currentBalance))}
                        </td>
                        <td className={`${td} text-right`}>
                          {m.pendingCount ? (
                            <span className="rounded-full bg-[#fef3c7] px-2 py-0.5 font-semibold text-[#92400e]">{m.pendingCount}</span>
                          ) : (
                            <span className="text-soft">0</span>
                          )}
                        </td>
                        <td className={`${td} text-muted`}>เข้า {num(m.feePercent)}% + {fmtMoney(num(m.feeFlat))}<div className="text-[11px]">ออก {num(m.outFeePercent ?? 0)}% + {fmtMoney(num(m.outFeeFlat ?? 0))}</div></td>
                        <td className={td}>
                          {m.status === "active" ? (
                            <span className="inline-block rounded-full bg-[#dcfce7] px-2.5 py-[3px] text-[11px] font-semibold text-[#166534]">ใช้งาน</span>
                          ) : (
                            <span className="inline-block rounded-full bg-[#f1f5f9] px-2.5 py-[3px] text-[11px] font-semibold text-[#475569]">ระงับ</span>
                          )}
                        </td>
                        <td className={`${td} text-right text-soft group-hover:text-primary`}>
                          <ArrowUpRight size={16} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-surface-alt font-semibold">
                    <td className={td}>รวม {merchants.length} ร้าน</td>
                    <td className={`${td} text-right tabular-nums`}>{fmtMoney(sum(merchants, (m) => num(m.depositTotal)))}</td>
                    <td className={`${td} text-right tabular-nums`}>{fmtMoney(sum(merchants, (m) => num(m.feeTotal)))}</td>
                    <td className={`${td} text-right text-danger tabular-nums`}>- {fmtMoney(sum(merchants, (m) => num(m.withdrawTotal)))}</td>
                    {!isAll && (
                      <td className={`${td} text-right tabular-nums`}>
                        {fmtMoney(sum(merchants, (m) => num(m.depositTotal) - num(m.feeTotal) - num(m.withdrawTotal)))}
                      </td>
                    )}
                    <td className={`${td} text-right tabular-nums`}>{fmtMoney(sum(merchants, (m) => num(m.currentBalance)))}</td>
                    <td className={`${td} text-right`}>{sum(merchants, (m) => m.pendingCount)}</td>
                    <td colSpan={3} />
                  </tr>
                </tfoot>
              </table>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
