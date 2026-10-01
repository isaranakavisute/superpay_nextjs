import type { Metadata } from "next";
import { StateBadge } from "@/components/cells";
import { Card, CardHead, PageHeader } from "@/components/ui";
import { listResource } from "@/lib/api";
import { fmtDate, fmtMoney } from "@/lib/format";
import { portalCall, requirePortal } from "@/lib/portal";
import type { MerchantRow } from "@/lib/rows";
import { PortalShell } from "../PortalShell";
import { AccountsCard, KeysCard, PasswordCard, WebhookCard } from "./SettingsCards";

export const metadata: Metadata = { title: "ตั้งค่า — Merchant Portal" };

export default async function PortalSettings() {
  const user = await requirePortal("/merchant/settings");
  const owner = user.tier === "owner";
  const [shops, keys, hook, accts] = await Promise.all([
    listResource<MerchantRow>("merchants").catch(() => null),
    portalCall<{ keys: [] }>(user, "GET", "/keys"),
    portalCall<{ endpoint: { url: string; secretPrefix: string | null } | null }>(user, "GET", "/webhook"),
    portalCall<{ data: []; note: string | null }>(user, "GET", "/accounts"),
  ]);
  const m = shops?.data.find((x) => x.id === user.merchantId);
  const row = (label: string, value: React.ReactNode) => (
    <div className="flex items-center justify-between gap-4 px-[22px] py-3.5"><dt className="text-muted">{label}</dt><dd className="text-right">{value}</dd></div>
  );

  return (
    <PortalShell user={user} path="/merchant/settings">
      <PageHeader title="ตั้งค่าร้านค้า" subtitle={owner ? "ข้อมูลร้าน API key, webhook และบัญชีรับเงิน" : "ข้อมูลร้าน — การแก้ไขทำได้เฉพาะเจ้าของร้าน"} />
      <div className="grid items-start gap-5 xl:grid-cols-2">
        <div className="grid gap-5">
          <Card>
            <CardHead title="ข้อมูลร้าน" />
            {m ? (
              <dl className="divide-y divide-line">
                {row("ชื่อร้าน", m.name)}
                {row("Slug", <code>{m.slug}</code>)}
                {row("สถานะ", <StateBadge status={m.status} />)}
                {row("KYC", <StateBadge status={m.kycStatus} />)}
                {row("อัตราค่าธรรมเนียม", `${Number(m.feePercent)}% + ${fmtMoney(m.feeFlat)} ต่อรายการ`)}
                {row("ยอดขั้นต่ำในบัญชี", fmtMoney(m.minBalance))}
                {row("เริ่มใช้งาน", fmtDate(m.createdAt))}
              </dl>
            ) : <div className="p-6 text-muted">โหลดข้อมูลร้านไม่สำเร็จ</div>}
          </Card>
          <WebhookCard url={hook.ok ? hook.endpoint?.url ?? null : null} secretPrefix={hook.ok ? hook.endpoint?.secretPrefix ?? null : null} owner={owner} />
          <PasswordCard />
        </div>
        <div className="grid gap-5">
          <KeysCard keys={keys.ok ? (keys.keys ?? []) : []} owner={owner} />
          <AccountsCard accounts={accts.ok ? (accts.data ?? []) : []} note={accts.ok ? accts.note ?? null : accts.error} owner={owner} />
        </div>
      </div>
    </PortalShell>
  );
}
