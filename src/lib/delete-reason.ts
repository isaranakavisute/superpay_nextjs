/**
 * Soft delete (18 Oct 2026): every "ลบ" in the console needs a reason. The row is kept, hidden from the lists and
 * shown on รายการที่ลบแล้ว (/deleted), where Super Admin can restore it.
 */
export const REASON_MIN = 3;
export const REASON_MAX = 300;

/** Error text for a bad reason, or null when it is fine. */
export function reasonError(reason: unknown): string | null {
  const r = typeof reason === "string" ? reason.trim() : "";
  if (r.length < REASON_MIN) return `กรุณาระบุเหตุผลที่ลบ (อย่างน้อย ${REASON_MIN} ตัวอักษร)`;
  if (r.length > REASON_MAX) return `เหตุผลยาวเกิน ${REASON_MAX} ตัวอักษร`;
  return null;
}

/** Browser prompt for places that used confirm(): the reason, or null if cancelled. Re-asks until it is valid. */
export function askDeleteReason(what: string): string | null {
  let hint = "";
  for (;;) {
    const r = window.prompt(`${hint}ลบ ${what}\n\nระบุเหตุผลที่ลบ (จำเป็น) — ข้อมูลจะยังเก็บไว้ในระบบ ดู/กู้คืนได้ที่ "รายการที่ลบแล้ว"`);
    if (r === null) return null;
    const err = reasonError(r);
    if (!err) return r.trim();
    hint = `⚠️ ${err}\n\n`;
  }
}

export const DELETE_NOTE = "ข้อมูลจะยังเก็บไว้ในระบบ (ไม่ถูกลบถาวร) — ดูและกู้คืนได้ที่หน้า \"รายการที่ลบแล้ว\"";
