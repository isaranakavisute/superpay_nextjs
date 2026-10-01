import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

// Credentials are checked by the backend against user_password (see lib/api.ts);
// the session itself is an HMAC-signed cookie holding the user's id and name.

export type SessionUser = { id: number; username: string; fullName: string; role: string };

export const SESSION_COOKIE = "sp_session";
const MAX_AGE = 60 * 60 * 8; // 8 hours
/** Read lazily so `next build` works without it; a deployed server refuses to run unsigned. */
function secret() {
  const s = process.env.SESSION_SECRET;
  if (s) return s;
  if (process.env.NODE_ENV === "production") throw new Error("SESSION_SECRET must be set in production");
  return "dev-only-secret-change-me";
}

const sign = (payload: string) => createHmac("sha256", secret()).update(payload).digest("base64url");

export async function createSession(user: { id: number; username: string; fullName: string; roleName: string | null }) {
  const payload = Buffer.from(
    JSON.stringify({ id: user.id, u: user.username, n: user.fullName, r: user.roleName, exp: Date.now() + MAX_AGE * 1000 }),
  ).toString("base64url");
  (await cookies()).set(SESSION_COOKIE, `${payload}.${sign(payload)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function destroySession() {
  (await cookies()).delete(SESSION_COOKIE);
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const raw = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!raw) return null;
  const [payload, sig] = raw.split(".");
  if (!payload || !sig) return null;
  const expected = Buffer.from(sign(payload));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  try {
    const { id, u, n, r, exp } = JSON.parse(Buffer.from(payload, "base64url").toString());
    if (typeof exp !== "number" || exp < Date.now() || typeof u !== "string") return null;
    // Name and role come from console_user_profiles at login time.
    return { id, username: u, fullName: typeof n === "string" ? n : u, role: typeof r === "string" ? r : "ผู้ใช้งานระบบ" };
  } catch {
    return null;
  }
}

// ---- Merchant Portal session (separate cookie, same signing key, own purpose prefix) ----

export type PortalUser = { id: number; merchantId: number; username: string; fullName: string; tier: "owner" | "staff" | "viewer"; merchantName: string };
export const PORTAL_COOKIE = "sp_portal";
const PORTAL_AGE = 60 * 60 * 8;
const signPortal = (payload: string) => createHmac("sha256", secret()).update(`portal.${payload}`).digest("base64url");

export async function createPortalSession(u: PortalUser) {
  const payload = Buffer.from(JSON.stringify({ ...u, exp: Date.now() + PORTAL_AGE * 1000 })).toString("base64url");
  (await cookies()).set(PORTAL_COOKIE, `${payload}.${signPortal(payload)}`, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: PORTAL_AGE });
}

export async function destroyPortalSession() {
  (await cookies()).delete(PORTAL_COOKIE);
}

export async function getPortalUser(): Promise<PortalUser | null> {
  const raw = (await cookies()).get(PORTAL_COOKIE)?.value;
  const [payload, sig] = raw?.split(".") ?? [];
  if (!payload || !sig) return null;
  const expected = Buffer.from(signPortal(payload));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  try {
    const p = JSON.parse(Buffer.from(payload, "base64url").toString());
    if (typeof p.exp !== "number" || p.exp < Date.now() || !Number.isInteger(p.merchantId)) return null;
    return { id: p.id, merchantId: p.merchantId, username: p.username, fullName: p.fullName, tier: p.tier, merchantName: p.merchantName };
  } catch {
    return null;
  }
}
