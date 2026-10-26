import type { Metadata } from "next";
import { AlertTriangle } from "lucide-react";
import { ConsoleShell } from "@/components/shell/ConsoleShell";
import { Card, PageHeader } from "@/components/ui";
import { listResource, viewerHeaders } from "@/lib/api";
import { RoleMatrix, type Group, type Role } from "./RoleMatrix";

export const metadata: Metadata = { title: "สิทธิ์การเข้าถึง — Option Pay Admin" };

const BASE = process.env.BACKEND_URL ?? "http://localhost:3001";

export default async function RolesPage() {
  let data;
  try {
    const [roles, cat] = await Promise.all([
      listResource<Role>("roles", { limit: 50 }),
      fetch(`${BASE}/api/console/roles-admin/catalogue`, { headers: await viewerHeaders(), cache: "no-store" }).then(async (r) => {
        if (!r.ok) throw new Error(`roles catalogue → HTTP ${r.status}`);
        return ((await r.json()) as { groups: Group[] }).groups;
      }),
    ]);
    data = { roles: roles.data, groups: cat };
  } catch (err) {
    data = err instanceof Error ? err.message : String(err);
  }

  return (
    <ConsoleShell title="สิทธิ์การเข้าถึง" path="/roles">
      <PageHeader title="สิทธิ์การเข้าถึง" subtitle="กำหนดว่าแต่ละบทบาททำอะไรได้ — Super Admin มีสิทธิ์เต็มเสมอ (แก้ไม่ได้) · บันทึกแล้วมีผลทันทีไม่ต้องเข้าสู่ระบบใหม่" />
      {typeof data === "string" ? (
        <Card className="flex items-start gap-3 p-5">
          <AlertTriangle className="mt-0.5 shrink-0 text-danger" size={20} />
          <div className="text-[13px] text-muted">{data}</div>
        </Card>
      ) : (
        <RoleMatrix roles={data.roles} groups={data.groups} />
      )}
    </ConsoleShell>
  );
}
