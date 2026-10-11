import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen, Code2, Download } from "lucide-react";
import { Card, PageHeader } from "@/components/ui";
import { requirePortal } from "@/lib/portal";
import { PortalShell } from "../PortalShell";

export const metadata: Metadata = { title: "คู่มือ — Merchant Portal" };

const DOCS = [
  { href: "/merchant/docs/manual", pdf: "merchant-manual.pdf", icon: BookOpen, title: "คู่มือการใช้งานสำหรับร้านค้า", desc: "วิธีใช้ Merchant Portal — แดชบอร์ด รายการชำระเงิน ถอนเงิน ตั้งค่าร้าน หน้าชำระเงินของลูกค้า และการแก้ปัญหา" },
  { href: "/merchant/docs/api", pdf: "api-v1.pdf", icon: Code2, title: "คู่มือ API v1", desc: "สำหรับนักพัฒนา — ตัวอย่างคำสั่ง curl แบบเต็มทุก endpoint (กดคัดลอกได้) พร้อมสิทธิ์ที่ต้องใช้ ข้อผิดพลาด และการตรวจลายเซ็น webhook" },
];

export default async function PortalDocs() {
  const user = await requirePortal("/merchant/docs");
  return (
    <PortalShell user={user} path="/merchant/docs">
      <PageHeader title="คู่มือ" subtitle="คู่มือการใช้งานและเอกสาร API ของ Option Pay" />
      <div className="grid gap-4 md:grid-cols-2">
        {DOCS.map((d) => (
          <Card key={d.href} className="flex flex-col p-5">
            <div className="flex items-start gap-3.5">
              <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary-50 text-primary"><d.icon size={22} /></div>
              <div className="min-w-0 flex-1">
                <Link href={d.href} className="font-semibold hover:text-primary">{d.title}</Link>
                <div className="mt-1 text-[13px] text-muted">{d.desc}</div>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link href={d.href} className="inline-flex items-center rounded-lg border border-primary bg-primary px-3.5 py-2 text-[13px] font-medium text-primary-fg hover:bg-primary-600">อ่านคู่มือ →</Link>
              <a href={`/merchant/docs/${d.pdf}?download=1`} className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-2 text-[12.5px] text-muted hover:text-ink"><Download size={13} /> PDF</a>
            </div>
          </Card>
        ))}
      </div>
    </PortalShell>
  );
}
