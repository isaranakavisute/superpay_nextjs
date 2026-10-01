"use client";

import { useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

/** Shop picker: writes ?merchantId= (keeping the range). */
export function MerchantSelect({ options, value }: { options: { id: number; label: string }[]; value: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  const [pending, start] = useTransition();
  return (
    <select
      aria-label="เลือกร้านค้า"
      value={value}
      disabled={pending}
      onChange={(e) => {
        const q = new URLSearchParams(search.toString());
        q.set("merchantId", e.target.value);
        start(() => router.push(`${pathname}?${q}`, { scroll: false }));
      }}
      className="min-w-[260px] rounded-lg border border-line bg-surface px-3 py-[9px] text-[13.5px] text-ink outline-none [color-scheme:dark] focus:border-primary"
    >
      {options.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
    </select>
  );
}
