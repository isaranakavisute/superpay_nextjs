// th-TH uses the Buddhist calendar by default: "01 ต.ค. 2569 07:43", "1 ต.ค. 2569".
const money = new Intl.NumberFormat("th-TH", {
  style: "currency",
  currency: "THB",
  minimumFractionDigits: 2,
});

const dateTime = new Intl.DateTimeFormat("th-TH", {
  timeZone: "Asia/Bangkok",
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const longDate = new Intl.DateTimeFormat("th-TH", {
  timeZone: "Asia/Bangkok",
  day: "numeric",
  month: "short",
  year: "numeric",
});

const shortDate = new Intl.DateTimeFormat("th-TH", {
  timeZone: "Asia/Bangkok",
  day: "numeric",
  month: "short",
});

const toDate = (v: string | number | Date) => (v instanceof Date ? v : new Date(v));

/** Accepts numbers or the backend's decimal strings. */
export const fmtMoney = (n: number | string | null | undefined) => money.format(Number(n ?? 0));
export const fmtDateTime = (v: string | number | Date | null | undefined) => (v == null ? "—" : dateTime.format(toDate(v)));
export const fmtDate = (v: string | number | Date) => longDate.format(toDate(v));
export const fmtShortDate = (v: string | number | Date) => shortDate.format(toDate(v));

/** "เมื่อสักครู่", "5 นาทีที่แล้ว", … relative to `now`. */
export function fmtAgo(v: string | null | undefined, now: number) {
  if (!v) return "—";
  const s = Math.max(0, Math.round((now - new Date(v).getTime()) / 1000));
  if (s < 60) return "เมื่อสักครู่";
  if (s < 3600) return `${Math.floor(s / 60)} นาทีที่แล้ว`;
  if (s < 86400) return `${Math.floor(s / 3600)} ชั่วโมงที่แล้ว`;
  return `${Math.floor(s / 86400)} วันที่แล้ว`;
}

export const initials = (name: string) =>
  name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w.charAt(0))
    .join("")
    .toUpperCase();
