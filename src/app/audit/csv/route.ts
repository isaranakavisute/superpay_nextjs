import { listResource } from "@/lib/api";
import type { AuditRow } from "@/lib/rows";
import { getSessionUser } from "@/lib/session";
import { auditWindow } from "../filters";

const cell = (v: unknown) => {
  const s = v == null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
};

/** Audit log as CSV (up to 5,000 rows, UTF-8 with BOM for Excel). */
export async function GET(req: Request) {
  if (!(await getSessionUser())) return new Response("Unauthorized", { status: 401 });
  const u = new URL(req.url).searchParams;
  const win = auditWindow(u.get("range") ?? undefined, u.get("from") ?? undefined, u.get("to") ?? undefined, Date.now());
  const rows: AuditRow[] = [];
  for (let offset = 0; offset < 5000; offset += 200) {
    const page = await listResource<AuditRow>("audit", { q: u.get("q"), family: u.get("family"), entity: u.get("entity"), ...win, limit: 200, offset });
    rows.push(...page.data);
    if (page.data.length < 200) break;
  }
  const lines = rows.map((l) => [l.createdAt, l.actor, l.action, l.entity, l.entityRef, l.detail, l.ip].map(cell).join(","));
  return new Response("﻿" + ["เวลา,ผู้ทำ,การกระทำ,entity,เป้าหมาย,รายละเอียด,IP", ...lines].join("\n"), {
    headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": 'attachment; filename="audit-log.csv"', "cache-control": "no-store" },
  });
}
