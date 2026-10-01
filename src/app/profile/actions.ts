"use server";

import { revalidatePath } from "next/cache";
import { consoleWrite, type ActionResult } from "@/lib/api";
import { createSession, getSessionUser } from "@/lib/session";

const fail = (error: string): ActionResult => ({ ok: false, error });

async function self(path: string, body: unknown) {
  const me = await getSessionUser();
  if (!me) return { me: null, r: fail("กรุณาเข้าสู่ระบบใหม่") };
  const r = await consoleWrite("POST", `/api/console/profile/${me.id}${path}`, me.username, body);
  if (r.ok) revalidatePath("/profile");
  return { me, r };
}

export async function saveInfo(b: { fullName: string; email: string; phone: string }) {
  if (!b.fullName.trim()) return fail("กรุณากรอกชื่อ-นามสกุล");
  const { me, r } = await self("/info", { fullName: b.fullName, email: b.email === "-" ? "" : b.email, phone: b.phone === "-" ? "" : b.phone });
  // Keep the top-bar name in step with the profile.
  if (r.ok && me) await createSession({ id: me.id, username: me.username, fullName: b.fullName.trim(), roleName: me.role });
  return r;
}

export async function changePassword(b: { current: string; next: string; confirm: string }) {
  if (b.next.length < 6) return fail("รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัวอักษร");
  if (b.next !== b.confirm) return fail("ยืนยันรหัสผ่านใหม่ไม่ตรงกัน");
  return (await self("/password", { current: b.current, next: b.next })).r;
}

export async function setup2fa() {
  return (await self("/2fa/setup", {})).r;
}
export async function enable2fa(code: string) {
  return (await self("/2fa/enable", { code })).r;
}
export async function disable2fa(password: string, code: string) {
  return (await self("/2fa/disable", { password, code })).r;
}
