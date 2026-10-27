import { rangeFromParams, rangeWindow, resolveRange } from "@/components/dashboard/range";
import { listResource } from "@/lib/api";
import { bkkDayStart } from "@/lib/domain";
import type { OutflowRow } from "@/lib/rows";
import { getSessionUser } from "@/lib/session";

const cell = (v: unknown) => {
  const s = v == null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
};
/** Kept as text in Excel (account numbers / refs keep their leading zeros). */
const text = (v: string | null) => (v ? `="${v.replaceAll('"', '""')}"` : "");
/** Bangkok time as "YYYY-MM-DD HH:mm:ss" — sorts and filters as a date in Excel. */
const bkk = (v: string | null) => (v ? new Date(new Date(v).getTime() + 7 * 3_600_000).toISOString().slice(0, 19).replace("T", " ") : "");
const SOURCE: Record<string, string> = { api: "api", withdrawal: "คำขอถอน", manual: "manual", p2p: "P2P", portal: "portal" };
const MAX = 20_000;

/**
 * "admin ดำเนินการเรียบร้อยแล้ว" (approved + admin ดำเนินการ = yes) as CSV for Excel — the same date range and filters as
 * the page, every row (up to 20,000), UTF-8 with BOM so Thai opens correctly.
 */
export async function GET(req: Request) {
  if (!(await getSessionUser())) return new Response("Unauthorized", { status: 401 });
  const u = new URL(req.url).searchParams;
  const params = Object.fromEntries(u.entries());
  const today = bkkDayStart(Date.now());
  const range = resolveRange(rangeFromParams(params, today), today);
  const filters = { q: u.get("q"), category: u.get("category"), account: u.get("account"), ...rangeWindow(range), status: "approved", adminDone: "yes" };
  const rows: OutflowRow[] = [];
  for (let offset = 0; offset < MAX; offset += 200) {
    const page = await listResource<OutflowRow>("outflows", { ...filters, limit: 200, offset });
    rows.push(...page.data);
    if (page.data.length < 200) break;
  }
  const head = "เลขที่,merchantRef,ร้านค้า,หักจาก,ธนาคารผู้รับ,เลขบัญชีผู้รับ,ชื่อผู้รับ,ยอด,ค่าธรรมเนียม,สถานะ,ที่มา,สร้างเมื่อ,ถอนสำเร็จเมื่อ,admin ผู้ดำเนินการ,รายละเอียด";
  const lines = rows.map((o) => [
    o.ref, text(o.merchantRef), o.merchantName ?? "house",
    o.merchantId != null ? `ยอดร้าน ${o.merchantName ?? ""}` : (o.fromAccount ?? ""),
    o.receiverBankName || o.receiverBankCode, text(o.receiverAccount), o.receiverName,
    Number(o.amount).toFixed(2), Number(o.fee).toFixed(2), "ถอนสำเร็จ", SOURCE[o.source] ?? o.source,
    bkk(o.createdAt), bkk(o.adminDoneAt ?? o.completedAt), o.adminDoneBy ?? "", o.description ?? "",
  ].map(cell).join(","));
  const name = `payouts-admin-done-${range.isAll ? "all" : bkk(new Date(range.from).toISOString()).slice(0, 10)}.csv`;
  return new Response("﻿" + [head, ...lines].join("\r\n"), {
    headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="${name}"`, "cache-control": "no-store" },
  });
}
