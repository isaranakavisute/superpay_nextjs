"use server";

import { newId } from "@/lib/demo-ids";
import { consoleWrite } from "@/lib/api";
import { addDemoRecord, adminCall, bulkOverLimit, demoCallbackLog, demoFees, demoRecords, demoSlipQr, overLimit, signedCall, type DemoCall, type DemoCallbackLog, type DemoFees, type DemoPayment, type DemoPayout } from "@/lib/demo-api";

export type DemoResult = { ok: true; call: DemoCall } | { ok: false; error: string };


/** `write`: counts toward the per-visitor limit — reads (balance, status, the page's own refresh) never do. */
async function run(fn: () => Promise<DemoCall>, write = true): Promise<DemoResult> {
  if (write && (await overLimit())) return { ok: false, error: "เรียกถี่เกินไป — รอสักครู่แล้วลองใหม่ (สูงสุด 20 ครั้ง/นาที)" };
  try {
    return { ok: true, call: await fn() };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "เกิดข้อผิดพลาด" };
  }
}

const money = (v: string) => Number(String(v).replace(/,/g, ""));
const clean = <T extends Record<string, unknown>>(o: T) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== "" && v !== undefined)) as T;

export async function demoBalance(dry = false): Promise<DemoResult> {
  return run(() => signedCall("GET", "/api/v1/balance", undefined, {}, dry), false);
}

/** Which endpoint the demo calls: v1 as before, or v2 (= v1 + redirect_url). */
type PayForm = { amount: string; description: string; memberName: string; api?: "v1" | "v2"; redirectUrl?: string };
const createPath = (f: PayForm) => (f.api === "v2" ? "/api/v2/payment/create" : "/api/v1/payment/create");
/** v2 only: redirect_url when filled in (v1 never gets it). */
const v2Extra = (f: PayForm) => (f.api === "v2" && f.redirectUrl?.trim() ? { redirect_url: f.redirectUrl.trim() } : {});

export async function demoCreatePayment(f: PayForm & { orderId: string }, dry = false): Promise<DemoResult> {
  const amount = money(f.amount);
  if (!(amount > 0)) return { ok: false, error: "กรุณาใส่ยอดเงินมากกว่า 0" };
  const metadata = clean({ memberName: f.memberName.trim() });
  return run(async () => {
    const c = await signedCall("POST", createPath(f), clean({ amount, orderId: f.orderId.trim(), description: f.description.trim(), ...(Object.keys(metadata).length ? { metadata } : {}), ...v2Extra(f) }), {}, dry);
    const ref = (c.json?.transaction as { ref?: string } | undefined)?.ref;
    if (c.ok && ref) await addDemoRecord("payment", ref);
    return c;
  });
}

export async function demoUploadSlip(ref: string, file: { mime: string; data: string }, dry = false): Promise<DemoResult> {
  const r = ref.trim().toUpperCase();
  if (!/^TXN\d+$/.test(r)) return { ok: false, error: "กรุณาใส่เลขที่รายการ (ref) เช่น TXN100001 — ได้จากขั้นตอนที่ 1" };
  if (!["image/png", "image/jpeg", "image/webp"].includes(file.mime)) return { ok: false, error: "ไฟล์สลิปต้องเป็น PNG / JPG / WEBP" };
  if (file.data.length > 11_000_000) return { ok: false, error: "รูปต้องไม่เกิน 8 MB" };
  return run(() => signedCall("POST", `/api/v1/payment/${r}/slip`, { mime: file.mime, image: file.data }, {}, dry));
}

export async function demoCreatePayout(f: { amount: string; bankCode: string; accountNumber: string; accountName: string; merchantRef: string; description: string }, dry = false): Promise<DemoResult> {
  const amount = money(f.amount);
  if (!(amount > 0)) return { ok: false, error: "กรุณาใส่ยอดเงินมากกว่า 0" };
  if (!/^\d[\d\s-]{5,24}$/.test(f.accountNumber.trim())) return { ok: false, error: "กรุณาใส่เลขบัญชีผู้รับ (ตัวเลข 6–20 หลัก)" };
  if (!f.accountName.trim()) return { ok: false, error: "กรุณาใส่ชื่อบัญชีผู้รับ" };
  const body = clean({
    amount,
    bankCode: f.bankCode,
    accountNumber: f.accountNumber.trim(),
    accountName: f.accountName.trim(),
    merchantRef: f.merchantRef.trim(),
    description: `[DEMO] ${f.description.trim()}`.trim(),
  });
  return run(async () => {
    const c = await signedCall("POST", "/api/v1/payout/create", body, body.merchantRef ? { "Idempotency-Key": body.merchantRef } : {}, dry);
    const ref = (c.json?.payout as { id?: string } | undefined)?.id;
    if (c.ok && ref) await addDemoRecord("payout", ref);
    return c;
  });
}

/** รายการเงินเข้า / รายการเงินออก of this page only. */
export async function demoLists(): Promise<{ payments: DemoPayment[]; payouts: DemoPayout[] } | null> {
  return demoRecords().catch(() => null);
}

/** Row actions work only on what this page created — never on the shop's other orders. */
async function own(kind: "payment", ref: string): Promise<DemoPayment | null>;
async function own(kind: "payout", ref: string): Promise<DemoPayout | null>;
async function own(kind: "payment" | "payout", ref: string) {
  const l = await demoRecords().catch(() => null);
  const r = ref.trim().toUpperCase();
  return (kind === "payment" ? l?.payments.find((x) => x.ref === r) : l?.payouts.find((x) => x.ref === r)) ?? null;
}
const notOwn = { ok: false as const, error: "ทำได้เฉพาะรายการที่สร้างจากหน้า demo นี้" };

export async function demoCheckPayment(ref: string): Promise<DemoResult> {
  if (!(await own("payment", ref))) return notOwn;
  return run(() => signedCall("GET", `/api/v1/transactions/${ref.trim().toUpperCase()}`), false);
}

export async function demoCancelPayment(ref: string): Promise<DemoResult> {
  if (!(await own("payment", ref))) return notOwn;
  return run(() => signedCall("PATCH", `/api/v1/transactions/${ref.trim().toUpperCase()}/cancel`));
}

export async function demoCheckPayout(ref: string): Promise<DemoResult> {
  if (!(await own("payout", ref))) return notOwn;
  return run(() => signedCall("GET", `/api/v1/payout/${ref.trim().toUpperCase()}`), false);
}

/** What the DEMO slip of one of this page's open orders shows, with its signed QR. */
export async function demoSlipData(ref: string): Promise<{ ok: true; qr: string; ref: string; amount: number; accountName: string | null; accountNo: string | null; bankCode: string | null; customerName: string | null } | { ok: false; error: string }> {
  const p = await own("payment", ref);
  if (!p) return { ok: false, error: "สร้างสลิป DEMO ได้เฉพาะรายการที่สร้างจากหน้านี้ — เริ่มที่ขั้นตอนที่ 1" };
  if (!["pending", "expired"].includes(p.status.toLowerCase())) return { ok: false, error: `รายการ ${p.ref} ไม่ได้รอชำระแล้ว` };
  const amount = Number(p.amount);
  return { ok: true, qr: await demoSlipQr(p.ref, amount), ref: p.ref, amount, accountName: null, accountNo: p.accountNo, bankCode: p.accountBankCode, customerName: p.customerName };
}

/** Callback log (webhook + Telegram) of this page's orders. */
export async function demoCallbacks(): Promise<DemoCallbackLog[] | null> {
  return demoCallbackLog().catch(() => null);
}

/** "admin ดำเนินการ" of one of this page's payouts (yes = the team made the transfer) — same backend call as the console. */
export async function demoSetAdminDone(ref: string, done: boolean): Promise<{ ok: boolean; error?: string }> {
  if (!(await own("payout", ref))) return notOwn;
  const r = await consoleWrite("POST", `/api/console/outflows/${ref.trim().toUpperCase()}/admin-done`, "demo-page", { done });
  return r.ok ? { ok: true } : { ok: false, error: r.error };
}

const reasonOk = (r: string) => r.trim().length >= 3;

/** Reject a payout of this page (pending, or auto-approved and not yet transferred): payout.failed callback + refund. */
export async function demoRejectPayout(ref: string, reason: string): Promise<DemoResult> {
  const o = await own("payout", ref);
  if (!o) return notOwn;
  if (!reasonOk(reason)) return { ok: false, error: "กรุณาระบุเหตุผล (อย่างน้อย 3 ตัวอักษร)" };
  return run(() => adminCall("POST", `/api/console/outflows/${o.ref}/reject`, { reason: reason.trim() }));
}

/** Delete (soft) a record of this page — an open one is rejected first (callback sent), like the console's ลบ. */
export async function demoDelete(kind: "payment" | "payout", ref: string, reason: string): Promise<DemoResult> {
  const r = kind === "payment" ? await own("payment", ref) : await own("payout", ref);
  if (!r) return notOwn;
  if (!reasonOk(reason)) return { ok: false, error: "กรุณาระบุเหตุผลที่ลบ (อย่างน้อย 3 ตัวอักษร)" };
  return run(() => adminCall("DELETE", `/api/console/${kind === "payment" ? "payments" : "outflows"}/${r.ref}`, { reason: reason.trim() }));
}

/** Fee rates and totals of the demo shop (ร้านค้า / ยอดคงเหลือ cards). */
export async function demoShopFees(): Promise<DemoFees | null> {
  return demoFees().catch(() => null);
}

/**
 * Change the demo shop's fee % (payment / payout) — the console's rates call (same checks: not below the parent's,
 * not above a sub-shop's). New transactions only; the flat fees stay as they are. Kept to 0–10% on this public page.
 */
export async function demoSetFees(feePercent: number, outFeePercent: number): Promise<{ ok: boolean; error?: string }> {
  if (await overLimit()) return { ok: false, error: "เรียกถี่เกินไป — รอสักครู่แล้วลองใหม่" };
  const ok = (n: number) => Number.isFinite(n) && n >= 0 && n <= 10 && Math.round(n * 100) === n * 100;
  if (!ok(feePercent) || !ok(outFeePercent)) return { ok: false, error: "ใส่ % ได้ 0 – 10 (ทศนิยมไม่เกิน 2 ตำแหน่ง)" };
  const f = await demoFees().catch(() => null);
  if (!f) return { ok: false, error: "ไม่พบร้านทดลอง" };
  const r = await consoleWrite("POST", `/api/console/merchants/${f.id}/rates`, "demo-page",
    { feePercent, feeFlat: Number(f.feeFlat), outFeePercent, outFeeFlat: Number(f.outFeeFlat) });
  return r.ok ? { ok: true } : { ok: false, error: r.error };
}

// "use server" files may export only async functions — the limit stays private here (the page shows the same 100).
const BULK_MAX = 100;

/**
 * สร้างหลายรายการ: `count` real, signed POST /payment/create calls, 10 at a time, each with its own orderId
 * (<base>-001, -002 …). Returns one combined result: every curl command, and per order its ref or error.
 */
export async function demoCreatePaymentsBulk(f: PayForm, count: number): Promise<DemoResult & { bulk?: { orderId: string; ref: string | null; status: number; error: string | null; ms: number }[] }> {
  const n = Math.floor(Number(count));
  if (!(n >= 1 && n <= BULK_MAX)) return { ok: false, error: `ใส่จำนวน 1 – ${BULK_MAX} รายการ` };
  const amount = money(f.amount);
  if (!(amount > 0)) return { ok: false, error: "กรุณาใส่ยอดเงินมากกว่า 0" };
  if (await bulkOverLimit()) return { ok: false, error: "สร้างหลายรายการได้ไม่เกิน 3 ครั้งต่อ 10 นาที — รอสักครู่แล้วลองใหม่" };
  const base = newId("DEMO");
  const metadata = clean({ memberName: f.memberName.trim() });
  const jobs = Array.from({ length: n }, (_, i) => `${base}-${String(i + 1).padStart(3, "0")}`);
  const out: { orderId: string; call: DemoCall | null; error: string | null }[] = [];
  const started = Date.now();
  // 10 at a time — "at once" without opening 100 connections from one visitor.
  for (let i = 0; i < jobs.length; i += 10) {
    const part = await Promise.all(jobs.slice(i, i + 10).map(async (orderId) => {
      try {
        const c = await signedCall("POST", createPath(f), clean({ amount, orderId, description: f.description.trim(), ...(Object.keys(metadata).length ? { metadata } : {}), ...v2Extra(f) }));
        const ref = (c.json?.transaction as { ref?: string } | undefined)?.ref;
        if (c.ok && ref) await addDemoRecord("payment", ref);
        return { orderId, call: c, error: null };
      } catch (e) {
        return { orderId, call: null, error: e instanceof Error ? e.message : "เกิดข้อผิดพลาด" };
      }
    }));
    out.push(...part);
  }
  const bulk = out.map(({ orderId, call, error }) => ({
    orderId,
    ref: ((call?.json?.transaction as { ref?: string } | undefined)?.ref) ?? null,
    status: call?.status ?? 0,
    error: error ?? (call && !call.ok ? ((call.json?.error as { message?: string } | undefined)?.message ?? `HTTP ${call.status}`) : null),
    ms: call?.ms ?? 0,
  }));
  const okCount = bulk.filter((b) => b.ref).length;
  const ms = Date.now() - started;
  const curls = out.map((o, i) => `# ${i + 1}/${n} · orderId ${o.orderId}\n${o.call?.curl ?? `# ส่งไม่ได้: ${o.error}`}`);
  const summary = {
    success: okCount === n,
    requested: n,
    created: okCount,
    failed: n - okCount,
    totalMs: ms,
    refs: bulk.filter((b) => b.ref).map((b) => `${b.ref} (${b.orderId})`),
    errors: bulk.filter((b) => b.error).map((b) => `${b.orderId}: ${b.error}`),
  };
  const first = out[0]?.call;
  return {
    ok: true,
    bulk,
    call: {
      ok: okCount > 0,
      status: okCount === n ? 200 : okCount > 0 ? 207 : first?.status ?? 0,
      ms,
      curl: curls.join("\n\n"),
      curlShort: `${first?.curlShort ?? ""}\n\n# … และอีก ${n - 1} คำสั่ง (orderId ต่างกัน) — ส่งพร้อมกันครั้งละ 10 · คำสั่งทั้งหมดอยู่ในกล่องใต้ปุ่ม`,
      response: JSON.stringify(summary, null, 2),
      json: summary,
    },
  };
}

/** DEMO-slip data for many of this page's open orders at once (one list read, not one per order). */
export async function demoSlipDataMany(refs: string[]): Promise<{ ok: true; items: { ref: string; qr: string; amount: number; accountNo: string | null; bankCode: string | null; customerName: string | null }[]; skipped: { ref: string; why: string }[] } | { ok: false; error: string }> {
  if (!Array.isArray(refs) || !refs.length || refs.length > 100) return { ok: false, error: "เลือกได้ 1 – 100 รายการ" };
  const l = await demoRecords().catch(() => null);
  if (!l) return { ok: false, error: "โหลดรายการไม่ได้ — ลองใหม่อีกครั้ง" };
  const items = [], skipped = [];
  for (const raw of refs) {
    const ref = String(raw).trim().toUpperCase();
    const p = l.payments.find((x) => x.ref === ref);
    if (!p) { skipped.push({ ref, why: "ไม่ใช่รายการจากหน้านี้" }); continue; }
    if (!["pending", "expired"].includes(p.status.toLowerCase())) { skipped.push({ ref, why: `สถานะ ${p.status} — ไม่ได้รอชำระแล้ว` }); continue; }
    const amount = Number(p.amount);
    items.push({ ref, qr: await demoSlipQr(ref, amount), amount, accountNo: p.accountNo, bankCode: p.accountBankCode, customerName: p.customerName });
  }
  return { ok: true, items, skipped };
}

/**
 * แนบสลิปหลายรายการ: up to 10 slips per call (the page sends the rest in further calls), each a real, signed
 * POST /payment/:ref/slip, all at once. Counts once toward the per-visitor limit.
 */
export async function demoUploadSlipsBatch(items: { ref: string; mime: string; data: string }[]): Promise<{ ok: true; results: { ref: string; call: DemoCall | null; error: string | null }[] } | { ok: false; error: string }> {
  if (!Array.isArray(items) || !items.length || items.length > 10) return { ok: false, error: "ส่งได้ครั้งละ 1 – 10 สลิป" };
  if (await overLimit()) return { ok: false, error: "เรียกถี่เกินไป — รอสักครู่แล้วลองใหม่ (สูงสุด 20 ครั้ง/นาที)" };
  const l = await demoRecords().catch(() => null);
  const mine = new Set((l?.payments ?? []).map((x) => x.ref));
  const results = await Promise.all(items.map(async ({ ref, mime, data }) => {
    const r = String(ref).trim().toUpperCase();
    if (!mine.has(r)) return { ref: r, call: null, error: "ไม่ใช่รายการจากหน้านี้" };
    if (!["image/png", "image/jpeg", "image/webp"].includes(mime) || data.length > 11_000_000) return { ref: r, call: null, error: "ไฟล์สลิปไม่ถูกต้อง" };
    try { return { ref: r, call: await signedCall("POST", `/api/v1/payment/${r}/slip`, { mime, image: data }), error: null }; }
    catch (e) { return { ref: r, call: null, error: e instanceof Error ? e.message : "เกิดข้อผิดพลาด" }; }
  }));
  return { ok: true, results };
}
