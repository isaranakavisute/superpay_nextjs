import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getPortalUser } from "@/lib/session";
import { PortalLoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "เข้าสู่ระบบ — Merchant Portal" };

export default async function PortalLoginPage({ searchParams }: PageProps<"/merchant/login">) {
  if (await getPortalUser()) redirect("/merchant/dashboard");
  const { returnTo } = await searchParams;
  return (
    <div className="grid min-h-screen place-items-center bg-(image:--auth-shell-bg) px-6 py-12">
      <PortalLoginForm returnTo={typeof returnTo === "string" ? returnTo : undefined} />
    </div>
  );
}
