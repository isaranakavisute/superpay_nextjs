import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Card } from "@/components/ui";
import { requirePortal, viewableShops } from "@/lib/portal";
import { getPortalUser } from "@/lib/session";
import { ChooseShopForm } from "./ChooseShopForm";

export const metadata: Metadata = { title: "เลือกร้านค้า — Merchant Portal" };
const PATH = "/merchant/choose-shop";

/** Right after a portal super-admin signs in: which shop to open (as its owner). Other users go to their dashboard. */
export default async function ChooseShopPage() {
  await requirePortal(PATH);
  const u = await getPortalUser();
  if (!u?.superAdmin) redirect("/merchant/dashboard");
  const shops = await viewableShops(u);
  return (
    <div className="ui-compact grid min-h-screen place-items-center px-4">
      <Card className="w-full max-w-[460px] p-7">
        <h1 className="text-lg font-semibold">เลือกร้านค้าที่จะเข้าใช้งาน</h1>
        <p className="mt-1 mb-5 text-[13px] text-muted">
          คุณเข้าสู่ระบบในฐานะ <strong className="text-ink">Super admin</strong> — เปิดได้ทุกร้าน (ทั้งร้านหลักและร้านย่อย) ในฐานะเจ้าของร้าน · เปลี่ยนร้านภายหลังได้จากเมนูชื่อร้านด้านบน
        </p>
        <ChooseShopForm shops={shops} />
      </Card>
    </div>
  );
}
