"use client";

import { useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

type Opt = { value: string; label: string };
const sel = "rounded-lg border border-line bg-surface px-3 py-2 text-[13px] text-ink outline-none [color-scheme:dark] focus:border-primary";

export function AuditToolbar({ families, entities, ranges, csvHref }: { families: Opt[]; entities: Opt[]; ranges: Opt[]; csvHref: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, start] = useTransition();
  const set = (patch: Record<string, string>) => {
    const q = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v) q.set(k, v);
      else q.delete(k);
    }
    start(() => router.push(`${pathname}?${q}`, { scroll: false }));
  };
  const range = params.get("range") ?? "";
  return (
    <div className={`mb-3 flex flex-wrap items-center gap-2.5 ${pending ? "opacity-70" : ""}`}>
      <select aria-label="ประเภท" className={sel} value={params.get("family") ?? ""} onChange={(e) => set({ family: e.target.value })}>{families.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select>
      <select aria-label="Entity" className={sel} value={params.get("entity") ?? ""} onChange={(e) => set({ entity: e.target.value })}>{entities.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select>
      <select aria-label="ช่วงเวลา" className={sel} value={range} onChange={(e) => set({ range: e.target.value })}>{ranges.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select>
      {range === "custom" && (
        <>
          <input type="date" aria-label="ตั้งแต่" className={sel} value={params.get("from") ?? ""} onChange={(e) => set({ from: e.target.value })} />
          <input type="date" aria-label="ถึง" className={sel} value={params.get("to") ?? ""} onChange={(e) => set({ to: e.target.value })} />
        </>
      )}
      <a href={csvHref} className="ml-auto rounded-lg border border-line px-3 py-1.5 text-[12.5px] text-ink hover:bg-surface-alt">⭳ CSV</a>
    </div>
  );
}
