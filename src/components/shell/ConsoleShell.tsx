import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { consoleHeaders, getAlerts } from "@/lib/api";
import { THEMES, THEME_COOKIE, brandView, getBranding, pickTheme } from "@/lib/branding";
import { getSessionUser } from "@/lib/session";
import { AppShell, type ShellAlerts, type ShellLook, type ShellSearch } from "./AppShell";
import type { Params } from "../list/query";

/**
 * Server wrapper for every console page: requires a session, loads the menu
 * badges / bell / low-balance banner, and renders the shell. A backend hiccup
 * only hides the badges; it never blocks the page.
 */
export async function ConsoleShell({
  title,
  path,
  search,
  children,
}: {
  title: string;
  path: string;
  /** Show the top-bar search; `params` are kept as hidden fields. */
  search?: { placeholder: string; params: Params };
  children: React.ReactNode;
}) {
  const user = await getSessionUser();
  if (!user) redirect(`/login?returnTo=${encodeURIComponent(path)}`);

  const [branding, me] = await Promise.all([getBranding(), getMe(user.id, user.username)]);
  // Settings → security: everyone but the owner must turn on 2FA first; they can still sign in.
  if (branding.security.enforce2fa && me && !me.twoFactor && user.id !== branding.security.ownerUserId && path !== "/profile") {
    redirect("/profile?setup2fa=1");
  }
  const themeIds = branding.theme.allowUser ? branding.theme.enabled : [branding.theme.default];
  const look: ShellLook = {
    brand: brandView(branding),
    theme: {
      current: pickTheme(branding, (await cookies()).get(THEME_COOKIE)?.value),
      options: THEMES.filter((t) => themeIds.includes(t.id)).map((t) => ({ id: t.id, name: t.name })),
      allowUser: branding.theme.allowUser,
    },
    // Only people who can approve payouts hear the payout alarm.
    sound: me?.canApprovePayouts && branding.sounds.sequence.length ? branding.sounds.sequence : null,
  };

  let alerts: ShellAlerts | null = null;
  try {
    const a = await getAlerts();
    const q = a.queues;
    alerts = {
      badges: {
        payments: q.payments,
        outflows: q.outflows,
        withdrawals: q.withdrawals,
        "double-credits": q.doubleCredits,
        events: q.events,
      },
      pendingTotal: q.payments + q.outflows + q.withdrawals,
      lowBalance: a.lowBalanceMerchants.length
        ? { names: a.lowBalanceMerchants.map((m) => m.name), count: a.lowBalanceMerchants.length }
        : null,
    };
  } catch {
    alerts = null;
  }

  const shellSearch: ShellSearch | null = search
    ? {
        placeholder: search.placeholder,
        value: typeof search.params.q === "string" ? search.params.q : "",
        keep: Object.entries(search.params).filter(
          (e): e is [string, string] => typeof e[1] === "string" && !!e[1] && e[0] !== "q" && e[0] !== "page",
        ),
      }
    : null;

  return (
    <AppShell title={title} user={user} alerts={alerts} search={shellSearch} look={look}>
      {children}
    </AppShell>
  );
}

const BASE = process.env.BACKEND_URL ?? "http://localhost:3001";

/** The signed-in user's 2FA state and payout permission (null if the backend is unreachable). */
async function getMe(id: number, username: string) {
  try {
    const r = await fetch(`${BASE}/api/console/profile/${id}`, { headers: consoleHeaders(username), cache: "no-store", signal: AbortSignal.timeout(4000) });
    if (!r.ok) return null;
    const p = ((await r.json()) as { profile: { roleCode: string; permissions: string[]; twoFactorEnabledAt: string | null } }).profile;
    return { twoFactor: !!p.twoFactorEnabledAt, canApprovePayouts: p.roleCode === "super_admin" || p.permissions.includes("outflow.approve") };
  } catch {
    return null;
  }
}
