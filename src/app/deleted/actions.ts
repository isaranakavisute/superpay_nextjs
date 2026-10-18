"use server";

import { revalidatePath } from "next/cache";
import { consoleWrite, type ActionResult } from "@/lib/api";
import { getSessionUser } from "@/lib/session";

const TYPES = ["payment", "outflow", "merchant", "account", "channel", "device", "alert", "announcement", "faq", "asset"];

/** Super Admin: bring a soft-deleted row back (the backend refuses everyone else). */
export async function restoreDeleted(type: string, key: string): Promise<ActionResult> {
  if (!TYPES.includes(type) || !/^[A-Za-z0-9_-]{1,100}$/.test(key)) return { ok: false, error: "รายการไม่ถูกต้อง" };
  const me = await getSessionUser();
  if (!me) return { ok: false, error: "กรุณาเข้าสู่ระบบใหม่" };
  const r = await consoleWrite("POST", `/api/console/deleted/${type}/${encodeURIComponent(key)}/restore`, me.username, {});
  if (r.ok) revalidatePath("/deleted");
  if (!r.ok && /forbidden|super admin|403/i.test(r.error)) return { ok: false, error: "กู้คืนได้เฉพาะ Super Admin" };
  return r;
}
