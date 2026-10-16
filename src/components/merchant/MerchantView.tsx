import Link from "next/link";
import { AlertTriangle, ArrowUp, Clock, DollarSign, Landmark, TrendingUp } from "lucide-react";
import { BankCell, PayerCell } from "../cells";
import { TrendChart } from "../dashboard/TrendChart";
import { rangeFromParams, rangeWindow, resolveRange, toDayKey } from "../dashboard/range";
import { DayBar } from "../list/DayBar";
import { DataTable } from "../list/ListParts";
import { param, type Params } from "../list/query";
import { Card, CardHead, GhostLink, SectionLabel, StatCard, StatGrid, StatusBadge } from "../ui";
import { getDashboardTrend, listResource, type ListResult } from "@/lib/api";
import { bkkDayStart, type PaymentStatus } from "@/lib/domain";
import { fmtDateTime, fmtMoney } from "@/lib/format";
import { requestTime } from "@/lib/request-time";
import type { MerchantRow, PaymentRow, WithdrawalRow } from "@/lib/rows";
import { BreakdownButton } from "./BreakdownButton";
import { CarryArrow, FlowArrow } from "./FlowArrow";
import { MerchantTree } from "./MerchantTree";
import { MerchantSelect } from "./MerchantSelect";

type Sum = ListResult["summary"][number] & { fee?: string; commission?: string };
const by = (s: ListResult["summary"]) => Object.fromEntries(s.map((x) => [x.key, x as Sum])) as Record<string, Sum | undefined>;
const n = (v: string | number | null | undefined) => Number(v ?? 0);
const STATUSES: PaymentStatus[] = ["pending", "approved", "rejected", "refunded", "expired"];
const FLOW = "mb-6 grid gap-[18px] sm:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_168px_minmax(0,1fr)_168px_minmax(0,1fr)] xl:gap-x-2";

/**
 * One shop's numbers, laid out like the original "แดชบอร์ดร้านค้า":
 * shop picker · day picker · period tiles · now/lifetime tiles · trend · status
 * summary · recent payments · withdrawal requests. `pickerPath` shows the shop
 * switcher (admin view); the merchant portal passes a fixed `merchantId` instead.
 */
/** `portal`: rendered inside the Merchant Portal — links stay in the portal instead of the console. */
export async function MerchantView({ params, pickerPath, merchantId, portal = false }: { params: Params; pickerPath?: string; merchantId?: number; portal?: boolean }) {
  const now = await requestTime();
  const today = bkkDayStart(now);
  const sel = rangeFromParams(params, today);
  const range = resolveRange(sel, today);
  const win = rangeWindow(range);

  let merchants: MerchantRow[];
  try {
    merchants = (await listResource<MerchantRow>("merchants", win)).data;
  } catch (err) {
    return (
      <Card className="flex items-start gap-3 p-5">
        <AlertTriangle className="mt-0.5 shrink-0 text-danger" size={20} />
        <div className="text-[13px] text-muted">{err instanceof Error ? err.message : String(err)}</div>
      </Card>
    );
  }
  if (merchants.length === 0) return <Card className="px-5 py-[60px] text-center text-muted">ยังไม่มี merchant ในระบบ</Card>;

  const sorted = [...merchants].sort((a, b) => a.name.localeCompare(b.name, "th"));
  const wanted = merchantId ?? Number(param(params, "merchantId"));
  const m = sorted.find((x) => x.id === wanted) ?? sorted[0];

  const [period, lifetime, recent, withdrawals, pendingW, trend, paidOut] = await Promise.all([
    listResource<PaymentRow>("payments", { merchantId: m.id, ...win, limit: 1 }),
    listResource<PaymentRow>("payments", { merchantId: m.id, limit: 1 }),
    listResource<PaymentRow>("payments", { merchantId: m.id, ...win, limit: 10 }),
    listResource<WithdrawalRow>("withdrawals", { merchantId: m.id, ...win, limit: 5 }),
    listResource<WithdrawalRow>("withdrawals", { merchantId: m.id, status: "pending", limit: 1 }),
    getDashboardTrend(30, m.id),
    listResource("outflows", { merchantId: m.id, status: "approved", limit: 1 }),
  ]);
  // Admin view: payouts (amount + out-fee) in the selected period, for the flow cards.
  const periodOut = portal ? null : by((await listResource("outflows", { merchantId: m.id, status: "approved", ...win, limit: 1 })).summary).approved;
  const p = by(period.summary);
  const life = by(lifetime.summary);
  const wPend = by(pendingW.summary);
  const lifetimeNet = n(life.approved?.amount) - n(life.approved?.fee);
  const lifetimeOutRow = by(paidOut.summary).approved;
  const lifetimeOut = n(lifetimeOutRow?.amount);
  const lifetimeOutFee = n(lifetimeOutRow?.fee);

  const gross = n(p.approved?.amount);
  const fee = n(p.approved?.fee);
  // The old fixed 5% "คอม" (payments.commission) is paid to nobody and is not part of any balance: not shown.
  const commission = 0;
  const totalCount = period.summary.reduce((x, s) => x + s.count, 0);
  const PORTAL: Record<string, string> = { "/payments": "/merchant/transactions", "/withdrawals": "/merchant/withdrawals" };
  // Same page for another shop, keeping the selected period.
  const shopLink = (id: number) => {
    const q = new URLSearchParams(Object.entries(params).filter((e): e is [string, string] => typeof e[1] === "string" && e[0] !== "merchantId"));
    q.set("merchantId", String(id));
    return `${pickerPath ?? "/merchant-dashboard"}?${q}`;
  };
  const href = (path: string, extra = "") => (portal ? `${PORTAL[path] ?? path}?${extra.replace(/^&/, "")}` : `${path}?merchantId=${m.id}${extra}`);

  return (
    <>
      {pickerPath && (
        <div className="mb-4 flex flex-wrap items-center gap-2.5">
          <MerchantSelect value={m.id} options={sorted.map((x) => ({ id: x.id, label: x.status === "active" ? x.name : `${x.name} (${x.status})` }))} />
          <span className="text-xs text-muted">
            <code className="text-[11px]">{m.slug}</code> · fee เข้า {n(m.feePercent)}% + {fmtMoney(m.feeFlat)} · ออก {n(m.outFeePercent)}% + {fmtMoney(m.outFeeFlat)} · {m.apiKeysActive}/{m.apiKeysTotal} API key
          </span>
        </div>
      )}

      <DayBar sel={sel} label={range.label} today={toDayKey(today)} />

      {portal ? (
        <>
        <SectionLabel>ยอดในช่วงที่เลือก — {range.label}</SectionLabel>
        <StatGrid>
          <StatCard href={href("/payments", "&status=approved")} tone="emerald" icon={<DollarSign size={24} />} label="ยอดรับชำระ (gross)" value={fmtMoney(gross)} note={`${p.approved?.count ?? 0} รายการอนุมัติ`} />
          <StatCard
            href={href("/payments", "&status=approved")}
            tone="amber"
            icon={<DollarSign size={24} />}
            label={commission ? "ค่าธรรมเนียม (ระบบได้)" : "ค่าธรรมเนียม"}
            value={fmtMoney(fee - commission)}
            note={
              <span className="flex flex-col">
                {commission > 0 && <span className="text-ink">เต็ม {fmtMoney(fee)} − คอม {fmtMoney(commission)}</span>}
                <span>จาก {n(m.feePercent)}% + {fmtMoney(m.feeFlat)} / รายการ</span>
              </span>
            }
          />
          <StatCard href={href("/payments", "&status=approved")} tone="sky" icon={<TrendingUp size={24} />} label="ยอดสุทธิเข้าร้าน (net)" value={fmtMoney(gross - fee)} note="gross − fee" />
          <StatCard href={href("/withdrawals")} tone="rose" icon={<ArrowUp size={24} />} label="ถอนแล้ว" value={fmtMoney(m.withdrawTotal)} note={`${m.withdrawCount} รายการเงินออกที่อนุมัติ`} />
        </StatGrid>

        <SectionLabel>ยอด ณ ตอนนี้ &amp; ยอดสะสม</SectionLabel>
        <StatGrid>
          <StatCard
            href={href("/withdrawals")}
            tone="sky"
            icon={<Landmark size={24} />}
            label="ยอดคงเหลือถอนได้ (ตอนนี้)"
            value={fmtMoney(m.currentBalance)}
            valueClass={n(m.currentBalance) < n(m.minBalance) ? "text-danger" : ""}
            note={`net สะสม ${fmtMoney(lifetimeNet)} − ถอนสะสม ${fmtMoney(lifetimeOut)}`}
          />
          <StatCard href={href("/payments", "&status=approved&range=all")} tone="emerald" icon={<DollarSign size={24} />} label="ยอดรับสะสมทั้งหมด" value={fmtMoney(life.approved?.amount)} note={`${life.approved?.count ?? 0} รายการตลอดอายุ`} />
          <StatCard href={href("/payments", "&status=pending&range=all")} tone="amber" icon={<Clock size={24} />} label="รอตรวจสอบ (ตอนนี้)" value={life.pending?.count ?? 0} note={fmtMoney(life.pending?.amount)} />
          <StatCard href={href("/withdrawals")} tone="amber" icon={<Clock size={24} />} label="คำขอถอนรอ (ตอนนี้)" value={wPend.pending?.count ?? 0} note={fmtMoney(wPend.pending?.amount)} />
        </StatGrid>
        </>
      ) : (
        <>
          {/* Two rows on one 5-column grid (card · arrow · card · arrow · card) so the arrows line up. */}
          <SectionLabel>ยอดในช่วงที่เลือก — {range.label}</SectionLabel>
          <div className={FLOW}>
            <StatCard href={href("/payments", "&status=approved")} tone="emerald" icon={<DollarSign size={24} />} label="ยอดรับชำระ (gross)" value={fmtMoney(gross)} note={`${p.approved?.count ?? 0} รายการอนุมัติ`} />
            <FlowArrow lines={[{ label: `ค่าธรรมเนียมเงินเข้า ${n(m.feePercent)}%`, value: `− ${fmtMoney(fee)}`, tone: "text-warning" }]}>
              <BreakdownButton kind="payments" merchantId={m.id} from={win.from} to={win.to} label={range.label} title={`${m.name} — ยอดรับชำระ → ยอดสุทธิเข้าร้าน (${range.label})`} />
            </FlowArrow>
            <StatCard href={href("/payments", "&status=approved")} tone="sky" icon={<TrendingUp size={24} />} label="ยอดสุทธิเข้าร้าน (net)" value={fmtMoney(gross - fee)} note="ยอดรับชำระ − ค่าธรรมเนียมเงินเข้า" />
            <div className="xl:col-span-2">
              <Card className="h-full p-5">
                <div className="mb-3 flex items-center gap-2 text-[13px] text-muted"><ArrowUp size={16} className="text-danger" /> โอนออกในช่วงนี้ · {periodOut?.count ?? 0} รายการที่อนุมัติ</div>
                <div className="grid grid-cols-2 gap-4">
                  <div><div className="text-[11.5px] text-muted">ยอดโอนออก</div><div className="text-[22px] font-bold tabular-nums">{fmtMoney(periodOut?.amount)}</div></div>
                  <div><div className="text-[11.5px] text-muted">ค่าธรรมเนียมเงินออก ({n(m.outFeePercent)}%)</div><div className="text-[22px] font-bold tabular-nums text-warning">{fmtMoney(periodOut?.fee)}</div></div>
                </div>
                <div className="mt-2 text-[11.5px] text-muted">หักจากร้านรวม {fmtMoney(n(periodOut?.amount) + n(periodOut?.fee))} · <Link href={`/outflows?merchantId=${m.id}`} className="text-primary hover:underline">ดูรายการเงินออก</Link></div>
              </Card>
            </div>
          </div>

          {/* The period's net is part of the running total below it. */}
          <div className={`${FLOW} -my-3`}>
            <div className="hidden xl:block" /><div className="hidden xl:block" />
            <CarryArrow label="ยกไปรวมในยอดสะสม" note={range.isAll ? "ทั้งหมด = ยอดสะสม" : `+ ช่วงอื่น ${fmtMoney(lifetimeNet - (gross - fee))}`} />
          </div>

          <SectionLabel>ยอดสะสมตั้งแต่เปิดร้าน → ยอดคงเหลือ ณ ตอนนี้</SectionLabel>
          <div className={FLOW}>
            <StatCard href={href("/payments", "&status=approved&range=all")} tone="emerald" icon={<DollarSign size={24} />} label="ยอดรับสะสม (gross)" value={fmtMoney(life.approved?.amount)} note={`${life.approved?.count ?? 0} รายการตลอดอายุ`} />
            <FlowArrow lines={[{ label: "ค่าธรรมเนียมเงินเข้าสะสม", value: `− ${fmtMoney(life.approved?.fee)}`, tone: "text-warning" }]}>
              <BreakdownButton kind="payments" merchantId={m.id} from={null} to={null} label="สะสมทั้งหมด" title={`${m.name} — ยอดรับสะสม → ยอดสุทธิเข้าร้านสะสม`} />
            </FlowArrow>
            <StatCard href={href("/payments", "&status=approved&range=all")} tone="sky" icon={<TrendingUp size={24} />} label="ยอดสุทธิเข้าร้านสะสม" value={fmtMoney(lifetimeNet)} note="ยอดรับสะสม − ค่าธรรมเนียมเงินเข้าสะสม" />
            <FlowArrow lines={[
              ...(n(m.openingBalance) ? [{ label: "ยอดตั้งต้น", value: `+ ${fmtMoney(m.openingBalance)}` }] : []),
              { label: `ยอดโอนออก (${lifetimeOutRow?.count ?? 0})`, value: `− ${fmtMoney(lifetimeOut)}`, tone: "text-danger" },
              { label: "ค่าธรรมเนียมเงินออก", value: `− ${fmtMoney(lifetimeOutFee)}`, tone: "text-warning" },
              // Also part of the balance — shown only when the shop has them, so the arrow always adds up.
              ...(n(m.creditAdjustments) ? [{ label: "ปรับยอด", value: `${n(m.creditAdjustments) > 0 ? "+" : "−"} ${fmtMoney(Math.abs(n(m.creditAdjustments)))}` }] : []),
              ...(n(m.commissionEarned) ? [{ label: "ค่าคอมจากร้านย่อย", value: `+ ${fmtMoney(m.commissionEarned)}`, tone: "text-success" }] : []),
            ]}>
              <BreakdownButton kind="balance" merchantId={m.id} from={null} to={null} label="สะสมทั้งหมด" title={`${m.name} — ยอดสุทธิเข้าร้านสะสม → ยอดคงเหลือถอนได้`} />
            </FlowArrow>
            <StatCard
              href={`/outflows?merchantId=${m.id}`}
              tone="emerald"
              icon={<Landmark size={24} />}
              label="ยอดคงเหลือถอนได้ (ตอนนี้)"
              value={fmtMoney(m.currentBalance)}
              valueClass={n(m.currentBalance) < n(m.minBalance) ? "text-danger" : ""}
              note="สุทธิสะสม − โอนออก − ค่าธรรมเนียมเงินออก"
            />
          </div>

          <StatGrid>
            <StatCard href={href("/payments", "&status=pending&range=all")} tone="amber" icon={<Clock size={24} />} label="รอตรวจสอบ (ตอนนี้)" value={life.pending?.count ?? 0} note={fmtMoney(life.pending?.amount)} />
            <StatCard href={href("/withdrawals")} tone="amber" icon={<Clock size={24} />} label="คำขอถอนรอ (ตอนนี้)" value={wPend.pending?.count ?? 0} note={fmtMoney(wPend.pending?.amount)} />
          </StatGrid>

          <div className="mb-6">
            <MerchantTree merchantId={m.id} from={win.from} to={win.to} rangeLabel={range.label} link={(id) => shopLink(id)} />
          </div>
        </>
      )}

      <div className="space-y-5">
        <TrendChart trend={trend.map((t) => ({ day: t.day, amount: n(t.amount), count: t.count }))} />

        <Card>
          <CardHead title="สรุปตามสถานะ"><span className="text-[12.5px] text-muted">{range.label}</span></CardHead>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-x-6 gap-y-1 px-5 py-5">
            {STATUSES.map((s) => {
              const count = p[s]?.count ?? 0;
              const pct = totalCount ? Math.round((count / totalCount) * 100) : 0;
              return (
                <div key={s} className="mb-3">
                  <div className="mb-1.5 flex items-center justify-between">
                    <StatusBadge status={s} />
                    <strong className="text-[13px]">{count} <span className="font-normal text-muted">({pct}%)</span></strong>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-md bg-surface-alt">
                    <div className="h-full bg-linear-to-r from-primary to-accent" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <Card>
          <CardHead title={`รายการชำระเงินล่าสุดของ ${m.name}`}>
            <GhostLink href={href("/payments", "&range=all")}>ดูทั้งหมด</GhostLink>
          </CardHead>
          <DataTable<PaymentRow>
            rows={recent.data}
            rowKey={(x) => x.ref}
            empty="ไม่มีรายการในช่วงนี้"
            columns={[
              { header: "เลขที่", cell: (x) => <strong>{x.ref}</strong> },
              { header: "ลูกค้า", cell: (x) => <PayerCell name={x.customerName} bankCode={x.payerBankCode} masked={x.payerAccountMasked} /> },
              { header: "ช่องทางรับเงิน", cell: (x) => <BankCell code={x.accountBankCode} bank={x.accountBankName} name={x.accountName} account={x.accountNo} /> },
              { header: "ยอด", cell: (x) => <strong className="tabular-nums">{fmtMoney(x.amount)}</strong> },
              { header: "Fee", cell: (x) => (n(x.fee) ? <span className="text-muted tabular-nums">{fmtMoney(x.fee)}</span> : <span className="text-soft">—</span>) },
              { header: "สุทธิ", cell: (x) => <span className="tabular-nums">{fmtMoney(n(x.amount) - n(x.fee))}</span> },
              { header: "สถานะ", cell: (x) => <StatusBadge status={x.status} /> },
              { header: "วันที่", cell: (x) => <span className="text-muted">{fmtDateTime(x.createdAt)}</span> },
            ]}
          />
        </Card>

        <Card>
          <CardHead title={`คำขอถอน — ${range.label}`}>
            <GhostLink href={href("/withdrawals", "&range=all")}>ดูทั้งหมด</GhostLink>
          </CardHead>
          <DataTable<WithdrawalRow>
            rows={withdrawals.data}
            rowKey={(w) => w.ref}
            empty="ไม่มีคำขอถอนในช่วงนี้"
            columns={[
              { header: "เลขที่", cell: (w) => <Link href={portal ? `/merchant/withdrawals?q=${w.ref}` : `/withdrawals?range=all&q=${w.ref}`} className="text-primary"><strong>{w.ref}</strong></Link> },
              { header: "ยอด", cell: (w) => <strong className="text-danger tabular-nums">- {fmtMoney(w.amount)}</strong> },
              { header: "ปลายทาง", cell: (w) => <div><div>{w.receiverBankCode} • {w.receiverAccount}</div><div className="text-[11px] text-muted">{w.receiverName}</div></div> },
              { header: "สถานะ", cell: (w) => <StatusBadge status={w.status} kind="outflow" /> },
              { header: "วันที่", cell: (w) => <span className="text-muted">{fmtDateTime(w.createdAt)}</span> },
            ]}
          />
        </Card>
      </div>
    </>
  );
}
