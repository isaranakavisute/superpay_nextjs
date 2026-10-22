import { getSessionUser } from "@/lib/session";

// USD → THB for the server bill reminder on the payments page. The rate source updates once a day; keep it 1 hour.
const SOURCE = "https://open.er-api.com/v6/latest/USD";
let cached: { at: number; rate: number; updated: string } | null = null;

export async function GET() {
  if (!(await getSessionUser())) return Response.json({ error: "unauthorized" }, { status: 401 });
  if (!cached || Date.now() - cached.at > 3_600_000) {
    try {
      const j = (await (await fetch(SOURCE, { cache: "no-store", signal: AbortSignal.timeout(5000) })).json()) as { result: string; rates: Record<string, number>; time_last_update_utc: string };
      if (j.result === "success" && j.rates.THB > 0) cached = { at: Date.now(), rate: j.rates.THB, updated: new Date(j.time_last_update_utc).toISOString() };
    } catch {
      /* keep the last rate */
    }
  }
  return Response.json({ rate: cached?.rate ?? null, updated: cached?.updated ?? null }, { headers: { "cache-control": "no-store" } });
}
