import "server-only";
import { cache } from "react";
import { consoleHeaders } from "./api";
import { DEFAULT_MERCHANT_PERMS, type MerchantPermMatrix } from "./merchant-perms";

const BASE = process.env.BACKEND_URL ?? "http://localhost:3001";

export const THEMES = [
  { id: "royal-gold", name: "ดำทอง", mode: "มืด" },
  { id: "midnight", name: "มิดไนท์", mode: "มืด" },
] as const;
export type ThemeId = (typeof THEMES)[number]["id"];
export const THEME_COOKIE = "sp_theme";

export type Branding = {
  brand: { siteName: string; tagline: string; loginHeadline: string; loginSubtext: string; logoScale: number; logoAsset: string | null; faviconAsset: string | null };
  theme: { default: ThemeId; allowUser: boolean; enabled: ThemeId[] };
  security: { enforce2fa: boolean; ownerUserId: number | null };
  sounds: { sequence: string[] };
  merchantPerms: MerchantPermMatrix;
};

export const DEFAULT_BRANDING: Branding = {
  brand: { siteName: "Option Pay", tagline: "Payment Console", loginHeadline: "", loginSubtext: "", logoScale: 100, logoAsset: null, faviconAsset: null },
  theme: { default: "royal-gold", allowUser: true, enabled: ["royal-gold", "midnight"] },
  security: { enforce2fa: false, ownerUserId: null },
  sounds: { sequence: ["builtin:chime"] },
  merchantPerms: DEFAULT_MERCHANT_PERMS,
};

/** Public settings for this request (deduped). A backend outage falls back to the defaults. */
export const getBranding = cache(async (): Promise<Branding> => {
  try {
    const r = await fetch(`${BASE}/api/console/config/public`, { headers: consoleHeaders(), cache: "no-store", signal: AbortSignal.timeout(4000) });
    if (!r.ok) return DEFAULT_BRANDING;
    const j = (await r.json()) as Branding;
    return { brand: j.brand, theme: j.theme, security: j.security, sounds: j.sounds, merchantPerms: j.merchantPerms ?? DEFAULT_MERCHANT_PERMS };
  } catch {
    return DEFAULT_BRANDING;
  }
});

/** Theme to render: the user's cookie if allowed and enabled, else the default. */
export function pickTheme(b: Branding, cookie: string | undefined): ThemeId {
  const c = THEMES.find((t) => t.id === cookie)?.id;
  return c && b.theme.allowUser && b.theme.enabled.includes(c) ? c : b.theme.default;
}

/** What the logo/sidebar components need (client-safe). */
export type BrandView = { siteName: string; tagline: string; logoUrl: string | null; scale: number };
export const brandView = (b: Branding): BrandView => ({
  siteName: b.brand.siteName,
  tagline: b.brand.tagline,
  logoUrl: b.brand.logoAsset ? `/branding/logo?v=${b.brand.logoAsset}` : null,
  scale: b.brand.logoScale,
});

export async function fetchAsset(id: string) {
  return fetch(`${BASE}/api/console/config/asset/${encodeURIComponent(id)}`, { headers: consoleHeaders(), cache: "no-store" });
}
