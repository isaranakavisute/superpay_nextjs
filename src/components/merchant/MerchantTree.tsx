import Link from "next/link";
import { ChevronRight, GitBranch, LayoutDashboard } from "lucide-react";
import { consoleHeaders } from "@/lib/api";
import { fmtMoney } from "@/lib/format";
import { Card, CardHead } from "../ui";
import { BreakdownButton } from "./BreakdownButton";
import { RateButton } from "./RateButton";
import type { Rates } from "@/app/merchant-dashboard/actions";

const BASE = process.env.BACKEND_URL ?? "http://localhost:3001";
type Node = Rates & {
  id: number; name: string; slug: string; status: string; parentId: number | null; depth: number; children: number;
  payCount: number; gross: string; fee: string; outCount: number; outAmount: string; outFee: string; commission: string; balance: string;
};
type Tree = { root: { id: number; name: string; parent: (Rates & { id: number; name: string }) | null }; ancestors: { id: number; name: string }[]; shops: Node[];
  totals: { shops: number; gross: string; fee: string; outAmount: string; outFee: string; commission: string; balance: string } };

const n = (v: unknown) => Number(v ?? 0);
const rates = (x: Rates) => ({ feePercent: n(x.feePercent), feeFlat: n(x.feeFlat), outFeePercent: n(x.outFeePercent), outFeeFlat: n(x.outFeeFlat) });
const th = "border-b border-line bg-surface-alt px-3 py-2.5 text-left text-[11.5px] font-semibold whitespace-nowrap text-muted";
const td = "border-b border-line/60 px-3 py-2.5 align-middle whitespace-nowrap";
const num = `${td} text-right tabular-nums`;

/**
 * ร้านแม่–ร้านย่อย (admin): the selected shop and every shop below it, with each one's rates (editable), the period's
 * numbers, the ค่าคอม it earned (click → how it is made) and its balance. Breadcrumb to the shops above it.
 */
export async function MerchantTree({ merchantId, from, to, rangeLabel, link }: { merchantId: number; from: string | null; to: string | null; rangeLabel: string; link: (id: number) => string }) {
  const q = new URLSearchParams();
  if (from) q.set("from", from);
  if (to) q.set("to", to);
  let t: Tree;
  try {
    const r = await fetch(`${BASE}/api/console/merchants/${merchantId}/breakdown/tree?${q}`, { headers: consoleHeaders(), cache: "no-store" });
    if (!r.ok) return null;
    t = await r.json();
  } catch {
    return null;
  }
  const byId = new Map(t.shops.map((s) => [s.id, s]));
  const floorOf = (s: Node) => {
    const p = s.parentId != null ? byId.get(s.parentId) ?? (t.root.parent?.id === s.parentId ? t.root.parent : null) : null;
    return p ? { ...rates(p), name: p.name } : null;
  };
  const ceilingOf = (s: Node) => {
    const kids = t.shops.filter((k) => k.parentId === s.id);
    if (!kids.length) return null;
    const min = (k: keyof Rates) => Math.min(...kids.map((x) => n(x[k])));
    return { feePercent: min("feePercent"), feeFlat: min("feeFlat"), outFeePercent: min("outFeePercent"), outFeeFlat: min("outFeeFlat"), names: kids.map((k) => k.name).join(", ") };
  };
  const solo = t.shops.length === 1;

  return (
    <Card>
      <CardHead title="ร้านแม่–ร้านย่อย">
        <span className="text-[12.5px] text-muted">{rangeLabel} · ยอดคงเหลือ ณ ตอนนี้</span>
      </CardHead>
      <div className="flex flex-wrap items-center gap-1 border-b border-line px-5 py-2.5 text-[12.5px]">
        <GitBranch size={14} className="mr-1 text-muted" />
        {t.ancestors.map((a) => (
          <span key={a.id} className="flex items-center gap-1">
            <Link href={link(a.id)} className="text-primary hover:underline">{a.name}</Link><ChevronRight size={13} className="text-soft" />
          </span>
        ))}
        <strong>{t.root.name}</strong>
        <span className="ml-2 text-muted">{solo ? "· ยังไม่มีร้านย่อย" : `· ${t.shops.length - 1} ร้านย่อยทุกชั้น`}</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-[13px]">
          <thead>
            <tr>
              <th className={th}>ร้าน</th><th className={th}>อัตราเงินเข้า</th><th className={th}>อัตราเงินออก</th>
              <th className={`${th} text-right`}>ยอดรับชำระ</th><th className={`${th} text-right`}>ค่าธรรมเนียมเข้า</th>
              <th className={`${th} text-right`}>ยอดโอนออก</th><th className={`${th} text-right`}>ค่าธรรมเนียมออก</th>
              <th className={`${th} text-right`}>ค่าคอมที่ได้</th><th className={`${th} text-right`}>ยอดคงเหลือ</th><th className={th} />
            </tr>
          </thead>
          <tbody>
            {t.shops.map((s) => (
              <tr key={s.id} className={s.id === t.root.id ? "bg-primary/5" : "hover:bg-surface-alt/40"}>
                <td className={td}>
                  <div className="flex items-center" style={{ paddingLeft: s.depth * 22 }}>
                    {s.depth > 0 && <span className="mr-1.5 text-soft">└</span>}
                    <div>
                      <div className="font-medium">{s.name}{s.status !== "active" && <span className="ml-1.5 text-[11px] text-warning">({s.status})</span>}</div>
                      <div className="text-[11px] text-muted">{s.depth === 0 ? "ร้านที่เลือก" : `ชั้นที่ ${s.depth}`}{s.children ? ` · ${s.children} ร้านย่อย` : ""}</div>
                    </div>
                  </div>
                </td>
                <td className={td}>{n(s.feePercent)}%{n(s.feeFlat) ? ` + ฿${n(s.feeFlat).toFixed(2)}` : ""}</td>
                <td className={td}>
                  {n(s.outFeePercent)}%{n(s.outFeeFlat) ? ` + ฿${n(s.outFeeFlat).toFixed(2)}` : ""}
                  <RateButton merchantId={s.id} name={s.name} current={rates(s)} floor={floorOf(s)} ceiling={ceilingOf(s)}
                    volume={{ label: rangeLabel, gross: n(s.gross), payCount: s.payCount, outAmount: n(s.outAmount), outCount: s.outCount }} />
                </td>
                <td className={num}>{fmtMoney(s.gross)}<div className="text-[11px] text-muted">{s.payCount} รายการ</div></td>
                <td className={`${num} text-warning`}>{fmtMoney(s.fee)}</td>
                <td className={num}>{fmtMoney(s.outAmount)}<div className="text-[11px] text-muted">{s.outCount} รายการ</div></td>
                <td className={`${num} text-warning`}>{fmtMoney(s.outFee)}</td>
                <td className={num}>
                  {s.children ? (
                    <BreakdownButton kind="commission" merchantId={s.id} from={from} to={to} label={rangeLabel} title={`${s.name} — ค่าคอมจากร้านย่อย (${rangeLabel})`}
                      className={`rounded-md px-2 py-1 font-semibold tabular-nums underline decoration-dotted underline-offset-4 transition hover:bg-primary/10 ${n(s.commission) ? "text-success" : "text-muted"}`}>
                      {fmtMoney(s.commission)}
                    </BreakdownButton>
                  ) : <span className="text-soft">—</span>}
                </td>
                <td className={`${num} font-semibold`}>{fmtMoney(s.balance)}</td>
                <td className={td}>
                  {s.id !== t.root.id && (
                    <Link href={link(s.id)} className="inline-flex items-center gap-1 rounded-md border border-line px-2 py-1 text-[12px] text-muted transition hover:border-primary hover:text-primary">
                      <LayoutDashboard size={13} /> แดชบอร์ด
                    </Link>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
          {!solo && (
            <tfoot>
              <tr className="bg-surface-alt font-semibold">
                <td className={td} colSpan={3}>รวม {t.totals.shops} ร้าน</td>
                <td className={num}>{fmtMoney(t.totals.gross)}</td><td className={`${num} text-warning`}>{fmtMoney(t.totals.fee)}</td>
                <td className={num}>{fmtMoney(t.totals.outAmount)}</td><td className={`${num} text-warning`}>{fmtMoney(t.totals.outFee)}</td>
                <td className={`${num} text-success`}>{fmtMoney(t.totals.commission)}</td><td className={num}>{fmtMoney(t.totals.balance)}</td><td className={td} />
              </tr>
            </tfoot>
          )}
        </table>
      </div>
      <div className="px-5 py-3 text-[12px] text-muted">
        ค่าคอมที่ได้ = ส่วนต่างอัตรา × รายการของร้านใต้ร้านนั้น (ทุกชั้น) — คลิกตัวเลขเพื่อดูที่มาทีละรายการ · ✏️ แก้อัตราได้ (ต้องไม่ต่ำกว่าร้านแม่ และไม่สูงกว่าร้านย่อย) · มีผลกับรายการใหม่
      </div>
    </Card>
  );
}
