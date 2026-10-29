"use server";

import { createHmac } from "node:crypto";
import { headers } from "next/headers";
import { consoleHeaders, verifyLogin } from "@/lib/api";
import { getSessionUser } from "@/lib/session";

const BASE = process.env.BACKEND_URL ?? "http://localhost:3001";
/** The always-on control container (same host network; never reached through the gateway for this call). */
const CONTROL = process.env.CONTROL_URL ?? "http://127.0.0.1:4700";
const KEY = process.env.CONSOLE_API_KEY ?? "";
export type ShutdownResult = { ok: true; progressUrl: string } | { ok: false; error: string; needCode?: boolean };

/** Super Admin only — checked against the backend, not just the menu. */
async function isSuperAdmin(id: number, username: string) {
  const r = await fetch(`${BASE}/api/console/profile/${id}`, { headers: { ...consoleHeaders(username), "x-console-user-id": String(id) }, cache: "no-store" }).catch(() => null);
  if (!r?.ok) return false;
  return ((await r.json()) as { profile: { roleCode: string } }).profile.roleCode === "super_admin";
}

/**
 * ตั้งค่าระบบ → ปิดระบบ (shutdown): asks the control container to `docker stop` front-end → back-end → database.
 * The front-end (this page) stops first, so the browser is sent to the control container's progress page.
 */
export async function requestShutdown(input: { password: string; code?: string; phrase: string; reason: string }): Promise<ShutdownResult> {
  const me = await getSessionUser();
  if (!me) return { ok: false, error: "กรุณาเข้าสู่ระบบใหม่" };
  if (!(await isSuperAdmin(me.id, me.username))) return { ok: false, error: "เฉพาะ Super Admin เท่านั้น" };
  if (input.phrase.trim() !== "ปิดระบบ") return { ok: false, error: "พิมพ์คำว่า ปิดระบบ ให้ถูกต้องเพื่อยืนยัน" };
  const reason = input.reason.trim();
  if (reason.length < 5) return { ok: false, error: "กรุณาระบุเหตุผล (อย่างน้อย 5 ตัวอักษร)" };
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0].trim();
  const who = await verifyLogin(me.username, input.password, ip, input.code?.trim() || undefined).catch(() => "invalid" as const);
  if (who === "totp_required") return { ok: false, error: "กรุณาใส่รหัส 2FA จากแอปยืนยันตัวตน", needCode: true };
  if (who === "totp_invalid") return { ok: false, error: "รหัส 2FA ไม่ถูกต้อง", needCode: true };
  if (who === "invalid" || who.id !== me.id) return { ok: false, error: "รหัสผ่านไม่ถูกต้อง" };
  const body = JSON.stringify({ by: `${me.fullName || me.username} (admin portal)`, reason });
  const ts = String(Math.floor(Date.now() / 1000));
  const sig = createHmac("sha256", KEY).update(`${ts}.${body}`).digest("hex");
  const r = await fetch(`${CONTROL}/internal/shutdown`, {
    method: "POST", headers: { "content-type": "application/json", "x-control-timestamp": ts, "x-control-signature": sig }, body, cache: "no-store",
  }).catch(() => null);
  if (!r) return { ok: false, error: "ติดต่อตัวควบคุมระบบไม่ได้ — ลองใหม่ หรือสั่ง shutdown ในกลุ่ม Option Pay Controller" };
  const j = (await r.json().catch(() => ({}))) as { ok?: boolean; progressUrl?: string; error?: string };
  return j.ok && j.progressUrl ? { ok: true, progressUrl: j.progressUrl } : { ok: false, error: j.error ?? `ตัวควบคุมระบบตอบ ${r.status}` };
}
