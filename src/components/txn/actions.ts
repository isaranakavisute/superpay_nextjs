"use server";

import { consoleHeaders } from "@/lib/api";
import { getSessionUser } from "@/lib/session";
import type { TxnHit, TxnTimeline } from "./types";

const BASE = process.env.BACKEND_URL ?? "http://localhost:3001";

async function get<T>(path: string): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
  const me = await getSessionUser();
  if (!me) return { ok: false, error: "กรุณาเข้าสู่ระบบใหม่" };
  try {
    const r = await fetch(`${BASE}${path}`, { headers: { ...consoleHeaders(me.username), "x-console-user-id": String(me.id) }, cache: "no-store" });
    const j = await r.json().catch(() => null);
    if (!r.ok) return { ok: false, error: j?.error?.message ?? `HTTP ${r.status}` };
    return { ok: true, data: j as T };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/** Refs that contain `q` (TXN… / OUT… / WDR…), with who / which bank / how much. */
export async function searchTxn(q: string) {
  const s = q.trim();
  if (s.length < 2 || s.length > 40) return { ok: true as const, data: { data: [] as TxnHit[], total: 0 } };
  return get<{ data: TxnHit[]; total: number }>(`/api/console/txn-search?${new URLSearchParams({ q: s, limit: "20" })}`);
}

/** One transaction from creation to now. */
export async function txnTimeline(ref: string) {
  if (!/^[A-Za-z0-9_-]{2,40}$/.test(ref)) return { ok: false as const, error: "เลขที่รายการไม่ถูกต้อง" };
  return get<TxnTimeline>(`/api/console/txn-search/${encodeURIComponent(ref)}`);
}
