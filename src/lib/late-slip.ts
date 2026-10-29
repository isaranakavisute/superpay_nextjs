// Rule "แนบสลิปหลังยกเลิกอัตโนมัติ" (28 Oct 2026) — the same test as the backend's lateSlipAllowed (merchant-api/v1.service.js):
// an order the SYSTEM cancelled only because no payment came in time (midnight rule / 23:00 duplicate rule) still takes a
// slip for 24 h after it was created; the slip is checked as usual and approved only when everything passes.

const LATE_SLIP_HOURS = 24;
const REASONS = [/^ยกเลิกเนื่องจากยังไม่ได้ดำเนินการภายในเที่ยงคืน/, /^ซ้ำกับ TXN\d+ ที่ชำระแล้ว — ไม่มีเงินโอนใหม่สำหรับออเดอร์นี้ภายใน 23:00/];

type Row = { status: string; reviewedBy: string | null; reviewNote: string | null; createdAt: string; refundedAmount?: string | number | null };

/** Until when a slip can still be attached to this cancelled order (null = not under the rule, or the 24 h are over). */
export function lateSlipUntil(p: Row, now: number): Date | null {
  if (p.status !== "rejected" || p.reviewedBy !== "system" || Number(p.refundedAmount ?? 0) > 0) return null;
  if (!REASONS.some((r) => r.test(p.reviewNote ?? ""))) return null;
  const until = new Date(p.createdAt).getTime() + LATE_SLIP_HOURS * 3_600_000;
  return until > now ? new Date(until) : null;
}
