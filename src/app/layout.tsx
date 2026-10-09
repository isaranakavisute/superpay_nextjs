import type { Metadata } from "next";
import { cookies } from "next/headers";
import { THEME_COOKIE, getBranding, pickTheme } from "@/lib/branding";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const { brand } = await getBranding();
  const custom = brand.faviconAsset ?? brand.logoAsset;
  return {
    title: `${brand.siteName} Admin`,
    description: "ระบบจัดการรับชำระเงิน",
    ...(custom ? { icons: { icon: `/branding/favicon?v=${custom}` } } : {}),
  };
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const theme = pickTheme(await getBranding(), (await cookies()).get(THEME_COOKIE)?.value);
  return (
    <html lang="th" data-theme={theme} className="h-full antialiased">
      <body className="min-h-full font-sans">{children}</body>
    </html>
  );
}
