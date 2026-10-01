"use client";

import { useState } from "react";
import { fmtMoney, fmtShortDate } from "@/lib/format";
import { Card, CardHead } from "../ui";

export type TrendDay = { day: string; amount: number; count: number };

const SPANS = [7, 14, 30] as const;
const W = 800;
const H = 240;
const PAD = { top: 16, right: 16, bottom: 28, left: 64 };

/** Round up to a "nice" axis maximum (1, 2, 2.5, 5 × 10ⁿ). */
function niceMax(v: number) {
  if (v <= 0) return 1000;
  const p = 10 ** Math.floor(Math.log10(v));
  return ([1, 2, 2.5, 5, 10].find((m) => m * p >= v) ?? 10) * p;
}

const compact = new Intl.NumberFormat("th-TH", { notation: "compact", maximumFractionDigits: 1 });
const dayDate = (key: string) => new Date(`${key}T00:00:00+07:00`);

/** `trend` is the last 30 Bangkok days, oldest first; the span toggle slices it. */
export function TrendChart({ trend }: { trend: TrendDay[] }) {
  const [span, setSpan] = useState<(typeof SPANS)[number]>(7);
  const [hover, setHover] = useState<number | null>(null);

  const days = trend.slice(-span);
  const max = niceMax(Math.max(0, ...days.map((d) => d.amount)));
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const x = (i: number) => PAD.left + (days.length <= 1 ? innerW / 2 : (i / (days.length - 1)) * innerW);
  const y = (v: number) => PAD.top + innerH - (v / max) * innerH;

  const line = days.map((d, i) => `${i ? "L" : "M"}${x(i)},${y(d.amount)}`).join(" ");
  const area = `${line} L${x(days.length - 1)},${PAD.top + innerH} L${x(0)},${PAD.top + innerH} Z`;
  const total = days.reduce((a, d) => a + d.amount, 0);
  const labelEvery = Math.ceil(days.length / 8);
  const h = hover != null ? days[hover] : null;

  return (
    <Card>
      <CardHead title="แนวโน้มยอดชำระ">
        <div className="flex items-center gap-3">
          <span className="text-[12.5px] text-muted">
            รวม <strong className="text-ink">{fmtMoney(total)}</strong>
          </span>
          <div className="inline-flex rounded-lg bg-surface-alt p-0.5 ring-1 ring-line">
            {SPANS.map((s) => (
              <button
                key={s}
                onClick={() => setSpan(s)}
                className={`rounded-md px-2.5 py-1 text-xs font-medium ${span === s ? "bg-surface text-primary shadow-sm" : "text-muted hover:text-ink"}`}
              >
                {s} วัน
              </button>
            ))}
          </div>
        </div>
      </CardHead>
      <div className="relative px-3 pt-3 pb-2">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" onMouseLeave={() => setHover(null)}>
          <defs>
            <linearGradient id="trendFill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.28" />
              <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="trendStroke" x1="0" x2="1">
              <stop offset="0%" stopColor="var(--color-primary)" />
              <stop offset="100%" stopColor="var(--color-accent)" />
            </linearGradient>
          </defs>

          {[0, 0.25, 0.5, 0.75, 1].map((t) => (
            <g key={t}>
              <line x1={PAD.left} x2={W - PAD.right} y1={y(max * t)} y2={y(max * t)} stroke="var(--color-line)" strokeDasharray={t ? "4 4" : undefined} />
              <text x={PAD.left - 10} y={y(max * t) + 4} textAnchor="end" fontSize="11" fill="var(--color-soft)">
                {compact.format(max * t)}
              </text>
            </g>
          ))}

          <path d={area} fill="url(#trendFill)" />
          <path d={line} fill="none" stroke="url(#trendStroke)" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />

          {days.map((d, i) => (
            <g key={d.day}>
              {i % labelEvery === 0 && (
                <text x={x(i)} y={H - 8} textAnchor="middle" fontSize="11" fill="var(--color-soft)">
                  {fmtShortDate(dayDate(d.day))}
                </text>
              )}
              <rect
                x={x(i) - innerW / days.length / 2}
                y={PAD.top}
                width={innerW / days.length}
                height={innerH}
                fill="transparent"
                onMouseEnter={() => setHover(i)}
              />
            </g>
          ))}

          {h && hover != null && (
            <g pointerEvents="none">
              <line x1={x(hover)} x2={x(hover)} y1={PAD.top} y2={PAD.top + innerH} stroke="var(--color-primary)" strokeOpacity="0.3" />
              <circle cx={x(hover)} cy={y(h.amount)} r="5" fill="var(--color-surface)" stroke="var(--color-primary)" strokeWidth="2.5" />
            </g>
          )}
        </svg>

        {h && hover != null && (
          <div
            className="pointer-events-none absolute top-2 rounded-lg border border-line bg-surface px-3 py-2 text-xs shadow-card"
            style={{ left: `${(x(hover) / W) * 100}%`, transform: `translateX(${hover > days.length / 2 ? "-105%" : "5%"})` }}
          >
            <div className="text-muted">{fmtShortDate(dayDate(h.day))}</div>
            <div className="font-semibold text-ink">{fmtMoney(h.amount)}</div>
            <div className="text-muted">{h.count} รายการ</div>
          </div>
        )}
      </div>
    </Card>
  );
}
