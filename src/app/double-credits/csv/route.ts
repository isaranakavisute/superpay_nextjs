import { listResource } from "@/lib/api";
import type { DoubleCreditRow } from "@/lib/rows";
import { getSessionUser } from "@/lib/session";

const cell = (v: unknown) => {
  const s = v == null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
};

/** CSV of the open cases (UTF-8 with BOM so Excel shows Thai correctly). */
export async function GET(req: Request) {
  if (!(await getSessionUser())) return new Response("Unauthorized", { status: 401 });
  const url = new URL(req.url);
  const rows = (
    await listResource<DoubleCreditRow>("double-credits", {
      status: "open",
      merchantId: url.searchParams.get("merchantId"),
      from: url.searchParams.get("from"),
      to: url.searchParams.get("to"),
      limit: 200,
    })
  ).data;
  const header = ["ร้าน", "ออเดอร์ที่ได้เงินซ้ำ", "Order ID", "ยอด", "ค่าธรรมเนียม", "อนุมัติเองโดย", "อนุมัติเมื่อ", "ออเดอร์ที่ถือสลิป", "ระดับ", "เหตุผล", "อ้างอิงธนาคาร", "พบเมื่อ"];
  const lines = rows.map((d) =>
    [d.merchantName, d.creditedRef, d.creditedOrderId, d.amount, d.creditedFee, d.approvedBy, d.approvedAt, d.slipHolderRef, d.confidence, d.reason, d.bankRef, d.detectedAt].map(cell).join(","),
  );
  return new Response("﻿" + [header.join(","), ...lines].join("\n"), {
    headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": 'attachment; filename="double-credits.csv"', "cache-control": "no-store" },
  });
}
