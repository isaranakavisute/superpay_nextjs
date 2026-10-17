"use server";

import { revalidatePath } from "next/cache";
import { consoleWrite, type ActionResult } from "@/lib/api";
import { getSessionUser } from "@/lib/session";

/** Give a left-over more time (hours from now, or from its current deadline if later). */
export async function extendLeftover(rawId: number | string, hours: number): Promise<ActionResult> {
  const id = Number(rawId);
  if (!Number.isInteger(id) || id <= 0 || !Number.isInteger(hours) || hours < 1 || hours > 168) return { ok: false, error: "ข้อมูลไม่ถูกต้อง" };
  const me = await getSessionUser();
  if (!me) return { ok: false, error: "กรุณาเข้าสู่ระบบใหม่" };
  const r = await consoleWrite("POST", `/api/console/transfer-leftovers/${id}/extend`, me.username, { hours });
  if (r.ok) revalidatePath("/transfer-leftovers");
  return r;
}
