"use client";

import { useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { TxnSuggest } from "@/components/txn/TxnSuggest";

type Option = { value: string; label: string };

const select =
  "rounded-lg border border-line bg-surface px-3 py-2 text-[13px] text-ink outline-none [color-scheme:dark] focus:border-primary";

/** Search + selects; each change rewrites the URL (paging resets), keeping the range. */
export function FilterCard({
  filters,
  searchPlaceholder,
  txn = false,
}: {
  filters: { name: string; options: Option[] }[];
  searchPlaceholder: string;
  /** Transaction search box: suggest refs containing the text, open a ref's full history. */
  txn?: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, start] = useTransition();
  const [q, setQ] = useState(params.get("q") ?? "");

  const set = (patch: Record<string, string>) => {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    // Any filter change starts every bucket from page 1.
    for (const k of [...next.keys()]) if (/^[a-z]+p$/.test(k)) next.delete(k);
    start(() => router.push(`${pathname}?${next}`, { scroll: false }));
  };

  return (
    <div className={`mb-5 rounded-xl border border-line bg-surface transition-opacity ${pending ? "opacity-70" : ""}`}>
      <form
        className="flex flex-wrap items-center gap-2.5 px-[22px] py-4"
        onSubmit={(e) => {
          e.preventDefault();
          set({ q: q.trim() });
        }}
      >
        <label className="relative">
          <Search size={15} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-soft" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            ref={input}
            onBlur={() => !txn && q.trim() !== (params.get("q") ?? "") && set({ q: q.trim() })}
            placeholder={searchPlaceholder}
            className="min-w-[220px] rounded-lg border border-line bg-surface py-2 pr-3 pl-9 text-[13px] text-ink outline-none placeholder:text-soft focus:border-primary"
          />
          {txn && <TxnSuggest inputRef={input} />}
        </label>
        {filters.map((f) => (
          <select key={f.name} aria-label={f.options[0]?.label} className={select} value={params.get(f.name) ?? ""} onChange={(e) => set({ [f.name]: e.target.value })}>
            {f.options.map((o) => (
              <option key={o.value || "all"} value={o.value}>{o.label}</option>
            ))}
          </select>
        ))}
      </form>
    </div>
  );
}
