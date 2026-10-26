import "server-only";
import type { OutflowCategory, OutflowStatus, PaymentStatus } from "./domain";
import { errorText } from "./api-error";

// Server-side client for the superpayment backend. URL and key never reach the browser.
const BASE = process.env.BACKEND_URL ?? "http://localhost:3001";
// Shared secret the backend requires on console endpoints (CONSOLE_API_KEY in both projects).
const KEY = process.env.CONSOLE_API_KEY ?? "";

/** Headers for every console call; `actor` names the signed-in operator for audit entries. */
export function consoleHeaders(actor?: string): Record<string, string> {
  return { "x-console-key": KEY, ...(actor ? { "x-console-actor": actor } : {}) };
}

/**
 * Console headers naming who is looking (x-console-user-id): private test records are shown only to their owner
 * (backend shared/private-records.js). Use for every read of lists / totals.
 */
/**
 * x-console-user-id for a write made as `actor`: the backend checks that operator's role (สิทธิ์การเข้าถึง). The id is
 * needed because two console accounts may share a username (e.g. "admin" — one Admin, one Super Admin).
 */
async function operatorId(actor: string): Promise<Record<string, string>> {
  const me = await (await import("./session")).getSessionUser().catch(() => null);
  return me && me.username === actor ? { "x-console-user-id": String(me.id) } : {};
}

export async function viewerHeaders(): Promise<Record<string, string>> {
  const me = await (await import("./session")).getSessionUser().catch(() => null);
  return { ...consoleHeaders(me?.username), ...(me ? { "x-console-user-id": String(me.id) } : {}) };
}

// The backend returns numeric/bigint columns as strings to keep full precision.
type Money = string;

export type DashboardSummary = {
  window: { from: string | null; to: string | null };
  payments: {
    byStatus: { status: PaymentStatus; count: number; amount: Money; fee: Money; commission: Money }[];
    totalCount: number;
    pendingLiveCount: number;
    recent: {
      ref: string;
      merchantId: number | null;
      merchantName: string | null;
      customerName: string;
      payerBankCode: string;
      payerBankName: string;
      payerAccountMasked: string | null;
      receiveAccount: string;
      accountBankCode: string;
      accountBankName: string;
      accountName: string | null;
      accountNo: string | null;
      amount: Money;
      fee: Money;
      currency: string;
      status: PaymentStatus;
      createdAt: string;
    }[];
  };
  outflows: {
    byStatus: { status: OutflowStatus; count: number; amount: Money }[];
    pendingLiveCount: number;
    recent: {
      ref: string;
      merchantId: number | null;
      merchantName: string | null;
      category: OutflowCategory;
      fromAccount: string | null;
      receiverName: string;
      receiverBankCode: string;
      receiverBankName: string;
      receiverAccount: string;
      amount: Money;
      currency: string;
      status: OutflowStatus;
      createdAt: string;
    }[];
  };
  receivingAccounts: number;
  users: number;
  merchants: {
    id: number;
    name: string;
    slug: string;
    feePercent: Money;
    feeFlat: Money;
    outFeePercent?: Money;
    outFeeFlat?: Money;
    status: "active" | "suspended";
    depositTotal: Money;
    depositCount: number;
    feeTotal: Money;
    withdrawTotal: Money;
    withdrawCount: number;
    currentBalance: Money;
    pendingCount: number;
  }[];
};

export type TrendPoint = { day: string; amount: Money; fee?: Money; count: number };

async function get<T>(path: string): Promise<T> {
  const res = await fetch(BASE + path, { cache: "no-store", headers: await viewerHeaders() });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(errorText(body, `${path} → HTTP ${res.status}`));
  }
  return res.json();
}

/** `from`/`to` are epoch ms; pass null for an unbounded side. */
export function getDashboardSummary(from: number | null, to: number | null) {
  const q = new URLSearchParams();
  if (from != null) q.set("from", new Date(from).toISOString());
  if (to != null) q.set("to", new Date(to).toISOString());
  return get<DashboardSummary>(`/api/dashboard/summary?${q}`);
}

export async function getDashboardTrend(days: number, merchantId?: number) {
  return (await get<{ data: TrendPoint[] }>(`/api/dashboard/trend?days=${days}${merchantId ? `&merchantId=${merchantId}` : ""}`)).data;
}

export type AuthUser = { id: number; username: string; fullName: string; roleCode: string | null; roleName: string | null };

/** Checks credentials against the backend (user_password). Returns null on bad credentials. */
export type LoginResult = AuthUser | "invalid" | "totp_required" | "totp_invalid";

export async function verifyLogin(username: string, password: string, ip?: string, code?: string): Promise<LoginResult> {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json", ...consoleHeaders(), ...(ip ? { "x-forwarded-for": ip } : {}) },
    body: JSON.stringify({ username, password, ...(code ? { code } : {}) }),
    cache: "no-store",
  });
  if (res.status === 400) return "invalid";
  if (res.status === 401) {
    // 401 is also what a missing/wrong console key gets; tell those apart.
    const err = (await res.json().catch(() => null))?.error;
    if (err?.message === "Missing or invalid console key") throw new Error("console key rejected by backend");
    return err?.code === "totp_required" || err?.code === "totp_invalid" ? err.code : "invalid";
  }
  if (!res.ok) throw new Error(`login → HTTP ${res.status}`);
  return (await res.json()).user;
}

// ---- Generic console lists: GET /api/console/:resource ----

export type Row = Record<string, unknown>;
export type ListResult<T = Row> = {
  data: T[];
  pagination: { total: number; limit: number; offset: number };
  summary: { key: string; count: number; amount?: Money }[];
};

/** `params` are passed through as-is; nullish values are dropped. */
export function listResource<T = Row>(resource: string, params: Record<string, string | number | null | undefined> = {}) {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v != null && v !== "") q.set(k, String(v));
  return get<ListResult<T>>(`/api/console/${encodeURIComponent(resource)}?${q}`);
}

export type Alerts = {
  queues: { payments: number; outflows: number; withdrawals: number; doubleCredits: number; events: number };
  lowBalanceMerchants: { id: number; name: string; slug: string; currentBalance: Money; minBalance: Money }[];
};

export const getAlerts = () => get<Alerts>("/api/dashboard/alerts");
export type DupOrder = {
  ref: string; merchantOrderId: string | null; merchantName: string | null; customerName: string | null; senderBank: string | null; senderLast4: string | null;
  amount: string; status: string; accountBank: string | null; accountLast4: string | null; createdAt: string; completedAt: string | null; reviewedBy: string | null;
  reviewNote: string | null; hasSlip: boolean; slipUploadedAt: string | null; transferredAt: string | null; slipAmount: string | null;
  transRef: string | null; imageId: string | null; slipProvider: string | null;
  callbacks: { event: string; statusCode: number | null; state: string | null; at: string }[];
};
export type RelationKind = "duplicate" | "reused" | "carry";
export type Relation = { kind: RelationKind; other: DupOrder | null; order: DupOrder; sameOrder: boolean };
/** An order and the order its สถานะ note points at (23:00 duplicate rule, slip reused, carry-over). */
export const getRelation = (ref: string) => get<Relation>(`/api/console/payments/${encodeURIComponent(ref)}/relation`);
export type LiveQuota = {
  checkedAt: string; threshold: number; provider: string | null; ok: boolean; message: string;
  quota: { remaining: number | null; total: number | null; used: number | null; expiresAt: string | null } | null;
};
/** Slip provider quota right now (backend caches it 30 s; the provider's account call uses no quota). */
export const getLiveQuota = () => get<{ quota: LiveQuota }>("/api/console/config/quota/live").then((r) => r.quota);

// ---- Console write actions ----

export type ActionResult = { ok: true; [k: string]: unknown } | { ok: false; error: string };

/** POST/DELETE to a console endpoint on behalf of `actor`; backend errors come back as { ok: false }. */
export async function consoleWrite(method: "POST" | "DELETE", path: string, actor: string, body?: unknown): Promise<ActionResult> {
  try {
    const res = await fetch(BASE + path, {
      method,
      cache: "no-store",
      headers: { "content-type": "application/json", ...consoleHeaders(actor), ...(await operatorId(actor)) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const json = await res.json().catch(() => null);
    if (!res.ok) return { ok: false, error: errorText(json, `HTTP ${res.status}`) };
    return { ok: true, ...(json ?? {}) };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
