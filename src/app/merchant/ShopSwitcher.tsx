"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import type { ViewableShop } from "@/lib/portal";
import { viewShop } from "./actions";
import { treeLabels } from "./shopTree";

/** Own shop + every sub-merchant below it; choosing one views it (read only). */
export function ShopSwitcher({ shops, current, home }: { shops: ViewableShop[]; current: number; home: number }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const label = treeLabels(shops);
  return (
    <select
      aria-label="เลือกร้านที่จะดู"
      disabled={pending}
      value={current}
      onChange={(e) => start(async () => { await viewShop(Number(e.target.value) === home ? 0 : Number(e.target.value)); router.refresh(); })}
      className="max-w-[260px] truncate rounded-lg border border-line bg-surface-alt px-2.5 py-1.5 text-[13px] [color-scheme:dark]"
    >
      {shops.map((s) => (
        <option key={s.id} value={s.id}>
          {`${label.get(s.id)}${s.id === home ? " (ร้านของฉัน)" : ""}${s.status === "pending" ? " · รออนุมัติ" : s.status === "suspended" ? " · ระงับ" : ""}`}
        </option>
      ))}
    </select>
  );
}

export function BackToOwnShop() {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button type="button" disabled={pending} onClick={() => start(async () => { await viewShop(0); router.refresh(); })} className="rounded-md border border-amber-400/40 px-2.5 py-1 text-[12.5px] font-medium hover:bg-amber-400/10">
      กลับร้านของฉัน
    </button>
  );
}

/** Opens a sub-merchant's own pages (dashboard, transactions…) read only. */
export function ViewShopButton({ id }: { id: number }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button type="button" disabled={pending} onClick={() => start(async () => { await viewShop(id); router.push("/merchant/dashboard"); router.refresh(); })} className="text-[12px] text-muted hover:text-ink">
      เปิดร้าน →
    </button>
  );
}
