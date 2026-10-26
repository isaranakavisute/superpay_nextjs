"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSyncExternalStore } from "react";
import { ChevronRight, LogOut, X } from "lucide-react";
import { logout } from "@/app/login/actions";
import type { SessionUser } from "@/lib/session";
import { initials } from "@/lib/format";
import { Logo, type LogoBrand } from "../Logo";
import { NAV_GROUPS, PROFILE_ITEM, TOP_ITEMS, type NavItem } from "./nav";
import { canOpen } from "@/lib/page-perms";

const OPEN_GROUPS_KEY = "superpay_nav_groups";
const CHANGE_EVENT = "superpay:nav-groups";

function readSavedGroups() {
  try {
    return localStorage.getItem(OPEN_GROUPS_KEY) ?? "[]";
  } catch {
    return "[]"; // private mode
  }
}

function writeSavedGroups(ids: string[]) {
  try {
    localStorage.setItem(OPEN_GROUPS_KEY, JSON.stringify(ids));
  } catch {
    /* private mode — still update this tab below */
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

function subscribeSavedGroups(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}

function parseGroups(raw: string): string[] {
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function NavLink({ item, active, inGroup, badge }: { item: NavItem; active: boolean; inGroup?: boolean; badge?: number }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      className={`group/link mb-0.5 flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors duration-200 ${
        inGroup ? "text-[13.5px]" : "text-sm"
      } ${
        active
          ? "bg-linear-to-br from-primary to-primary-alt text-primary-fg shadow-active"
          : "text-sidebar-ink hover:bg-white/5 hover:text-white"
      }`}
    >
      <Icon size={18} strokeWidth={2} className={`shrink-0 ${active ? "" : "opacity-85"}`} />
      <span className="truncate">{item.label}</span>
      {!!badge && <NavBadge n={badge} active={active} />}
    </Link>
  );
}

function NavBadge({ n, active }: { n: number; active?: boolean }) {
  return (
    <span
      className={`ml-auto h-[18px] min-w-[18px] shrink-0 rounded-full px-[5px] text-center text-[11px] leading-[18px] font-bold ${
        active ? "bg-white/30 text-primary-fg" : "bg-danger text-white"
      }`}
    >
      {n}
    </span>
  );
}

export function Sidebar({
  user,
  brand,
  badges,
  perms = null,
  open,
  collapsed,
  onClose,
}: {
  user: SessionUser;
  brand: LogoBrand;
  badges: Record<string, number>;
  perms?: string[] | null;
  open: boolean;
  collapsed: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();
  const isActive = (href: string) => pathname === href;
  // A group is open if it holds the current page or the user opened it before
  // (remembered per browser). The server snapshot is "[]", so the first client
  // render matches the server and saved groups appear right after hydration.
  const saved = useSyncExternalStore(subscribeSavedGroups, readSavedGroups, () => "[]");
  const savedGroups = parseGroups(saved);
  const isOpen = (id: string) =>
    savedGroups.includes(id) || NAV_GROUPS.some((g) => g.id === id && g.items.some((i) => isActive(i.href)));

  const toggle = (id: string) => {
    const next = isOpen(id) ? savedGroups.filter((g) => g !== id) : [...savedGroups, id];
    writeSavedGroups(next);
  };

  return (
    <aside
      className={`h-viewport fixed inset-y-0 left-0 z-50 flex w-[250px] flex-col bg-linear-to-b from-sidebar to-sidebar-2 text-sidebar-ink [color-scheme:dark] transition-transform duration-200 lg:sticky lg:top-0 lg:h-screen ${collapsed ? "lg:hidden" : "lg:translate-x-0"} ${
        open ? "translate-x-0" : "-translate-x-full"
      }`}
    >
      <div className="flex items-center gap-3 border-b border-white/[0.06] p-[22px]">
        <div className="min-w-0 flex-1">
          <Logo brand={brand} />
        </div>
        <button
          onClick={onClose}
          className="grid size-8 place-items-center rounded-lg text-soft transition hover:bg-white/[0.08] hover:text-white"
          aria-label="ปิดเมนู"
        >
          <X size={18} />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-3.5 [scrollbar-color:rgba(255,255,255,0.13)_transparent] hover:[scrollbar-color:rgba(255,255,255,0.26)_transparent]">
        {TOP_ITEMS.map((item) => (
          <NavLink key={item.key} item={item} active={isActive(item.href)} badge={badges[item.key]} />
        ))}
        {NAV_GROUPS.map((g) => ({ ...g, items: g.items.filter((i) => canOpen(perms, i.key)) })).filter((g) => g.items.length).map((group) => {
          const expanded = isOpen(group.id);
          return (
            <div key={group.id} className="mb-0.5">
              <button
                type="button"
                onClick={() => toggle(group.id)}
                aria-expanded={expanded}
                className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-[11.5px] font-semibold tracking-[0.6px] uppercase transition-colors duration-200 hover:bg-white/5 hover:text-white ${
                  expanded ? "text-white" : "text-soft"
                }`}
              >
                <ChevronRight
                  size={16}
                  strokeWidth={2.2}
                  className={`shrink-0 opacity-80 transition-transform duration-200 ${expanded ? "rotate-90" : ""}`}
                />
                <span>{group.label}</span>
                {(() => {
                  const sum = group.items.reduce((n, i) => n + (badges[i.key] ?? 0), 0);
                  return !expanded && sum > 0 ? <NavBadge n={sum} /> : null;
                })()}
              </button>
              {expanded && (
                <div className="pl-2.5">
                  {group.items.map((item) => (
                    <NavLink key={item.key} item={item} active={isActive(item.href)} inGroup badge={badges[item.key]} />
                  ))}
                </div>
              )}
            </div>
          );
        })}
        <NavLink item={PROFILE_ITEM} active={isActive(PROFILE_ITEM.href)} />
      </nav>

      <div className="flex items-center gap-2.5 border-t border-white/[0.06] px-[18px] py-3.5">
        <div className="grid size-9 shrink-0 place-items-center rounded-full bg-linear-to-br from-[#38bdf8] to-[#2563eb] font-semibold text-white">
          {initials(user.fullName)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[13px] font-medium text-white" title={user.fullName}>
            {user.fullName}
          </div>
          <div className="text-[11px] text-soft">{user.role}</div>
        </div>
        <form action={logout}>
          <button
            className="grid size-8 place-items-center rounded-lg text-soft transition hover:bg-red-500/15 hover:text-red-300"
            title="ออกจากระบบ"
          >
            <LogOut size={18} />
          </button>
        </form>
      </div>
    </aside>
  );
}
