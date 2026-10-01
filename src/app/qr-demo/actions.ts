"use server";

import { consoleWrite, type ActionResult } from "@/lib/api";
import { getSessionUser } from "@/lib/session";

/** Verify a slip with the configured provider and find the pending order it matches (report only). */
export async function checkSlip(file: { mime: string; data: string }, bankAccountId?: number): Promise<ActionResult> {
  const me = await getSessionUser();
  if (!me) return { ok: false, error: "กรุณาเข้าสู่ระบบใหม่" };
  if (!["image/png", "image/jpeg", "image/webp"].includes(file.mime)) return { ok: false, error: "ไฟล์ต้องเป็น PNG / JPG / WEBP" };
  return consoleWrite("POST", "/api/console/config/slip/demo-verify", me.username, { image: file.data, mime: file.mime, bankAccountId });
}
