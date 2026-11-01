// สิทธิ์การเข้าถึง for console pages (24 Oct 2026): which permission opens each menu item / page. A list means any one is
// enough; "*" = Super Admin only; no entry = every signed-in operator. The backend (middleware/consolePerms.js) enforces
// the same rules on the data and on every action — this file only hides what the role cannot open.
// Not a "use client" module: ConsoleShell (server) and the sidebar (client) both use it.

export const SUPER = "*";

const PAGE_PERMS: Record<string, string | string[]> = {
  payments: "payment.view",
  outflows: "outflow.view",
  "bank-statements": "outflow.view",
  withdrawals: "withdrawal.view",
  p2p: "withdrawal.view",
  "double-credits": ["payment.double_credit", "payment.view"],
  "transfer-leftovers": "payment.view",
  accounts: "account.view",
  merchants: "merchant.view",
  "merchant-dashboard": "merchant.view",
  webhooks: "webhook.view",
  "webhook-events": "webhook.view",
  channels: "channel.view",
  events: "channel.view",
  devices: "channel.view",
  "qr-demo": "channel.view",
  settings: "settings.manage",
  alerts: "alerts.manage",
  "support-bot": "settings.manage",
  announcements: "settings.manage",
  roles: "user.view",
  users: "user.view",
  audit: "audit.view",
  "api-logs": "audit.view",
  deleted: SUPER,
  backups: SUPER,
  "system-control": SUPER,
};

/** The page key of a console path: "/payments?x" → "payments". */
export const pageKeyOf = (path: string) => path.replace(/^\//, "").split(/[/?#]/)[0];

/**
 * Menus a role does not see (สิทธิ์การเข้าถึง → เมนูที่แสดง, 31 Oct 2026) travel with its permissions as "menu-hidden:<key>"
 * (ConsoleShell adds them from the profile). A hidden menu is gone from the sidebar and its page shows "no access";
 * Super Admin always sees everything. Dashboard and profile can be hidden too (1 Nov 2026) — then the console opens on the
 * role's first visible page instead (firstPage).
 */
export const HIDDEN_MENU = "menu-hidden:";

/** The first page (in menu order) a role may open — where it lands when the dashboard is hidden; null = none. */
export function firstPage(perms: string[] | null, items: { key: string; href: string }[]) {
  return items.find((i) => canOpen(perms, i.key))?.href ?? null;
}

/** null perms = unknown (backend unreachable): show everything; the backend still refuses what the role may not do. */
export function canOpen(perms: string[] | null, key: string) {
  if (perms && !perms.includes(SUPER) && perms.includes(HIDDEN_MENU + key)) return false;
  const need = PAGE_PERMS[key];
  if (!need || !perms || perms.includes(SUPER)) return true;
  if (need === SUPER) return false;
  return (Array.isArray(need) ? need : [need]).some((p) => perms.includes(p));
}
