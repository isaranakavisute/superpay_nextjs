"use server";

import { revalidatePath } from "next/cache";
import { consoleWrite, type ActionResult } from "@/lib/api";
import { getSessionUser } from "@/lib/session";

export type BotInput = { id?: number; name: string; enabled: boolean; botChannelId: number | null; botToken?: string; chatIds: string; events: string[] };

async function as(fn: (actor: string) => Promise<ActionResult>) {
  const me = await getSessionUser();
  if (!me) return { ok: false, error: "กรุณาเข้าสู่ระบบใหม่" } as ActionResult;
  const r = await fn(me.username);
  if (r.ok) revalidatePath("/alerts");
  return r;
}

export async function saveAlerts(bots: BotInput[], deleted: number[], thresholds: { repeatMinutes: number; slipFailCount: number; slipDownMinutes: number }) {
  if (bots.some((b) => !b.name.trim())) return { ok: false, error: "ทุก bot ต้องมีชื่อ" } as ActionResult;
  return as((actor) => consoleWrite("POST", "/api/console/alert-bots", actor, { bots, deleted, thresholds }));
}

export async function testBot(id: number) {
  if (!Number.isInteger(id) || id <= 0) return { ok: false, error: "บันทึก bot ก่อนทดสอบ" } as ActionResult;
  return as((actor) => consoleWrite("POST", `/api/console/alert-bots/${id}/test`, actor, {}));
}
