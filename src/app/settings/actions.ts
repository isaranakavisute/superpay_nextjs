"use server";

import { revalidatePath } from "next/cache";
import { consoleWrite, type ActionResult } from "@/lib/api";
import { getSessionUser } from "@/lib/session";
import { reasonError } from "@/lib/delete-reason";

const SECTIONS = ["brand", "theme", "sounds", "slip", "quota", "balance", "limits", "security", "merchantPerms", "outbound", "demo"] as const;
export type Section = (typeof SECTIONS)[number];

async function as(path: string, body: unknown): Promise<ActionResult> {
  const me = await getSessionUser();
  if (!me) return { ok: false, error: "กรุณาเข้าสู่ระบบใหม่" };
  const r = await consoleWrite("POST", `/api/console/config${path}`, me.username, body);
  // Brand/theme/sounds show on every page (sidebar, favicon, theme button).
  if (r.ok) revalidatePath("/", "layout");
  return r;
}

export async function saveSection(section: Section, body: Record<string, unknown>) {
  if (!SECTIONS.includes(section)) return { ok: false, error: "ส่วนการตั้งค่าไม่ถูกต้อง" } as ActionResult;
  return as(`/${section}`, body);
}

export async function uploadAsset(kind: "logo" | "favicon" | "sound", file: { mime: string; data: string; name?: string }) {
  if (!["logo", "favicon", "sound"].includes(kind)) return { ok: false, error: "ชนิดไฟล์ไม่ถูกต้อง" } as ActionResult;
  return as(`/assets/${kind}`, file);
}

export async function deleteAsset(kind: "logo" | "favicon" | "sound", reason: string, id?: string) {
  if (id && !/^[a-f0-9]{12}$/.test(id)) return { ok: false, error: "ไฟล์ไม่ถูกต้อง" } as ActionResult;
  const err = reasonError(reason);
  if (err) return { ok: false, error: err } as ActionResult;
  return as(id ? `/assets/${kind}/${id}/delete` : `/assets/${kind}/delete`, { reason: reason.trim() });
}

export async function testSlip(which: "primary" | "fallback", form: Record<string, unknown>) {
  return as("/slip/test", { which, form });
}

export async function checkQuota() {
  return as("/quota/check", {});
}
