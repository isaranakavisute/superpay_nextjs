import "server-only";
import { redirect } from "next/navigation";
import { consoleHeaders, type ActionResult } from "./api";
import { getBranding } from "./branding";
import type { MerchantPermission } from "./merchant-perms";
import { getPortalUser, type PortalUser } from "./session";

const BASE = process.env.BACKEND_URL ?? "http://localhost:3001";

/** The signed-in portal user, or off to the portal login. */
export async function requirePortal(path: string): Promise<PortalUser> {
  const u = await getPortalUser();
  if (!u) redirect(`/merchant/login?returnTo=${encodeURIComponent(path)}`);
  return u;
}

/** What this portal user may do (Settings → สิทธิ์ผู้ใช้ร้านค้า, by level). */
export async function portalPerms(u: PortalUser): Promise<Set<MerchantPermission | string>> {
  return new Set((await getBranding()).merchantPerms[u.tier] ?? []);
}

const headers = (u: PortalUser) => ({ "content-type": "application/json", ...consoleHeaders(u.username), "x-portal-tier": u.tier });

/** Backend portal call scoped to the session's shop. */
export async function portalCall<T = Record<string, unknown>>(u: PortalUser, method: "GET" | "POST", path: string, body?: unknown): Promise<ActionResult & Partial<T>> {
  try {
    const r = await fetch(`${BASE}/api/console/portal/${u.merchantId}${path}`, { method, headers: headers(u), body: body === undefined ? undefined : JSON.stringify(body), cache: "no-store" });
    const j = await r.json().catch(() => null);
    if (!r.ok) return { ok: false, error: j?.error?.message ?? `HTTP ${r.status}` } as ActionResult & Partial<T>;
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
