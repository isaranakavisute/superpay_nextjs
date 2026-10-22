"use server";

import { headers } from "next/headers";
import { verifyLogin, viewerHeaders } from "@/lib/api";
import { getSessionUser } from "@/lib/session";
import type { ApplyBody, ApplyResult, BackupOverview, ChangeDay, ChangeFilter, ChangeTx, RestoreImpact } from "./types";

const BASE = process.env.BACKEND_URL ?? "http://localhost:3001";
type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string; needCode?: boolean };

async function call<T>(method: "GET" | "POST", path: string, body?: unknown): Promise<Result<T>> {
  const r = await fetch(`${BASE}/api/console/backups${path}`, {
    method,
    headers: { ...(await viewerHeaders()), ...(body ? { "content-type": "application/json" } : {}) },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  }).catch(() => null);
  if (!r) return { ok: false, error: "ระบบหลังบ้านไม่ตอบสนอง (อาจกำลังสลับฐานข้อมูล) — ลองใหม่อีกครั้ง" };
  const j = await r.json().catch(() => null);
  if (!r.ok) return { ok: false, error: j?.error?.message ?? `HTTP ${r.status}` };
  return { ok: true, ...(j as T) };
}

export async function loadBackups(): Promise<Result<BackupOverview>> {
  if (!(await getSessionUser())) return { ok: false, error: "กรุณาเข้าสู่ระบบใหม่" };
  return call<BackupOverview>("GET", "");
}

export async function loadImpact(file: string): Promise<Result<RestoreImpact>> {
  if (!(await getSessionUser())) return { ok: false, error: "กรุณาเข้าสู่ระบบใหม่" };
  return call<RestoreImpact>("GET", `/impact?file=${encodeURIComponent(file)}`);
}

export async function backupNow(): Promise<Result<{ jobId: number }>> {
  if (!(await getSessionUser())) return { ok: false, error: "กรุณาเข้าสู่ระบบใหม่" };
  return call<{ jobId: number }>("POST", "/run", {});
}

/**
 * Full restore (Super Admin only — the backend checks it again). The signed-in user re-enters their own password
 * (and 2FA code when they have it) before the request is queued.
 */
export async function restoreBackup(file: string, reason: string, password: string, code?: string): Promise<Result<{ jobId: number }>> {
  const me = await getSessionUser();
  if (!me) return { ok: false, error: "กรุณาเข้าสู่ระบบใหม่" };
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0].trim();
  const who = await verifyLogin(me.username, password, ip, code?.trim() || undefined).catch(() => "invalid" as const);
  if (who === "totp_required") return { ok: false, error: "กรุณาใส่รหัส 2FA จากแอปยืนยันตัวตน", needCode: true };
  if (who === "totp_invalid") return { ok: false, error: "รหัส 2FA ไม่ถูกต้อง", needCode: true };
  if (who === "invalid" || who.id !== me.id) return { ok: false, error: "รหัสผ่านไม่ถูกต้อง" };
  return call<{ jobId: number }>("POST", "/restore", { file, reason });
}

// ---- Real-time change log ----
export async function loadChangeDays(): Promise<Result<{ days: ChangeDay[]; tables: string[] }>> {
  if (!(await getSessionUser())) return { ok: false, error: "กรุณาเข้าสู่ระบบใหม่" };
  return call("GET", "/changes/days");
}

export async function loadChanges(f: ChangeFilter): Promise<Result<{ transactions: ChangeTx[]; total: number; limit: number }>> {
  if (!(await getSessionUser())) return { ok: false, error: "กรุณาเข้าสู่ระบบใหม่" };
  const qs = new URLSearchParams({ day: f.day, from: f.from, to: f.to, ...(f.table ? { table: f.table } : {}), ...(f.q ? { q: f.q } : {}) });
  return call("GET", `/changes?${qs}`);
}

export async function loadChange(id: string): Promise<Result<{ change: { id: string; at: string; tbl: string; op: string; oldRow: Record<string, unknown> | null; newRow: Record<string, unknown> | null; source: string | null } }>> {
  if (!(await getSessionUser())) return { ok: false, error: "กรุณาเข้าสู่ระบบใหม่" };
  return call("GET", `/changes/${encodeURIComponent(id)}`);
}

/** Dry run (everything rolled back): how many rows would apply, which conflict. Super Admin only (backend). */
export async function previewChanges(b: ApplyBody): Promise<Result<ApplyResult>> {
  if (!(await getSessionUser())) return { ok: false, error: "กรุณาเข้าสู่ระบบใหม่" };
  return call("POST", "/changes/preview", b);
}

/** Undo / replay for real, after the user re-enters their password (+ 2FA). */
export async function applyChanges(b: ApplyBody, password: string, code?: string): Promise<Result<ApplyResult>> {
  const me = await getSessionUser();
  if (!me) return { ok: false, error: "กรุณาเข้าสู่ระบบใหม่" };
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0].trim();
  const who = await verifyLogin(me.username, password, ip, code?.trim() || undefined).catch(() => "invalid" as const);
  if (who === "totp_required") return { ok: false, error: "กรุณาใส่รหัส 2FA จากแอปยืนยันตัวตน", needCode: true };
  if (who === "totp_invalid") return { ok: false, error: "รหัส 2FA ไม่ถูกต้อง", needCode: true };
  if (who === "invalid" || who.id !== me.id) return { ok: false, error: "รหัสผ่านไม่ถูกต้อง" };
  return call("POST", "/changes/apply", b);
}
