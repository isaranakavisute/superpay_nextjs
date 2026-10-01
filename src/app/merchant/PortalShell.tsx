import Link from "next/link";
import { LogOut } from "lucide-react";
import { Logo } from "@/components/Logo";
import { brandView, getBranding } from "@/lib/branding";
import { initials } from "@/lib/format";
import type { PortalUser } from "@/lib/session";
import { logoutPortal } from "./actions";

const NAV = [
  { href: "/merchant/dashboard", label: "แดชบอร์ด" },
  { href: "/merchant/transactions", label: "รายการชำระเงิน" },
  { href: "/merchant/withdrawals", label: "ถอนเงิน" },
  { href: "/merchant/settings", label: "ตั้งค่า" },
];
const TIER: Record<string, string> = { owner: "เจ้าของร้าน", staff: "พนักงาน", viewer: "ดูอย่างเดียว" };

/** Merchant Portal frame: top bar with the shop, tabs, and the signed-in portal user. */
export async function PortalShell({ user, path, children }: { user: PortalUser; path: string; children: React.ReactNode }) {
  const branding = await getBranding();
  return (
    <div className="ui-compact min-h-screen">
      <header className="sticky top-0 z-10 border-b border-line bg-surface">
        <div className="flex items-center justify-between gap-3 px-4 py-3.5 sm:px-8">
          <div className="flex min-w-0 items-center gap-4">
            <Logo size={32} brand={{ ...brandView(branding), tagline: "Merchant Portal" }} />
            <div className="hidden h-8 w-px bg-line sm:block" />
            <div className="hidden min-w-0 sm:block">
              <div className="truncate font-semibold">{user.merchantName}</div>
              <div className="text-[11.5px] text-muted">ร้านค้า</div>
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
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-medium whitespace-nowrap ${path === n.href ? "border-primary text-primary" : "border-transparent text-muted hover:text-ink"}`}>{n.label}</Link>
          ))}
        </nav>
      </header>
      <main className="p-4 sm:px-8 sm:py-7">{children}</main>
    </div>
  );
}
