// Shared page-load times for the console's loading popup (src/lib/load-times.ts): every admin's last loads per page,
// plus the background check's server times (lib/page-probe.ts) — kept in this server's memory. Signed-in only.
import { getSessionUser } from "@/lib/session";
import { slowEnd } from "@/lib/load-times";
import { probeStore } from "@/lib/page-probe";

const KEEP = 20;
const stuck = ((globalThis as { __opPageStuck?: Map<string, number> }).__opPageStuck ??= new Map<string, number>());
const store = ((globalThis as { __opPageTimes?: Map<string, number[]> }).__opPageTimes ??= new Map<string, number[]>());
const estimates = () => Object.fromEntries([...store].map(([k, v]) => [k, slowEnd(v)]));
/** The background check's latest server time per page (≈ the slower end of its last 3 rounds). */
const server = () => Object.fromEntries([...probeStore.times].map(([k, v]) => [k, slowEnd(v.slice(-3))]));

export async function GET() {
  if (!(await getSessionUser())) return Response.json({ ok: false }, { status: 401 });
  return Response.json({ ok: true, estimates: estimates(), server: server(), checkedAt: probeStore.at || null, stuck: Object.fromEntries(stuck) });
}

export async function POST(req: Request) {
  if (!(await getSessionUser())) return Response.json({ ok: false }, { status: 401 });
  const b = (await req.json().catch(() => null)) as { page?: unknown; ms?: unknown; stuck?: unknown } | null;
  const page = typeof b?.page === "string" && /^[a-z0-9-]{1,40}$/.test(b.page) ? b.page : null;
  const ms = Number(b?.ms);
  if (!page || !(ms > 0 && ms < 120_000)) return Response.json({ ok: false }, { status: 400 });
  // A stuck page that the popup retried by itself (1 Nov 2026): logged (website log) and counted — not a load time.
  if (b?.stuck === 1 || b?.stuck === 2) {
    stuck.set(page, (stuck.get(page) ?? 0) + 1);
    console.log(JSON.stringify({ msg: "page stuck — retried automatically", page, ms: Math.round(ms), attempt: b.stuck }));
    return Response.json({ ok: true });
  }
  store.set(page, [...(store.get(page) ?? []), Math.round(ms)].slice(-KEEP));
  return Response.json({ ok: true, estimates: estimates(), server: server(), checkedAt: probeStore.at || null });
}
