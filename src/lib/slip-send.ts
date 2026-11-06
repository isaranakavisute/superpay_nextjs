import type { ActionResult } from "@/lib/api";

/** Browser side: send the picked file; never throws — any failure comes back as a Thai message. */
/** (lib/slip-upload.ts is the server side.) */
export async function sendSlip(url: string, file: File): Promise<ActionResult> {
  try {
    const res = await fetch(url, { method: "POST", headers: { "content-type": file.type }, body: file });
    const j = (await res.json().catch(() => null)) as ActionResult | null;
    if (j && typeof j === "object" && "ok" in j) return j;
    return { ok: false, error: `แนบสลิปไม่สำเร็จ — ระบบตอบกลับไม่ถูกต้อง (HTTP ${res.status}) ลองใหม่อีกครั้ง` };
  } catch {
    return { ok: false, error: "แนบสลิปไม่สำเร็จ — เชื่อมต่อระบบไม่ได้ ตรวจอินเทอร์เน็ตแล้วลองใหม่อีกครั้ง" };
  }
}
