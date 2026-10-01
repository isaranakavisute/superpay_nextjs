"use server";

import { revalidatePath } from "next/cache";
import { consoleWrite, type ActionResult } from "@/lib/api";
import { getSessionUser } from "@/lib/session";

export async function saveRoles(roles: Record<string, string[]>): Promise<ActionResult> {
  const me = await getSessionUser();
  if (!me) return { ok: false, error: "กรุณาเข้าสู่ระบบใหม่" };
  if ("super_admin" in roles) return { ok: false, error: "Super Admin แก้ไม่ได้" };
  const r = await consoleWrite("POST", "/api/console/roles-admin", me.username, { roles });
  if (r.ok) revalidatePath("/roles");
  return r;
}
