// Audit filters shared by the page and its CSV route.
export const FAMILIES = [
  { value: "", label: "ทุกประเภท" },
  { value: "auth", label: "การเข้าสู่ระบบ" },
  { value: "user", label: "ผู้ใช้" },
  { value: "payment", label: "รายการชำระเงิน" },
  { value: "outflow", label: "เงินออก" },
  { value: "withdrawal", label: "ถอนเงิน" },
  { value: "merchant", label: "ร้านค้า" },
  { value: "role", label: "สิทธิ์" },
  { value: "device", label: "อุปกรณ์ Forwarder" },
];

export const RANGES = [
  { value: "", label: "ทุกช่วงเวลา" },
  { value: "today", label: "วันนี้" },
  { value: "yesterday", label: "เมื่อวาน" },
  { value: "7d", label: "7 วันล่าสุด" },
  { value: "30d", label: "30 วันล่าสุด" },
  { value: "month", label: "เดือนนี้" },
  { value: "custom", label: "กำหนดเอง" },
];

const DAY = 86_400_000;
const BKK = 7 * 3_600_000;
const dayStart = (ts: number) => Math.floor((ts + BKK) / DAY) * DAY - BKK;

/** [from, to) for an audit range selection, as ISO strings (undefined = unbounded). */
export function auditWindow(range: string | undefined, from: string | undefined, to: string | undefined, now: number) {
  const today = dayStart(now);
  const iso = (n: number) => new Date(n).toISOString();
  switch (range) {
    case "today": return { from: iso(today), to: iso(today + DAY) };
    case "yesterday": return { from: iso(today - DAY), to: iso(today) };
    case "7d": return { from: iso(today - 6 * DAY), to: iso(today + DAY) };
    case "30d": return { from: iso(today - 29 * DAY), to: iso(today + DAY) };
    case "month": {
      const d = new Date(today + BKK);
      return { from: iso(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1) - BKK), to: iso(today + DAY) };
    }
    case "custom": {
      const f = from && /^\d{4}-\d{2}-\d{2}$/.test(from) ? Date.parse(`${from}T00:00:00+07:00`) : undefined;
      const t = to && /^\d{4}-\d{2}-\d{2}$/.test(to) ? Date.parse(`${to}T00:00:00+07:00`) + DAY : undefined;
      return { from: f ? iso(f) : undefined, to: t ? iso(t) : undefined };
    }
    default: return { from: undefined, to: undefined };
  }
}
