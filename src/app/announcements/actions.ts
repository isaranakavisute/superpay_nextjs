"use server";

import { revalidatePath } from "next/cache";
import { consoleWrite, type ActionResult } from "@/lib/api";
import { getSessionUser } from "@/lib/session";
import { reasonError } from "@/lib/delete-reason";

export type AnnouncementInput = {
  title: string; message: string; mode: "times" | "interval" | "now"; times: string[]; onDate: string | null;
  intervalSeconds: number | null; startAt: string | null; enabled: boolean;
};

async function as(fn: (actor: string) => Promise<ActionResult>) {
  const me = await getSessionUser();
  if (!me) return { ok: false, error: "กรุณาเข้าสู่ระบบใหม่" } as ActionResult;
  const r = await fn(me.username);
  if (r.ok) revalidatePath("/announcements");
  return r;
}

export async function saveAnnouncement(id: number | null, b: AnnouncementInput) {
  if (!b.title.trim() || !b.message.trim()) return { ok: false, error: "กรุณาใส่หัวข้อและข้อความ" } as ActionResult;
  return as((actor) => consoleWrite("POST", id ? `/api/console/support-bot/announcements/${id}` : "/api/console/support-bot/announcements", actor, b));
}
export const deleteAnnouncement = async (id: number, reason: string) => {
  const err = reasonError(reason);
  return err ? ({ ok: false, error: err } as ActionResult) : as((actor) => consoleWrite("POST", `/api/console/support-bot/announcements/${Number(id) || 0}/delete`, actor, { reason: reason.trim() }));
};
