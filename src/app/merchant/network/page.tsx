import type { Metadata } from "next";
import Link from "next/link";
import { Card, CardHead, PageHeader } from "@/components/ui";
import { fmtMoney } from "@/lib/format";
import { portalCall, portalPerms, requirePortal } from "@/lib/portal";
import { PortalShell } from "../PortalShell";
import { ViewShopButton } from "../ShopSwitcher";
import { CommissionDonut, ShopBars, TrendLines, type NetDay } from "./NetworkCharts";

export const metadata: Metadata = { title: "ภาพรวมร้านย่อย — Merchant Portal" };
const PATH = "/merchant/network";

type Totals = { shops: number; active: number; pending: number; suspended: number; paidAmount: number; paidCount: number; feesPaid: number; outAmount: number;
  outCount: number; outFees: number; commissionToMe: number; balance: number; pendingPayments: number; pendingWithdrawals: number };
type Shop = { id: number; name: string; slug: string; parentId: number; depth: number; status: string; paidAmount: string; paidCount: number; feesPaid: string;
  outAmount: string; outCount: number; outFees: string; commissionToMe: string; balance: string; pendingPayments: number; pendingWithdrawals: string };
type Net = { days: number; shop: number | null; totals: Totals; trend: NetDay[]; shops: Shop[] };
type Sub = { id: number; name: string; depth: number };

const STATUS: Record<string, [string, string]> = { active: ["ใช้งาน", "text-emerald-300"], pending: ["รออนุมัติ", "text-amber-200"], suspended: ["ระงับ", "text-red-300"] };

export default async function PortalNetwork({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await requirePortal(PATH);
  const sp = await searchParams;
  const days = [7, 30, 90].includes(Number(sp.days)) ? Number(sp.days) : 30;
  const shopId = Number(sp.shop) > 0 ? Number(sp.shop) : null;
  const can = await portalPerms(user);
  const [net, list] = user.viewing || !can.has("view_dashboard") ? [null, null] : await Promise.all([
    portalCall<Net>(user, "GET", `/network?days=${days}${shopId ? `&shop=${shopId}` : ""}`),
    portalCall<{ subMerchants: Sub[] }>(user, "GET", "/sub-merchants"),
  ]);
  const subs = list?.ok ? list.subMerchants ?? [] : [];
  const trend = net?.trend ?? [];
  const rows = net?.shops ?? [];
  const one = shopId ? subs.find((s) => s.id === shopId) : null;
  const href = (q: { days?: number; shop?: number | null }) => {
    const p = new URLSearchParams();
    p.set("days", String(q.days ?? days));
    const s = q.shop === undefined ? shopId : q.shop;
    if (s) p.set("shop", String(s));
    return `${PATH}?${p}`;
  };

  return (
    <PortalShell user={user} path={PATH}>
      <PageHeader title={one ? `ภาพรวมร้านย่อย — ${one.name}` : "ภาพรวมร้านย่อย"}
        subtitle={one ? "ข้อมูลเฉพาะร้านนี้ (ไม่รวมร้านย่อยใต้ร้านนี้)" : "ยอดเงินและค่าคอมของร้านย่อยทุกชั้นใต้ร้านคุณ — เลือกร้านเพื่อดูเฉพาะร้าน"} />
      {user.viewing ? (
        <Card className="p-5 text-[13px] text-muted">ภาพรวมร้านย่อยดูได้จากร้านของคุณเอง — กด กลับร้านของฉัน ด้านบน</Card>
      ) : !can.has("view_dashboard") ? (
        <Card className="p-5 text-[13px] text-muted">ระดับผู้ใช้ของคุณไม่มีสิทธิ์ดูภาพรวม</Card>
      ) : !net?.ok || !net.totals ? (
        <Card className="p-5 text-[13px] text-red-300">โหลดข้อมูลไม่สำเร็จ{net && !net.ok ? `: ${net.error}` : ""}</Card>
      ) : subs.length === 0 ? (
        <Card className="p-10 text-center text-[13px] text-muted">ยังไม่มีร้านย่อย — สร้างได้ที่แท็บ <Link href="/merchant/sub-merchants" className="text-primary underline">ร้านย่อย</Link></Card>
      ) : (
        <div className="grid gap-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <form action={PATH} className="flex items-center gap-2">
              <input type="hidden" name="days" value={days} />
              <label htmlFor="net-shop" className="text-[13px] text-muted">ร้าน</label>
              <select id="net-shop" name="shop" defaultValue={shopId ?? ""} className="rounded-lg border border-line bg-surface-alt px-2.5 py-1.5 text-[13px] [color-scheme:dark]">
                <option value="">ทุกร้านย่อย ({subs.length} ร้าน)</option>
                {subs.map((s) => <option key={s.id} value={s.id}>{`${"  ".repeat(s.depth - 1)}${s.depth > 1 ? "└ " : ""}${s.name}`}</option>)}
              </select>
              <button type="submit" className="rounded-lg border border-line px-3 py-1.5 text-[13px] hover:bg-surface-alt">ดู</button>
              {shopId && <Link href={href({ shop: null })} className="text-[13px] text-primary">← ทุกร้าน</Link>}
            </form>
            <div className="inline-flex rounded-lg bg-surface-alt p-0.5 ring-1 ring-line">
              {[7, 30, 90].map((d) => <Link key={d} href={href({ days: d })} className={`rounded-md px-3 py-1 text-xs font-medium ${d === days ? "bg-surface text-primary shadow-sm" : "text-muted hover:text-ink"}`}>{d} วัน</Link>)}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              ["ยอดรับชำระ", fmtMoney(net.totals.paidAmount), `${net.totals.paidCount} รายการ · ${days} วัน`, "text-emerald-300"],
              ["ค่าคอมที่คุณได้", fmtMoney(net.totals.commissionToMe), `${days} วัน · เข้ายอดคงเหลือของร้านคุณ`, "text-primary"],
              ["เงินออก (ถอน / payout)", fmtMoney(net.totals.outAmount), `${net.totals.outCount} รายการ · ค่าธรรมเนียม ${fmtMoney(net.totals.outFees)}`, "text-red-300"],
              ["ยอดคงเหลือรวม (ตอนนี้)", fmtMoney(net.totals.balance), `รอถอน ${fmtMoney(net.totals.pendingWithdrawals)}`, ""],
              ["ค่าธรรมเนียมที่ร้านย่อยจ่าย", fmtMoney(net.totals.feesPaid), "เงินเข้า · รวมส่วนของระบบและร้านแม่ทุกชั้น", ""],
              ["รายการรอชำระ (ตอนนี้)", `${net.totals.pendingPayments} รายการ`, "ยังไม่หมดอายุ", ""],
              ["จำนวนร้าน", `${net.totals.shops} ร้าน`, `ใช้งาน ${net.totals.active} · รออนุมัติ ${net.totals.pending} · ระงับ ${net.totals.suspended}`, ""],
              ["ยอดสุทธิเข้าร้านย่อย", fmtMoney(net.totals.paidAmount - net.totals.feesPaid), "ยอดรับชำระ − ค่าธรรมเนียม", ""],
            ].map(([l, v, n, tone]) => (
              <div key={l} className="rounded-xl border border-line bg-surface px-5 py-4">
                <div className="text-[12px] text-muted">{l}</div>
                <div className={`mt-1 text-xl font-semibold tabular-nums ${tone}`}>{v}</div>
                <div className="mt-0.5 text-[11.5px] text-soft">{n}</div>
              </div>
            ))}
          </div>

          <Card>
            <CardHead title={`แนวโน้มรายวัน — ${days} วัน`} />
            <div className="px-[22px] py-4"><TrendLines days={trend} /></div>
          </Card>

          {!one && (
            <div className="grid gap-5 xl:grid-cols-2">
              <Card><CardHead title="ยอดรับชำระตามร้าน" /><div className="px-[22px] py-4"><ShopBars shops={rows} /></div></Card>
              <Card><CardHead title="ค่าคอมที่คุณได้ มาจากร้านไหน" /><div className="px-[22px] py-4"><CommissionDonut shops={rows} /></div></Card>
            </div>
          )}

          <Card>
            <CardHead title={one ? "ตัวเลขของร้านนี้" : "รายละเอียดทุกร้าน"} />
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-[12.5px]">
                <thead><tr>{["ร้าน", "สถานะ", "ยอดรับชำระ", "ค่าธรรมเนียมที่จ่าย", "เงินออก", "ค่าคอมที่คุณได้", "ยอดคงเหลือ", "รอชำระ", ""].map((h) => (
                  <th key={h} className="border-b border-line bg-surface-alt px-4 py-2.5 text-left text-[11.5px] font-semibold text-muted whitespace-nowrap">{h}</th>))}</tr></thead>
                <tbody className="divide-y divide-line">
                  {rows.map((s) => (
                    <tr key={s.id} className="hover:bg-surface-alt">
                      <td className="px-4 py-2.5" style={{ paddingLeft: `${16 + (one ? 0 : (s.depth - 1) * 22)}px` }}>{!one && s.depth > 1 && <span className="mr-1 text-soft">└</span>}<span className="font-medium">{s.name}</span></td>
                      <td className={`px-4 py-2.5 ${(STATUS[s.status] ?? ["", ""])[1]}`}>{(STATUS[s.status] ?? [s.status])[0]}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums">{fmtMoney(s.paidAmount)}<div className="text-[11px] text-muted">{s.paidCount} รายการ</div></td>
                      <td className="px-4 py-2.5 text-right tabular-nums">{fmtMoney(s.feesPaid)}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums">{fmtMoney(s.outAmount)}<div className="text-[11px] text-muted">{s.outCount} รายการ</div></td>
                      <td className="px-4 py-2.5 text-right font-semibold text-primary tabular-nums">{fmtMoney(s.commissionToMe)}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums">{fmtMoney(s.balance)}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums">{s.pendingPayments}</td>
                      <td className="px-4 py-2.5">
                        <div className="flex justify-end gap-2 whitespace-nowrap">
                          {!one && <Link href={href({ shop: s.id })} className="text-[12px] text-primary">เฉพาะร้านนี้</Link>}
                          <ViewShopButton id={s.id} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="border-t border-line px-[22px] py-2.5 text-[11.5px] text-muted">ยอดในช่วง {days} วันล่าสุด (เวลาไทย) · ยอดคงเหลือและรอชำระเป็นข้อมูลตอนนี้ · <strong>เปิดร้าน</strong> = ดูแดชบอร์ดและรายการทั้งหมดของร้านนั้น (ดูอย่างเดียว)</p>
          </Card>
        </div>
      )}
    </PortalShell>
  );
}
