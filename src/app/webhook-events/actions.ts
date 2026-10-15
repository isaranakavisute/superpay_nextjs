"use server";

import { revalidatePath } from "next/cache";
import { consoleWrite, type ActionResult } from "@/lib/api";
import { getSessionUser } from "@/lib/session";

/** Per endpoint: which events are posted to the shop, and which alert Telegram. */
export async function saveWebhookEvents(id: number, events: string[], alertEvents: string[]): Promise<ActionResult> {
  if (!Number.isInteger(id) || id <= 0) return { ok: false, error: "ปลายทางไม่ถูกต้อง" };
  const me = await getSessionUser();
  if (!me) return { ok: false, error: "กรุณาเข้าสู่ระบบใหม่" };
  const r = await consoleWrite("POST", `/api/console/webhooks/settings/${id}`, me.username, { events, alertEvents });
  if (r.ok) revalidatePath("/webhook-events");
  return r;
}

/** Gives a shop its own webhook URL; it then gets a card with every event off. */
export async function addWebhookUrl(merchantId: number, url: string): Promise<ActionResult> {
  if (!Number.isInteger(merchantId) || merchantId <= 0) return { ok: false, error: "ร้านไม่ถูกต้อง" };
  if (!/^https:\/\/\S+$/.test(url.trim())) return { ok: false, error: "URL ต้องขึ้นต้นด้วย https://" };
  const me = await getSessionUser();
  if (!me) return { ok: false, error: "กรุณาเข้าสู่ระบบใหม่" };
  const r = await consoleWrite("POST", `/api/console/merchants/${merchantId}/webhook`, me.username, { url: url.trim() });
  if (r.ok) revalidatePath("/webhook-events");
  return r;
}
