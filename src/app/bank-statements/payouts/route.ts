import { listResource } from "@/lib/api";
import type { AccountRow, OutflowRow } from "@/lib/rows";
import { getSessionUser } from "@/lib/session";

const MAX = 40_000;
/** Bangkok "YYYY-MM-DD HH:MM:SS" */
const bkk = (v: string | null) => (v ? new Date(new Date(v).getTime() + 7 * 3_600_000).toISOString().slice(0, 19).replace("T", " ") : "");
const dayStart = (d: string, plusDays: number) => new Date(Date.parse(`${d}T00:00:00+07:00`) + plusDays * 86_400_000).toISOString();

/**
 * Payouts (every status) around a statement period, for เปรียบเทียบกับ bank statement. The statement PDFs never come here:
 * they are read in the browser. The backend checks the viewer's permission (outflow.view) on the list.
 */
export async function GET(req: Request) {
  if (!(await getSessionUser())) return Response.json({ error: "unauthorized" }, { status: 401 });
  const u = new URL(req.url).searchParams;
  const from = u.get("from") ?? "", to = u.get("to") ?? "";
  if (!/^\d{4}-\d\d-\d\d$/.test(from) || !/^\d{4}-\d\d-\d\d$/.test(to) || from > to) return Response.json({ error: "bad range" }, { status: 400 });
  try {
    // created up to 2 days before the period (marked done later) and 1 day after (marked done a day early)
    const window = { from: dayStart(from, -2), to: dayStart(to, 2) };
    const rows: OutflowRow[] = [];
    for (let offset = 0; offset < MAX; offset += 200) {
      const page = await listResource<OutflowRow>("outflows", { ...window, limit: 200, offset });
      rows.push(...page.data);
      if (page.data.length < 200) break;
    }
    const accounts = await listResource<AccountRow>("accounts", { limit: 200 }).then((r) => r.data).catch(() => [] as AccountRow[]);
    return Response.json({
      payouts: rows.map((o) => ({
        ref: o.ref, merchant: o.merchantName ?? "", amount: Number(o.amount), receiverName: o.receiverName, bank: o.receiverBankCode,
        account: o.receiverAccount, status: o.status, created: bkk(o.createdAt), done: bkk(o.adminDoneAt ?? o.completedAt ?? o.createdAt), doneBy: o.adminDoneBy ?? "",
      })),
      accounts: accounts.map((a) => ({ label: a.label, bank: a.bankCode, account: a.accountNo ?? "" })),
    }, { headers: { "cache-control": "no-store" } });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "unavailable" }, { status: 502 });
  }
}
