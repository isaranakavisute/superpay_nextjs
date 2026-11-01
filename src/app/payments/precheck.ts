"use server";

import { listResource } from "@/lib/api";
import { getSessionUser } from "@/lib/session";
import type { MerchantRow, PaymentRow } from "@/lib/rows";

/**
 * Checks before an admin creates a payment, or ties one to a shop (1 Nov 2026 — TXN220444 / 220445 / 220458 / 220480:
 * orders made by hand under the parent shop, without the shop's Order ID, while the customer's real order was at a child
 * shop; the shop's system could not find them, or rejected the signature). Red = must be ticked before going on.
 */
export type PrecheckInput = { merchantId: number | null; merchantOrderId?: string; customerName?: string; amount?: number; bankAccountId?: number; exceptRef?: string };
export type PrecheckWarning = { level: "red" | "yellow"; text: string };
export type PrecheckSuggestion = { ref: string; merchantId: number; merchantName: string; orderId: string; amount: string; status: string; createdAt: string; customerName: string };
export type PrecheckResult = { ok: true; warnings: PrecheckWarning[]; suggestions: PrecheckSuggestion[] } | { ok: false; error: string };

type Account = { id: number; label: string; status: string; merchantIds?: number[] | null };
const STATUS_TH: Record<string, string> = { pending: "รอชำระ", expired: "หมดอายุ", rejected: "ยกเลิก/ปฏิเสธ", approved: "ชำระแล้ว", refunded: "คืนเงิน" };
const baht = (v: string | number) => Number(v).toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const norm = (s: string) => s.replace(/\s+/g, "").toLowerCase();

export async function precheckPayment(input: PrecheckInput): Promise<PrecheckResult> {
  if (!(await getSessionUser())) return { ok: false, error: "กรุณาเข้าสู่ระบบใหม่" };
  try {
    const w: PrecheckWarning[] = [];
    const suggestions: PrecheckSuggestion[] = [];
    const orderId = input.merchantOrderId?.trim() ?? "";
    const name = input.customerName?.trim() ?? "";
    const firstName = name.split(/\s+/)[0] ?? "";
    const since = new Date(Date.now() - 48 * 3600_000).toISOString();
    const [shops, accounts, byName, byOrder] = await Promise.all([
      listResource<MerchantRow>("merchants", { limit: 200 }),
      listResource<Account>("accounts", { limit: 200 }),
      firstName.length >= 2 ? listResource<PaymentRow>("payments", { q: firstName, from: since, to: new Date().toISOString(), limit: 200 }) : null,
      orderId ? listResource<PaymentRow>("payments", { q: orderId, limit: 20 }) : null,
    ]);
    const all = shops.data;
    const byId = new Map(all.map((m) => [m.id, m]));
    const m = input.merchantId != null ? byId.get(input.merchantId) ?? null : null;
    // the selected shop's whole family (its top shop and everything under it)
    const root = m ? (m.path?.[0] ?? m.id) : null;
    const family = new Set(root == null ? [] : all.filter((x) => x.id === root || (x.path ?? []).includes(root)).map((x) => x.id));
    const kids = m ? all.filter((x) => x.parentId === m.id) : [];

    // 10. house
    if (!m) w.push({ level: "yellow", text: "ไม่ผูกร้าน (house) — ไม่มีร้านใดได้รับเงินหรือได้รับแจ้งผล (callback)" });

    // 1. no shop Order ID
    if (m && !orderId) w.push({ level: "red", text: `ไม่มี Order ID ของร้าน — ระบบของร้าน ${m.name} จะหาออเดอร์นี้ไม่พบ (PAYMENT_LOG_NOT_FOUND) และลูกค้าจะไม่ได้รับเครดิตฝั่งร้าน · ใส่ Order ID ที่ร้านให้มา หรือใช้ออเดอร์เดิมของลูกค้า` });

    // 2. / 3. / 9. the customer's recent orders in this shop family (or anywhere, when no shop is chosen)
    const mine = (byName?.data ?? []).filter((p) => p.ref !== input.exceptRef && p.customerName && name && norm(p.customerName).startsWith(norm(firstName))
      && (root == null || (p.merchantId != null && family.has(p.merchantId))));
    const open = mine.filter((p) => ["pending", "expired", "rejected"].includes(String(p.status)) && p.merchantOrderId && p.merchantId != null);
    for (const p of open.slice(0, 5)) {
      suggestions.push({ ref: p.ref, merchantId: Number(p.merchantId), merchantName: p.merchantName ?? `#${p.merchantId}`, orderId: String(p.merchantOrderId), amount: String(p.amount), status: String(p.status), createdAt: String(p.createdAt), customerName: String(p.customerName) });
    }
    if (suggestions.length) {
      w.push({ level: "red", text: `พบออเดอร์เดิมของลูกค้า "${firstName}" ที่ยังไม่ได้ชำระ ${suggestions.length} รายการ (ด้านล่าง) — ควรชำระออเดอร์เดิมของร้านแทนการสร้างใหม่ (กด "ไปที่ออเดอร์นี้" แล้วแนบสลิป/อนุมัติที่ออเดอร์นั้น) · ออเดอร์ที่ถูกยกเลิกแล้วต้องให้ผู้ดูแลระบบเปิดใหม่` });
      const elsewhere = m ? suggestions.filter((s) => s.merchantId !== m.id) : [];
      if (elsewhere.length) w.push({ level: "red", text: `ออเดอร์เดิมของลูกค้าอยู่ที่ร้าน ${[...new Set(elsewhere.map((s) => s.merchantName))].join(", ")} แต่คุณเลือก ${m!.name} — callback จะลงชื่อด้วยคีย์ของ ${m!.name} ระบบร้านจะปฏิเสธ (INVALID_SIGNATURE) · เลือกร้านเดียวกับออเดอร์เดิม` });
    }
    if (input.amount && name) {
      const same = mine.find((p) => p.status === "pending" && Math.round(Number(p.amount) * 100) === Math.round(input.amount! * 100) && (!m || p.merchantId === m.id));
      if (same) w.push({ level: "yellow", text: `มีรายการรอชำระของลูกค้านี้ยอดเดียวกันอยู่แล้ว: ${same.ref} (${same.merchantName ?? "house"}) — อาจเป็นการสร้างซ้ำ` });
    }

    // 4. a parent shop with child shops
    if (m && kids.length) w.push({ level: "red", text: `${m.name} เป็นร้านแม่ที่มีร้านลูก: ${kids.map((k) => k.name).join(", ")} — ออเดอร์จากลูกค้ามักเป็นของร้านลูก ถ้าออเดอร์จริงอยู่ที่ร้านลูกแต่สร้างที่ร้านแม่ callback จะลายเซ็นไม่ตรง ร้านจะปฏิเสธ · ตรวจให้แน่ใจว่าเลือกร้านที่ออกออเดอร์จริง` });

    // 5. / 6. the Order ID
    if (orderId) {
      const hits = (byOrder?.data ?? []).filter((p) => p.merchantOrderId === orderId && p.ref !== input.exceptRef);
      for (const h of hits) {
        if (m && h.merchantId !== m.id) w.push({ level: "red", text: `Order ID นี้เป็นของร้าน ${h.merchantName ?? "house"} (${h.ref}) แต่คุณเลือก ${m.name} — ระบบร้านจะปฏิเสธลายเซ็น · เลือกร้าน ${h.merchantName}` });
        else w.push({ level: "red", text: `Order ID นี้ใช้กับ ${h.ref} แล้ว (${STATUS_TH[String(h.status)] ?? h.status} · ${baht(h.amount)} บาท) — ควรชำระ/แก้ไขออเดอร์นั้นแทนการสร้างใหม่` });
      }
      if (!hits.length && m) w.push({ level: "yellow", text: "ไม่พบ Order ID นี้ในระบบเรา — ตรวจให้ตรงกับเลขที่ร้านให้มาทุกตัวอักษร (เช่น PD-…)" });
    }

    // 7. below the shop's minimum
    if (m && input.amount && m.effMinDeposit && input.amount < m.effMinDeposit) {
      w.push({ level: "yellow", text: `ยอด ${baht(input.amount)} บาท ต่ำกว่ายอดฝากขั้นต่ำของร้าน ${m.name} (${baht(m.effMinDeposit)} บาท)` });
    }
    // 8. the receiving account
    const acc = input.bankAccountId ? accounts.data.find((a) => a.id === input.bankAccountId) : null;
    if (acc && acc.status !== "active") w.push({ level: "yellow", text: `บัญชีรับเงิน ${acc.label} ปิดใช้งานอยู่` });
    if (acc && m && acc.merchantIds?.length && !acc.merchantIds.some((id) => family.has(id))) {
      w.push({ level: "yellow", text: `บัญชีรับเงิน ${acc.label} ไม่ใช่บัญชีของร้าน ${m.name} — ตรวจว่าลูกค้าโอนเข้าบัญชีนี้จริง` });
    }
    return { ok: true, warnings: w, suggestions };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
