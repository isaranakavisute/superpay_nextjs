/**
 * What an admin must know before approving a payment: order vs slip. Every approval is confirmed; a mismatch
 * (no slip, slip amount ≠ order amount, slip refused by the check) is shown in red and needs an explicit tick.
 */
export type ApprovalInput = {
  ref: string; amount: string; customerName?: string | null; status?: string;
  hasSlipImage?: boolean; slipAmount?: string | null; slipDecision?: string | null; reviewNote?: string | null;
  /** What is left of the slip's bank transfer, and the other orders it already paid (set once it paid one). */
  slipTransferLeft?: string | null; slipTransferUsedBy?: string | null;
  /** The most this customer has left on earlier transfers at this shop (pays a short slip's difference). */
  customerLeftover?: string | null;
};

const baht = (v: string | number) => `฿${Number(v).toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function approvalWarnings(p: ApprovalInput): string[] {
  const w: string[] = [];
  if (!p.hasSlipImage) w.push("รายการนี้ยังไม่มีสลิป — ตรวจยอดเงินเข้าในบัญชีธนาคารก่อนอนุมัติ");
  const usedElsewhere = !!p.slipTransferUsedBy;
  if (usedElsewhere) {
    const left = Number(p.slipTransferLeft ?? 0);
    w.push(left + 0.005 >= Number(p.amount)
      ? `เงินโอนในสลิปนี้ใช้ชำระ ${p.slipTransferUsedBy} ไปแล้ว — คงเหลือ ${baht(left)} พอสำหรับออเดอร์นี้`
      : `เงินโอนในสลิปนี้ใช้ชำระ ${p.slipTransferUsedBy} ไปแล้ว — คงเหลือเพียง ${baht(left)} ถ้าอนุมัติ ${baht(p.amount)} จะนับเงินซ้ำ`);
  } else if (p.slipAmount != null && p.slipAmount !== "" && Math.round(Number(p.slipAmount) * 100) !== Math.round(Number(p.amount) * 100)) {
    const over = Number(p.slipAmount) - Number(p.amount);
    w.push(over > 0
      ? `ยอดในสลิป ${baht(p.slipAmount)} มากกว่ายอดออเดอร์ ${baht(p.amount)} — ถ้าอนุมัติ ออเดอร์นี้ได้เครดิต ${baht(p.amount)} และส่วนต่าง ${baht(over)} เป็นยอดคงเหลือ: ร้านสร้างออเดอร์ใหม่ยอดไม่เกิน ${baht(over)} ของลูกค้าคนนี้ แล้วส่งสลิปเดิม ระบบอนุมัติให้อัตโนมัติภายใน 24 ชม. หลังเวลาโอน`
      : Number(p.customerLeftover ?? 0) + 0.005 >= -over
        ? `ยอดในสลิป ${baht(p.slipAmount)} น้อยกว่ายอดออเดอร์ ${baht(p.amount)} — ส่วนที่ขาด ${baht(-over)} จะหักจากยอดคงเหลือของลูกค้าคนนี้ (มี ${baht(p.customerLeftover ?? 0)}) รวมครบ ${baht(p.amount)}`
        : `ยอดในสลิป ${baht(p.slipAmount)} น้อยกว่ายอดออเดอร์ ${baht(p.amount)} — ถ้าอนุมัติ ลูกค้าจะได้รับเครดิต ${baht(p.amount)} มากกว่าเงินที่โอนจริง ควรแก้ยอดให้ตรงก่อน`);
  }
  if (p.slipDecision === "invalid") w.push(`ระบบตรวจสลิปไม่ผ่าน: ${p.reviewNote ?? "สลิปไม่ถูกต้อง"}`);
  if (p.status === "expired") w.push("ออเดอร์นี้หมดอายุแล้ว — ตรวจให้แน่ใจว่าลูกค้าไม่ได้ชำระผ่านออเดอร์อื่นไปแล้ว");
  return w;
}

export { baht as fmtBaht };
