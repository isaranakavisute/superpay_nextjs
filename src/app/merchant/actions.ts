"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ActionResult } from "@/lib/api";
import { portalCall, portalLogin } from "@/lib/portal";
import { cookies } from "next/headers";
import { viewableShops } from "@/lib/portal";
import { createPortalSession, destroyPortalSession, getPortalUser, PORTAL_VIEW_COOKIE, SECURE_PORTAL_COOKIE } from "@/lib/session";

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
  (await cookies()).delete(PORTAL_VIEW_COOKIE);
  if (r.user.mustChangePassword) redirect("/merchant/settings?pw=1");
  // A super-admin has no shop of its own: pick the shop to open first.
  if (r.user.superAdmin) redirect("/merchant/choose-shop");
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
  // Permissions are enforced by the backend (configurable per level); its 403 message is shown as is.
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
  const r = await call("POST", `/users/${u.id}/password`, { current, next }, "/merchant/settings");
  // A temporary password is now replaced: the portal opens normally again.
  if (r.ok && u.mustChangePassword) await createPortalSession({ ...u, mustChangePassword: false });
  return r;
}

/** Shop switcher: view a sub-merchant (only shops below the user's own; id 0 = back to own shop). */
export async function viewShop(id: number) {
  const u = await getPortalUser();
  if (!u) return { ok: false, error: "กรุณาเข้าสู่ระบบใหม่" } as ActionResult;
  const jar = await cookies();
  // A super-admin always opens a chosen shop (its own row's shop included) — keep the choice even for that shop.
  if (!id || (id === u.merchantId && !u.superAdmin)) {
    jar.delete(PORTAL_VIEW_COOKIE);
  } else {
    if (!(await viewableShops(u)).some((s) => s.id === id)) return { ok: false, error: "ไม่มีสิทธิ์ดูร้านนี้" } as ActionResult;
    jar.set(PORTAL_VIEW_COOKIE, String(id), { httpOnly: true, sameSite: "lax", secure: SECURE_PORTAL_COOKIE, path: "/", maxAge: 60 * 60 * 8 });
  }
  revalidatePath("/merchant", "layout");
  return { ok: true } as ActionResult;
}

// ---- sub-merchants (owner of this shop) ----
export type SubRates = { feePercent: number; feeFlat: number; outFeePercent: number; outFeeFlat: number };
export const createSubMerchant = async (b: SubRates & { name: string; slug: string; allowSubMerchants: boolean; contactPhone?: string; owner: { fullName: string; email: string; password: string } }) =>
  call("POST", "/sub-merchants", b, "/merchant/sub-merchants");
export const updateSubMerchant = async (id: number, b: SubRates & { name: string; allowSubMerchants: boolean; status: "active" | "suspended" }) =>
  call("POST", `/sub-merchants/${Number(id) || 0}`, b, "/merchant/sub-merchants");
export const resetSubOwnerPassword = async (id: number, password: string) =>
  call("POST", `/sub-merchants/${Number(id) || 0}/owner-password`, { password }, "/merchant/sub-merchants");

/** The signed-in user's own secret key + API key (any level). */
async function ownSecretKey(suffix: string) {
  const u = await getPortalUser();
  if (!u) return { ok: false, error: "กรุณาเข้าสู่ระบบใหม่" } as ActionResult;
  return call("POST", `/users/${u.id}/secret-key${suffix}`, {}, "/merchant/settings");
}
export const createSecretKey = async () => ownSecretKey("");
export const revokeSecretKey = async () => ownSecretKey("/revoke");

/** A pending order made by hand (Transactions → สร้างรายการชำระ); orderId is generated when left empty. */
export async function createPortalPayment(b: { amount: number; orderId?: string; description?: string; customerName?: string }) {
  if (!(b.amount > 0)) return { ok: false, error: "ยอดต้องมากกว่า 0" } as ActionResult;
  const now = new Date(Date.now() + 7 * 3600_000).toISOString().replace(/\D/g, "").slice(2, 14); // Bangkok YYMMDDhhmmss
  const orderId = b.orderId?.trim() || `POS-${now}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
  const customerName = b.customerName?.trim();
  return call("POST", "/payments", { amount: b.amount, orderId, description: b.description?.trim() || undefined, metadata: customerName ? { memberName: customerName } : undefined }, "/merchant/transactions");
}

/** Full secret key + latest login API key, after the user re-enters their own login and password. */
export async function revealKeys(login: string, password: string) {
  const u = await getPortalUser();
  if (!u) return { ok: false, error: "กรุณาเข้าสู่ระบบใหม่" } as ActionResult;
  if (!login.trim() || !password) return { ok: false, error: "กรอกอีเมลหรือชื่อผู้ใช้ และรหัสผ่าน" } as ActionResult;
  return portalCall<{ secretKey: string | null; apiKey: string | null }>(u, "POST", `/users/${u.id}/secret-key/reveal`, { login: login.trim().toLowerCase(), password });
}
