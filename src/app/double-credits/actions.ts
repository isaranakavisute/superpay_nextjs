"use server";

import { revalidatePath } from "next/cache";
import { consoleWrite, type ActionResult } from "@/lib/api";
import { getSessionUser } from "@/lib/session";

async function as(fn: (actor: string) => Promise<ActionResult>): Promise<ActionResult> {
  const me = await getSessionUser();
  if (!me) return { ok: false, error: "กรุณาเข้าสู่ระบบใหม่" };
  const r = await fn(me.username);
  if (r.ok) for (const p of ["/double-credits", "/payments", "/merchants"]) revalidatePath(p);
  return r;
}

const valid = (ids: number[]) => ids.length > 0 && ids.every((n) => Number.isInteger(n) && n > 0);

/** ดึงเงินคืน / ไม่ใช่ซ้ำ for one or many cases (bulk is all-or-nothing on the backend). */
export async function resolveCases(action: "clawback" | "dismiss", rawIds: (number | string)[]) {
  // bigint ids arrive from the backend as strings.
  const ids = rawIds.map(Number);
  if (!valid(ids)) return { ok: false, error: "เลือกรายการไม่ถูกต้อง" } as ActionResult;
  if (ids.length === 1) return as((actor) => consoleWrite("POST", `/api/console/double-credits/${ids[0]}/${action}`, actor, {}));
  return as((actor) => consoleWrite("POST", "/api/console/double-credits/bulk", actor, { action, ids }));
}
