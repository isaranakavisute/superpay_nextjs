"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertTriangle, Bell, Menu, Search } from "lucide-react";
import type { LogoBrand } from "../Logo";
import type { SessionUser } from "@/lib/session";
import { PayoutSound } from "./PayoutSound";
import { Sidebar } from "./Sidebar";
import { ThemeButton, type ThemeOption } from "./ThemeButton";

export type ShellAlerts = {
  /** Menu badge per nav key (payments, outflows, …). */
  badges: Record<string, number>;
  /** Bell count: everything waiting on an admin. */
  pendingTotal: number;
  lowBalance: { names: string[]; count: number } | null;
};

export type ShellSearch = { placeholder: string; value: string; keep: [string, string][] };
export type ShellLook = { brand: LogoBrand; theme: { current: string; options: ThemeOption[]; allowUser: boolean }; sound: string[] | null };

export function AppShell({
  title,
  user,
  alerts,
  search,
  look,
  children,
}: {
  title: string;
  look: ShellLook;
  user: SessionUser;
  alerts?: ShellAlerts | null;
  /** Top-bar search for list pages (hidden on the dashboard, as on the original). */
  search?: ShellSearch | null;
  children: React.ReactNode;
}) {
  // Mobile: drawer open/closed. Desktop: the × in the sidebar collapses it.
  const [menuOpen, setMenuOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const low = alerts?.lowBalance;

  return (
    <div className="ui-compact flex min-h-screen">
      {look.sound && <PayoutSound sequence={look.sound} initialPending={alerts?.badges.outflows ?? 0} />}
      <Sidebar
        user={user}
        brand={look.brand}
        badges={alerts?.badges ?? {}}
        open={menuOpen}
        collapsed={collapsed}
        onClose={() => {
          setMenuOpen(false);
          setCollapsed(true);
        }}
      />
      {menuOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-[2px] lg:hidden" onClick={() => setMenuOpen(false)} />
      )}

      <main className="min-w-0 flex-1">
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-surface px-4 py-[18px] sm:px-8">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setMenuOpen(true);
                setCollapsed(false);
              }}
              className={`grid size-9 place-items-center rounded-lg border border-line text-muted hover:text-ink ${collapsed ? "" : "lg:hidden"}`}
              aria-label="เปิดเมนู"
            >
              <Menu size={18} />
            </button>
            <div className="text-[13px] text-muted">
              หน้าหลัก / <span className="font-semibold text-ink">{title}</span>
            </div>
          </div>
          <div className="flex items-center gap-3.5">
            {search && (
              <form className="relative hidden md:block" role="search">
                {search.keep.map(([k, v]) => (
                  <input key={k} type="hidden" name={k} value={v} />
                ))}
                <Search size={16} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-soft" />
                <input
                  name="q"
                  defaultValue={search.value}
                  placeholder={search.placeholder}
                  className="w-[280px] rounded-full border border-line bg-surface-alt py-[9px] pr-3.5 pl-[38px] text-[13px] text-ink outline-none transition placeholder:text-soft focus:border-primary focus:bg-surface focus:shadow-ring"
                />
              </form>
            )}
            <Link
              href="/payments?status=pending&range=all"
              className={`relative grid size-[38px] place-items-center rounded-full border bg-surface-alt transition hover:bg-surface hover:text-ink ${
                alerts?.pendingTotal ? "border-warning text-warning" : "border-line text-muted hover:border-primary"
              }`}
              aria-label="รายการค้างรออนุมัติ"
              title="รายการค้างรออนุมัติ"
            >
              <Bell size={18} />
              {!!alerts?.pendingTotal && (
                <span className="absolute -top-[5px] -right-[5px] h-[18px] min-w-[18px] rounded-full bg-danger px-[5px] text-center text-[11px] leading-[18px] font-bold text-white shadow-[0_0_0_2px_var(--color-surface)]">
                  {alerts.pendingTotal}
                </span>
              )}
            </Link>
            <ThemeButton current={look.theme.current} options={look.theme.options} allowUser={look.theme.allowUser} />
          </div>
        </header>

        {low && (
          <div className="flex items-center gap-3 border-b border-warning/30 bg-[color-mix(in_srgb,var(--color-warning)_12%,var(--color-surface))] px-4 py-3 text-[13px] sm:px-8">
            <AlertTriangle size={18} className="shrink-0 text-warning" />
            <div className="min-w-0 flex-1">
              <div>
                <strong>ยอดคงเหลือร้านค้าต่ำกว่าขั้นต่ำ {low.count} ร้าน</strong>
                {" — "}
                {low.names[0]}
                {low.count > 1 && ` และอีก ${low.count - 1} ร้าน`}
              </div>
              <div className="mt-0.5 text-[11.5px] text-muted">
                ร้านเหล่านี้ขอถอน/สั่งจ่ายไม่ได้จนกว่ายอดจะกลับขึ้นเหนือขั้นต่ำ · ร้านค้าได้รับแจ้งเตือนแล้ว
              </div>
            </div>
            <Link
              href="/merchants"
              className="shrink-0 rounded-lg bg-warning px-3 py-1.5 text-xs font-semibold whitespace-nowrap text-primary-fg hover:brightness-110"
            >
              ดูร้านค้า
            </Link>
          </div>
        )}

        <div className="p-4 sm:px-8 sm:py-7">{children}</div>
      </main>
    </div>
  );
}
