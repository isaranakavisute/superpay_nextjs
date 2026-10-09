"use server";

import { revalidatePath } from "next/cache";
import { consoleHeaders, consoleWrite, type ActionResult } from "@/lib/api";
import { getSessionUser } from "@/lib/session";

const BASE = process.env.BACKEND_URL ?? "http://localhost:3001";
const okId = (id: number) => Number.isInteger(id) && id > 0;
const bad = (error: string): ActionResult => ({ ok: false, error });

async function as(fn: (actor: string) => Promise<ActionResult>): Promise<ActionResult> {
  const me = await getSessionUser();
  if (!me) return bad("กรุณาเข้าสู่ระบบใหม่");
  const r = await fn(me.username);
  if (r.ok) for (const p of ["/merchants", "/merchant-dashboard", "/dashboard"]) revalidatePath(p);
  return r;
}

/** Read helper for the dialogs (API keys, webhook, portal users, credit history). */
async function read(path: string): Promise<ActionResult> {
  if (!(await getSessionUser())) return bad("กรุณาเข้าสู่ระบบใหม่");
  const res = await fetch(BASE + path, { headers: consoleHeaders(), cache: "no-store" });
  const json = await res.json().catch(() => null);
  return res.ok ? { ok: true, ...json } : bad(json?.error?.message ?? `HTTP ${res.status}`);
}

export type MerchantInput = {
  name: string;
  slug?: string;
  feePercent: number;
  feeFlat: number;
  minBalance: number;
  openingBalance?: number;
  status: "active" | "suspended";
  kycStatus: "pending" | "verified" | "rejected";
  contactEmail?: string;
  contactPhone?: string;
};

export async function createMerchant(input: MerchantInput) {
  if (!input.name.trim() || !input.slug?.trim()) return bad("กรุณากรอกชื่อร้านและ slug");
  return as((actor) => consoleWrite("POST", "/api/console/merchants", actor, input));
}
export async function updateMerchant(id: number, input: MerchantInput) {
  if (!okId(id)) return bad("ร้านไม่ถูกต้อง");
  // slug and opening balance are set at creation only.
  const { name, feePercent, feeFlat, minBalance, status, kycStatus, contactEmail, contactPhone } = input;
  const body = { name, feePercent, feeFlat, minBalance, status, kycStatus, contactEmail, contactPhone };
  return as((actor) => consoleWrite("POST", `/api/console/merchants/${id}/update`, actor, body));
}
export async function deleteMerchant(id: number) {
  if (!okId(id)) return bad("ร้านไม่ถูกต้อง");
  return as((actor) => consoleWrite("DELETE", `/api/console/merchants/${id}`, actor));
}
export async function getCredits(id: number) {
  return okId(id) ? read(`/api/console/merchants/${id}/credits`) : bad("ร้านไม่ถูกต้อง");
}
export async function adjustCredit(id: number, amount: number, reason: string) {
  if (!okId(id) || !amount || !reason.trim()) return bad("กรุณากรอกยอดและเหตุผล");
  return as((actor) => consoleWrite("POST", `/api/console/merchants/${id}/credits`, actor, { amount, reason }));
}
export async function getApiKeys(id: number) {
  return okId(id) ? read(`/api/console/merchants/${id}/api-keys`) : bad("ร้านไม่ถูกต้อง");
}
export async function createApiKey(id: number, label: string) {
  if (!okId(id) || !label.trim()) return bad("กรุณาตั้งชื่อ key");
  return as((actor) => consoleWrite("POST", `/api/console/merchants/${id}/api-keys`, actor, { label }));
}
export async function revokeApiKey(id: number, keyId: number) {
  if (!okId(id) || !okId(keyId)) return bad("key ไม่ถูกต้อง");
  return as((actor) => consoleWrite("POST", `/api/console/merchants/${id}/api-keys/${keyId}/revoke`, actor));
}
export async function getWebhook(id: number) {
  return okId(id) ? read(`/api/console/merchants/${id}/webhook`) : bad("ร้านไม่ถูกต้อง");
}
export async function setWebhookUrl(id: number, url: string) {
  if (!okId(id) || !/^https:\/\//.test(url.trim())) return bad("URL ต้องขึ้นต้นด้วย https://");
  return as((actor) => consoleWrite("POST", `/api/console/merchants/${id}/webhook`, actor, { url: url.trim() }));
}
export async function rotateWebhookSecret(id: number) {
  return okId(id) ? as((actor) => consoleWrite("POST", `/api/console/merchants/${id}/webhook/rotate`, actor)) : bad("ร้านไม่ถูกต้อง");
}
export async function getPortalUsers(id: number) {
  return okId(id) ? read(`/api/console/merchants/${id}/portal-users`) : bad("ร้านไม่ถูกต้อง");
}
/** email + password (both optional) let this user sign in to the merchant API (POST /api/v1/auth/login). */
export async function addPortalUser(id: number, username: string, fullName: string, tier: string, email = "", password = "") {
  if (!okId(id) || !username.trim() || !fullName.trim()) return bad("กรุณากรอก username และชื่อ");
  if (!!email.trim() !== !!password) return bad("ใส่อีเมลและรหัสผ่านคู่กัน เพื่อให้ผู้ใช้นี้ login API ได้ (หรือเว้นว่างทั้งคู่)");
  if (password && password.length < 8) return bad("รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร");
  return as((actor) => consoleWrite("POST", `/api/console/merchants/${id}/portal-users`, actor, { username, fullName, tier, email: email.trim(), password }));
}
export async function togglePortalUser(id: number, userId: number) {
  return okId(id) && okId(userId) ? as((actor) => consoleWrite("POST", `/api/console/merchants/${id}/portal-users/${userId}/toggle`, actor)) : bad("ผู้ใช้ไม่ถูกต้อง");
}
