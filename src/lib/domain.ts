// Shared domain types and lookups. Data itself comes from the backend (src/lib/api.ts).

export type PaymentStatus = "pending" | "approved" | "rejected" | "refunded" | "expired";
export type OutflowStatus = "pending" | "approved" | "rejected";
export type OutflowCategory = "withdraw" | "settlement" | "expense" | "refund";

export type Bank = { code: string; short: string; name: string; bg: string; fg: string };

// Bank chips: short code on the bank's colour. Names also come back from the API.
export const BANKS: Bank[] = [
  { code: "BBL", short: "BBL", name: "ธนาคารกรุงเทพ", bg: "#1e4291", fg: "#ffffff" },
  { code: "KBANK", short: "KBK", name: "ธนาคารกสิกรไทย", bg: "#138f2d", fg: "#ffffff" },
  { code: "KTB", short: "KTB", name: "ธนาคารกรุงไทย", bg: "#1ba5e1", fg: "#ffffff" },
  { code: "SCB", short: "SCB", name: "ธนาคารไทยพาณิชย์", bg: "#4e2a84", fg: "#ffffff" },
  { code: "BAY", short: "BAY", name: "ธนาคารกรุงศรีอยุธยา", bg: "#fec43b", fg: "#1f2937" },
  { code: "TTB", short: "TTB", name: "ธนาคารทหารไทยธนชาต", bg: "#1279be", fg: "#ffffff" },
];

export const findBank = (code: string) => BANKS.find((b) => b.code === code);

const DAY = 86_400_000;
const BKK_OFFSET = 7 * 3_600_000;

/** Midnight (Bangkok) of the day containing `ts`, as a UTC epoch. */
export function bkkDayStart(ts: number) {
  return Math.floor((ts + BKK_OFFSET) / DAY) * DAY - BKK_OFFSET;
}
