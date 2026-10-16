"use client";

import { useState } from "react";
import { Download, ListOrdered, X } from "lucide-react";
import { Modal, btn } from "../interactive/Modal";

type Kind = "payments" | "balance" | "commission";
type Data = Record<string, unknown> & { error?: string };
const m = (v: unknown) => Number(v ?? 0).toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const when = (t: unknown) => (t ? new Date(String(t)).toLocaleString("th-TH", { timeZone: "Asia/Bangkok", dateStyle: "medium", timeStyle: "short" }) : "—");
const th = "sticky top-0 z-[1] border-b border-line bg-surface-alt px-3 py-2 text-left text-[11.5px] font-semibold whitespace-nowrap text-muted";
const td = "border-b border-line/60 px-3 py-1.5 whitespace-nowrap";
const num = `${td} text-right tabular-nums`;

/** The button in the middle of a flow arrow: opens every transaction behind the arrow, with an Excel download. */
export function BreakdownButton({ kind, merchantId, from, to, label, title, children, className }: {
  kind: Kind; merchantId: number; from: string | null; to: string | null; label: string; title: string;
  /** Button content (default "ดูรายการ"); `className` replaces the default pill style. */
  children?: React.ReactNode; className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<Data | null>(null);
  const q = new URLSearchParams({ kind, merchantId: String(merchantId), label });
  if (kind !== "balance" && from) q.set("from", from);
  if (kind !== "balance" && to) q.set("to", to);
  const url = `/merchant-dashboard/breakdown?${q}`;
  const show = async () => {
    setOpen(true);
    setData(null);
    const r = await fetch(url, { cache: "no-store" });
    setData(await r.json().catch(() => ({ error: `HTTP ${r.status}` })));
  };

  return (
    <>
      <button type="button" onClick={show} title="ดูรายละเอียด"
        className={className ?? "inline-flex items-center gap-1.5 rounded-full border border-primary/50 bg-surface px-3 py-1.5 text-[12px] font-medium text-primary shadow-card transition hover:bg-primary hover:text-primary-fg"}>
        {children ?? <><ListOrdered size={14} /> ดูรายการ</>}
      </button>
      {open && (
        <Modal title={title} onClose={() => setOpen(false)} width={1180}
          footer={
            <div className="flex w-full items-center justify-between gap-3">
              <span className="text-[12px] text-muted">{label}</span>
              <div className="flex gap-2">
                <a href={`${url}&format=xlsx`} className={`${btn.base} ${btn.md} ${btn.primary} inline-flex items-center gap-1.5`}><Download size={15} /> ดาวน์โหลด Excel</a>
                <button type="button" className={`${btn.base} ${btn.md} ${btn.ghost} inline-flex items-center gap-1.5`} onClick={() => setOpen(false)}><X size={15} /> ปิด</button>
              </div>
            </div>
          }>
          {!data ? <div className="p-10 text-center text-muted">กำลังโหลดรายการ…</div>
            : data.error ? <div className="p-6 text-danger">{String(data.error)}</div>
            : kind === "payments" ? <PaymentsTable d={data} /> : kind === "commission" ? <CommissionTable d={data} /> : <BalanceTable d={data} />}
        </Modal>
      )}
    </>
  );
}

function Step({ items }: { items: [string, string, string?][] }) {
  return (
    <div className="mb-4 flex flex-wrap items-stretch gap-2 text-[13px]">
      {items.map(([k, v, tone], i) => (
        <div key={k} className="flex items-center gap-2">
          {i > 0 && <span aria-hidden className="text-lg text-muted">→</span>}
          <div className={`rounded-xl border px-3.5 py-2 ${tone ?? "border-line bg-surface-alt"}`}>
            <div className="text-[11.5px] text-muted">{k}</div>
            <div className="text-[16px] font-semibold tabular-nums">฿{v}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function PaymentsTable({ d }: { d: Data }) {
  const t = d.totals as { count: number; gross: string; fee: string; net: string };
  const s = d.shop as { feePercent: number; feeFlat: number };
  const rows = d.rows as { no: number; ref: string; orderId: string | null; customer: string; createdAt: string; approvedAt: string; amount: string; fee: string; net: string; cumulativeNet: string }[];
  return (
    <div>
      <Step items={[["ยอดรับชำระ (gross)", m(t.gross)], [`− ค่าธรรมเนียมเงินเข้า (${s.feePercent}% + ฿${s.feeFlat.toFixed(2)})`, m(t.fee), "border-amber-500/40 bg-amber-500/10"], ["= ยอดสุทธิเข้าร้าน (net)", m(t.net), "border-sky-500/40 bg-sky-500/10"]]} />
      <div className="mb-2 text-[12px] text-muted">{t.count} รายการที่อนุมัติ · ค่าธรรมเนียมคิดทีละรายการ ปัด 2 ตำแหน่ง · “สุทธิสะสม” ของรายการสุดท้าย = ยอดสุทธิเข้าร้าน</div>
      <div className="max-h-[52vh] overflow-auto rounded-xl border border-line">
        <table className="w-full border-collapse text-[12.5px]">
          <thead><tr>{["#", "เลขที่", "orderId", "ลูกค้า", "สร้างเมื่อ", "ยอดรับชำระ", "ค่าธรรมเนียม", "สุทธิ", "สุทธิสะสม"].map((h, i) => <th key={h} className={`${th} ${i >= 5 ? "text-right" : ""}`}>{h}</th>)}</tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.ref} className="hover:bg-surface-alt/50">
                <td className={`${td} text-muted`}>{r.no}</td><td className={td}><strong>{r.ref}</strong></td>
                <td className={`${td} max-w-[220px] truncate text-muted`} title={r.orderId ?? ""}>{r.orderId ?? "—"}</td>
                <td className={`${td} max-w-[180px] truncate`}>{r.customer}</td><td className={`${td} text-muted`}>{when(r.createdAt)}</td>
                <td className={num}>{m(r.amount)}</td><td className={`${num} text-amber-300`}>−{m(r.fee)}</td><td className={num}>{m(r.net)}</td><td className={`${num} text-muted`}>{m(r.cumulativeNet)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot><tr className="bg-surface-alt font-semibold">
            <td className={td} colSpan={5}>รวม {t.count} รายการ</td><td className={num}>{m(t.gross)}</td><td className={`${num} text-amber-300`}>−{m(t.fee)}</td><td className={num}>{m(t.net)}</td><td className={num}>✓</td>
          </tr></tfoot>
        </table>
      </div>
    </div>
  );
}

function BalanceTable({ d }: { d: Data }) {
  const st = d.start as { openingBalance: string; payments: number; gross: string; fee: string; net: string; startBalance: string };
  const t = d.totals as { count: number; amount: string; fee: string; deducted: string };
  const end = d.end as { computed: string; balance: string; matches: boolean };
  const s = d.shop as { outFeePercent: number; outFeeFlat: number };
  const adj = d.adjustments as { createdAt: string; reason: string; amount: string; balanceAfter: string }[];
  const com = Number(d.commission);
  const rows = d.payouts as { no: number; ref: string; merchantRef: string | null; receiverName: string; bankCode: string; account: string; createdAt: string; transferred: boolean; transferredAt: string | null; amount: string; fee: string; deducted: string; balanceAfter: string }[];
  return (
    <div>
      <Step items={[
        ["ยอดสุทธิเข้าร้านสะสม", m(st.startBalance), "border-sky-500/40 bg-sky-500/10"],
        [`− ยอดโอนออก (${t.count} รายการ)`, m(t.amount), "border-rose-500/40 bg-rose-500/10"],
        [`− ค่าธรรมเนียมเงินออก (${s.outFeePercent}%)`, m(t.fee), "border-amber-500/40 bg-amber-500/10"],
        ...(adj.length ? [["± ปรับยอด", m(adj.reduce((a, x) => a + Number(x.amount), 0))] as [string, string]] : []),
        ...(com ? [["+ ค่าคอมจากร้านย่อย", m(com)] as [string, string]] : []),
        ["= ยอดคงเหลือถอนได้", m(end.computed), "border-emerald-500/40 bg-emerald-500/10"],
      ]} />
      <div className="mb-2 text-[12px] text-muted">
        ยอดสุทธิเข้าร้านสะสม = ยอดตั้งต้น ฿{m(st.openingBalance)} + {st.payments} รายการชำระเงิน (฿{m(st.gross)} − ค่าธรรมเนียม ฿{m(st.fee)}) · โอนออกหักยอดร้านทันทีเมื่อสร้าง (ยอด + ค่าธรรมเนียม) — เรียงตามเวลา
      </div>
      <div className="max-h-[48vh] overflow-auto rounded-xl border border-line">
        <table className="w-full border-collapse text-[12.5px]">
          <thead><tr>{["#", "เลขที่", "ผู้รับ", "สร้างเมื่อ (หักยอด)", "สถานะ", "ยอดโอนออก", "ค่าธรรมเนียม", "หักจากร้าน", "คงเหลือหลังรายการ"].map((h, i) => <th key={h} className={`${th} ${i >= 5 ? "text-right" : ""}`}>{h}</th>)}</tr></thead>
          <tbody>
            <tr className="bg-sky-500/5"><td className={td} colSpan={8}><strong>ยอดสุทธิเข้าร้านสะสม (เริ่มต้น)</strong></td><td className={`${num} font-semibold`}>{m(st.startBalance)}</td></tr>
            {rows.map((r) => (
              <tr key={r.ref} className="hover:bg-surface-alt/50">
                <td className={`${td} text-muted`}>{r.no}</td>
                <td className={td}><strong>{r.ref}</strong>{r.merchantRef && <div className="max-w-[200px] truncate text-[11px] text-muted" title={r.merchantRef}>{r.merchantRef}</div>}</td>
                <td className={`${td} max-w-[200px] truncate`}>{r.receiverName}<div className="text-[11px] text-muted">{r.bankCode} {r.account}</div></td>
                <td className={`${td} text-muted`}>{when(r.createdAt)}</td>
                <td className={td}>{r.transferred ? <span className="text-success">ถอนสำเร็จ {when(r.transferredAt)}</span> : <span className="text-warning">อนุมัติแล้ว · รอโอน</span>}</td>
                <td className={`${num} text-rose-300`}>−{m(r.amount)}</td><td className={`${num} text-amber-300`}>−{m(r.fee)}</td><td className={num}>−{m(r.deducted)}</td><td className={`${num} font-medium`}>{m(r.balanceAfter)}</td>
              </tr>
            ))}
            {adj.map((a, i) => (
              <tr key={`a${i}`}><td className={td} /><td className={td}>ปรับยอด</td><td className={td} colSpan={2}>{a.reason}</td><td className={`${td} text-muted`}>{when(a.createdAt)}</td><td className={td} colSpan={2} /><td className={num}>{m(a.amount)}</td><td className={num}>{m(a.balanceAfter)}</td></tr>
            ))}
            {com !== 0 && <tr><td className={td} /><td className={td} colSpan={6}>+ ค่าคอมจากร้านย่อย</td><td className={num}>{m(com)}</td><td className={num}>{m(end.computed)}</td></tr>}
          </tbody>
          <tfoot><tr className="bg-surface-alt font-semibold">
            <td className={td} colSpan={5}>รวม {t.count} รายการโอนออก</td><td className={`${num} text-rose-300`}>−{m(t.amount)}</td><td className={`${num} text-amber-300`}>−{m(t.fee)}</td><td className={num}>−{m(t.deducted)}</td><td className={num}>{m(end.computed)}</td>
          </tr></tfoot>
        </table>
      </div>
      <div className={`mt-3 rounded-lg px-3 py-2 text-[13px] ${end.matches ? "bg-emerald-500/10 text-success" : "bg-rose-500/10 text-danger"}`}>
        {end.matches ? `✓ ตรงกับยอดคงเหลือในระบบทุกสตางค์ (฿${m(end.balance)})` : `✗ คำนวณได้ ฿${m(end.computed)} แต่ยอดในระบบ ฿${m(end.balance)} — กรุณาแจ้งผู้ดูแลระบบ`}
      </div>
    </div>
  );
}

function CommissionTable({ d }: { d: Data }) {
  const shop = d.shop as { name: string; feePercent: number; outFeePercent: number };
  const shares = d.shares as { no: number; kind: string; ref: string; createdAt: string; fromName: string; levels: number; belowName: string | null; base: string; belowPct: string | null; belowFee: string | null; ownPct: string | null; ownFee: string | null; amount: string }[];
  const byShop = d.byShop as { levels: number; fromName: string; count: number; amount: string }[];
  const subs = d.subShops as { name: string; levels: number; viaName: string; inGap: number; outGap: number }[];
  const pct = (v: string | number | null) => (v === null ? "—" : `${Number(v)}%`);
  return (
    <div>
      <div className="mb-3 rounded-xl border border-line bg-surface-alt px-4 py-3 text-[13px]">
        <strong>ค่าคอมของ {shop.name}</strong> = ค่าธรรมเนียม ณ อัตราของร้านที่อยู่ใต้ {shop.name} ในสายนั้น − ค่าธรรมเนียม ณ อัตราของ {shop.name}
        <span className="text-muted"> (เงินเข้า {shop.feePercent}% · เงินออก {shop.outFeePercent}%) — คิดทีละรายการที่อนุมัติ ปัด 2 ตำแหน่ง</span>
      </div>
      <Step items={[["ค่าคอมรวม", m(d.total), "border-emerald-500/40 bg-emerald-500/10"], ["จำนวนรายการที่ได้ค่าคอม", String(shares.length)]]} />

      <div className="mb-1.5 text-[12.5px] font-semibold">อัตราที่ทำให้เกิดค่าคอม — ทุกร้านใต้ {shop.name}</div>
      <div className="mb-4 overflow-auto rounded-xl border border-line">
        <table className="w-full border-collapse text-[12.5px]">
          <thead><tr>{["ร้าน", "ชั้นใต้ร้านนี้", "คิดจากอัตราของ", "ส่วนต่างเงินเข้า", "ส่วนต่างเงินออก"].map((h, i) => <th key={h} className={`${th} ${i >= 3 ? "text-right" : ""}`}>{h}</th>)}</tr></thead>
          <tbody>
            {subs.length === 0 && <tr><td className={`${td} text-muted`} colSpan={5}>ไม่มีร้านย่อย</td></tr>}
            {subs.map((c) => (
              <tr key={`${c.name}${c.levels}`}>
                <td className={td} style={{ paddingLeft: 12 + (c.levels - 1) * 18 }}>{c.levels > 1 ? "└ " : ""}{c.name}</td><td className={td}>ชั้นที่ {c.levels}</td><td className={td}>{c.viaName}</td>
                <td className={`${num} ${c.inGap > 0 ? "text-success" : "text-muted"}`}>{c.inGap > 0 ? "+" : ""}{c.inGap}%</td><td className={`${num} ${c.outGap > 0 ? "text-success" : "text-muted"}`}>{c.outGap > 0 ? "+" : ""}{c.outGap}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {byShop.length > 0 && (
        <>
          <div className="mb-1.5 text-[12.5px] font-semibold">สรุปตามร้านและชั้น</div>
          <div className="mb-4 overflow-auto rounded-xl border border-line">
            <table className="w-full border-collapse text-[12.5px]">
              <thead><tr>{["ชั้น", "จากร้าน", "จำนวนรายการ", "ค่าคอม"].map((h, i) => <th key={h} className={`${th} ${i >= 2 ? "text-right" : ""}`}>{h}</th>)}</tr></thead>
              <tbody>{byShop.map((g) => <tr key={`${g.levels}${g.fromName}`}><td className={td}>ชั้นที่ {g.levels}</td><td className={td}>{g.fromName}</td><td className={num}>{g.count}</td><td className={`${num} font-medium`}>{m(g.amount)}</td></tr>)}</tbody>
              <tfoot><tr className="bg-surface-alt font-semibold"><td className={td} colSpan={2}>รวม</td><td className={num}>{shares.length}</td><td className={num}>{m(d.total)}</td></tr></tfoot>
            </table>
          </div>
        </>
      )}

      <div className="mb-1.5 text-[12.5px] font-semibold">ทุกรายการที่ให้ค่าคอม</div>
      <div className="max-h-[40vh] overflow-auto rounded-xl border border-line">
        <table className="w-full border-collapse text-[12.5px]">
          <thead><tr>{["#", "ประเภท", "เลขที่", "วันที่", "จากร้าน", "ชั้น", "ยอดรายการ", "ร้านชั้นล่าง · อัตรา", "ค่าธรรมเนียม ณ อัตรานั้น", `อัตรา ${shop.name}`, "ค่าธรรมเนียม ณ อัตรานี้", "ค่าคอม"].map((h, i) => <th key={h} className={`${th} ${i === 6 || i >= 8 ? "text-right" : ""}`}>{h}</th>)}</tr></thead>
          <tbody>
            {shares.length === 0 && <tr><td className={`${td} text-muted`} colSpan={12}>ไม่มีค่าคอมในช่วงนี้ — ร้านย่อยที่อัตราเท่ากับร้านนี้ (ส่วนต่าง 0%) จะไม่มีค่าคอม</td></tr>}
            {shares.map((r) => (
              <tr key={`${r.no}${r.ref}`} className="hover:bg-surface-alt/50">
                <td className={`${td} text-muted`}>{r.no}</td><td className={td}>{r.kind}</td><td className={td}><strong>{r.ref}</strong></td><td className={`${td} text-muted`}>{when(r.createdAt)}</td>
                <td className={td}>{r.fromName}</td><td className={td}>{r.levels}</td><td className={num}>{m(r.base)}</td>
                <td className={td}>{r.belowName ?? "—"} · {pct(r.belowPct)}</td><td className={num}>{r.belowFee === null ? "—" : m(r.belowFee)}</td>
                <td className={td}>{pct(r.ownPct)}</td><td className={num}>{r.ownFee === null ? "—" : `− ${m(r.ownFee)}`}</td><td className={`${num} font-semibold text-success`}>{m(r.amount)}</td>
              </tr>
            ))}
          </tbody>
          {shares.length > 0 && <tfoot><tr className="bg-surface-alt font-semibold"><td className={td} colSpan={11}>รวม {shares.length} รายการ</td><td className={num}>{m(d.total)}</td></tr></tfoot>}
        </table>
      </div>
    </div>
  );
}
