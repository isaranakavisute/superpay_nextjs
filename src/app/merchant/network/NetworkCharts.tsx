"use client";

import { useState } from "react";

export type NetDay = { day: string; incoming: number; outgoing: number; commission: number; count: number };
export type NetShop = { id: number; name: string; paidAmount: string; commissionToMe: string };

const W = 820;
const H = 260;
const PAD = { top: 16, right: 66, bottom: 30, left: 66 };
const compact = new Intl.NumberFormat("th-TH", { notation: "compact", maximumFractionDigits: 1 });
const baht = (n: number) => `฿${n.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const niceMax = (v: number) => {
  if (v <= 0) return 1000;
  const p = 10 ** Math.floor(Math.log10(v));
  return ([1, 2, 2.5, 5, 10].find((m) => m * p >= v) ?? 10) * p;
};
const SERIES = [
  { k: "incoming", label: "ยอดรับชำระ", color: "#34d399" },
  { k: "outgoing", label: "เงินออก (ถอน / payout)", color: "#f87171" },
  { k: "commission", label: "ค่าคอมที่คุณได้ (แกนขวา)", color: "#d4af37" },
] as const;
const PALETTE = ["#d4af37", "#34d399", "#60a5fa", "#f472b6", "#a78bfa", "#fb923c", "#22d3ee", "#facc15", "#4ade80", "#f87171"];

/** Daily lines: money in, money out and the commission earned, per Bangkok day. */
export function TrendLines({ days }: { days: NetDay[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const [on, setOn] = useState<Record<string, boolean>>({ incoming: true, outgoing: true, commission: true });
  const shown = SERIES.filter((s) => on[s.k]);
  // Money in / out share the left axis; commission (far smaller) has its own right axis so its shape stays visible.
  const max = niceMax(Math.max(0, ...days.flatMap((d) => shown.filter((s) => s.k !== "commission").map((s) => d[s.k]))));
  const cmax = niceMax(Math.max(0, ...days.map((d) => d.commission)));
  const iw = W - PAD.left - PAD.right;
  const ih = H - PAD.top - PAD.bottom;
  const x = (i: number) => PAD.left + (days.length <= 1 ? iw / 2 : (i / (days.length - 1)) * iw);
  const y = (v: number) => PAD.top + ih - (v / max) * ih;
  const yc = (v: number) => PAD.top + ih - (v / cmax) * ih;
  const yOf = (k: (typeof SERIES)[number]["k"], v: number) => (k === "commission" ? yc(v) : y(v));
  const every = Math.ceil(days.length / 10);
  const h = hover != null ? days[hover] : null;
  return (
    <div>
      <div className="mb-2 flex flex-wrap gap-3 text-[12px]">
        {SERIES.map((s) => (
          <button key={s.k} type="button" aria-pressed={on[s.k]} onClick={() => setOn({ ...on, [s.k]: !on[s.k] })} className={`flex items-center gap-1.5 ${on[s.k] ? "text-ink" : "text-soft line-through"}`}>
            <span className="inline-block size-2.5 rounded-full" style={{ background: s.color }} />{s.label}
          </button>
        ))}
      </div>
      <div className="relative">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="กราฟแนวโน้มรายวันของร้านย่อย" onMouseLeave={() => setHover(null)}>
          {[0, 0.25, 0.5, 0.75, 1].map((t) => (
            <g key={t}>
              <line x1={PAD.left} x2={W - PAD.right} y1={y(max * t)} y2={y(max * t)} stroke="currentColor" className="text-line" strokeDasharray={t ? "3 4" : undefined} />
              <text x={PAD.left - 8} y={y(max * t) + 4} textAnchor="end" className="fill-current text-muted" fontSize="11">{compact.format(max * t)}</text>
              {on.commission && <text x={W - PAD.right + 8} y={y(max * t) + 4} textAnchor="start" fill="#d4af37" fontSize="11">{compact.format(cmax * t)}</text>}
            </g>
          ))}
          {days.map((d, i) => (i % every === 0 || i === days.length - 1) && (
            <text key={d.day} x={x(i)} y={H - 8} textAnchor="middle" className="fill-current text-muted" fontSize="11">{d.day.slice(8)}/{d.day.slice(5, 7)}</text>
          ))}
          {shown.map((s) => (
            <path key={s.k} d={days.map((d, i) => `${i ? "L" : "M"}${x(i)},${yOf(s.k, d[s.k])}`).join(" ")} fill="none" stroke={s.color} strokeWidth="2.2" strokeLinejoin="round" strokeDasharray={s.k === "commission" ? "6 4" : undefined} />
          ))}
          {hover != null && <line x1={x(hover)} x2={x(hover)} y1={PAD.top} y2={PAD.top + ih} stroke="currentColor" className="text-soft" />}
          {hover != null && shown.map((s) => <circle key={s.k} cx={x(hover)} cy={yOf(s.k, days[hover][s.k])} r="4" fill={s.color} />)}
          {days.map((d, i) => (
            <rect key={d.day} x={x(i) - iw / Math.max(1, days.length - 1) / 2} y={PAD.top} width={iw / Math.max(1, days.length - 1)} height={ih} fill="transparent" onMouseEnter={() => setHover(i)} />
          ))}
        </svg>
        {h && (
          <div className="pointer-events-none absolute top-2 right-2 rounded-lg border border-line bg-surface px-3 py-2 text-[12px] shadow-lg">
            <div className="mb-1 font-semibold">{new Date(`${h.day}T00:00:00+07:00`).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" })}</div>
            {SERIES.map((s) => <div key={s.k} className="flex justify-between gap-4"><span style={{ color: s.color }}>{s.label}</span><span className="tabular-nums">{baht(h[s.k])}</span></div>)}
            <div className="mt-0.5 text-muted">{h.count} รายการชำระ</div>
          </div>
        )}
      </div>
    </div>
  );
}

/** Horizontal bars: the period's payments per shop (top 10), with each shop's share. */
export function ShopBars({ shops }: { shops: NetShop[] }) {
  const rows = [...shops].map((s) => ({ ...s, v: Number(s.paidAmount) })).sort((a, b) => b.v - a.v).slice(0, 10);
  const total = shops.reduce((t, s) => t + Number(s.paidAmount), 0);
  const max = Math.max(1, ...rows.map((r) => r.v));
  if (!total) return <div className="py-10 text-center text-[13px] text-muted">ยังไม่มียอดรับชำระในช่วงนี้</div>;
  return (
    <div className="grid gap-2.5">
      {rows.map((r, i) => (
        <div key={r.id} className="grid grid-cols-[minmax(0,10rem)_1fr_auto] items-center gap-3 text-[12.5px]">
          <div className="truncate" title={r.name}>{r.name}</div>
          <div className="h-3 overflow-hidden rounded-full bg-surface-alt"><div className="h-full rounded-full" style={{ width: `${(r.v / max) * 100}%`, background: PALETTE[i % PALETTE.length] }} /></div>
          <div className="text-right tabular-nums">{baht(r.v)} <span className="text-[11px] text-muted">({((r.v / total) * 100).toFixed(1)}%)</span></div>
        </div>
      ))}
      {shops.length > 10 && <div className="text-[11.5px] text-muted">แสดง 10 อันดับแรกจาก {shops.length} ร้าน</div>}
    </div>
  );
}

/** Donut: which shops the commission came from. */
export function CommissionDonut({ shops }: { shops: NetShop[] }) {
  const rows = shops.map((s) => ({ ...s, v: Number(s.commissionToMe) })).filter((s) => s.v > 0).sort((a, b) => b.v - a.v);
  const top = rows.slice(0, 7);
  const rest = rows.slice(7).reduce((t, s) => t + s.v, 0);
  const parts = rest > 0 ? [...top, { id: -1, name: "อื่น ๆ", v: rest }] : top;
  const total = parts.reduce((t, s) => t + s.v, 0);
  if (!total) return <div className="py-10 text-center text-[13px] text-muted">ยังไม่มีค่าคอมในช่วงนี้</div>;
  const R = 70; const C = 2 * Math.PI * R;
  // Each slice starts where the previous ones end.
  const starts = parts.map((_, i) => parts.slice(0, i).reduce((t, x) => t + (x.v / total) * C, 0));
  return (
    <div className="flex flex-wrap items-center gap-5">
      <svg viewBox="0 0 180 180" className="w-[170px]" role="img" aria-label="สัดส่วนค่าคอมตามร้าน">
        <g transform="rotate(-90 90 90)">
          {parts.map((p, i) => {
            const len = (p.v / total) * C;
            return <circle key={p.id} cx="90" cy="90" r={R} fill="none" stroke={PALETTE[i % PALETTE.length]} strokeWidth="26" strokeDasharray={`${len} ${C - len}`} strokeDashoffset={-starts[i]} />;
          })}
        </g>
        <text x="90" y="86" textAnchor="middle" className="fill-current text-muted" fontSize="11">ค่าคอมรวม</text>
        <text x="90" y="104" textAnchor="middle" className="fill-current" fontSize="14" fontWeight="700">{compact.format(total)}</text>
      </svg>
      <div className="grid min-w-[180px] flex-1 gap-1.5 text-[12.5px]">
        {parts.map((p, i) => (
          <div key={p.id} className="flex items-center justify-between gap-3">
            <span className="flex min-w-0 items-center gap-2"><span className="inline-block size-2.5 shrink-0 rounded-full" style={{ background: PALETTE[i % PALETTE.length] }} /><span className="truncate">{p.name}</span></span>
            <span className="tabular-nums">{baht(p.v)} <span className="text-[11px] text-muted">{((p.v / total) * 100).toFixed(0)}%</span></span>
          </div>
        ))}
      </div>
    </div>
  );
}
