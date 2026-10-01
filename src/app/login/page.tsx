import type { Metadata } from "next";
import { Check } from "lucide-react";
import { Logo } from "@/components/Logo";
import { brandView, getBranding } from "@/lib/branding";
import { LoginForm } from "./LoginForm";

export async function generateMetadata(): Promise<Metadata> {
  return { title: `${(await getBranding()).brand.siteName} — เข้าสู่ระบบ` };
}

const FEATURES = [
  "กำหนดบทบาทและสิทธิ์ผู้ใช้ได้ละเอียด",
  "ตรวจสลิปและอนุมัติยอดเงินเข้าได้ทันที",
  "สรุปยอดรายวันและรายร้านค้าในหน้าเดียว",
  "ใช้งานได้ทั้งบนคอมพิวเตอร์และมือถือ",
];

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { returnTo } = await searchParams;
  const branding = await getBranding();
  const { brand } = branding;
  const headline = brand.loginHeadline.trim() ? brand.loginHeadline.split("\n") : ["จัดการรับ–จ่ายเงิน", "ครบในที่เดียว"];

  return (
    <div className="grid min-h-screen bg-(image:--auth-shell-bg) min-[900px]:grid-cols-[1.1fr_1fr]">
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-(image:--auth-art-bg) p-14 text-white min-[900px]:flex">
        <div className="pointer-events-none absolute -top-[120px] -right-[120px] size-[380px] rounded-full bg-white/[0.08]" />
        <div className="pointer-events-none absolute -bottom-20 -left-20 size-[260px] rounded-full bg-white/[0.08]" />

        <div className="relative">
          <Logo size={40} brand={{ ...brandView(branding), tagline: "" }} />
        </div>

        <div className="relative">
          <h2 className="mb-3.5 text-[30px] leading-[1.25] font-semibold">
            {headline.map((line, i) => (
              <span key={i}>
                {i > 0 && <br />}
                {line}
              </span>
            ))}
          </h2>
          <p className="max-w-[420px] text-[15px] opacity-85">
            {brand.loginSubtext.trim() || "ติดตามยอดชำระ อนุมัติรายการ และดูแลร้านค้าทั้งหมดได้จากคอนโซลเดียว ปลอดภัยด้วยระบบสิทธิ์และ 2FA"}
          </p>
          <ul className="mt-[22px]">
            {FEATURES.map((f) => (
              <li key={f} className="flex items-center gap-2.5 py-2.5 opacity-[0.92]">
                <Check size={18} strokeWidth={2.5} className="shrink-0" />
                {f}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative text-xs opacity-70">© {brand.siteName} Console</div>
      </aside>

      <main className="grid place-items-center px-8 py-12">
        <LoginForm returnTo={typeof returnTo === "string" ? returnTo : undefined} />
      </main>
    </div>
  );
}
