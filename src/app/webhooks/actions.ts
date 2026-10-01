"use server";

import { revalidatePath } from "next/cache";
import { consoleWrite, type ActionResult } from "@/lib/api";
import { getSessionUser } from "@/lib/session";

/** Re-send one or many deliveries now (bigint ids arrive as strings). */
export async function retryDeliveries(rawIds: (number | string)[]): Promise<ActionResult> {
  const ids = rawIds.map(Number);
  if (ids.length === 0 || !ids.every((n) => Number.isInteger(n) && n > 0)) return { ok: false, error: "เลือกรายการไม่ถูกต้อง" };
  const me = await getSessionUser();
  if (!me) return { ok: false, error: "กรุณาเข้าสู่ระบบใหม่" };
  const r =
    ids.length === 1
      ? await consoleWrite("POST", `/api/console/webhooks/${ids[0]}/retry`, me.username, {})
      : await consoleWrite("POST", "/api/console/webhooks/bulk-retry", me.username, { ids });
  revalidatePath("/webhooks");
  return r;
}
