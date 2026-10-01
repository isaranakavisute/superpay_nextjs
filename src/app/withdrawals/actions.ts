"use server";

import { revalidatePath } from "next/cache";
import { consoleWrite, type ActionResult } from "@/lib/api";
import { getSessionUser } from "@/lib/session";

const REF = /^WDR\d{1,12}$/;
const bad = (error: string): ActionResult => ({ ok: false, error });

async function as(fn: (actor: string) => Promise<ActionResult>): Promise<ActionResult> {
  const me = await getSessionUser();
  if (!me) return bad("กรุณาเข้าสู่ระบบใหม่");
  const r = await fn(me.username);
  if (r.ok) {
    revalidatePath("/withdrawals");
    revalidatePath("/outflows");
  }
  return r;
}

/** Approve → the backend creates the pending payout on the outflows page. */
export async function approveWithdrawal(ref: string) {
  if (!REF.test(ref)) return bad("เลขที่คำขอไม่ถูกต้อง");
  return as((actor) => consoleWrite("POST", `/api/console/withdrawals/${ref}/approve`, actor));
}

export async function rejectWithdrawal(ref: string, reason: string) {
  if (!REF.test(ref)) return bad("เลขที่คำขอไม่ถูกต้อง");
  if (!reason.trim()) return bad("กรุณาระบุเหตุผล");
  return as((actor) => consoleWrite("POST", `/api/console/withdrawals/${ref}/reject`, actor, { reason }));
}
