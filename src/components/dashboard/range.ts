import { bkkDayStart } from "@/lib/domain";
import { fmtDate } from "@/lib/format";

export type RangeMode = "today" | "yesterday" | "7d" | "month" | "all" | "custom";
export type RangeSel = { mode: RangeMode; from: string; to: string };

/** Tabs, in the original's order; "custom" is the from–to inputs beside them. */
export const RANGE_OPTIONS: { mode: Exclude<RangeMode, "custom">; label: string }[] = [
  { mode: "today", label: "วันนี้" },
  { mode: "yesterday", label: "เมื่อวาน" },
  { mode: "7d", label: "7 วัน" },
  { mode: "month", label: "เดือนนี้" },
  { mode: "all", label: "ทั้งหมด" },
];

const DAY = 86_400_000;
const BKK_OFFSET = 7 * 3_600_000;

/** "YYYY-MM-DD" of a Bangkok-midnight epoch. */
export const toDayKey = (dayStart: number) => new Date(dayStart + BKK_OFFSET).toISOString().slice(0, 10);
const fromDayKey = (key: string) => Date.parse(`${key}T00:00:00+07:00`);

export type ResolvedRange = { from: number; to: number; label: string; isAll: boolean };

/** Turns a selection into a half-open [from, to) window plus its label, e.g. "วันนี้ (1 ต.ค. 2569)". */
export function resolveRange(sel: RangeSel, today: number): ResolvedRange {
  const span = (from: number, to: number, name: string) => {
    const last = to - DAY;
    const dates = from === last ? fmtDate(from) : `${fmtDate(from)} – ${fmtDate(last)}`;
    return { from, to, label: name ? `${name} (${dates})` : dates, isAll: false };
  };
  switch (sel.mode) {
    case "today":
      return span(today, today + DAY, "วันนี้");
    case "yesterday":
      return span(today - DAY, today, "เมื่อวาน");
    case "7d":
      return span(today - 6 * DAY, today + DAY, "7 วันล่าสุด");
    case "month": {
      const key = toDayKey(today);
      return span(fromDayKey(`${key.slice(0, 8)}01`), today + DAY, "เดือนนี้");
    }
    case "all":
      return { from: -Infinity, to: Infinity, label: "ทั้งหมด", isAll: true };
    case "custom": {
      const a = bkkDayStart(fromDayKey(sel.from));
      const b = bkkDayStart(fromDayKey(sel.to));
      const [lo, hi] = a <= b ? [a, b] : [b, a];
      return span(lo, hi + DAY, "");
    }
  }
}

const DAY_KEY = /^\d{4}-\d{2}-\d{2}$/;
const MODES = new Set<string>([...RANGE_OPTIONS.map((o) => o.mode), "custom"]);

/** Reads ?range=&from=&to= into a selection; anything malformed falls back to `fallback`. */
export function rangeFromParams(
  params: Record<string, string | string[] | undefined>,
  today: number,
  fallback: RangeMode = "today",
): RangeSel {
  const one = (k: string) => (typeof params[k] === "string" ? (params[k] as string) : undefined);
  const todayKey = toDayKey(today);
  const from = DAY_KEY.test(one("from") ?? "") ? one("from")! : todayKey;
  const to = DAY_KEY.test(one("to") ?? "") ? one("to")! : from;
  const raw = one("range") ?? "";
  let mode: RangeMode = fallback;
  if (MODES.has(raw)) mode = raw as RangeMode;
  // An explicit from/to without a range means a picked span.
  else if (one("from")) mode = "custom";
  return { mode, from, to };
}

/** The search params a selection writes (merged into the page's other params by the caller). */
export function rangeParams(sel: RangeSel): Record<string, string | null> {
  return sel.mode === "custom"
    ? { range: "custom", from: sel.from, to: sel.to }
    : { range: sel.mode, from: null, to: null };
}

/** Window as backend query values; nulls mean unbounded. */
export function rangeWindow(r: ResolvedRange) {
  return r.isAll ? { from: null, to: null } : { from: new Date(r.from).toISOString(), to: new Date(r.to).toISOString() };
}
