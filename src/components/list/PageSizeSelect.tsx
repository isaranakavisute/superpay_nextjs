"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

const SIZES = [25, 50, 100, 200];

/** "แสดง [n] แถว" — rewrites ?{name}= and resets that bucket's page. */
export function PageSizeSelect({ name, value, pageKey }: { name: string; value: number; pageKey: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  return (
    <label className="flex items-center gap-1.5">
      แสดง
      <select
        value={value}
        onChange={(e) => {
          const q = new URLSearchParams(search.toString());
          q.set(name, e.target.value);
          q.delete(pageKey);
          router.push(`${pathname}?${q}`, { scroll: false });
        }}
        className="rounded-md border border-line bg-surface-alt px-1.5 py-1 text-[12.5px] text-ink outline-none [color-scheme:dark]"
      >
        {SIZES.map((s) => (
          <option key={s} value={s}>{s}</option>
        ))}
      </select>
      แถว
    </label>
  );
}
