import type { Metadata } from "next";
import { StateBadge } from "@/components/cells";
import { Card, CardHead, PageHeader } from "@/components/ui";
import { listResource } from "@/lib/api";
import { fmtDate, fmtMoney } from "@/lib/format";
import { portalCall, portalPerms, requirePortal, viewableShops } from "@/lib/portal";
import type { MerchantRow } from "@/lib/rows";
import { PortalShell } from "../PortalShell";
import { API_BASE } from "@/lib/api-curl-examples";
import { AccountsCard, KeysCard, PasswordCard, SecretKeyCard, WebhookCard } from "./SettingsCards";

type KeyInfo = { masked: string; revealable: boolean; createdAt: string; lastUsedAt: string | null };

export const metadata: Metadata = { title: "ตั้งค่า — Merchant Portal" };

export default async function PortalSettings({ searchParams }: PageProps<"/merchant/settings">) {
  const user = await requirePortal("/merchant/settings");
  const mustChange = user.mustChangePassword || (await searchParams).pw === "1";
  // A shop waiting for approval sees its settings but cannot change them yet (only its password).
  const locked = user.viewing || (await viewableShops(user)).find((x) => x.id === user.merchantId)?.status !== "active";
  const can = await portalPerms(user);
  const owner = can.has("manage_api_keys") || can.has("manage_webhooks") || can.has("manage_accounts");
  const [shops, keys, hook, accts, secret] = await Promise.all([
    listResource<MerchantRow>("merchants").catch(() => null),
    portalCall<{ keys: [] }>(user, "GET", "/keys"),
    portalCall<{ endpoint: { url: string; secretPrefix: string | null } | null }>(user, "GET", "/webhook"),
    portalCall<{ data: []; note: string | null }>(user, "GET", "/accounts"),
    portalCall<{ secretKey: KeyInfo | null; apiKey: KeyInfo | null }>(user, "GET", `/users/${user.id}/secret-key`),
  ]);
  const m = shops?.data.find((x) => x.id === user.merchantId);
  const row = (label: string, value: React.ReactNode) => (
    <div className="flex items-center justify-between gap-4 px-[22px] py-3.5"><dt className="text-muted">{label}</dt><dd className="text-right">{value}</dd></div>
  );

  return (
    <PortalShell user={user} path="/merchant/settings">
      {mustChange && !user.viewing && (
        <div role="alert" className="mb-4 rounded-lg border border-amber-400/40 bg-amber-400/10 px-4 py-3 text-[13px] text-amber-200">
          <strong>กรุณาเปลี่ยนรหัสผ่านชั่วคราว</strong> ที่ได้รับจากร้านแม่ก่อนใช้งาน — ใช้การ์ด <strong>เปลี่ยนรหัสผ่าน</strong> ด้านล่าง (ใส่รหัสชั่วคราวเป็นรหัสปัจจุบัน)
        </div>
      )}
      <PageHeader title="ตั้งค่าร้านค้า" subtitle={owner ? "ข้อมูลร้าน API key, webhook และบัญชีรับเงิน" : "ข้อมูลร้าน — ระดับของคุณดูได้อย่างเดียว"} />
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
                {row("ค่าธรรมเนียมเงินเข้า", `${Number(m.feePercent)}% + ${fmtMoney(m.feeFlat)} ต่อรายการ (หักจากยอดที่ลูกค้าโอน)`)}
                {row("ค่าธรรมเนียมเงินออก", `${Number(m.outFeePercent)}% + ${fmtMoney(m.outFeeFlat)} ต่อรายการ (บวกเพิ่มจากยอดถอน / payout)`)}
                {row("ยอดขั้นต่ำในบัญชี", fmtMoney(m.minBalance))}
                {m.parentId != null && row("ร้านแม่", shops?.data.find((x) => x.id === m.parentId)?.name ?? `#${m.parentId}`)}
                {row("เริ่มใช้งาน", fmtDate(m.createdAt))}
              </dl>
            ) : <div className="p-6 text-muted">โหลดข้อมูลร้านไม่สำเร็จ</div>}
          </Card>
          {!user.viewing && <WebhookCard url={hook.ok ? hook.endpoint?.url ?? null : null} secretPrefix={hook.ok ? hook.endpoint?.secretPrefix ?? null : null} owner={can.has("manage_webhooks") && !locked} />}
          {!user.viewing && <SecretKeyCard secretKey={secret.ok ? secret.secretKey ?? null : null} apiKey={secret.ok ? secret.apiKey ?? null : null} apiBase={API_BASE} />}
          {!user.viewing && <PasswordCard />}
        </div>
        <div className="grid gap-5">
          <KeysCard keys={keys.ok ? (keys.keys ?? []) : []} owner={can.has("manage_api_keys") && !locked} />
          <AccountsCard accounts={accts.ok ? (accts.data ?? []) : []} note={accts.ok ? accts.note ?? null : accts.error} owner={can.has("manage_accounts") && !locked} />
        </div>
      </div>
    </PortalShell>
  );
}
