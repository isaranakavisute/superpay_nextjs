import type { Metadata } from "next";
import { Card, PageHeader } from "@/components/ui";
import { portalCall, portalPerms, requirePortal } from "@/lib/portal";
import { PortalShell } from "../PortalShell";
import { SubMerchantsEditor, type SelfInfo, type SubMerchant } from "./SubMerchantsEditor";

export const metadata: Metadata = { title: "ร้านย่อย — Merchant Portal" };
const PATH = "/merchant/sub-merchants";

export default async function PortalSubMerchants() {
  const user = await requirePortal(PATH);
  const can = await portalPerms(user);
  const r = user.viewing ? null : await portalCall<{ subMerchants: SubMerchant[]; self: SelfInfo }>(user, "GET", "/sub-merchants");
  return (
    <PortalShell user={user} path={PATH}>
      <PageHeader title="ร้านย่อย" subtitle="สร้างร้านภายใต้ร้านของคุณ (ร้านย่อยสร้างร้านย่อยต่อได้ไม่จำกัด) — คุณได้ส่วนต่างค่าธรรมเนียมจากทุกรายการของร้านย่อย" />
      {user.viewing ? (
        <Card className="p-5 text-[13px] text-muted">จัดการร้านย่อยได้จากร้านของคุณเอง — กด กลับร้านของฉัน ด้านบน</Card>
      ) : !can.has("manage_sub_merchants") ? (
        <Card className="p-5 text-[13px] text-muted">ระดับผู้ใช้ของคุณไม่มีสิทธิ์จัดการร้านย่อย — ติดต่อเจ้าของร้าน</Card>
      ) : !r?.ok || !r.subMerchants || !r.self ? (
        <Card className="p-5 text-[13px] text-red-300">โหลดข้อมูลไม่สำเร็จ{r && !r.ok ? `: ${r.error}` : ""}</Card>
      ) : (
        <SubMerchantsEditor subs={r.subMerchants} self={r.self} />
      )}
    </PortalShell>
  );
}
