"use server";

import { revalidatePath } from "next/cache";
import { consoleWrite, type ActionResult } from "@/lib/api";
import { getSessionUser } from "@/lib/session";

const REF = /^TXN\d{1,12}$/;

/** Every action needs a signed-in operator; their username is the audit actor. */
async function as<T extends ActionResult>(fn: (actor: string) => Promise<T>): Promise<ActionResult> {
  const me = await getSessionUser();
  if (!me) return { ok: false, error: "กรุณาเข้าสู่ระบบใหม่" };
  const result = await fn(me.username);
  if (result.ok) revalidatePath("/payments");
  return result;
}

const bad = (error: string): ActionResult => ({ ok: false, error });

export async function approvePayment(ref: string) {
  if (!REF.test(ref)) return bad("เลขที่รายการไม่ถูกต้อง");
  return as((actor) => consoleWrite("POST", `/api/console/payments/${ref}/approve`, actor, {}));
}

export async function rejectPayment(ref: string, reason: string) {
  if (!REF.test(ref)) return bad("เลขที่รายการไม่ถูกต้อง");
  if (!reason.trim()) return bad("กรุณาระบุเหตุผล");
  return as((actor) => consoleWrite("POST", `/api/console/payments/${ref}/reject`, actor, { reason }));
}

export async function refundPayment(ref: string, amount: number) {
  if (!REF.test(ref)) return bad("เลขที่รายการไม่ถูกต้อง");
  if (!(amount > 0)) return bad("ยอดคืนเงินต้องมากกว่า 0");
  return as((actor) => consoleWrite("POST", `/api/console/payments/${ref}/refund`, actor, { amount }));
}

export async function editPaymentAmount(ref: string, amount: number) {
  if (!REF.test(ref)) return bad("เลขที่รายการไม่ถูกต้อง");
  if (!(amount > 0)) return bad("ยอดต้องมากกว่า 0");
  return as((actor) => consoleWrite("POST", `/api/console/payments/${ref}/amount`, actor, { amount }));
}

export async function revivePayment(ref: string) {
  if (!REF.test(ref)) return bad("เลขที่รายการไม่ถูกต้อง");
  return as((actor) => consoleWrite("POST", `/api/console/payments/${ref}/revive`, actor));
}

export async function deletePayment(ref: string) {
  if (!REF.test(ref)) return bad("เลขที่รายการไม่ถูกต้อง");
  return as((actor) => consoleWrite("DELETE", `/api/console/payments/${ref}`, actor));
}

export async function bulkPayments(action: "approve" | "reject", refs: string[], reason?: string) {
  if (refs.length === 0 || !refs.every((r) => REF.test(r))) return bad("เลือกรายการไม่ถูกต้อง");
  if (action === "reject" && !reason?.trim()) return bad("กรุณาระบุเหตุผล");
  return as((actor) => consoleWrite("POST", "/api/console/payments/bulk", actor, { action, refs, reason }));
}

export async function createPayment(input: {
  merchantId: number | null;
  customerName: string;
  payerBankCode: string;
  bankAccountId: number;
  amount: number;
  merchantOrderId?: string;
}) {
  if (!input.customerName.trim()) return bad("กรุณาระบุชื่อลูกค้า");
  if (!(input.amount > 0)) return bad("ยอดต้องมากกว่า 0");
  return as((actor) => consoleWrite("POST", "/api/console/payments", actor, input));
}

export async function assignPayment(ref: string, merchantId: number | null, merchantOrderId: string) {
  if (!REF.test(ref)) return bad("เลขที่รายการไม่ถูกต้อง");
  return as((actor) => consoleWrite("POST", `/api/console/payments/${ref}/assign`, actor, { merchantId, merchantOrderId: merchantOrderId.trim() || undefined }));
}

const MIMES = new Set(["image/jpeg", "image/png", "image/webp"]);

/** `data` is the image as base64 (no data: prefix). */
export async function uploadSlip(ref: string, mime: string, data: string) {
  if (!REF.test(ref)) return bad("เลขที่รายการไม่ถูกต้อง");
  if (!MIMES.has(mime)) return bad("รองรับเฉพาะไฟล์ JPG, PNG หรือ WebP");
  if (data.length > 7_000_000) return bad("ไฟล์ใหญ่เกิน 5 MB");
  return as((actor) => consoleWrite("POST", `/api/console/payments/${ref}/slip`, actor, { mime, data }));
}
