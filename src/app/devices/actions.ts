"use server";

import { revalidatePath } from "next/cache";
import { consoleWrite, type ActionResult } from "@/lib/api";
import { getSessionUser } from "@/lib/session";

async function act(id: number, path: string, method: "POST" | "DELETE" = "POST", body?: unknown): Promise<ActionResult> {
  if (!Number.isInteger(id) || id <= 0) return { ok: false, error: "อุปกรณ์ไม่ถูกต้อง" };
  const me = await getSessionUser();
  if (!me) return { ok: false, error: "กรุณาเข้าสู่ระบบใหม่" };
  const r = await consoleWrite(method, `/api/console/devices/${id}${path}`, me.username, body);
  if (r.ok) revalidatePath("/devices");
  return r;
}

export const renameDevice = async (id: number, name: string) => (name.trim() ? act(id, "/rename", "POST", { name }) : ({ ok: false, error: "กรุณาตั้งชื่อ" } as ActionResult));
export const suspendDevice = async (id: number) => act(id, "/suspend");
export const resumeDevice = async (id: number) => act(id, "/resume");
export const deleteDevice = async (id: number) => act(id, "", "DELETE");
