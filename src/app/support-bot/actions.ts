"use server";

import { revalidatePath } from "next/cache";
import { consoleWrite, type ActionResult } from "@/lib/api";
import { getSessionUser } from "@/lib/session";

export type FaqInput = { question: string; keywords: string; answer: string; enabled: boolean; sort: number };
export type BotSettings = { enabled: boolean; botToken: string; webhookSecret: string; allowedChatIds: string; minScore: number; allowPrivate: boolean; allGroups: boolean };

async function as(fn: (actor: string) => Promise<ActionResult>, refresh = true) {
  const me = await getSessionUser();
  if (!me) return { ok: false, error: "กรุณาเข้าสู่ระบบใหม่" } as ActionResult;
  const r = await fn(me.username);
  if (r.ok && refresh) revalidatePath("/support-bot");
  return r;
}

export async function saveFaq(id: number | null, b: FaqInput) {
  if (b.question.trim().length < 2) return { ok: false, error: "กรุณาใส่คำถาม" } as ActionResult;
  if (!b.answer.trim()) return { ok: false, error: "กรุณาใส่คำตอบ" } as ActionResult;
  return as((actor) => consoleWrite("POST", id ? `/api/console/support-bot/faqs/${id}` : "/api/console/support-bot/faqs", actor, b));
}
export const deleteFaq = async (id: number) => as((actor) => consoleWrite("POST", `/api/console/support-bot/faqs/${Number(id) || 0}/delete`, actor, {}));
export const testQuestion = async (text: string) => as((actor) => consoleWrite("POST", "/api/console/support-bot/test", actor, { text }), false);
export const saveSettings = async (b: BotSettings) => as((actor) => consoleWrite("POST", "/api/console/support-bot/settings", actor, b));
