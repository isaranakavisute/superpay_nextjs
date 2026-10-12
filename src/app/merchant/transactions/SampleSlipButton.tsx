"use client";

import { useState } from "react";
import { Download, Receipt } from "lucide-react";
import { btn, Modal } from "@/components/interactive/Modal";
import { renderSampleSlip, type SampleSlip } from "@/lib/sample-slip";

const B = (v: keyof typeof btn, s: "sm" | "md" = "md") => `${btn.base} ${btn[s]} ${btn[v]}`;

/** Transactions row → ตัวอย่างสลิป: a watermarked JPG of what this order's real slip must show. */
export function SampleSlipButton({ slip }: { slip: SampleSlip }) {
  const [img, setImg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const open = async () => {
    setBusy(true);
    try { setImg((await renderSampleSlip(slip)).toDataURL("image/jpeg", 0.92)); } finally { setBusy(false); }
  };
  return (
    <>
      <button type="button" disabled={busy} onClick={open} className="inline-flex items-center gap-1 text-[12.5px] text-muted hover:text-ink"><Receipt size={13} /> ตัวอย่างสลิป</button>
      {img && (
        <Modal title={`ตัวอย่างสลิปที่ถูกต้อง — ${slip.ref}`} onClose={() => setImg(null)} width={560}
          footer={<><button type="button" className={B("ghost")} onClick={() => setImg(null)}>ปิด</button>
            <a href={img} download={`ตัวอย่างสลิป-${slip.ref}.jpg`} className={B("primary")}><Download size={15} /> ดาวน์โหลด JPG</a></>}>
          <div className="grid gap-4 text-left text-[13px] whitespace-normal md:grid-cols-[220px_1fr]">
            {/* eslint-disable-next-line @next/next/no-img-element -- generated data: URL */}
            <img src={img} alt={`ตัวอย่างสลิปของ ${slip.ref}`} className="w-full rounded-lg border border-line" />
            <div>
              <div className="mb-2 font-semibold">สลิปจริงของลูกค้าต้องมีข้อมูลตรงกับรายการนี้</div>
              <ol className="list-decimal space-y-1.5 pl-5 text-muted">
                <li><strong className="text-ink">ยอดเงิน</strong> {slip.amount.toLocaleString("th-TH", { minimumFractionDigits: 2 })} บาท ตรงทุกสตางค์</li>
                <li><strong className="text-ink">บัญชีผู้รับ</strong> {slip.bankName} {slip.accountNo} {slip.accountName ? `(${slip.accountName})` : ""}</li>
                <li><strong className="text-ink">ชื่อผู้โอน</strong> {slip.customerName ? `ต้องเป็น ${slip.customerName}` : "ไม่ตรวจ (รายการนี้ไม่ได้ระบุชื่อลูกค้า)"}</li>
                <li><strong className="text-ink">เวลาโอน</strong> หลังสร้างรายการ และไม่เก่าเกินที่ระบบกำหนด</li>
                <li><strong className="text-ink">QR บนสลิป</strong> ครบ ชัด ไม่ครอปหรือแต่งภาพ</li>
              </ol>
              <p className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 p-2.5 text-[12px] text-red-300">ภาพนี้เป็นตัวอย่างเท่านั้น — ไม่ใช่หลักฐานการโอน ระบบจะปฏิเสธถ้านำไปอัปโหลด</p>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
