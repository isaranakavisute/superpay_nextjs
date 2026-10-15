import { listResource } from "@/lib/api";
import { portalPerms, requirePortal } from "@/lib/portal";
import type { OutflowRow } from "@/lib/rows";
import { PAYOUT_STATUS, SOURCE_LABEL, STATUS_PARAM, toView } from "../data";

const cell = (v: unknown) => {
  const s = v == null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
};

/** The shop's payouts as CSV (same filters as the page, up to 5,000 rows, UTF-8 with BOM for Excel). */
export async function GET(req: Request) {
  const user = await requirePortal("/merchant/payouts");
  if (!(await portalPerms(user)).has("view_transactions")) return new Response("Forbidden", { status: 403 });
  const u = new URL(req.url).searchParams;
  const rows: OutflowRow[] = [];
  for (let offset = 0; offset < 5000; offset += 200) {
    const page = await listResource<OutflowRow>("outflows", { merchantId: String(user.merchantId), status: STATUS_PARAM[u.get("status") ?? ""], q: u.get("q") ?? undefined, limit: 200, offset });
    rows.push(...page.data);
    if (page.data.length < 200) break;
  }
  const head = "เลขที่,merchantRef,ประเภท,ธนาคารผู้รับ,เลขบัญชีผู้รับ,ชื่อผู้รับ,ยอด,ค่าธรรมเนียม,หักจากร้าน,สถานะ,เหตุผล (ไม่สำเร็จ),สร้างเมื่อ,อนุมัติ/ปิดเมื่อ";
  const lines = rows.map(toView).map((o) => [o.ref, o.merchantRef, SOURCE_LABEL[o.source] ?? o.source, o.receiverBankCode, o.receiverAccount, o.receiverName,
    o.amount, o.fee, (Number(o.amount) + Number(o.fee)).toFixed(2), PAYOUT_STATUS[o.status]?.[0] ?? o.status, o.failureReason, o.createdAt, o.completedAt].map(cell).join(","));
  const name = `payouts-${user.merchantId}-${new Date().toISOString().slice(0, 10)}.csv`;
  return new Response("﻿" + [head, ...lines].join("\n"), {
    headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="${name}"`, "cache-control": "no-store" },
  });
}
