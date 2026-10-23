// Shared by the server-rendered payments page and the client dialog (Relation.tsx): which สถานะ notes get a
// "ดูความเกี่ยวข้อง" link. Not a "use client" module — the page calls relationLink() while rendering on the server.

export const REUSED_NOTE = "สลิปนี้ถูกใช้กับรายการอื่นแล้ว — ใช้ซ้ำไม่ได้";

/** Which link (if any) a payments row gets, from its note. */
export function relationLink(p: { ref: string; reviewedBy?: string | null; reviewNote?: string | null; slipReusedRef?: string | null }) {
  const note = p.reviewNote ?? "";
  const dup = /^ซ้ำกับ (TXN\d+) ที่ชำระแล้ว/.exec(note);
  if (dup && p.reviewedBy === "system") return `ดูความเกี่ยวข้องกับ ${dup[1]}`;
  if (note.includes(REUSED_NOTE)) {
    const other = /^TXN\d+$/.test(p.slipReusedRef ?? "") ? p.slipReusedRef : null;
    return other === p.ref ? "ดูรายละเอียด (ส่งสลิปซ้ำ)" : other ? `เทียบกับ ${other} ที่ใช้สลิปนี้แล้ว` : null;
  }
  const carry = /(?:ใช้ชำระ|ชำระผ่าน) (TXN\d+)/.exec(note);
  return carry ? `เทียบกับ ${carry[1]} ที่ใช้เงินโอนนี้` : null;
}
