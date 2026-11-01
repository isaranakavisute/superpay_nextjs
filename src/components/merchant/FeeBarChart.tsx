"use client";

import { useState } from "react";
import { fmtMoney, fmtShortDate } from "@/lib/format";
import type { FeeTrendDay } from "@/lib/api";
import { Card, CardHead } from "../ui";

const W = 1200;
const H = 220;
const PAD = { top: 22, right: 12, bottom: 30, left: 70 };

/** Round up to a "nice" axis maximum (1, 2, 2.5, 5 × 10ⁿ). */
function niceMax(v: number) {
  if (v <= 0) return 1000;
  const p = 10 ** Math.floor(Math.log10(v));
  return ([1, 2, 2.5, 5, 10].find((m) => m * p >= v) ?? 10) * p;
}
const compact = new Intl.NumberFormat("th-TH", { notation: "compact", maximumFractionDigits: 1 });
// the value written at each point: the full amount, not "66.1K" (user, 2 Nov 2026)
const full = (v: number) => v.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const dayDate = (key: string) => new Date(`${key}T00:00:00+07:00`);

/**
 * "ทุกร้านค้า": total fees (in + out, every shop) per day for the last 7 days — one series, one hue (brand gold),
 * so no legend. A line (2 Nov 2026, was bars) with a marker per day and the full amount beside it; hover a day for the
 * crosshair + in/out tooltip; values in text ink, not the line colour.
 */
export function FeeBarChart({ days }: { days: FeeTrendDay[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const rows = days.map((d) => ({ day: d.day, total: Number(d.total), feeIn: Number(d.feeIn), feeOut: Number(d.feeOut) }));
  const max = niceMax(Math.max(0, ...rows.map((r) => r.total)));
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const slot = innerW / Math.max(1, rows.length);
  const y = (v: number) => PAD.top + innerH - (v / max) * innerH;
  const cx = (i: number) => PAD.left + slot * i + slot / 2;
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
          {hover != null && <line x1={cx(hover)} x2={cx(hover)} y1={PAD.top} y2={PAD.top + innerH} stroke="var(--color-muted)" strokeWidth={1} strokeDasharray="3 3" />}
          <polyline points={rows.map((r, i) => `${cx(i)},${y(r.total)}`).join(" ")} fill="none" stroke="var(--color-primary)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
          {rows.map((r, i) => {
            const py = y(r.total);
            // the amount above its point; below it when the point is near the top of the chart
            const ly = py - 12 < PAD.top + 4 ? py + 20 : py - 12;
            return (
              <g key={r.day} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
                <rect x={PAD.left + slot * i} y={PAD.top} width={slot} height={innerH + PAD.bottom} fill="transparent" />
                <circle cx={cx(i)} cy={py} r={hover === i ? 6 : 4.5} fill="var(--color-primary)" stroke="var(--color-surface)" strokeWidth={2} />
                <text x={cx(i)} y={ly} textAnchor="middle" fontSize={12.5} fontWeight={600} fill="var(--color-ink)" className="tabular-nums">{full(r.total)}</text>
                <text x={cx(i)} y={H - 10} textAnchor="middle" fontSize={12} fill="var(--color-muted)">{fmtShortDate(dayDate(r.day).toISOString())}</text>
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
