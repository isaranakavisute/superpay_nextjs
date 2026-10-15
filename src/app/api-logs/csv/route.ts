import { rangeFromParams, rangeWindow, resolveRange } from "@/components/dashboard/range";
import { listResource } from "@/lib/api";
import { bkkDayStart } from "@/lib/domain";
import type { ApiLogRow } from "@/lib/rows";
import { getSessionUser } from "@/lib/session";
import { curlFor } from "@/lib/curl-for-log";

const cell = (v: unknown) => {
  const s = v == null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
};

/** API call log as CSV (same filters as the page, up to 20,000 rows, UTF-8 with BOM for Excel). */
export async function GET(req: Request) {
  if (!(await getSessionUser())) return new Response("Unauthorized", { status: 401 });
  const u = new URL(req.url).searchParams;
  const params = Object.fromEntries(u.entries());
  const today = bkkDayStart(Date.now());
  const win = rangeWindow(resolveRange(rangeFromParams(params, today), today));
  const rows: ApiLogRow[] = [];
  for (let offset = 0; offset < 20000; offset += 200) {
    const page = await listResource<ApiLogRow>("apiLogs", { q: u.get("q"), merchantId: u.get("merchantId"), method: u.get("method"), result: u.get("result"), source: u.get("source"), ...win, limit: 200, offset });
    rows.push(...page.data);
    if (page.data.length < 200) break;
  }
  const lines = rows.map((r) => [r.createdAt, r.source === "console" ? `ผู้ดูแลระบบ: ${r.actor ?? ""}` : "API ร้านค้า", r.merchantName, r.keyMerchantName, r.keyPrefix, r.keyUser, r.method, r.path, r.query, r.status, r.errorCode, r.durationMs, r.ip, r.userAgent, curlFor(r)].map(cell).join(","));
  return new Response("﻿" + ["เวลา,ประเภท,ร้าน,ร้านเจ้าของ key,API key,ผู้ใช้,method,path,query,HTTP,error,ms,IP,user-agent,คำสั่ง curl (key / secret / ลายเซ็น เป็นค่าตัวอย่าง)", ...lines].join("\n"), {
    headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": 'attachment; filename="api-call-log.csv"', "cache-control": "no-store" },
  });
}
