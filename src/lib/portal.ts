import "server-only";
import { redirect } from "next/navigation";
import { consoleHeaders, type ActionResult } from "./api";
import { getBranding } from "./branding";
import type { MerchantPermission } from "./merchant-perms";
import { cookies } from "next/headers";
import { getPortalUser, PORTAL_VIEW_COOKIE, type PortalUser } from "./session";
import { errorText } from "./api-error";

const BASE = process.env.BACKEND_URL ?? "http://localhost:3001";

export type ViewableShop = { id: number; name: string; depth: number; status: "active" | "suspended" | "pending" };

/** The user's own shop and every sub-merchant below it (the shop switcher; also the view check). */
export async function viewableShops(u: PortalUser): Promise<ViewableShop[]> {
  const home: PortalUser = { ...u, merchantId: u.homeMerchantId ?? u.merchantId, homeMerchantId: undefined };
  const r = await portalCall<{ shops: ViewableShop[] }>(home, "GET", "/viewable");
  return r.ok && r.shops ? r.shops : [];
}

/**
 * The signed-in portal user, or off to the portal login. When they chose to view a sub-merchant (shop switcher),
 * merchantId / merchantName are that shop's and `viewing` is set — pages then read that shop's data and hide
 * every write (the backend also refuses writes outside the user's own shop).
 * A temporary password (new sub-merchant owner) must be changed first.
 */
export async function requirePortal(path: string): Promise<PortalUser> {
  const u = await getPortalUser();
  if (!u) redirect(`/merchant/login?returnTo=${encodeURIComponent(path)}`);
  if (u.mustChangePassword && path !== "/merchant/settings") redirect("/merchant/settings?pw=1");
  const own = { ...u, homeMerchantId: u.merchantId, homeMerchantName: u.merchantName, viewing: false };
  const view = Number((await cookies()).get(PORTAL_VIEW_COOKIE)?.value);
  if (!Number.isInteger(view) || view <= 0 || view === u.merchantId) return own;
  const shop = (await viewableShops(u)).find((s) => s.id === view);
  return shop ? { ...own, merchantId: shop.id, merchantName: shop.name, viewing: true } : own;
}

/** What this portal user may do (Settings → สิทธิ์ผู้ใช้ร้านค้า, by level). */
export async function portalPerms(u: PortalUser): Promise<Set<MerchantPermission | string>> {
  return new Set((await getBranding()).merchantPerms[u.tier] ?? []);
}

const headers = (u: PortalUser) => ({
  "content-type": "application/json", ...consoleHeaders(u.username), "x-portal-tier": u.tier,
  // The user's own shop: the backend lets it read its subtree and write only to itself.
  "x-portal-home": String(u.homeMerchantId ?? u.merchantId),
});

/** Backend portal call scoped to the session's shop. */
export async function portalCall<T = Record<string, unknown>>(u: PortalUser, method: "GET" | "POST", path: string, body?: unknown): Promise<ActionResult & Partial<T>> {
  try {
    const r = await fetch(`${BASE}/api/console/portal/${u.merchantId}${path}`, { method, headers: headers(u), body: body === undefined ? undefined : JSON.stringify(body), cache: "no-store" });
    const j = await r.json().catch(() => null);
    if (!r.ok) return { ok: false, error: errorText(j, `HTTP ${r.status}`) } as ActionResult & Partial<T>;
    return { ok: true, ...(j ?? {}) };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) } as ActionResult & Partial<T>;
  }
}

export async function portalLogin(login: string, password: string) {
  const r = await fetch(`${BASE}/api/console/portal/login`, {
    method: "POST",
    headers: { "content-type": "application/json", ...consoleHeaders() },
    body: JSON.stringify(login.includes("@") ? { email: login, password } : { username: login, password }),
    cache: "no-store",
  });
  const j = await r.json().catch(() => null);
  if (!r.ok) return { ok: false as const, error: (j?.error?.message as string) ?? "เข้าสู่ระบบไม่สำเร็จ" };
  return { ok: true as const, user: j.user as PortalUser };
}
