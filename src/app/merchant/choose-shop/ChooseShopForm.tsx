"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { ViewableShop } from "@/lib/portal";
import { viewShop } from "../actions";
import { treeLabels } from "../shopTree";

const STATUS = { active: "", pending: " · รออนุมัติ", suspended: " · ระงับ" } as const;

export function ChooseShopForm({ shops }: { shops: ViewableShop[] }) {
  const router = useRouter();
  const [id, setId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const label = treeLabels(shops);
  const open = () => start(async () => {
    setError(null);
    const r = await viewShop(Number(id));
    if (!r.ok) { setError(r.error); return; }
    router.push("/merchant/dashboard");
    router.refresh();
  });
  return (
    <div className="flex flex-col gap-3">
      <label className="text-[13px] font-medium" htmlFor="shop">ร้านค้า</label>
      <select
        id="shop"
        value={id}
        onChange={(e) => setId(e.target.value)}
        className="rounded-lg border border-line bg-surface-alt px-3 py-2.5 font-mono text-sm [color-scheme:dark]"
      >
        <option value="" disabled>— เลือกร้าน —</option>
        {shops.map((s) => (
          <option key={s.id} value={s.id}>{`${label.get(s.id)}${STATUS[s.status] ?? ""}`}</option>
        ))}
      </select>
      {error && <p className="text-[12.5px] text-danger">{error}</p>}
      <button
        type="button"
        disabled={!id || pending}
        onClick={open}
        className="mt-1 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-fg transition disabled:opacity-50"
      >
        {pending ? "กำลังเปิด…" : "เข้าสู่ร้านนี้ในฐานะเจ้าของร้าน"}
      </button>
    </div>
  );
}
