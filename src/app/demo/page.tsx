import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Logo } from "@/components/Logo";
import { brandView, getBranding } from "@/lib/branding";
import { demoKey } from "@/lib/demo-api";
import { BANKS } from "@/lib/domain";
import { newId } from "@/lib/demo-ids";
import { DemoConsole } from "./DemoConsole";

export const metadata: Metadata = { title: "API Demo — Option Pay", robots: { index: false, follow: false } };

// Public (no login, see proxy.ts): runs the real merchant API, signed on this server, for the demo shop only.
export default async function DemoPage() {
  const brand = await getBranding();
  // Switched off in Settings → no page at all (the backend refuses every demo call too).
  if (!brand.demo.enabled) notFound();
  const key = await demoKey().catch(() => null);
  return (
    <DemoConsole
      logo={<Logo size={34} brand={{ ...brandView(brand), tagline: "" }} />}
      shop={key?.shop ?? null}
      banks={BANKS.map((b) => ({ code: b.code, name: b.name }))}
      firstIds={{ orderId: newId("DEMO"), merchantRef: newId("PO-DEMO") }}
    />
  );
}
