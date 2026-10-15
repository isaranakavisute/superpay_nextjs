"use server";

import { revalidatePath } from "next/cache";
import { consoleWrite, type ActionResult } from "@/lib/api";
import { getSessionUser } from "@/lib/session";

const REF = /^OUT\d{1,12}$/;
const CATEGORIES = new Set(["refund", "fee", "expense", "transfer", "other", "auto", "commission"]);
const bad = (error: string): ActionResult => ({ ok: false, error });

/** Every action needs a signed-in operator; their username is the audit actor. */
async function as(fn: (actor: string) => Promise<ActionResult>): Promise<ActionResult> {
  const me = await getSessionUser();
  if (!me) return bad("กรุณาเข้าสู่ระบบใหม่");
  const r = await fn(me.username);
  if (r.ok) revalidatePath("/outflows");
  return r;
}

/** Approve after paying outside Option Pay — the deducting account and the transfer reference are optional. */
export async function approveOutflow(ref: string, bankAccountId?: number, note?: string) {
  if (!REF.test(ref)) return bad("เลขที่รายการไม่ถูกต้อง");
  return as((actor) => consoleWrite("POST", `/api/console/outflows/${ref}/approve`, actor, { ...(bankAccountId ? { bankAccountId } : {}), ...(note?.trim() ? { note: note.trim() } : {}) }));
}

export async function rejectOutflow(ref: string, reason: string) {
  if (!REF.test(ref)) return bad("เลขที่รายการไม่ถูกต้อง");
  if (!reason.trim()) return bad("กรุณาระบุเหตุผล");
  return as((actor) => consoleWrite("POST", `/api/console/outflows/${ref}/reject`, actor, { reason }));
}

export async function updateOutflow(ref: string, input: { category: string; bankAccountId: number | null; receiverBankCode: string; description?: string }) {
  if (!REF.test(ref)) return bad("เลขที่รายการไม่ถูกต้อง");
  if (!CATEGORIES.has(input.category)) return bad("หมวดหมู่ไม่ถูกต้อง");
  return as((actor) => consoleWrite("POST", `/api/console/outflows/${ref}/update`, actor, input));
}

export async function deleteOutflow(ref: string) {
  if (!REF.test(ref)) return bad("เลขที่รายการไม่ถูกต้อง");
  return as((actor) => consoleWrite("DELETE", `/api/console/outflows/${ref}`, actor));
}

export async function bulkOutflows(action: "approve" | "reject", refs: string[], reason?: string, bankAccountId?: number, note?: string) {
  if (refs.length === 0 || !refs.every((r) => REF.test(r))) return bad("เลือกรายการไม่ถูกต้อง");
  if (action === "reject" && !reason?.trim()) return bad("กรุณาระบุเหตุผล");
  return as((actor) => consoleWrite("POST", "/api/console/outflows/bulk", actor, action === "approve" ? { action, refs, bankAccountId, ...(note?.trim() ? { note: note.trim() } : {}) } : { action, refs, reason }));
}

export async function createOutflow(input: {
  category: string;
  merchantId: number | null;
  bankAccountId: number | null;
  receiverName: string;
  receiverBankCode: string;
  receiverAccount: string;
  amount: number;
  description?: string;
}) {
  if (!CATEGORIES.has(input.category)) return bad("หมวดหมู่ไม่ถูกต้อง");
  if (!input.receiverName.trim()) return bad("กรุณาระบุชื่อผู้รับ");
  if (!/^[0-9-]{6,20}$/.test(input.receiverAccount.trim())) return bad("เลขบัญชีปลายทางไม่ถูกต้อง");
  if (!(input.amount > 0)) return bad("ยอดต้องมากกว่า 0");
  return as((actor) => consoleWrite("POST", "/api/console/outflows", actor, { ...input, receiverAccount: input.receiverAccount.trim() }));
}

const MIMES = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function uploadOutflowSlip(ref: string, mime: string, data: string) {
  if (!REF.test(ref)) return bad("เลขที่รายการไม่ถูกต้อง");
  if (!MIMES.has(mime)) return bad("รองรับเฉพาะไฟล์ JPG, PNG หรือ WebP");
  if (data.length > 7_000_000) return bad("ไฟล์ใหญ่เกิน 5 MB");
  return as((actor) => consoleWrite("POST", `/api/console/outflows/${ref}/slip`, actor, { mime, data }));
}
