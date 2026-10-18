import type { Metadata } from "next";
import { AlertTriangle } from "lucide-react";
import { ConsoleShell } from "@/components/shell/ConsoleShell";
import { Card, PageHeader } from "@/components/ui";
import { viewerHeaders } from "@/lib/api";
import { DeletedList, type DeletedRow } from "./DeletedList";

export const metadata: Metadata = { title: "รายการที่ลบแล้ว — Option Pay Admin" };

const BASE = process.env.BACKEND_URL ?? "http://localhost:3001";

/** Soft delete (18 Oct 2026): everything deleted in the console is kept — who, when, why — and Super Admin can restore it. */
export default async function DeletedPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const type = typeof sp.type === "string" ? sp.type : "";
  const q = typeof sp.q === "string" ? sp.q : "";
  let data: { data: DeletedRow[]; counts: Record<string, number>; types: Record<string, string> } | string;
  try {
    const qs = new URLSearchParams({ ...(type ? { type } : {}), ...(q ? { q } : {}), limit: "300" });
    const r = await fetch(`${BASE}/api/console/deleted?${qs}`, { headers: await viewerHeaders(), cache: "no-store" });
    if (!r.ok) throw new Error(`deleted → HTTP ${r.status}`);
    data = await r.json();
  } catch (err) {
    data = err instanceof Error ? err.message : String(err);
  }
  return (
    <ConsoleShell title="รายการที่ลบแล้ว" path="/deleted">
      <PageHeader title="รายการที่ลบแล้ว" subtitle="ทุกอย่างที่กด “ลบ” ในระบบยังเก็บไว้ครบ — ดูได้ว่าใครลบ เมื่อไร เพราะอะไร และกู้คืนได้ (เฉพาะ Super Admin)" />
      {typeof data === "string" ? (
        <Card className="flex items-start gap-3 p-5">
          <AlertTriangle className="mt-0.5 shrink-0 text-danger" size={20} />
          <div className="text-[13px] text-muted">{data}</div>
        </Card>
      ) : (
        <DeletedList rows={data.data} counts={data.counts} types={data.types} type={type} q={q} />
      )}
    </ConsoleShell>
  );
}
