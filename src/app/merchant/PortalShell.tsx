import Link from "next/link";
import { LogOut } from "lucide-react";
import { Logo } from "@/components/Logo";
import { brandView, getBranding } from "@/lib/branding";
import { initials } from "@/lib/format";
import { portalPerms, viewableShops } from "@/lib/portal";
import type { PortalUser } from "@/lib/session";
import { logoutPortal } from "./actions";
import { BackToOwnShop, ShopSwitcher } from "./ShopSwitcher";

const NAV: { href: string; label: string; perm?: string; needsSubs?: boolean }[] = [
  { href: "/merchant/dashboard", label: "แดชบอร์ด" },
  { href: "/merchant/transactions", label: "รายการชำระเงิน" },
  { href: "/merchant/withdrawals", label: "ถอนเงิน" },
  { href: "/merchant/payouts", label: "รายการโอนออก" },
  { href: "/merchant/network", label: "ภาพรวมร้านย่อย", perm: "view_dashboard", needsSubs: true },
  { href: "/merchant/sub-merchants", label: "ร้านย่อย", perm: "manage_sub_merchants" },
  { href: "/merchant/settings", label: "ตั้งค่า" },
  { href: "/merchant/docs", label: "คู่มือ" },
];
const TIER: Record<string, string> = { owner: "เจ้าของร้าน", staff: "พนักงาน", viewer: "ดูอย่างเดียว" };

/** Merchant Portal frame: top bar with the shop, tabs, and the signed-in portal user. */
export async function PortalShell({ user, path, children }: { user: PortalUser; path: string; children: React.ReactNode }) {
  const [branding, shops, can] = await Promise.all([getBranding(), viewableShops(user), portalPerms(user)]);
  // A super-admin has no "own" shop in the switcher: every shop opens as its owner.
  const home = user.superAdmin ? -1 : user.homeMerchantId ?? user.merchantId;
  const current = shops.find((s) => s.id === user.merchantId);
  // Sub-merchants are managed from the user's own shop; when viewing another shop, its tab is hidden.
  const hasSubs = user.superAdmin ? shops.some((s) => s.depth > (current?.depth ?? 0)) : shops.some((s) => s.depth > 0);
  const nav = NAV.filter((n) => !n.perm || (can.has(n.perm) && !user.viewing && (!n.needsSubs || hasSubs)));
  return (
    <div className="ui-compact min-h-screen">
      <header className="sticky top-0 z-10 border-b border-line bg-surface">
        <div className="flex items-center justify-between gap-3 px-4 py-3.5 sm:px-8">
          <div className="flex min-w-0 items-center gap-4">
            <Logo size={32} brand={{ ...brandView(branding), tagline: "Merchant Portal" }} />
            <div className="hidden h-8 w-px bg-line sm:block" />
            <div className="hidden min-w-0 sm:block">
              {shops.length > 1 ? <ShopSwitcher shops={shops} current={user.merchantId} home={home} /> : <div className="truncate font-semibold">{user.merchantName}</div>}
              <div className="text-[11.5px] text-muted">{user.superAdmin ? "Super admin — เปิดได้ทุกร้านในฐานะเจ้าของร้าน" : user.viewing ? "ร้านย่อย (ดูอย่างเดียว)" : "ร้านค้า"}</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="grid size-9 place-items-center rounded-full bg-linear-to-br from-primary-alt to-primary text-[13px] font-semibold text-primary-fg">{initials(user.fullName)}</div>
            <div className="hidden text-right sm:block">
              <div className="text-[13px] font-medium">{user.fullName}</div>
              <div className="text-[11px] text-muted">{TIER[user.tier] ?? user.tier}</div>
            </div>
            <form action={logoutPortal}>
              <button type="submit" title="ออกจากระบบ" aria-label="ออกจากระบบ" className="grid size-9 place-items-center rounded-lg text-muted hover:bg-surface-alt hover:text-ink"><LogOut size={17} /></button>
            </form>
          </div>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-4 sm:px-8">
          {nav.map((n) => (
            <Link key={n.href} href={n.href} className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-medium whitespace-nowrap ${path === n.href ? "border-primary text-primary" : "border-transparent text-muted hover:text-ink"}`}>{n.label}</Link>
          ))}
        </nav>
      </header>
      {user.viewing && (
        <div role="status" className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-400/30 bg-amber-400/10 px-4 py-2 text-[13px] text-amber-200 sm:px-8">
          <span>กำลังดูร้านย่อย <strong>{user.merchantName}</strong> — ดูอย่างเดียว แก้ไขร้านนี้ได้ที่แท็บ ร้านย่อย ของร้าน {user.homeMerchantName}</span>
          <BackToOwnShop />
        </div>
      )}
      {current?.status === "pending" && (
        <div role="status" className="border-b border-amber-400/30 bg-amber-400/10 px-4 py-2 text-[13px] text-amber-200 sm:px-8">
          ร้านนี้<strong>รอผู้ดูแลระบบอนุมัติ</strong> — ยังรับชำระเงิน ถอนเงิน ออก API key และสร้างร้านย่อยไม่ได้ (ดูข้อมูลและเปลี่ยนรหัสผ่านได้)
        </div>
      )}
      <main className="p-4 sm:px-8 sm:py-7">{children}</main>
    </div>
  );
}
