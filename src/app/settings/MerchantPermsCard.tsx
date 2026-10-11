"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DEFAULT_MERCHANT_PERMS, MERCHANT_PERMISSIONS, type MerchantPermMatrix, type MerchantTier } from "@/lib/merchant-perms";
import { saveSection } from "./actions";
import { B, Msg, SCard, hint, useRun } from "./parts";

const TIERS: { id: MerchantTier; label: string }[] = [
  { id: "owner", label: "เจ้าของร้าน" },
  { id: "staff", label: "พนักงาน" },
  { id: "viewer", label: "ดูอย่างเดียว" },
];

/** Who may do what, per shop-user level — enforced by the merchant API and the Merchant Portal. */
export function MerchantPermsCard({ matrix }: { matrix: MerchantPermMatrix }) {
  const router = useRouter();
  const [m, setM] = useState<MerchantPermMatrix>(matrix);
  const { r, pending, run } = useRun();
  const toggle = (tier: MerchantTier, code: string) =>
    setM((x) => ({ ...x, [tier]: x[tier].includes(code) ? x[tier].filter((c) => c !== code) : [...x[tier], code] }));
  const dirty = JSON.stringify(m) !== JSON.stringify(matrix);

  return (
    <SCard title="สิทธิ์ผู้ใช้ร้านค้า (Merchant API & Portal)" note="กำหนดว่าผู้ใช้ร้านค้าแต่ละระดับทำอะไรได้ — มีผลทันที">
      <div className={`${hint} mt-0 mb-3`}>
        ใช้กับ API key ที่ผู้ใช้ร้านค้าได้จาก <code>POST /api/v1/auth/login</code> (ด้วย secret key ของผู้ใช้) และการใช้งานใน Merchant Portal · เรียกสิ่งที่ไม่มีสิทธิ์จะได้ <code>403 PERMISSION_DENIED</code> ·
        API key ที่ผู้ดูแลออกให้ร้านในหน้า <strong className="text-ink">ร้านค้า</strong> หรือที่ออกใน Portal เป็น key ระดับร้าน <strong className="text-ink">ใช้ได้ทุกอย่าง</strong> · การเปลี่ยนรหัสผ่านของตัวเองใน Portal ทำได้เสมอ
      </div>
      <Msg r={r} />
      <div className="overflow-x-auto rounded-[10px] border border-line">
        <table className="w-full border-collapse text-[13px]">
          <thead>
            <tr className="bg-surface-alt text-left text-xs text-muted">
              <th className="px-3.5 py-2.5 font-semibold">สิทธิ์</th>
              {TIERS.map((t) => <th key={t.id} className="w-[110px] px-3 py-2.5 text-center font-semibold">{t.label}</th>)}
            </tr>
          </thead>
          <tbody>
            {MERCHANT_PERMISSIONS.map((p) => (
              <tr key={p.code} className="border-t border-line">
                <td className="px-3.5 py-2.5">
                  <div className="font-medium">{p.label}</div>
                  <div className="font-mono text-[11px] text-soft">{p.code} · {p.endpoints}</div>
                </td>
                {TIERS.map((t) => (
                  <td key={t.id} className="text-center">
                    <input type="checkbox" aria-label={`${t.label}: ${p.label}`} className="size-4 accent-(--color-primary)" checked={m[t.id].includes(p.code)} onChange={() => toggle(t.id, p.code)} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-3.5 flex flex-wrap items-center justify-between gap-2">
        <button type="button" className={B("ghost", "sm")} onClick={() => setM(DEFAULT_MERCHANT_PERMS)}>คืนค่าเริ่มต้น</button>
        <button type="button" className={B("primary")} disabled={pending || !dirty} onClick={() => run(() => saveSection("merchantPerms", m), (res) => res.ok && router.refresh())}>บันทึกสิทธิ์</button>
      </div>
    </SCard>
  );
}
