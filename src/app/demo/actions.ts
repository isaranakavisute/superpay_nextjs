"use server";

import { consoleWrite } from "@/lib/api";
import { addDemoRecord, adminCall, demoCallbackLog, demoFees, demoRecords, demoSlipQr, overLimit, signedCall, type DemoCall, type DemoCallbackLog, type DemoFees, type DemoPayment, type DemoPayout } from "@/lib/demo-api";

export type DemoResult = { ok: true; call: DemoCall } | { ok: false; error: string };

// Payouts are real requests on the demo shop's balance (the team still transfers them by hand) — keep them small.
const MAX_PAYOUT = 100;

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

export async function demoCreatePayment(f: { amount: string; orderId: string; description: string; memberName: string }, dry = false): Promise<DemoResult> {
  const amount = money(f.amount);
  if (!(amount > 0)) return { ok: false, error: "กรุณาใส่ยอดเงินมากกว่า 0" };
  const metadata = clean({ memberName: f.memberName.trim() });
  return run(async () => {
    const c = await signedCall("POST", "/api/v1/payment/create", clean({ amount, orderId: f.orderId.trim(), description: f.description.trim(), ...(Object.keys(metadata).length ? { metadata } : {}) }), {}, dry);
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
  if (amount > MAX_PAYOUT) return { ok: false, error: `หน้า demo โอนออกได้ไม่เกิน ${MAX_PAYOUT} บาทต่อรายการ` };
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
