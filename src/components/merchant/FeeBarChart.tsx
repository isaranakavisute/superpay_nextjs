"use client";

import { useState } from "react";
import { fmtMoney, fmtShortDate } from "@/lib/format";
import type { FeeTrendDay } from "@/lib/api";
import { Card, CardHead } from "../ui";

const W = 1200;
const H = 220;
const PAD = { top: 22, right: 12, bottom: 30, left: 70 };
const GAP = 2;

/** Round up to a "nice" axis maximum (1, 2, 2.5, 5 × 10ⁿ). */
function niceMax(v: number) {
  if (v <= 0) return 1000;
  const p = 10 ** Math.floor(Math.log10(v));
  return ([1, 2, 2.5, 5, 10].find((m) => m * p >= v) ?? 10) * p;
}
const compact = new Intl.NumberFormat("th-TH", { notation: "compact", maximumFractionDigits: 1 });
const dayDate = (key: string) => new Date(`${key}T00:00:00+07:00`);

/**
 * "ทุกร้านค้า": total fees (in + out, every shop) per day for the last 7 days — one series, one hue (brand gold),
 * so no legend; per-bar hover tooltip; values in text ink, not the bar colour.
 */
export function FeeBarChart({ days }: { days: FeeTrendDay[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const rows = days.map((d) => ({ day: d.day, total: Number(d.total), feeIn: Number(d.feeIn), feeOut: Number(d.feeOut) }));
  const max = niceMax(Math.max(0, ...rows.map((r) => r.total)));
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const slot = innerW / Math.max(1, rows.length);
  const barW = Math.min(96, slot * 0.62);
  const y = (v: number) => PAD.top + innerH - (v / max) * innerH;
  const sum = rows.reduce((a, r) => a + r.total, 0);
  const h = hover != null ? rows[hover] : null;
  return (
    <Card className="mb-5">
      <CardHead title="ค่าธรรมเนียมรวมทุกร้าน (เข้า + ออก) — 7 วันล่าสุด">
        <span className="text-[12.5px] text-muted">รวม 7 วัน <strong className="text-ink tabular-nums">{fmtMoney(sum)}</strong></span>
      </CardHead>
      <div className="relative px-4 pt-2 pb-3">
        <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" role="img"
          aria-label={`ค่าธรรมเนียมรวมต่อวัน: ${rows.map((r) => `${r.day} ${fmtMoney(r.total)}`).join(", ")}`}>
          {[0, 0.25, 0.5, 0.75, 1].map((f) => (
            <g key={f}>
              <line x1={PAD.left} x2={W - PAD.right} y1={y(max * f)} y2={y(max * f)} stroke="var(--color-line)" strokeWidth={1} strokeDasharray={f ? "3 4" : undefined} />
              <text x={PAD.left - 10} y={y(max * f) + 4} textAnchor="end" fontSize={12} fill="var(--color-muted)">{compact.format(max * f)}</text>
            </g>
          ))}
          {rows.map((r, i) => {
            const cx = PAD.left + slot * i + slot / 2;
            const top = y(r.total);
            const bh = Math.max(0, PAD.top + innerH - top);
            const rr = Math.min(4, bh / 2);
            const x0 = cx - barW / 2 + GAP / 2;
            const w = barW - GAP;
            const base = PAD.top + innerH;
            // Rounded data end (top), square baseline.
            const path = bh > 0 ? `M${x0},${base} L${x0},${top + rr} Q${x0},${top} ${x0 + rr},${top} L${x0 + w - rr},${top} Q${x0 + w},${top} ${x0 + w},${top + rr} L${x0 + w},${base} Z` : "";
            return (
              <g key={r.day} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
                <rect x={PAD.left + slot * i} y={PAD.top} width={slot} height={innerH} fill="transparent" />
                {path && <path d={path} fill="var(--color-primary)" opacity={hover == null || hover === i ? 1 : 0.55} />}
                <text x={cx} y={Math.max(PAD.top + 10, top - 6)} textAnchor="middle" fontSize={12} fontWeight={600} fill="var(--color-ink)">{r.total ? compact.format(r.total) : "0"}</text>
                <text x={cx} y={H - 10} textAnchor="middle" fontSize={12} fill="var(--color-muted)">{fmtShortDate(dayDate(r.day).toISOString())}</text>
              </g>
            );
          })}
        </svg>
        {h && (
          <div className="pointer-events-none absolute top-2 right-4 rounded-lg border border-line bg-surface px-3 py-2 text-[12px] shadow-lg">
            <div className="font-semibold">{fmtShortDate(dayDate(h.day).toISOString())}</div>
            <div className="tabular-nums">รวม <strong>{fmtMoney(h.total)}</strong></div>
            <div className="text-muted tabular-nums">เข้า {fmtMoney(h.feeIn)} · ออก {fmtMoney(h.feeOut)}</div>
          </div>
        )}
      </div>
    </Card>
  );
}
