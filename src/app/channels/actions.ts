"use server";

import { revalidatePath } from "next/cache";
import { consoleWrite, type ActionResult } from "@/lib/api";
import { getSessionUser } from "@/lib/session";

const TYPES = new Set(["telegram", "line", "facebook", "email", "sms"]);

async function as(fn: (actor: string) => Promise<ActionResult>): Promise<ActionResult> {
  const me = await getSessionUser();
  if (!me) return { ok: false, error: "กรุณาเข้าสู่ระบบใหม่" };
  const r = await fn(me.username);
  if (r.ok) revalidatePath("/channels");
  return r;
}

export async function createChannel(type: string, name: string) {
  if (!TYPES.has(type) || !name.trim()) return { ok: false, error: "ข้อมูลไม่ครบ" } as ActionResult;
  return as((actor) => consoleWrite("POST", "/api/console/channels", actor, { type, name }));
}

export async function saveChannel(
  id: number,
  body: { name: string; enabled: boolean; config: Record<string, string | boolean>; secrets: Record<string, string>; accountIds: number[]; endpointIds: number[] },
) {
  if (!Number.isInteger(id) || id <= 0 || !body.name.trim()) return { ok: false, error: "ข้อมูลไม่ครบ" } as ActionResult;
  return as((actor) => consoleWrite("POST", `/api/console/channels/${id}/update`, actor, body));
}

export async function deleteChannel(id: number) {
  if (!Number.isInteger(id) || id <= 0) return { ok: false, error: "ช่องทางไม่ถูกต้อง" } as ActionResult;
  return as((actor) => consoleWrite("DELETE", `/api/console/channels/${id}`, actor));
}
