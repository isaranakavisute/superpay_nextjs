import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, Shield, Trash2, Users } from "lucide-react";
import { param, withParams, type Params } from "@/components/list/query";
import { ConsoleShell } from "@/components/shell/ConsoleShell";
import { Badge, Card, PageHeader } from "@/components/ui";
import { listResource } from "@/lib/api";
import { fmtDateTime, initials } from "@/lib/format";
import type { RoleRow, UserRow } from "@/lib/rows";
import { getSessionUser } from "@/lib/session";
import { FilterCard } from "../payments/FilterCard";
import { NewUserButton, UserActions } from "./UserControls";

export const metadata: Metadata = { title: "จัดการผู้ใช้ — SuperPay Admin" };

type PortalUser = { id: number; username: string; fullName: string; tier: string; status: string; merchantName: string; lastLoginAt: string | null };
const th = "border-b border-line bg-surface-alt px-[18px] py-[13px] text-left text-xs font-semibold tracking-[0.5px] text-muted uppercase whitespace-nowrap";
const td = "px-[18px] py-[13px] align-middle";
const ROLE_TONE: Record<string, string> = {
  super_admin: "bg-[rgba(236,72,153,0.15)] text-[#f9a8d4]", admin: "bg-[rgba(139,92,246,0.15)] text-[#c4b5fd]",
  finance: "bg-[rgba(56,189,248,0.15)] text-[#7dd3fc]", support: "bg-[rgba(16,185,129,0.15)] text-[#6ee7b7]", viewer: "bg-[rgba(148,163,184,0.15)] text-[#cbd5e1]",
};
const STATUS: Record<string, [string, string]> = {
  active: ["ใช้งาน", "bg-[rgba(16,185,129,0.15)] text-[#6ee7b7]"], inactive: ["ปิดใช้", "bg-[rgba(148,163,184,0.15)] text-[#cbd5e1]"],
  locked: ["ล็อก", "bg-[rgba(239,68,68,0.15)] text-[#fca5a5]"], deleted: ["ถูกลบ", "bg-[rgba(148,163,184,0.1)] text-[#94a3b8] line-through"],
  disabled: ["ปิดใช้", "bg-[rgba(148,163,184,0.15)] text-[#cbd5e1]"],
};
const TIER: Record<string, string> = { owner: "เจ้าของร้าน", staff: "พนักงาน", viewer: "ดูอย่างเดียว" };

export default async function UsersPage({ searchParams }: PageProps<"/users">) {
  const params: Params = await searchParams;
  const tab = (["staff", "merchant", "deleted"] as const).find((t) => t === param(params, "tab")) ?? "staff";
  const q = param(params, "q");
  const me = await getSessionUser();

  let data;
  try {
    const [all, roles, portal] = await Promise.all([
      listResource<UserRow>("users", { q, role: param(params, "role"), limit: 200 }),
      listResource<RoleRow>("roles", { limit: 50 }),
      listResource<PortalUser>("portal-users", { q, limit: 200 }),
    ]);
    data = { all: all.data, roles: roles.data, portal: portal.data };
  } catch (err) {
    data = err instanceof Error ? err.message : String(err);
  }

  const shell = (body: React.ReactNode, roles: { code: string; name: string }[] = []) => (
    <ConsoleShell title="จัดการผู้ใช้" path="/users" search={{ placeholder: "ค้นหาผู้ใช้...", params }}>
      <PageHeader title="จัดการผู้ใช้" subtitle="เพิ่ม แก้ไข และกำหนดสิทธิ์ของผู้ใช้ในระบบ" actions={roles.length ? <NewUserButton roles={roles} /> : undefined} />
      {body}
    </ConsoleShell>
  );
  if (typeof data === "string") {
    return shell(<Card className="flex items-start gap-3 p-5"><AlertTriangle className="mt-0.5 shrink-0 text-danger" size={20} /><div className="text-[13px] text-muted">{data}</div></Card>);
  }

  const status = param(params, "status");
  const staff = data.all.filter((u) => u.status !== "deleted" && (!status || u.status === status));
  const deleted = data.all.filter((u) => u.status === "deleted");
  const roles = data.roles.map((r) => ({ code: r.code, name: r.name }));
  const rows = tab === "deleted" ? deleted : staff;
  const shown = tab === "merchant" ? data.portal.length : rows.length;
  const total = tab === "merchant" ? data.portal.length : tab === "deleted" ? deleted.length : data.all.filter((u) => u.status !== "deleted").length;

  return shell(
    <>
      <div className="mb-5 flex flex-wrap gap-1 border-b border-line">
        {([["staff", "ผู้ใช้งาน", staff.length, <Users key="i" size={15} />], ["merchant", "ผู้ใช้ร้านค้า", data.portal.length, <Shield key="i" size={15} />], ["deleted", "ผู้ใช้ที่ถูกลบ", deleted.length, <Trash2 key="i" size={15} />]] as const).map(([v, label, n, icon]) => (
          <Link key={v} href={withParams("/users", params, { tab: v === "staff" ? null : v })} className={`-mb-px inline-flex items-center gap-1.5 border-b-2 px-[18px] py-2.5 text-sm font-medium ${tab === v ? "border-primary text-primary" : "border-transparent text-muted hover:text-ink"}`}>
            {icon} {label} ({n})
          </Link>
        ))}
      </div>
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line">
          <div className="-mb-5 flex-1 [&>div]:mb-0 [&>div]:rounded-none [&>div]:border-0">
            <FilterCard
              searchPlaceholder="ค้นหาชื่อ / อีเมล / username..."
              filters={[
                ...(tab === "merchant" ? [] : [{ name: "role", options: [{ value: "", label: "ทุกระดับ" }, ...roles.map((r) => ({ value: r.code, label: r.name }))] }]),
                ...(tab === "deleted" ? [] : [{ name: "status", options: [{ value: "", label: "ทุกสถานะ" }, { value: "active", label: "ใช้งาน" }, { value: "inactive", label: "ปิดใช้" }, { value: "locked", label: "ล็อก" }] }]),
              ]}
            />
          </div>
          <div className="px-[22px] text-[13px] text-muted">แสดง {shown} จาก {total} รายการ</div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[13px]">
            <thead><tr>{["ผู้ใช้", tab === "merchant" ? "ร้านค้า" : "อีเมล / โทร", "ระดับสิทธิ์", "สถานะ", "เข้าใช้ล่าสุด", ...(tab === "merchant" ? [] : ["จัดการ"])].map((h) => <th key={h} className={`${th} ${h === "จัดการ" ? "text-right" : ""}`}>{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-line">
              {tab === "merchant"
                ? data.portal.map((u) => (
                    <tr key={u.id} className="hover:bg-surface-alt">
                      <td className={td}><div className="font-medium">{u.fullName}</div><div className="text-xs text-muted">@{u.username}</div></td>
                      <td className={td}>{u.merchantName}</td>
                      <td className={td}><Badge className="bg-surface-alt text-muted">{TIER[u.tier] ?? u.tier}</Badge></td>
                      <td className={td}><Badge className={STATUS[u.status]?.[1] ?? ""}>{STATUS[u.status]?.[0] ?? u.status}</Badge></td>
                      <td className={`${td} text-muted`}>{fmtDateTime(u.lastLoginAt)}</td>
                    </tr>
                  ))
                : rows.map((u) => {
                    const isSelf = u.id === me?.id;
                    return (
                      <tr key={u.id} className="hover:bg-surface-alt">
                        <td className={td}>
                          <div className="flex items-center gap-2.5">
                            <div className="grid size-9 shrink-0 place-items-center rounded-full bg-linear-to-br from-[#38bdf8] to-[#2563eb] text-[13px] font-semibold text-white">{initials(u.fullName)}</div>
                            <div><div className="font-medium">{u.fullName} {isSelf && <span className="text-primary">(คุณ)</span>}</div><div className="text-xs text-muted">@{u.username}</div></div>
                          </div>
                        </td>
                        <td className={td}><div>{u.email ?? "—"}</div><div className="text-xs text-muted">{u.phone ?? "-"}</div></td>
                        <td className={td}><Badge className={ROLE_TONE[u.roleCode] ?? ROLE_TONE.viewer}>{u.roleName}</Badge></td>
                        <td className={td}>
                          <div className="flex flex-col items-start gap-1">
                            <Badge className={STATUS[u.status][1]}>{STATUS[u.status][0]}</Badge>
                            {u.twoFactor ? <Badge className="bg-[rgba(16,185,129,0.15)] text-[#6ee7b7]">2FA เปิด</Badge> : <Badge className="bg-surface-alt text-muted">2FA ปิด</Badge>}
                          </div>
                        </td>
                        <td className={`${td} text-[13px] text-muted`}>{fmtDateTime(u.lastLoginAt)}</td>
                        <td className={td}><UserActions user={u} roles={roles} isSelf={isSelf} /></td>
                      </tr>
                    );
                  })}
              {shown === 0 && <tr><td colSpan={6} className="px-5 py-[60px] text-center text-muted">ไม่พบผู้ใช้ที่ตรงกับเงื่อนไข</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
    </>,
    roles,
  );
}
