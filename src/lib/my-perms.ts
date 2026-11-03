import { cache } from "react";
import { consoleHeaders } from "@/lib/api";
import { getSessionUser } from "@/lib/session";

const BASE = process.env.BACKEND_URL ?? "http://localhost:3001";

/**
 * The signed-in operator's permissions, read on the server (once per request) — for parts of a page a role may not
 * see at all, so their data is not even fetched (2 Nov 2026: the payments summary cards, permission payment.totals).
 * ["*"] = Super Admin. Null when unknown (not signed in / backend unreachable): treat as "no".
 */
export const myPerms = cache(async (): Promise<string[] | null> => {
  const me = await getSessionUser().catch(() => null);
  if (!me) return null;
  try {
    const r = await fetch(`${BASE}/api/console/profile/${me.id}`, { headers: { ...consoleHeaders(me.username), "x-console-user-id": String(me.id) }, cache: "no-store", signal: AbortSignal.timeout(4000) });
    if (!r.ok) return null;
    const p = ((await r.json()) as { profile: { roleCode: string; permissions?: string[] } }).profile;
    return p.roleCode === "super_admin" ? ["*"] : p.permissions ?? [];
  } catch {
    return null;
  }
});

export const hasPerm = (perms: string[] | null, perm: string) => !!perms && (perms.includes("*") || perms.includes(perm));
