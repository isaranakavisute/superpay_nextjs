"use server";

import { revalidatePath } from "next/cache";
import { consoleWrite, type ActionResult } from "@/lib/api";
import { getSessionUser } from "@/lib/session";

export type AccountInput = { bankCode: string; accountNo: string; accountName: string; accountType: "receive" | "send" | "both"; promptpayId: string; merchantIds: number[] };

async function as(path: string, body: unknown): Promise<ActionResult> {
  const me = await getSessionUser();
  if (!me) return { ok: false, error: "กรุณาเข้าสู่ระบบใหม่" };
  const r = await consoleWrite("POST", `/api/console/accounts-admin${path}`, me.username, body);
  if (r.ok) revalidatePath("/accounts");
  return r;
}
const okId = (id: number) => Number.isInteger(id) && id > 0;

export const createAccount = async (b: AccountInput) => as("", b);
export const updateAccount = async (id: number, b: AccountInput) => (okId(id) ? as(`/${id}/update`, b) : ({ ok: false, error: "บัญชีไม่ถูกต้อง" } as ActionResult));
export const accountAction = async (id: number, action: "toggle" | "reset" | "delete") =>
  okId(id) && ["toggle", "reset", "delete"].includes(action) ? as(`/${id}/${action}`, {}) : ({ ok: false, error: "บัญชีไม่ถูกต้อง" } as ActionResult);
export const resetAccounts = async (ids: number[]) => as("/reset", { ids: ids.filter(okId) });
