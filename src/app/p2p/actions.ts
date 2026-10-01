"use server";

import { revalidatePath } from "next/cache";
import { consoleWrite, type ActionResult } from "@/lib/api";
import { getSessionUser } from "@/lib/session";

const REF = /^P2P\d{1,12}$/;

async function act(ref: string, verb: "settle" | "release"): Promise<ActionResult> {
  if (!REF.test(ref)) return { ok: false, error: "เลขที่คู่ไม่ถูกต้อง" };
  const me = await getSessionUser();
  if (!me) return { ok: false, error: "กรุณาเข้าสู่ระบบใหม่" };
  const r = await consoleWrite("POST", `/api/console/p2p/${ref}/${verb}`, me.username);
  if (r.ok) for (const p of ["/p2p", "/withdrawals", "/payments", "/outflows"]) revalidatePath(p);
  return r;
}

export const settlePair = async (ref: string) => act(ref, "settle");
export const releasePair = async (ref: string) => act(ref, "release");
