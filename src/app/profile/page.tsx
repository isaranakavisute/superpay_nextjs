import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { ConsoleShell } from "@/components/shell/ConsoleShell";
import { Card, PageHeader } from "@/components/ui";
import { consoleHeaders, listResource } from "@/lib/api";
import { fmtDate, fmtDateTime } from "@/lib/format";
import type { RoleRow, UserRow } from "@/lib/rows";
import { getBranding } from "@/lib/branding";
import { getSessionUser } from "@/lib/session";
import { InfoForm, PasswordForm, TwoFactorCard } from "./ProfileForms";

export const metadata: Metadata = { title: "โปรไฟล์ — SuperPay Admin" };

const BASE = process.env.BACKEND_URL ?? "http://localhost:3001";
type Profile = { id: number; username: string; fullName: string; email: string | null; phone: string | null; roleCode: string; status: string; createdAt: string; twoFactorEnabledAt: string | null };
const ROLE_TONE: Record<string, string> = {
  super_admin: "bg-[rgba(236,72,153,0.15)] text-[#f9a8d4]", admin: "bg-[rgba(139,92,246,0.15)] text-[#c4b5fd]",
  finance: "bg-[rgba(56,189,248,0.15)] text-[#7dd3fc]", support: "bg-[rgba(16,185,129,0.15)] text-[#6ee7b7]", viewer: "bg-[rgba(148,163,184,0.15)] text-[#cbd5e1]",
};
const STATUS: Record<string, [string, string]> = {
  active: ["ใช้งาน", "bg-[rgba(16,185,129,0.15)] text-[#6ee7b7]"], inactive: ["ปิดใช้", "bg-[rgba(148,163,184,0.15)] text-[#cbd5e1]"], locked: ["ล็อก", "bg-[rgba(239,68,68,0.15)] text-[#fca5a5]"],
};

export default async function ProfilePage({ searchParams }: PageProps<"/profile">) {
  const me = await getSessionUser();
  if (!me) redirect("/login?returnTo=/profile");
  const { security } = await getBranding();
  const forced = security.enforce2fa && me.id !== security.ownerUserId;
  const askSetup = (await searchParams).setup2fa === "1";

  let data;
  try {
    const [p, users, roles] = await Promise.all([
      fetch(`${BASE}/api/console/profile/${me.id}`, { headers: consoleHeaders(me.username), cache: "no-store" }).then(async (r) => {
        if (r.status === 404) return null;
        if (!r.ok) throw new Error(`profile → HTTP ${r.status}`);
        return ((await r.json()) as { profile: Profile }).profile;
      }),
      listResource<UserRow>("users", { q: me.username, limit: 50 }),
      listResource<RoleRow>("roles", { limit: 50 }),
    ]);
    data = { p, lastLoginAt: users.data.find((u) => u.id === me.id)?.lastLoginAt ?? null, roleName: (code: string) => roles.data.find((r) => r.code === code)?.name ?? code };
  } catch (err) {
    data = err instanceof Error ? err.message : String(err);
  }

  const meta = (label: string, value: React.ReactNode) => (
    <div className="flex items-center justify-between gap-3 border-b border-dashed border-line py-2.5 text-[13px] last:border-0">
      <span className="text-muted">{label}</span><span className="text-right">{value}</span>
    </div>
  );

  return (
    <ConsoleShell title="โปรไฟล์" path="/profile">
      <PageHeader title="โปรไฟล์ของฉัน" subtitle="จัดการข้อมูลส่วนตัว รหัสผ่าน และการยืนยันตัวตน 2 ชั้น" />
      {typeof data === "string" ? (
        <Card className="flex items-start gap-3 p-5"><AlertTriangle className="mt-0.5 shrink-0 text-danger" size={20} /><div className="text-[13px] text-muted">{data}</div></Card>
      ) : !data.p ? (
        <Card className="flex items-start gap-3 p-5"><AlertTriangle className="mt-0.5 shrink-0 text-warning" size={20} /><div className="text-[13px] text-muted">บัญชี @{me.username} ยังไม่มีโปรไฟล์ในระบบคอนโซล — ให้ผู้ดูแลเพิ่มจากหน้าจัดการผู้ใช้</div></Card>
      ) : (
        <>
        {askSetup && forced && !data.p.twoFactorEnabledAt && (
          <Card className="mb-5 flex items-start gap-3 border-warning/40 p-5"><AlertTriangle className="mt-0.5 shrink-0 text-warning" size={20} /><div className="text-[13px]"><strong>ต้องเปิดยืนยันตัวตน 2 ชั้นก่อนใช้งาน</strong><div className="text-muted">ระบบบังคับ 2FA กับทุกบัญชี — ตั้งค่าในการ์ดด้านล่าง แล้วจึงใช้งานหน้าอื่นได้</div></div></Card>
        )}
        <div className="grid items-start gap-5 lg:grid-cols-[320px_1fr]">
          <Card className="px-6 py-7 text-center">
            <div className="mx-auto mb-3.5 grid size-24 place-items-center rounded-full bg-linear-to-br from-[#f59e0b] to-[#b45309] text-[36px] font-semibold text-white">{data.p.fullName.trim().charAt(0).toUpperCase()}</div>
            <h3 className="text-lg font-semibold">{data.p.fullName}</h3>
            <div className="text-[13px] text-muted">@{data.p.username}</div>
            <div className="mt-2"><span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${ROLE_TONE[data.p.roleCode] ?? ROLE_TONE.viewer}`}>{data.roleName(data.p.roleCode)}</span></div>
            <div className="mt-5 border-t border-line pt-2 text-left">
              {meta("อีเมล", data.p.email ?? "-")}
              {meta("เบอร์โทร", data.p.phone ?? "-")}
              {meta("สมัครเมื่อ", fmtDate(data.p.createdAt))}
              {meta("เข้าใช้ล่าสุด", fmtDateTime(data.lastLoginAt))}
              {meta("สถานะ", <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${STATUS[data.p.status]?.[1] ?? ""}`}>{STATUS[data.p.status]?.[0] ?? data.p.status}</span>)}
            </div>
          </Card>
          <div className="grid gap-5">
            <InfoForm key={`${data.p.fullName}|${data.p.email}|${data.p.phone}`} username={data.p.username} initial={{ fullName: data.p.fullName, email: data.p.email ?? "", phone: data.p.phone ?? "" }} />
            <PasswordForm />
            <TwoFactorCard enabled={!!data.p.twoFactorEnabledAt} forced={forced} />
          </div>
        </div>
        </>
      )}
    </ConsoleShell>
  );
}
