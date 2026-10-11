import type { Metadata } from "next";
import { StateBadge } from "@/components/cells";
import { Card, CardHead, PageHeader } from "@/components/ui";
import { listResource } from "@/lib/api";
import { fmtDate, fmtMoney } from "@/lib/format";
import { portalCall, portalPerms, requirePortal } from "@/lib/portal";
import type { MerchantRow } from "@/lib/rows";
import { PortalShell } from "../PortalShell";
import { API_BASE } from "@/lib/api-curl-examples";
import { AccountsCard, KeysCard, PasswordCard, SecretKeyCard, WebhookCard } from "./SettingsCards";

type KeyInfo = { masked: string; revealable: boolean; createdAt: string; lastUsedAt: string | null };

export const metadata: Metadata = { title: "ตั้งค่า — Merchant Portal" };

export default async function PortalSettings() {
  const user = await requirePortal("/merchant/settings");
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
                {row("อัตราค่าธรรมเนียม", `${Number(m.feePercent)}% + ${fmtMoney(m.feeFlat)} ต่อรายการ`)}
                {row("ยอดขั้นต่ำในบัญชี", fmtMoney(m.minBalance))}
                {row("เริ่มใช้งาน", fmtDate(m.createdAt))}
              </dl>
            ) : <div className="p-6 text-muted">โหลดข้อมูลร้านไม่สำเร็จ</div>}
          </Card>
          <WebhookCard url={hook.ok ? hook.endpoint?.url ?? null : null} secretPrefix={hook.ok ? hook.endpoint?.secretPrefix ?? null : null} owner={can.has("manage_webhooks")} />
          <SecretKeyCard secretKey={secret.ok ? secret.secretKey ?? null : null} apiKey={secret.ok ? secret.apiKey ?? null : null} apiBase={API_BASE} />
          <PasswordCard />
        </div>
        <div className="grid gap-5">
          <KeysCard keys={keys.ok ? (keys.keys ?? []) : []} owner={can.has("manage_api_keys")} />
          <AccountsCard accounts={accts.ok ? (accts.data ?? []) : []} note={accts.ok ? accts.note ?? null : accts.error} owner={can.has("manage_accounts")} />
        </div>
      </div>
    </PortalShell>
  );
}
