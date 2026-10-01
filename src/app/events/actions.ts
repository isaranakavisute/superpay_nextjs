"use server";

import { revalidatePath } from "next/cache";
import { consoleWrite, listResource, type ActionResult } from "@/lib/api";
import type { PaymentRow } from "@/lib/rows";
import { getSessionUser } from "@/lib/session";

const okId = (id: number | string) => Number.isInteger(Number(id)) && Number(id) > 0;
const bad = (error: string): ActionResult => ({ ok: false, error });

async function as(fn: (actor: string) => Promise<ActionResult>): Promise<ActionResult> {
  const me = await getSessionUser();
  if (!me) return bad("กรุณาเข้าสู่ระบบใหม่");
  const r = await fn(me.username);
  if (r.ok) for (const p of ["/events", "/payments"]) revalidatePath(p);
  return r;
}

const post = (path: string, body?: unknown) => as((actor) => consoleWrite("POST", `/api/console/events${path}`, actor, body ?? {}));

export async function matchEvent(id: number | string, paymentRef: string) {
  return okId(id) && /^TXN\d+$/.test(paymentRef) ? post(`/${Number(id)}/match`, { paymentRef }) : bad("ข้อมูลไม่ถูกต้อง");
}
export async function createAndMatch(id: number | string, merchantId: number | null, bankAccountId: number, customerName: string) {
  return okId(id) && okId(bankAccountId) && customerName.trim() ? post(`/${Number(id)}/create-match`, { merchantId, bankAccountId, customerName }) : bad("ข้อมูลไม่ครบ");
}
export async function rejectEvent(id: number | string, reason: string) {
  return okId(id) && reason.trim() ? post(`/${Number(id)}/reject`, { reason }) : bad("กรุณาระบุเหตุผล");
}
export async function flipEvent(id: number | string) {
  return okId(id) ? post(`/${Number(id)}/flip`) : bad("ข้อมูลไม่ถูกต้อง");
}
export async function recheckEvent(id: number | string) {
  return okId(id) ? post(`/${Number(id)}/recheck`) : bad("ข้อมูลไม่ถูกต้อง");
}
export async function recheckToday() {
  return post("/recheck-today");
}
export async function simulateEvent(b: { channelId: number; direction: "in" | "out"; sender: string; amount: number; bankAccountId: number | null; orderRef: string }) {
  if (!okId(b.channelId) || !b.sender.trim() || !(b.amount > 0)) return bad("ข้อมูลไม่ครบ");
  return post("/simulate", b);
}

/** Pending orders to match against, closest amount first. */
export async function candidateOrders(amount: number) {
  if (!(await getSessionUser())) return [];
  const list = await listResource<PaymentRow>("payments", { status: "pending,expired", limit: 100 });
  return list.data
    .map((p) => ({ ref: p.ref, amount: p.amount, customerName: p.customerName, merchantName: p.merchantName, createdAt: p.createdAt }))
    .sort((a, b) => Math.abs(Number(a.amount) - amount) - Math.abs(Number(b.amount) - amount))
    .slice(0, 20);
}
