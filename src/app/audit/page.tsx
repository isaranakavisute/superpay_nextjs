import type { Metadata } from "next";
import { AlertTriangle } from "lucide-react";
import { param, type Params } from "@/components/list/query";
import { ConsoleShell } from "@/components/shell/ConsoleShell";
import { Card, PageHeader } from "@/components/ui";
import { listResource } from "@/lib/api";
import { fmtDateTime } from "@/lib/format";
import { requestTime } from "@/lib/request-time";
import type { AuditRow, UserRow } from "@/lib/rows";
import { AuditToolbar } from "./AuditToolbar";
import { FAMILIES, RANGES, auditWindow } from "./filters";

export const metadata: Metadata = { title: "บันทึกการตรวจสอบ — Option Pay Admin" };

const LIMIT = 500;
const td = "border-b border-line px-[18px] py-3 align-top";

/** Badge colour by action family. */
function actionTone(action: string) {
  if (/fail|lockout|reject|delete/.test(action)) return "bg-[#fee2e2] text-[#991b1b]";
  if (/^(payment|outflow|withdrawal|p2p|double_credit)\./.test(action)) return "bg-[#dbeafe] text-[#1e40af]";
  if (/^(user|apikey|role)\./.test(action)) return "bg-[#fef3c7] text-[#92400e]";
  if (/^auth\./.test(action)) return "bg-[#dcfce7] text-[#166534]";
  return "bg-[#e5e7eb] text-[#374151]";
}

export default async function AuditPage({ searchParams }: PageProps<"/audit">) {
  const params: Params = await searchParams;
  const now = await requestTime();
  const win = auditWindow(param(params, "range"), param(params, "from"), param(params, "to"), now);
  const filters = { q: param(params, "q"), family: param(params, "family"), entity: param(params, "entity"), ...win };

  let data;
  try {
    const [first, more, everything, users] = await Promise.all([
      listResource<AuditRow>("audit", { ...filters, limit: 200 }),
      listResource<AuditRow>("audit", { ...filters, limit: 200, offset: 200 }),
      listResource<AuditRow>("audit", { limit: 1 }),
      listResource<UserRow>("users", { limit: 200 }),
    ]);
    const third = first.pagination.total > 400 ? await listResource<AuditRow>("audit", { ...filters, limit: 100, offset: 400 }) : null;
    data = {
      rows: [...first.data, ...more.data, ...(third?.data ?? [])].slice(0, LIMIT),
      total: first.pagination.total,
      entities: everything.summary.map((s) => s.key),
      roleOf: Object.fromEntries(users.data.map((u) => [u.username, u.roleName])),
    };
  } catch (err) {
    data = err instanceof Error ? err.message : String(err);
  }

  const csvHref = `/audit/csv?${new URLSearchParams(Object.entries({ q: params.q, family: params.family, entity: params.entity, range: params.range, from: params.from, to: params.to }).filter((e): e is [string, string] => typeof e[1] === "string" && !!e[1]))}`;

  return (
    <ConsoleShell title="บันทึกการตรวจสอบ" path="/audit" search={{ placeholder: "ค้นหา action / ผู้ทำ / รายละเอียด...", params }}>
      <PageHeader title="บันทึกการตรวจสอบ (Audit Log)" subtitle="ใคร ทำอะไร เมื่อไหร่ จาก IP ไหน — เรียงใหม่สุดก่อน" />
      {typeof data === "string" ? (
        <Card className="flex items-start gap-3 p-5"><AlertTriangle className="mt-0.5 shrink-0 text-danger" size={20} /><div className="text-[13px] text-muted">{data}</div></Card>
      ) : (
        <>
          <AuditToolbar families={FAMILIES} entities={[{ value: "", label: "ทุก Entity" }, ...data.entities.map((e) => ({ value: e, label: e }))]} ranges={RANGES} csvHref={csvHref} />
          <Card className="overflow-hidden p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] border-collapse text-[13px]">
                <thead>
                  <tr>{["เวลา", "ผู้ทำ", "การกระทำ", "เป้าหมาย", "รายละเอียด", "IP"].map((h) => <th key={h} className="border-b border-line bg-surface-alt px-[18px] py-[13px] text-left text-xs font-semibold tracking-[0.5px] text-muted uppercase whitespace-nowrap">{h}</th>)}</tr>
                </thead>
                <tbody>
                  {data.rows.length === 0 ? (
                    <tr><td colSpan={6} className="px-5 py-12 text-center text-muted">ไม่มีรายการ</td></tr>
                  ) : (
                    data.rows.map((l) => (
                      <tr key={l.id} className="hover:bg-surface-alt">
                        <td className={`${td} text-[12.5px] whitespace-nowrap`}>{fmtDateTime(l.createdAt)}</td>
                        <td className={td}><div>{l.actor || "—"}</div>{data.roleOf[l.actor] && <div className="text-[10.5px] text-muted">{data.roleOf[l.actor]}</div>}</td>
                        <td className={td}><span className={`rounded px-2 py-0.5 font-mono text-[11.5px] ${actionTone(l.action)}`}>{l.action}</span></td>
                        <td className={td}>{l.entityRef ? <><strong>{l.entityRef}</strong><div className="text-[10.5px] text-muted">{l.entity}</div></> : <span className="text-muted">{l.entity}</span>}</td>
                        <td className={`${td} text-[12.5px] text-muted`}>{l.detail ?? "—"}</td>
                        <td className={`${td} font-mono text-[11.5px] text-muted`}>{l.ip ?? "—"}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
          <div className="mt-2.5 text-xs text-muted">
            แสดง {data.rows.length.toLocaleString()} จาก {data.total.toLocaleString()} รายการ · บันทึกนี้เขียนอย่างเดียว แก้/ลบไม่ได้
            {data.total > LIMIT && <span className="text-warning"> · แสดงสูงสุด {LIMIT} รายการ — ใช้ตัวกรองหรือดาวน์โหลด CSV (สูงสุด 5,000 รายการ)</span>}
          </div>
        </>
      )}
    </ConsoleShell>
  );
}
