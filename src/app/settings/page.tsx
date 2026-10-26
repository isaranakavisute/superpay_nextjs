import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { ConsoleShell } from "@/components/shell/ConsoleShell";
import { Card, PageHeader } from "@/components/ui";
import { consoleHeaders, listResource } from "@/lib/api";
import { THEMES } from "@/lib/branding";
import type { AccountRow, UserRow } from "@/lib/rows";
import { getSessionUser } from "@/lib/session";
import type { MerchantPermMatrix } from "@/lib/merchant-perms";
import { BrandCard, type Brand } from "./BrandCard";
import { MerchantPermsCard } from "./MerchantPermsCard";
import { BalanceCard, LimitsCard, OutboundCard, QuotaCard, SecurityCard, type QuotaStatus } from "./OtherCards";
import { SlipCard, type Slip } from "./SlipCard";
import { SoundCard } from "./SoundCard";
import { ThemeCard } from "./ThemeCard";

export const metadata: Metadata = { title: "ตั้งค่าระบบ — Option Pay Admin" };

const BASE = process.env.BACKEND_URL ?? "http://localhost:3001";
type Config = {
  brand: Brand; theme: { default: string; allowUser: boolean; enabled: string[] }; sounds: { sequence: string[] }; slip: Slip;
  quota: { threshold: number; status: QuotaStatus }; balance: { minMerchantBalance: number }; limits: { minDeposit: number; minWithdraw: number };
  security: { enforce2fa: boolean; ownerUserId: number | null };
  merchantPerms: MerchantPermMatrix;
  outbound: { destinations: { id: string; name: string; url: string; secret: string; enabled: boolean }[] };
  customSounds: { id: string; name: string; bytes: number }[];
};

export default async function SettingsPage() {
  const me = await getSessionUser();
  if (!me) redirect("/login?returnTo=/settings");
  let data;
  try {
    const [config, accounts, users] = await Promise.all([
      fetch(`${BASE}/api/console/config`, { headers: { ...consoleHeaders(me.username), "x-console-user-id": String(me.id) }, cache: "no-store" }).then(async (r) => {
        if (!r.ok) throw new Error(`settings → HTTP ${r.status}`);
        return ((await r.json()) as { config: Config }).config;
      }),
      listResource<AccountRow>("accounts", { limit: 200 }),
      listResource<UserRow>("users", { limit: 200 }),
    ]);
    data = {
      config,
      accounts: accounts.data.filter((a) => a.accountType !== "send" && a.status === "active").map((a) => ({ id: a.id, label: `${a.bankName} • ${a.accountNo ?? "—"} (${a.label})` })),
      users: users.data.filter((u) => u.status !== "deleted").map((u) => ({ id: u.id, label: `${u.fullName} (@${u.username}) · ${u.roleName}` })),
    };
  } catch (err) {
    data = err instanceof Error ? err.message : String(err);
  }

  return (
    <ConsoleShell title="ตั้งค่าระบบ" path="/settings">
      <PageHeader title="ตั้งค่าระบบ" subtitle="การตั้งค่ากลางที่ใช้ทั่วทั้งระบบ" />
      {typeof data === "string" ? (
        <Card className="flex items-start gap-3 p-5"><AlertTriangle className="mt-0.5 shrink-0 text-danger" size={20} /><div className="text-[13px] text-muted">{data}</div></Card>
      ) : (
        <>
          <BrandCard brand={data.config.brand} />
          <ThemeCard theme={data.config.theme} themes={THEMES.map((t) => ({ ...t }))} />
          <SoundCard sequence={data.config.sounds.sequence} customs={data.config.customSounds} />
          <SlipCard slip={data.config.slip} accounts={data.accounts} />
          <QuotaCard threshold={data.config.quota.threshold} status={data.config.quota.status} />
          <BalanceCard min={Number(data.config.balance.minMerchantBalance)} />
          <LimitsCard minDeposit={Number(data.config.limits.minDeposit)} minWithdraw={Number(data.config.limits.minWithdraw)} />
          <SecurityCard enforce2fa={data.config.security.enforce2fa} ownerUserId={data.config.security.ownerUserId} users={data.users} meId={me.id} />
          <MerchantPermsCard key={JSON.stringify(data.config.merchantPerms)} matrix={data.config.merchantPerms} />
          <OutboundCard key={data.config.outbound.destinations.map((d) => d.id).join()} destinations={data.config.outbound.destinations} />
        </>
      )}
    </ConsoleShell>
  );
}
