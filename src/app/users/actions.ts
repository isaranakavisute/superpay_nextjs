"use server";

import { revalidatePath } from "next/cache";
import { consoleWrite, type ActionResult } from "@/lib/api";
import { getSessionUser } from "@/lib/session";

export type UserInput = { username?: string; password?: string; fullName: string; email: string; phone: string; roleCode: string; status: "active" | "inactive" };

async function as(fn: (actor: string) => Promise<ActionResult>): Promise<ActionResult> {
  const me = await getSessionUser();
  if (!me) return { ok: false, error: "กรุณาเข้าสู่ระบบใหม่" };
  const r = await fn(me.username);
  if (r.ok) revalidatePath("/users");
  return r;
}
const okId = (id: number) => Number.isInteger(id) && id > 0;

export async function createUser(u: UserInput) {
  if (!u.username?.trim() || !u.fullName.trim() || !u.password || u.password.length < 6) return { ok: false, error: "กรอกชื่อผู้ใช้ ชื่อ และรหัสผ่านอย่างน้อย 6 ตัว" } as ActionResult;
  return as((actor) => consoleWrite("POST", "/api/console/users-admin", actor, u));
}
export async function updateUser(id: number, u: UserInput) {
  if (!okId(id) || !u.fullName.trim()) return { ok: false, error: "ข้อมูลไม่ครบ" } as ActionResult;
  const { username: _u, ...rest } = u;
  void _u;
  return as((actor) => consoleWrite("POST", `/api/console/users-admin/${id}/update`, actor, rest));
}
export async function userAction(id: number, action: "lock" | "unlock" | "delete" | "restore") {
  return okId(id) ? as((actor) => consoleWrite("POST", `/api/console/users-admin/${id}/${action}`, actor, {})) : ({ ok: false, error: "ผู้ใช้ไม่ถูกต้อง" } as ActionResult);
}
