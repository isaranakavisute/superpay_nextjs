import type { Metadata } from "next";
import { AlertTriangle } from "lucide-react";
import { ConsoleShell } from "@/components/shell/ConsoleShell";
import { Dashboard } from "@/components/dashboard/Dashboard";
import { rangeFromParams, resolveRange } from "@/components/dashboard/range";
import { Card } from "@/components/ui";
import { getDashboardSummary, getDashboardTrend } from "@/lib/api";
import { bkkDayStart } from "@/lib/domain";
import { requestTime } from "@/lib/request-time";
import { getSessionUser } from "@/lib/session";

export const metadata: Metadata = { title: "แดชบอร์ด — Option Pay Admin" };

export default async function DashboardPage({ searchParams }: PageProps<"/dashboard">) {
  const today = bkkDayStart(await requestTime());
  const sel = rangeFromParams(await searchParams, today);
  const range = resolveRange(sel, today);
  const user = await getSessionUser();

  let data: { summary: Awaited<ReturnType<typeof getDashboardSummary>>; trend: Awaited<ReturnType<typeof getDashboardTrend>> } | null = null;
  let error: string | null = null;
  try {
    const [summary, trend] = await Promise.all([
      getDashboardSummary(range.isAll ? null : range.from, range.isAll ? null : range.to),
      getDashboardTrend(30),
    ]);
    data = { summary, trend };
  } catch (err) {
    error = err instanceof Error ? err.message : String(err);
  }

  const body = data ? (
    <Dashboard sel={sel} rangeLabel={range.label} isAll={range.isAll} userName={user?.fullName ?? ""} summary={data.summary} trend={data.trend} />
  ) : (
    <Card className="flex items-start gap-3 p-5">
      <AlertTriangle className="mt-0.5 shrink-0 text-danger" size={20} />
      <div>
        <div className="font-semibold">โหลดข้อมูลแดชบอร์ดไม่สำเร็จ</div>
        <div className="mt-1 text-[13px] text-muted">ติดต่อ backend ไม่ได้ ({error})</div>
      </div>
    </Card>
  );

  return (
    <ConsoleShell title="แดชบอร์ด" path="/dashboard">
      {body}
    </ConsoleShell>
  );
}
