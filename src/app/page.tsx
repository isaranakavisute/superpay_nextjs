import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";

// optionpay.co (user, 31 Oct 2026): a neutral front page — a landscape picture and one way in; nothing says what the
// site is (no name, logo or description). Signed-in operators go straight to the dashboard as before.
export const metadata: Metadata = { title: "Welcome", robots: { index: false, follow: false } };

export default async function Home() {
  if (await getSessionUser()) redirect("/dashboard");
  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden bg-[#0b1026] bg-[url('/landing/bg.svg')] bg-cover bg-center px-6">
      <div className="w-full max-w-[400px] rounded-3xl border border-white/15 bg-white/[0.07] px-8 py-9 text-center text-white shadow-[0_20px_60px_rgba(0,0,0,0.35)] backdrop-blur-md">
        <p className="text-[15px] leading-relaxed text-white/85">
          This system is for authorized users only.
          <br />
          Please sign in to continue.
        </p>
        <Link href="/login" className="mt-7 inline-flex h-11 items-center justify-center rounded-xl bg-white px-9 text-[15px] font-semibold text-[#1b2a55] shadow-[0_6px_20px_rgba(0,0,0,0.25)] transition hover:bg-white/90">
          Sign in
        </Link>
      </div>
      <footer className="absolute bottom-5 text-[11.5px] text-white/55">© {new Date().getFullYear()}</footer>
    </main>
  );
}
