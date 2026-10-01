"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ActionResult } from "@/lib/api";
import { portalCall, portalLogin } from "@/lib/portal";
import { createPortalSession, destroyPortalSession, getPortalUser } from "@/lib/session";

export type PortalLoginState = { error?: string };

export async function loginPortal(_prev: PortalLoginState, form: FormData): Promise<PortalLoginState> {
  const login = String(form.get("login") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  if (!login || !password) return { error: "กรอกอีเมลหรือชื่อผู้ใช้ และรหัสผ่าน" };
  let r;
  try {
    r = await portalLogin(login, password);
  } catch {
    return { error: "ไม่สามารถเชื่อมต่อระบบได้ กรุณาลองใหม่อีกครั้ง" };
  }
  if (!r.ok) return { error: r.error };
  await createPortalSession(r.user);
  const back = String(form.get("returnTo") ?? "");
  redirect(back.startsWith("/merchant/") && !back.startsWith("//") ? back : "/merchant/dashboard");
}

export async function logoutPortal() {
  await destroyPortalSession();
  redirect("/merchant/login");
}

/** Shop-scoped write for the signed-in portal user. */
async function call(method: "POST", path: string, body: unknown, page: string): Promise<ActionResult> {
  const u = await getPortalUser();
  if (!u) return { ok: false, error: "กรุณาเข้าสู่ระบบใหม่" };
  if (u.tier !== "owner" && !path.endsWith("/password")) return { ok: false, error: "เฉพาะเจ้าของร้านเท่านั้น" };
  const r = await portalCall(u, method, path, body);
  if (r.ok) revalidatePath(page);
  return r;
}

export const requestWithdrawal = async (b: { amount: number; bankCode: string; accountNumber: string; accountName: string; note?: string }) =>
  call("POST", "/withdrawals", { ...b, note: b.note || undefined }, "/merchant/withdrawals");
export const createKey = async (label: string) => call("POST", "/keys", { label }, "/merchant/settings");
export const revokeKey = async (id: number) => (Number.isInteger(id) ? call("POST", `/keys/${id}/revoke`, {}, "/merchant/settings") : ({ ok: false, error: "key ไม่ถูกต้อง" } as ActionResult));
export const setWebhook = async (url: string) => call("POST", "/webhook", { url }, "/merchant/settings");
export const rotateSecret = async () => call("POST", "/webhook/rotate", {}, "/merchant/settings");
export const addAccount = async (b: { type: "BANK" | "PROMPTPAY"; bankCode?: string; accountNumber?: string; accountName?: string; promptPayId?: string }) =>
  call("POST", "/accounts", b, "/merchant/settings");
export const removeAccount = async (id: number) => call("POST", `/accounts/${Number(id) || 0}/delete`, {}, "/merchant/settings");
export async function changePassword(current: string, next: string) {
  const u = await getPortalUser();
  if (!u) return { ok: false, error: "กรุณาเข้าสู่ระบบใหม่" } as ActionResult;
  return call("POST", `/users/${u.id}/password`, { current, next }, "/merchant/settings");
}
